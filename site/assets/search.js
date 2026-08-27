// The search overlay. The whole index is a single fetched file, small enough
// at this size that ranking runs on every keystroke without a worker.

import { loadNotes } from "./data.js"
import { noteUrl } from "./nav.js"
import { escapeHtml, escapeRegex } from "./text.js"

// A title match says what a note is about; a body match may be one passing
// mention. A term matching nothing at all rules the note out entirely, so
// several words narrow rather than widen.
function rank(notes, query) {
  const terms = query.split(/\s+/).filter(Boolean)
  const scored = []

  for (const note of notes) {
    const title = note.title.toLowerCase()
    const tags = note.tags.join(" ").toLowerCase()
    let score = 0

    for (const term of terms) {
      if (title === term) score += 120
      else if (title.startsWith(term)) score += 70
      else if (title.includes(term)) score += 45
      if (tags.includes(term)) score += 25
      const at = note.text.indexOf(term)
      if (at >= 0) score += 12
      if (!title.includes(term) && !tags.includes(term) && at < 0) {
        score = -1
        break
      }
    }

    if (score > 0) scored.push({ note, score })
  }

  return scored
    .sort((a, b) => b.score - a.score || a.note.title.localeCompare(b.note.title, "en"))
    .slice(0, 25)
    .map((s) => s.note)
}

// The line under a result: the text around the first hit, with the term marked.
function snippet(note, query) {
  const term = query.split(/\s+/)[0]
  const at = note.text.indexOf(term)
  if (at < 0) return escapeHtml(note.excerpt)
  const from = Math.max(0, at - 60)
  const raw = note.text.slice(from, from + 170)
  const safe = escapeHtml(`${from > 0 ? "…" : ""}${raw}…`)
  return safe.replace(new RegExp(escapeRegex(term), "gi"), (m) => `<mark>${m}</mark>`)
}

export function initSearch() {
  const overlay = document.querySelector(".search-overlay")
  const input = document.querySelector(".search-input")
  const results = document.querySelector(".search-results")
  let activeIndex = 0
  let matches = []

  function open() {
    if (!overlay) return
    overlay.hidden = false
    document.body.style.overflow = "hidden"
    loadNotes()
    input.focus()
    input.select()
  }

  function close() {
    if (!overlay) return
    overlay.hidden = true
    document.body.style.overflow = ""
  }

  function moveSelection(step) {
    if (matches.length === 0) return
    activeIndex = (activeIndex + step + matches.length) % matches.length
    for (const [i, li] of [...results.children].entries()) {
      li.classList.toggle("is-active", i === activeIndex)
    }
    results.children[activeIndex]?.scrollIntoView({ block: "nearest" })
  }

  function render(list, query) {
    if (!query) {
      results.innerHTML = ""
      return
    }
    if (list.length === 0) {
      results.innerHTML = '<li class="search-none"><a>No notes match that.</a></li>'
      return
    }

    results.innerHTML = list
      .map(
        (note, i) => `<li${i === 0 ? ' class="is-active"' : ""}><a href="${noteUrl(note.url)}">
      <span class="result-title"><span class="dot dot-${note.kind}"></span>${escapeHtml(note.title)}<span class="result-where">${escapeHtml(note.section)}</span></span>
      <span class="result-snippet">${snippet(note, query)}</span>
    </a></li>`,
      )
      .join("")
  }

  document.querySelector(".search-open")?.addEventListener("click", open)
  document.querySelector(".search-close")?.addEventListener("click", close)
  overlay?.addEventListener("click", (event) => {
    if (event.target === overlay) close()
  })

  document.addEventListener("keydown", (event) => {
    const typingElsewhere = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)

    if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typingElsewhere)) {
      event.preventDefault()
      open()
      return
    }
    if (overlay?.hidden !== false) return

    if (event.key === "Escape") {
      close()
    } else if (event.key === "ArrowDown") {
      event.preventDefault()
      moveSelection(1)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      moveSelection(-1)
    } else if (event.key === "Enter") {
      const link = results.children[activeIndex]?.querySelector("a")
      if (link) {
        event.preventDefault()
        window.location.href = link.href
      }
    }
  })

  input?.addEventListener("input", async () => {
    const query = input.value.trim().toLowerCase()
    const notes = await loadNotes()
    matches = query ? rank(notes, query) : []
    activeIndex = 0
    render(matches, query)
  })
}
