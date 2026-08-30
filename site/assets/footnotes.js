// The citation card that opens off a reference marker.
//
// The markup already works without any of this: the marker is an anchor down
// to the list at the foot of the note. What this adds is reading the citation
// without losing your place, and taking a copy of it.
//
// The card reads from that list rather than carrying its own copy, so there is
// only ever one version of a citation on the page.

// Long enough that running your eye along a line with several markers in it
// does not flash a card at each one on the way past. Matches the note preview.
const OPEN_DELAY = 400
// Short enough to feel immediate, long enough to cross the gap from the marker
// into the card without it closing on the way.
const CLOSE_DELAY = 160

export function initFootnotes() {
  const card = document.querySelector(".footnote-card")
  if (!card) return

  const text = card.querySelector(".fn-card-text")
  const copy = card.querySelector(".fn-copy")
  let openTimer = null
  let closeTimer = null
  let anchor = null

  const hide = () => {
    clearTimeout(openTimer)
    clearTimeout(closeTimer)
    card.hidden = true
    anchor = null
    delete copy.dataset.copied
    copy.textContent = "Copy"
  }

  function show(ref) {
    const item = document.getElementById(`fn-${ref.dataset.fn}`)
    const source = item?.querySelector(".fn-text")
    if (!source) return

    anchor = ref
    text.innerHTML = source.innerHTML
    delete copy.dataset.copied
    copy.textContent = "Copy"
    card.hidden = false

    // Same placement as the note preview: under the marker, pulled back inside
    // the viewport on the right, flipped above when there is no room below.
    const rect = ref.getBoundingClientRect()
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
      if (event.target.closest(".footnote-card")) {
        clearTimeout(closeTimer)
        return
      }
      const ref = event.target.closest(".fn-ref")
      if (!ref) return
      clearTimeout(closeTimer)
      clearTimeout(openTimer)
      openTimer = setTimeout(() => show(ref), OPEN_DELAY)
    },
    { passive: true },
  )

  document.addEventListener(
    "mouseout",
    (event) => {
      if (!event.target.closest(".fn-ref") && !event.target.closest(".footnote-card")) return
      clearTimeout(openTimer)
      // Not closed outright: the pointer is usually on its way into the card.
      clearTimeout(closeTimer)
      closeTimer = setTimeout(hide, CLOSE_DELAY)
    },
    { passive: true },
  )

  // A tap has no hover to offer, so the click opens the card instead of jumping
  // to the foot of the note. Clicking the same marker again lets the jump
  // happen, so the list is still reachable.
  document.addEventListener("click", (event) => {
    const ref = event.target.closest(".fn-ref")
    if (ref) {
      if (anchor === ref && !card.hidden) return
      event.preventDefault()
      clearTimeout(openTimer)
      clearTimeout(closeTimer)
      show(ref)
      return
    }
    if (!event.target.closest(".footnote-card")) hide()
  })

  copy.addEventListener("click", async () => {
    const value = text.textContent.trim()
    try {
      await navigator.clipboard.writeText(value)
      copy.dataset.copied = "true"
      copy.textContent = "Copied"
    } catch {
      // Clipboard access can be refused outright, in which case saying nothing
      // would look like it worked. Select it instead so the reader can copy.
      const range = document.createRange()
      range.selectNodeContents(text)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      copy.textContent = "Press Ctrl C"
    }
  })

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hide()
  })
  window.addEventListener("scroll", hide, { passive: true })
  document.querySelector("main")?.addEventListener("scroll", hide, { passive: true })
}
