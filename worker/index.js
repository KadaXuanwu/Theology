// The chat endpoint.
//
// The browser sends a question and nothing else. This Worker holds the API key,
// fetches the vault from the published site, decides what the model gets to
// read, and streams the answer back as plain text.
//
// The browser deliberately does not supply the notes. If it did, anyone could
// post half a megabyte of their own text and have it billed to this key.

import { buildPrompt, resolveLinks } from "./context.js"
import { pickProvider } from "./providers.js"

// Caps. A chat bubble question is a sentence, and the history only exists so
// follow-ups make sense, so both can be small without anyone noticing.
const MAX_QUESTION = 1000
const MAX_HISTORY = 8
const MAX_HISTORY_CHARS = 6000

// Requests one address may make per window, and how long the window is.
//
// Six, down from twelve: Gemini's own free tier limit for this model is around
// five a minute, measured by hitting it twice. Note the mismatch that cannot be
// fixed here, though. This counter is per address, Gemini's quota is per
// project, so three readers asking two questions each will exhaust it while
// none of them comes close to this. That is what the quota message is for; this
// limit only stops one address spending the whole allowance alone.
const RATE_LIMIT = 6
const RATE_WINDOW_MS = 60_000

// How long a fetched corpus is reused before checking for a newer one. Notes
// change daily, the Worker does not, so this is what keeps the two in step
// without ever redeploying this file.
const CORPUS_TTL_MS = 10 * 60_000

let corpusCache = { at: 0, data: null }
const hits = new Map()

const cors = (origin) => ({
  "access-control-allow-origin": origin,
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
  vary: "origin",
})

const fail = (status, message, origin) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json", ...cors(origin) },
  })

// In-memory, so it resets when the isolate does and does not span Cloudflare
// locations. That makes it a speed bump rather than a guarantee, which is the
// right trade at zero cost: the hard ceiling on spend is that the model account
// has no billing enabled, not this counter.
function rateLimited(ip) {
  const now = Date.now()
  const seen = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  seen.push(now)
  hits.set(ip, seen)

  // Keep the map from growing without bound on a long-lived isolate.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(key)
    }
  }
  return seen.length > RATE_LIMIT
}

async function loadCorpus(env) {
  const now = Date.now()
  if (corpusCache.data && now - corpusCache.at < CORPUS_TTL_MS) return corpusCache.data

  const response = await fetch(env.CORPUS_URL, { cf: { cacheTtl: 600 } })
  if (!response.ok) {
    // A stale corpus answers better than an error page does.
    if (corpusCache.data) return corpusCache.data
    throw new Error(`corpus fetch failed: ${response.status}`)
  }

  const data = await response.json()
  corpusCache = { at: now, data }
  return data
}

// A bracket construct can be split across two chunks of the stream, so anything
// from an unfinished one onward is held back until it completes. Two reasons:
// the reader would otherwise watch a raw "[[Jesus Exi" appear and vanish, and
// more importantly the page rebuilds its markup from the whole answer on every
// chunk, so half a link now and half a link later still assembles into a link
// there. Holding it here is what lets resolveLinks see it whole.
const HOLD_LIMIT = 500

export function splitAtOpenLink(buffer) {
  const lastDouble = buffer.lastIndexOf("[[")
  const lastSingle = buffer.lastIndexOf("[")
  // When the final "[" is just the second half of a "[[", judge the pair.
  const open = lastDouble >= 0 && lastSingle <= lastDouble + 1 ? lastDouble : lastSingle
  if (open < 0) return [buffer, ""]

  const tail = buffer.slice(open)
  const finished = /^\[\[[^\][]*\]\]/.test(tail) || /^\[[^\][]*\]\([^)]*\)/.test(tail)
  // A bracket that never closes would stall the stream, so stop waiting.
  if (finished || tail.length > HOLD_LIMIT) return [buffer, ""]
  return [buffer.slice(0, open), tail]
}

function readRequest(body) {
  const question = typeof body.question === "string" ? body.question.trim() : ""
  if (!question) throw new Error("Ask a question first.")
  if (question.length > MAX_QUESTION) throw new Error("That question is too long.")

  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY) : []
  const clean = []
  let chars = 0
  for (const message of history) {
    if (typeof message?.text !== "string") continue
    const role = message.role === "assistant" ? "assistant" : "user"
    const text = message.text.slice(0, 2000)
    chars += text.length
    if (chars > MAX_HISTORY_CHARS) break
    clean.push({ role, text })
  }

  const pageUrl = typeof body.pageUrl === "string" ? body.pageUrl.slice(0, 200) : null
  return { question, history: clean, pageUrl }
}

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN || "*"
    const origin = request.headers.get("origin")
    const echo = allowed === "*" ? "*" : allowed

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(echo) })
    if (request.method !== "POST") return fail(405, "POST a question.", echo)
    if (allowed !== "*" && origin && origin !== allowed) return fail(403, "Not allowed from here.", echo)

    const ip = request.headers.get("cf-connecting-ip") ?? "unknown"
    if (rateLimited(ip)) return fail(429, "Too many questions just now. Give it a minute.", echo)

    let asked
    try {
      asked = readRequest(await request.json())
    } catch (error) {
      return fail(400, error.message, echo)
    }

    let corpus
    let prompt
    try {
      corpus = await loadCorpus(env)
      prompt = buildPrompt(corpus, asked)
    } catch (error) {
      return fail(502, `Could not read the vault: ${error.message}`, echo)
    }

    const provider = pickProvider(env)
    const stats = {}
    const answer = provider.stream({ ...prompt, history: asked.history }, env, stats)[Symbol.asyncIterator]()

    // Wait for the first token before replying at all. Everything that usually
    // goes wrong, a slow model, a bad key, a rejected model id, goes wrong
    // before any text exists, and holding the headers back until then means
    // those become a real status code the page can treat as a failure. Once
    // headers are sent the only way to report a problem is to write it into
    // the answer, where it reads as something the assistant said.
    let first
    try {
      first = await answer.next()
    } catch (error) {
      return fail(502, error.message, echo)
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encode = new TextEncoder()
        const send = (text) => controller.enqueue(encode.encode(resolveLinks(text, corpus.notes)))
        let held = ""
        const take = (chunk) => {
          const [ready, rest] = splitAtOpenLink(held + chunk)
          held = rest
          if (ready) send(ready)
        }

        try {
          if (!first.done) take(first.value)
          for (let step = await answer.next(); !step.done; step = await answer.next()) take(step.value)
          if (held) send(held)
        } catch (error) {
          if (held) send(held)
          // Only reachable once text is already flowing, so there is no status
          // code left to use.
          controller.enqueue(encode.encode(`\n\n_Something went wrong: ${error.message}_`))
        }
        controller.close()

        // Read with `wrangler tail`. The catalogue is the same tokens on every
        // question and sits at the front of the prompt, so it should be served
        // from the provider's implicit cache. Should. This is how we find out,
        // and it decides whether trimming the catalogue further is worth doing.
        console.log(
          JSON.stringify({
            notesSent: prompt.used.length,
            promptChars: prompt.system.length + prompt.context.length,
            usage: stats.usage ?? null,
          }),
        )
      },
    })

    return new Response(stream, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        ...cors(echo),
      },
    })
  },
}
