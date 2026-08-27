// The card that opens under a link to another note, on any page, from the same
// index the search reads.

import { loadNotes } from "./data.js"
import { escapeHtml } from "./text.js"

// How long the cursor has to sit on a link before the card opens. Long enough
// that reading a paragraph with several links in it does not flash a card at
// every one the cursor happens to cross on its way somewhere else.
const PREVIEW_DELAY = 500

export function initPreviews() {
  const card = document.querySelector(".preview-card")
  if (!card) return
  let hoverTimer = null

  async function showPreview(link) {
    const notes = await loadNotes()
    const note = notes.find((n) => n.title === link.dataset.note)
    if (!note) return

    card.innerHTML = `<span class="preview-title"><span class="dot dot-${note.kind}"></span>${escapeHtml(note.title)}</span><span class="preview-text">${escapeHtml(note.excerpt)}</span>`
    card.hidden = false

    const rect = link.getBoundingClientRect()
    const size = card.getBoundingClientRect()
    const margin = 10
    let left = rect.left + window.scrollX
    let top = rect.bottom + window.scrollY + 8

    if (left + size.width > window.scrollX + document.documentElement.clientWidth - margin) {
      left = window.scrollX + document.documentElement.clientWidth - size.width - margin
    }
    if (rect.bottom + size.height + 20 > document.documentElement.clientHeight) {
      top = rect.top + window.scrollY - size.height - 8
    }

    card.style.left = `${Math.max(margin, left)}px`
    card.style.top = `${Math.max(margin, top)}px`
  }

  document.addEventListener(
    "mouseover",
    (event) => {
      const link = event.target.closest("a[data-note]")
      if (!link) return
      clearTimeout(hoverTimer)
      hoverTimer = setTimeout(() => showPreview(link), PREVIEW_DELAY)
    },
    { passive: true },
  )

  document.addEventListener(
    "mouseout",
    (event) => {
      if (!event.target.closest("a[data-note]")) return
      clearTimeout(hoverTimer)
      card.hidden = true
    },
    { passive: true },
  )

  const hide = () => {
    card.hidden = true
  }
  window.addEventListener("scroll", hide, { passive: true })
  document.querySelector("main")?.addEventListener("scroll", hide, { passive: true })
}
