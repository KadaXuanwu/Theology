// The chat endpoint.
//
// The browser sends a question and nothing else. This Worker holds the API key,
// fetches the vault from the published site, decides what the model gets to
// read, and streams the answer back as plain text.
//
// The browser deliberately does not supply the notes. If it did, anyone could
// post half a megabyte of their own text and have it billed to this key.

import { buildPrompt } from "./context.js"
import { pickProvider } from "./providers.js"

// Caps. A chat bubble question is a sentence, and the history only exists so
// follow-ups make sense, so both can be small without anyone noticing.
const MAX_QUESTION = 1000
const MAX_HISTORY = 8
const MAX_HISTORY_CHARS = 6000

// Requests one address may make per window, and how long the window is.
const RATE_LIMIT = 12
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

    let prompt
    try {
      prompt = buildPrompt(await loadCorpus(env), asked)
    } catch (error) {
      return fail(502, `Could not read the vault: ${error.message}`, echo)
    }

    const provider = pickProvider(env)
    const stream = new ReadableStream({
      async start(controller) {
        const encode = new TextEncoder()
        try {
          for await (const chunk of provider.stream({ ...prompt, history: asked.history }, env)) {
            controller.enqueue(encode.encode(chunk))
          }
        } catch (error) {
          // The stream has already started by the time most failures happen, so
          // the message goes into the answer rather than into a status code.
          controller.enqueue(encode.encode(`\n\n_Something went wrong: ${error.message}_`))
        }
        controller.close()
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
