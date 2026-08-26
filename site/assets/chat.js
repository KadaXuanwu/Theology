// The chat bubble.
//
// Sends a question to the Worker and streams the answer back. It deliberately
// sends nothing but the question, the page you are on and the conversation so
// far: the notes are read by the Worker from the published site, so a visitor
// cannot decide what the model gets fed.
//
// `render` takes its root as an argument, and the history helpers read storage
// only when called, so all three can be tested in node away from any DOM.

const ENDPOINT = "__CHAT_ENDPOINT__"

export const escapeHtml = (value) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  )

// A deliberately tiny markdown subset: links, bold, italic, paragraphs. The
// text is escaped first and only these shapes are put back, so nothing the
// model writes can become markup of its own choosing.
export function render(text, root = "") {
  const safe = escapeHtml(text)
    // Only note-shaped paths become links: lowercase, digits, dashes, slashes.
    // A colon cannot match, so a javascript: or data: url stays plain text
    // rather than becoming something clickable.
    .replace(/\[([^\]]+)\]\(([a-z0-9][a-z0-9\-/]*)\)/gi, (_, label, href) => {
      const clean = href.replace(/\/+$/, "")
      return `<a href="${root}${clean}/">${label}</a>`
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")

  return safe
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("")
}

// The conversation outlives the page. Every answer links other notes, so the
// first thing a reader does with a good answer is click out of the page they
// asked it on, and losing the thread at exactly that moment makes the chat feel
// broken. sessionStorage rather than localStorage: it should survive following
// a link, not still be sitting there next week.
const STORE = "chat-history"

export function loadHistory() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) ?? "[]")
    return Array.isArray(saved) ? saved.filter((m) => m && typeof m.text === "string") : []
  } catch {
    return [] // private browsing, or something else wrote to the key
  }
}

export const saveHistory = (history) => {
  try {
    sessionStorage.setItem(STORE, JSON.stringify(history))
  } catch {
    // Storage full or blocked. The chat still works, it just forgets.
  }
}

function init() {
  const bubble = document.querySelector(".chat-open")
  const panel = document.querySelector(".chat-panel")
  const log = document.querySelector(".chat-log")
  const form = document.querySelector(".chat-form")
  const input = document.querySelector(".chat-input")
  if (!bubble || !panel || !log || !form || !input) return

  const root = document.documentElement.dataset.root ?? ""
  const pageUrl = document.body.dataset.noteUrl ?? null
  const history = loadHistory()
  let waiting = false

  const open = () => {
    panel.hidden = false
    bubble.setAttribute("aria-expanded", "true")
    document.body.classList.add("chat-is-open")
    if (log.childElementCount === 0) {
      if (history.length) {
        for (const message of history) say(message.role, message.text)
      } else {
        say(
          "assistant",
          "Ask about anything in the vault. If you only half remember a note, describe it and I will try to find it.",
        )
      }
    }
    grow()
    input.focus()
  }

  const close = () => {
    panel.hidden = true
    bubble.setAttribute("aria-expanded", "false")
    document.body.classList.remove("chat-is-open")
  }

  bubble.addEventListener("click", () => (panel.hidden ? open() : close()))
  document.querySelector(".chat-close")?.addEventListener("click", close)
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) close()
  })

  // The box is one line until the text needs more, then grows to a ceiling set
  // in the stylesheet and scrolls beyond it. Height has to be reset first or it
  // can only ever grow, never shrink back when text is deleted.
  function grow() {
    input.style.height = "auto"
    input.style.height = `${input.scrollHeight}px`
  }

  input.addEventListener("input", grow)

  // Enter sends, because this is a chat box. Shift+Enter is the newline, which
  // is the convention every other chat box has taught people to expect.
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      form.requestSubmit()
    }
  })

  form.addEventListener("submit", (event) => {
    event.preventDefault()
    const question = input.value.trim()
    if (!question || waiting) return
    input.value = ""
    grow()
    ask(question)
  })

  // Twice, deliberately. Reading scrollHeight forces layout, so the immediate
  // assignment is correct for what exists now and works even in a tab the
  // browser is not painting, where requestAnimationFrame never runs. The
  // deferred one then catches height that appears after layout, which is what
  // the streaming caret and the slow notice add.
  const scrollToEnd = () => {
    log.scrollTop = log.scrollHeight
    requestAnimationFrame(() => {
      log.scrollTop = log.scrollHeight
    })
  }

  // Whether arriving text should keep the log pinned to the end. Held as state
  // rather than measured per chunk: the scroll above is deferred to the next
  // frame, so measuring during streaming reads the position from before it and
  // concludes the reader has scrolled away when they have not.
  //
  // Only a real scroll changes it, which is also the behaviour worth having:
  // scroll up to re-read something and the answer stops chasing you, scroll
  // back to the bottom and it resumes.
  let following = true
  const atBottom = () => log.scrollHeight - log.scrollTop - log.clientHeight < 40
  log.addEventListener("scroll", () => {
    following = atBottom()
  })

  function say(role, text) {
    const message = document.createElement("div")
    message.className = `chat-message chat-${role}`
    message.innerHTML = render(text, root)
    log.append(message)
    // Unconditional: a message you just sent should always be in view.
    scrollToEnd()
    return message
  }

  async function ask(question) {
    waiting = true
    form.classList.add("is-waiting")
    // Asking something is a decision to watch the reply, whatever the reader
    // had scrolled to before.
    following = true
    say("user", question)

    const answer = say("assistant", "")
    answer.classList.add("is-streaming")

    // A failed turn must not join the conversation. It used to be pushed into
    // history like any other answer, which meant "Something went wrong" was
    // saved, shown again on the next page load as though the assistant had
    // said it, and sent back to the model as context for the next question.
    let failed = false
    let text = ""

    // Nothing arrives for a while on a slow answer, and a blinking caret alone
    // reads as frozen rather than working.
    const slow = setTimeout(() => {
      if (!text) answer.dataset.slow = "true"
    }, 4000)

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, pageUrl, history }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? `The assistant is unavailable (${response.status}).`)
      }

      if (!response.body) throw new Error("The assistant sent nothing back. Try again.")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        answer.innerHTML = render(text, root)
        if (following) scrollToEnd()
      }
    } catch (error) {
      failed = !text
      // A dropped connection surfaces as "Failed to fetch", which tells a
      // reader nothing. Anything the Worker sent deliberately is already
      // written for them.
      const dropped = error instanceof TypeError
      text = text || (dropped ? "Could not reach the assistant. Check your connection and try again." : error.message)
      answer.innerHTML = render(text, root)
      answer.classList.add("chat-failed")
    }

    clearTimeout(slow)
    delete answer.dataset.slow
    answer.classList.remove("is-streaming")

    if (!failed) {
      history.push({ role: "user", text: question }, { role: "assistant", text })
      // Only the last few turns are worth keeping; the Worker trims anyway.
      if (history.length > 8) history.splice(0, history.length - 8)
      saveHistory(history)
    }

    waiting = false
    form.classList.remove("is-waiting")
    input.focus()
  }
}

if (typeof document !== "undefined") init()
