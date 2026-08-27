// The tag filter, on both views of the tags.
//
// Every tag is on the page already, and each chip carries the notes it covers,
// so a combination is worked out here rather than fetched, and the reader never
// leaves the page while they build one up.
//
// The chips ship as ordinary links to the single tag pages, which is what they
// still are with no script running. This turns them into toggles.

import { setTagFocus } from "./graphs.js"
import { escapeHtml } from "./text.js"

const CLOSE_ICON =
  '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>'

export function initTags() {
  const picker = document.querySelector(".tag-cloud")
  if (!picker) return

  const chips = [...picker.querySelectorAll(".tag-chip")]
  // The list view has the notes on the page; the map view does not. Everything
  // below has to work either way.
  const results = document.querySelector(".tag-results")
  const rows = results ? [...results.querySelectorAll(".card-list > li")] : []
  const groups = results ? [...results.querySelectorAll(".list-section")] : []
  const none = results?.querySelector(".tag-none")
  const count = document.querySelector(".tag-count")
  const chosen = document.querySelector(".tag-selected")
  const modeButtons = [...document.querySelectorAll(".tag-mode-option")]
  const clear = document.querySelector(".tag-clear")
  const total = Number(picker.dataset.total) || rows.length

  // Every tag, and the notes under it. This is the whole index the filter works
  // from, which is why the map view needs no list of notes to count.
  const covers = new Map(
    chips.map((chip) => [chip.dataset.tag, new Set(chip.dataset.notes.split("|").filter(Boolean))]),
  )
  const titleOf = new Map(rows.map((row) => [row, row.querySelector("a")?.dataset.note ?? ""]))

  // A tag in the URL that no longer exists is dropped rather than left to
  // filter everything away, which is what a renamed tag in an old link does.
  const params = new URLSearchParams(location.search)
  let selected = [
    ...new Set(
      (params.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter((t) => covers.has(t)),
    ),
  ]
  let mode = params.get("match") === "any" ? "any" : "all"

  // Null means no tags picked, which is every note rather than none of them.
  const matching = () => {
    if (selected.length === 0) return null
    const sets = selected.map((tag) => covers.get(tag))
    return mode === "all"
      ? new Set([...sets[0]].filter((title) => sets.every((set) => set.has(title))))
      : new Set(sets.flatMap((set) => [...set]))
  }

  // Every way out of here that leads back into the tags keeps whatever
  // combination the reader has built: the switch in the header, the arrows that
  // enlarge and shrink the graph, and the entry in the tree.
  const carriers = [...document.querySelectorAll(".view-switch a.view-tab, .panel-expand, .tree-tags a")]
  const carrierPath = new Map(carriers.map((link) => [link, link.getAttribute("href").split("?")[0]]))

  // The selection is worth linking to, so it lives in the URL. Replaced rather
  // than pushed: Back belongs to the page the reader came from, not to every
  // chip they tried on the way.
  //
  // Written out by hand. URLSearchParams escapes the comma between the tags
  // into %2C, which turns a link worth sharing into a mess.
  function writeUrl() {
    const parts = []
    if (selected.length) parts.push(`tags=${selected.map(encodeURIComponent).join(",")}`)
    if (selected.length > 1 && mode === "any") parts.push("match=any")
    const search = parts.length ? `?${parts.join("&")}` : ""
    history.replaceState(null, "", `${location.pathname}${search}`)
    for (const link of carriers) link.setAttribute("href", `${carrierPath.get(link)}${search}`)
  }

  function paint() {
    const matched = matching()

    for (const chip of chips) {
      chip.setAttribute("aria-pressed", String(selected.includes(chip.dataset.tag)))
    }

    for (const row of rows) {
      const on = !matched || matched.has(titleOf.get(row))
      row.hidden = !on
      for (const mark of row.querySelectorAll(".result-tag")) {
        mark.classList.toggle("is-on", selected.includes(mark.dataset.tag))
      }
    }

    // A section with nothing left in it is not an empty heading, it is gone.
    for (const group of groups) {
      const live = [...group.querySelectorAll(".card-list > li")].filter((row) => !row.hidden)
      group.hidden = live.length === 0
      const label = group.querySelector(".tree-count")
      if (label) label.textContent = String(live.length)
    }

    const shown = matched ? matched.size : total
    count.textContent = selected.length
      ? `${shown} of ${total} notes`
      : `${total} ${total === 1 ? "note" : "notes"}`

    // Its own row under the controls, one line high whether it holds nothing or
    // a dozen, so picking a tag never shifts what is below it.
    chosen.innerHTML = selected.length
      ? selected
          .map(
            (tag) =>
              `<li><button type="button" data-tag="${escapeHtml(tag)}" aria-label="Remove ${escapeHtml(tag)}">#${escapeHtml(tag)}${CLOSE_ICON}</button></li>`,
          )
          .join("")
      : '<li class="tag-hint">No tags selected</li>'

    for (const button of modeButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.mode === mode))
    }

    if (none) {
      none.hidden = shown > 0
      none.textContent =
        mode === "all" && selected.length > 1
          ? "No note carries all of those tags. Try Any."
          : "Nothing under that tag."
    }

    // The map answers the same picking the list does: what came through, and
    // what it links to. One hop out in the rail, two on the page that is only
    // the map, which is how a single note's two graphs already read.
    setTagFocus(matched ? [...matched] : null)
    writeUrl()
  }

  const toggle = (tag) => {
    selected = selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]
    paint()
  }

  for (const chip of chips) {
    // A link the script has turned into a switch says so, rather than
    // announcing a destination it no longer goes to.
    chip.setAttribute("role", "button")
    chip.addEventListener("click", (event) => {
      event.preventDefault()
      toggle(chip.dataset.tag)
    })
    // Enter comes free with the link; a button is also expected to take Space.
    chip.addEventListener("keydown", (event) => {
      if (event.key !== " ") return
      event.preventDefault()
      toggle(chip.dataset.tag)
    })
  }

  chosen.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-tag]")
    if (button) toggle(button.dataset.tag)
  })

  // The strip is one row with no scrollbar, so a plain wheel moves it sideways.
  // Without this a mouse cannot reach a chip that has run off the end of it.
  chosen.addEventListener(
    "wheel",
    (event) => {
      if (event.deltaY === 0 || chosen.scrollWidth <= chosen.clientWidth) return
      event.preventDefault()
      chosen.scrollLeft += event.deltaY
    },
    { passive: false },
  )

  for (const button of modeButtons) {
    button.addEventListener("click", () => {
      mode = button.dataset.mode
      paint()
    })
  }

  clear.addEventListener("click", () => {
    selected = []
    paint()
  })

  paint()
}
