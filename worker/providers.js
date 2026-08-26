// The model, behind one function.
//
// Each provider is an async generator that takes the assembled prompt and
// yields plain text as it arrives. Nothing above this file knows which model
// answered, so swapping one for another is a config change. That matters here
// because no benchmark can tell you which model reads this particular vault
// well: the only way to find out is to run the same questions through both.

// How long to wait for the first token before giving up. Measured against the
// live endpoint, the same question answers in 0.7s most of the time and has
// taken 56s, all with a valid answer at the end. A reader will not wait that
// long, and a bubble that sits blinking for a minute reads as broken, so a
// slow answer is turned into a short honest one instead.
const FIRST_TOKEN_MS = 25_000

// Shown to the reader, so it says what to do rather than naming a timeout.
export const TOO_SLOW = "That took too long to come back. Try asking again."

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

    // Aborts only while waiting for the first token. Once text is flowing the
    // timer is cleared, so a long answer is never cut off part way.
    const abort = new AbortController()
    let waiting = setTimeout(() => abort.abort(), FIRST_TOKEN_MS)

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
            maxOutputTokens: 800,
            // Gemini 3.x thinks by default. Reading supplied notes and citing
            // them is not a reasoning task, and the thinking was the likeliest
            // source of answers that took the better part of a minute.
            thinkingLevel: "low",
          },
        }),
      })
    } catch (error) {
      clearTimeout(waiting)
      if (error.name === "AbortError") throw new Error(TOO_SLOW)
      throw error
    }

    if (!response.ok) {
      clearTimeout(waiting)
      throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 200)}`)
    }

    for await (const payload of sseLines(response)) {
      clearTimeout(waiting)
      waiting = null
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
