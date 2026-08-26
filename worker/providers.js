// The model, behind one function.
//
// Each provider is an async generator that takes the assembled prompt and
// yields plain text as it arrives. Nothing above this file knows which model
// answered, so swapping one for another is a config change. That matters here
// because no benchmark can tell you which model reads this particular vault
// well: the only way to find out is to run the same questions through both.

// How long to wait for the first token before giving up. Measured against the
// live endpoint, roughly a quarter of requests take over twenty seconds while
// the rest answer in two or three, and spacing them out does not change that.
// It is the free tier, not anything here.
//
// So a stall is not waited out, it is abandoned and tried again. With about
// seven attempts in ten landing in the fast group, two attempts takes outright
// failures from roughly a third to under a tenth, and the reader waits about
// fifteen seconds in the bad case rather than twenty five and a dead end.
const FIRST_TOKEN_MS = 12_000
const ATTEMPTS = 2

// Shown to the reader, so they say what to do rather than naming a timeout or
// quoting an API. A quota rejection used to reach the page as a raw JSON blob
// telling a visitor to go and check somebody else's billing details.
export const TOO_SLOW = "That took too long to come back. Try asking again."
export const TOO_BUSY = "A lot of questions just now. Try again in a minute."
export const BROKEN = "The assistant is not working right now. Try again later."

// A model can return a perfectly valid stream carrying no text. On a vault
// about religion the likeliest reason is a safety filter, which is worth its
// own wording: nothing is broken and asking the same thing again will not help.
export const DECLINED = "The model would not answer that one. Try rephrasing it."
export const NO_ANSWER = "No answer came back. Try asking again."

export const noAnswer = (finishReason) =>
  /SAFETY|BLOCK|PROHIBITED|RECITATION/i.test(finishReason ?? "") ? DECLINED : NO_ANSWER

// Whatever went wrong, the reader gets a sentence. The status and the API's own
// text go to the Worker log instead, where `wrangler tail` will show them.
//
// That is a deliberate trade: a misconfigured model id used to announce itself
// in the chat bubble, which is how the thinking_level mistake was caught. It is
// still just as visible, only in the log rather than on the public site.
function readable(status) {
  if (status === 429) return TOO_BUSY
  if (status >= 500) return TOO_SLOW
  return BROKEN
}

// Reads an SSE body and yields each `data:` payload as a string. Chunks arrive
// split at arbitrary byte boundaries, so lines are buffered until complete.
async function* sseLines(response) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let cut
    while ((cut = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, cut).trim()
      buffer = buffer.slice(cut + 1)
      if (line.startsWith("data:")) yield line.slice(5).trim()
    }
  }
}

// Turns our own message shape into Gemini's. History carries the conversation
// only; the notes live in the system instruction so they are sent once rather
// than repeated inside every turn.
const geminiContents = (history, question) => [
  ...history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  })),
  { role: "user", parts: [{ text: question }] },
]

const gemini = {
  label: "Gemini",
  // Flash Lite. 2.5 was cheaper but Google has closed it to new accounts.
  // Override with MODEL in wrangler.toml.
  defaultModel: "gemini-3.5-flash-lite",

  async *stream({ system, context, question, history }, env, stats = {}) {
    const model = env.MODEL || gemini.defaultModel
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`

    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      stats.attempts = attempt
      const last = attempt === ATTEMPTS

      // Aborts only while waiting for the first token. Once text is flowing the
      // timer is cleared, so a long answer is never cut off part way. It stays
      // armed across the body read, because fetch resolves as soon as headers
      // arrive and a stalled answer stalls after that.
      const abort = new AbortController()
      let waiting = setTimeout(() => abort.abort(), FIRST_TOKEN_MS)
      let started = false

      let response
      try {
        response = await fetch(endpoint, {
        method: "POST",
        signal: abort.signal,
        headers: {
          "content-type": "application/json",
          // Header rather than the documented ?key= query parameter, so the key
          // never appears in a URL that something downstream might log.
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: `${system}\n\n${context}` }] },
          contents: geminiContents(history, question),
          generationConfig: {
            // Low, because the job is reading supplied text accurately rather
            // than writing something new.
            temperature: 0.2,
            // Thinking is spent out of this same budget, so this is not the
            // length of an answer, it is the length of thinking plus answer.
            // At 800 the model was measured spending 767 of it thinking and
            // answering in the 29 that were left, which truncates mid sentence
            // and sometimes returns nothing at all. Answers run 30 to 80
            // tokens, so almost all of this is headroom for thinking.
            //
            // Raising it does not make answers longer, the prompt does that,
            // and does not make it think more, thinking_level does that. It
            // only stops the budget running out before the answer starts.
            maxOutputTokens: 3000,
            // Gemini 3.x thinks by default. Reading supplied notes and citing
            // them is not a reasoning task, and the thinking was the likeliest
            // source of answers that took the better part of a minute.
            //
            // It nests inside thinkingConfig. Put directly in generationConfig
            // under either spelling the API answers "Cannot find field", which
            // reads like the feature is unsupported rather than misplaced.
            // 3.x takes thinkingLevel; 2.5 models take thinkingBudget instead.
            // Left out entirely when THINKING_LEVEL is blank, so a model that
            // does not know the field is a config change, not a code change.
            ...(env.THINKING_LEVEL ? { thinkingConfig: { thinkingLevel: env.THINKING_LEVEL } } : {}),
          },
        }),
      })
      } catch (error) {
        clearTimeout(waiting)
        // A stall is worth one more go: about a quarter of requests to the free
        // tier take over twenty seconds while the rest answer in two or three,
        // so a second attempt usually lands in the fast group.
        if (error.name === "AbortError" && !last) continue
        if (error.name === "AbortError") throw new Error(TOO_SLOW)
        throw error
      }

      if (!response.ok) {
        clearTimeout(waiting)
        console.log(`gemini ${response.status}: ${(await response.text()).slice(0, 400)}`)
        throw new Error(readable(response.status))
      }

      try {
        yield* gemini.read(response, stats, () => {
          clearTimeout(waiting)
          waiting = null
          started = true
        })
        return
      } catch (error) {
        clearTimeout(waiting)
        // Only retry a stall before any text existed. Once a word has been
        // sent the reader is watching it arrive, and starting over would
        // rewrite what they have already read.
        if (error.name === "AbortError" && !started && !last) continue
        if (error.name === "AbortError" && !started) throw new Error(TOO_SLOW)
        throw error
      }
    }
  },

  // Split out so the retry loop above stays readable.
  async *read(response, stats, onFirstToken) {
    for await (const payload of sseLines(response)) {
      onFirstToken()
      if (payload === "[DONE]") break
      let parsed
      try {
        parsed = JSON.parse(payload)
      } catch {
        continue // a keepalive or a partial frame, nothing to show
      }
      // Arrives on the last chunk. Kept whole rather than picking out a field,
      // because the one that reports cache reuse has been renamed before and
      // an undefined here would look exactly like a cache that never hit.
      if (parsed.usageMetadata) stats.usage = parsed.usageMetadata

      // Why the model stopped. Only interesting when no text arrived at all,
      // where it is the difference between a safety block and a broken call.
      const reason = parsed.candidates?.[0]?.finishReason
      if (reason) stats.finishReason = reason

      const parts = parsed.candidates?.[0]?.content?.parts ?? []
      for (const part of parts) if (part.text) yield part.text
    }
  },
}

const workersAi = {
  label: "Workers AI",
  defaultModel: "@cf/meta/llama-3.1-8b-instruct",

  async *stream({ system, context, question, history }, env, stats = {}) {
    if (!env.AI) throw new Error("Workers AI binding is not configured")

    const messages = [
      { role: "system", content: `${system}\n\n${context}` },
      ...history.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
      { role: "user", content: question },
    ]

    const response = await env.AI.run(env.MODEL || workersAi.defaultModel, {
      messages,
      stream: true,
      max_tokens: 800,
    })

    for await (const payload of sseLines({ body: response })) {
      if (payload === "[DONE]") break
      try {
        const parsed = JSON.parse(payload)
        if (parsed.response) yield parsed.response
      } catch {
        continue
      }
    }
  },
}

export const providers = { gemini, workersai: workersAi }

export function pickProvider(env) {
  const name = (env.PROVIDER || "gemini").toLowerCase()
  const provider = providers[name]
  if (!provider) throw new Error(`Unknown PROVIDER "${name}". Use one of: ${Object.keys(providers).join(", ")}`)
  return provider
}
