// The model, behind one function.
//
// Each provider is an async generator that takes the assembled prompt and
// yields plain text as it arrives. Nothing above this file knows which model
// answered, so swapping one for another is a config change. That matters here
// because no benchmark can tell you which model reads this particular vault
// well: the only way to find out is to run the same questions through both.

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

  async *stream({ system, context, question, history }, env) {
    const model = env.MODEL || gemini.defaultModel
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`

    const response = await fetch(endpoint, {
      method: "POST",
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
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 200)}`)
    }

    for await (const payload of sseLines(response)) {
      if (payload === "[DONE]") break
      let parsed
      try {
        parsed = JSON.parse(payload)
      } catch {
        continue // a keepalive or a partial frame, nothing to show
      }
      const parts = parsed.candidates?.[0]?.content?.parts ?? []
      for (const part of parts) if (part.text) yield part.text
    }
  },
}

const workersAi = {
  label: "Workers AI",
  defaultModel: "@cf/meta/llama-3.1-8b-instruct",

  async *stream({ system, context, question, history }, env) {
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
