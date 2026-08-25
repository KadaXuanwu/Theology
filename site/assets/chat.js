// The chat bubble.
//
// Sends a question to the Worker and streams the answer back. It deliberately
// sends nothing but the question, the page you are on and the conversation so
// far: the notes are read by the Worker from the published site, so a visitor
// cannot decide what the model gets fed.
//
// `render` is exported and takes its root as an argument so the link
// sanitiser can be tested in node, away from any DOM.

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

function init() {
  const bubble = document.querySelector(".chat-open")
  const panel = document.querySelector(".chat-panel")
  const log = document.querySelector(".chat-log")
  const form = document.querySelector(".chat-form")
  const input = document.querySelector(".chat-input")
  if (!bubble || !panel || !log || !form || !input) return

  const root = document.documentElement.dataset.root ?? ""
  const pageUrl = document.body.dataset.noteUrl ?? null
  const history = []
  let waiting = false

  const open = () => {
    panel.hidden = false
    bubble.setAttribute("aria-expanded", "true")
    document.body.classList.add("chat-is-open")
    if (log.childElementCount === 0) {
      say(
        "assistant",
        "Ask about anything in the vault. If you only half remember a note, describe it and I will try to find it.",
      )
    }
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

  form.addEventListener("submit", (event) => {
    event.preventDefault()
    const question = input.value.trim()
    if (!question || waiting) return
    input.value = ""
    ask(question)
  })

  function say(role, text) {
    const message = document.createElement("div")
    message.className = `chat-message chat-${role}`
    message.innerHTML = render(text, root)
    log.append(message)
    log.scrollTop = log.scrollHeight
    return message
  }

  async function ask(question) {
    waiting = true
    form.classList.add("is-waiting")
    say("user", question)

    const answer = say("assistant", "")
    answer.classList.add("is-streaming")

    let text = ""
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

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        answer.innerHTML = render(text, root)
        log.scrollTop = log.scrollHeight
      }
    } catch (error) {
      text = text || `Something went wrong: ${error.message}`
      answer.innerHTML = render(text, root)
    }

    answer.classList.remove("is-streaming")
    history.push({ role: "user", text: question }, { role: "assistant", text })
    // Only the last few turns are worth keeping; the Worker trims anyway.
    if (history.length > 8) history.splice(0, history.length - 8)

    waiting = false
    form.classList.remove("is-waiting")
    input.focus()
  }
}

if (typeof document !== "undefined") init()
