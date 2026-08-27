// Turning the model's chunks into the response body.
//
// Two jobs: hold back a link that is only half written, and resolve the titles
// the model wrote into urls it was never given.

import { resolveLinks } from "./context.js"

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

// The body of the response, built from an iterator whose first chunk has
// already been taken. That first chunk is pulled before any headers are sent,
// so a failure that early can still be a status code; everything after this
// point has to be written into the answer instead.
export function answerStream({ first, chunks, notes, onFinish }) {
  return new ReadableStream({
    async start(controller) {
      const encode = new TextEncoder()
      const send = (text) => controller.enqueue(encode.encode(resolveLinks(text, notes)))
      let held = ""
      const take = (chunk) => {
        const [ready, rest] = splitAtOpenLink(held + chunk)
        held = rest
        if (ready) send(ready)
      }

      try {
        take(first)
        for (let step = await chunks.next(); !step.done; step = await chunks.next()) take(step.value)
        if (held) send(held)
      } catch (error) {
        if (held) send(held)
        // Only reachable once text is already flowing, so there is no status
        // code left to use.
        controller.enqueue(encode.encode(`\n\n_Something went wrong: ${error.message}_`))
      }
      controller.close()
      onFinish?.()
    },
  })
}
