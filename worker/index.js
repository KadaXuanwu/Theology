// The chat endpoint.
//
// The browser sends a question and nothing else. This Worker holds the API key,
// fetches the vault from the published site, decides what the model gets to
// read, and streams the answer back as plain text.
//
// The browser deliberately does not supply the notes. If it did, anyone could
// post half a megabyte of their own text and have it billed to this key.
//
// What is left in this file is the request itself: who may call, how often,
// what a valid question looks like, and which status code a failure becomes.
// The vault, the counter and the stream each live next door.

import { buildPrompt } from "./context.js"
import { createCorpusReader } from "./corpus.js"
import { noAnswer, pickProvider } from "./providers.js"
import { createRateLimiter } from "./rate-limit.js"
import { answerStream } from "./stream.js"

// Caps. A chat bubble question is a sentence, and the history only exists so
// follow-ups make sense, so both can be small without anyone noticing.
const MAX_QUESTION = 1000
const MAX_HISTORY = 8
const MAX_HISTORY_CHARS = 6000
const MAX_MESSAGE_CHARS = 2000
const MAX_PAGE_URL = 200

// Requests one address may make per window, and how long the window is.
//
// Six, down from twelve. Flash Lite's free tier allows about fifteen a minute
// and 500 a day, so this is not really protecting the per-minute limit; it is
// protecting the daily one from a single visitor.
//
// Six a minute is still 360 an hour, so one determined address could spend the
// day's 500 in under two hours. A daily counter in Workers KV is the answer if
// that ever happens; the free allowance of 1,000 writes a day covers it.
const RATE_LIMIT = 6
const RATE_WINDOW_MS = 60_000

// How long a fetched corpus is reused before checking for a newer one. Notes
// change daily, the Worker does not, so this is what keeps the two in step
// without ever redeploying this file.
const CORPUS_TTL_MS = 10 * 60_000

const rateLimited = createRateLimiter({ limit: RATE_LIMIT, windowMs: RATE_WINDOW_MS })
const loadCorpus = createCorpusReader({ ttlMs: CORPUS_TTL_MS })

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

// Everything the browser is allowed to say, and nothing it is not. Throws with
// a sentence the reader can act on, which becomes a 400.
export function readRequest(body) {
  const question = typeof body.question === "string" ? body.question.trim() : ""
  if (!question) throw new Error("Ask a question first.")
  if (question.length > MAX_QUESTION) throw new Error("That question is too long.")

  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY) : []
  const clean = []
  let chars = 0
  for (const message of history) {
    if (typeof message?.text !== "string") continue
    const role = message.role === "assistant" ? "assistant" : "user"
    const text = message.text.slice(0, MAX_MESSAGE_CHARS)
    chars += text.length
    if (chars > MAX_HISTORY_CHARS) break
    clean.push({ role, text })
  }

  const pageUrl = typeof body.pageUrl === "string" ? body.pageUrl.slice(0, MAX_PAGE_URL) : null
  return { question, history: clean, pageUrl }
}

// Whether this request may be answered at all. Returns a Response to send back
// instead, or null to carry on.
function reject(request, allowed, echo) {
  const origin = request.headers.get("origin")

  if (request.method !== "POST") return fail(405, "POST a question.", echo)
  if (allowed !== "*" && origin && origin !== allowed) return fail(403, "Not allowed from here.", echo)

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown"
  if (rateLimited(ip)) return fail(429, "Too many questions just now. Give it a minute.", echo)

  return null
}

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN || "*"
    const echo = allowed === "*" ? "*" : allowed

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(echo) })

    const refused = reject(request, allowed, echo)
    if (refused) return refused

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
    const chunks = provider.stream({ ...prompt, history: asked.history }, env, stats)[Symbol.asyncIterator]()

    // Wait for the first token before replying at all. Everything that usually
    // goes wrong, a slow model, a bad key, a rejected model id, goes wrong
    // before any text exists, and holding the headers back until then means
    // those become a real status code the page can treat as a failure. Once
    // headers are sent the only way to report a problem is to write it into
    // the answer, where it reads as something the assistant said.
    let first
    try {
      first = await chunks.next()
    } catch (error) {
      return fail(502, error.message, echo)
    }

    // A valid stream carrying no text at all. Without this the reader gets an
    // empty bubble and no idea why, which looks worse than any error message.
    // A safety filter is the likeliest cause on a vault about religion.
    if (first.done) {
      console.log(`no answer, finishReason: ${stats.finishReason ?? "none given"}`)
      return fail(502, noAnswer(stats.finishReason), echo)
    }

    const body = answerStream({
      first: first.value,
      chunks,
      notes: corpus.notes,
      // Read with `wrangler tail`. The catalogue is the same tokens on every
      // question and sits at the front of the prompt, so it should be served
      // from the provider's implicit cache. Should. This is how we find out,
      // and it decides whether trimming the catalogue further is worth doing.
      onFinish: () =>
        console.log(
          JSON.stringify({
            notesSent: prompt.used.length,
            promptChars: prompt.system.length + prompt.context.length,
            usage: stats.usage ?? null,
          }),
        ),
    })

    return new Response(body, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        ...cors(echo),
      },
    })
  },
}
