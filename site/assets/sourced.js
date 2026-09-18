// The Sourced switch in the header: only notes that passed source verification.
//
// The choice is remembered and applied to the root element by the inline script
// in the head, before first paint, and the stylesheet hides the rest from every
// list on the page. This keeps the button in step, corrects the counts beside
// the lists, and tells the search, the tags filter and the graphs, which each
// filter their own data.

import { writeText } from "./store.js"

const KEY = "sourcedOnly"
const html = document.documentElement

export const sourcedOnly = () => "sourcedOnly" in html.dataset

// The tree names every note with its status, so it is the index of which notes
// are sourced on a page that has no other list of them.
const unsourced = new Set(
  [...document.querySelectorAll('.tree a[data-status]:not([data-status="sourced"])')].map((a) => a.dataset.note),
)
export const passes = (title) => !sourcedOnly() || !unsourced.has(title)
export const sourcedTotal = () => document.querySelectorAll('.tree a[data-status="sourced"]').length

const listeners = []
export const onSourcedChange = (fn) => listeners.push(fn)

// A count beside a list says how many are in it, so it follows the switch. A
// row the tags filter hid stays hidden, whichever way the switch is set.
function recount() {
  for (const box of document.querySelectorAll(".tree-folder, .list-section")) {
    const rows = [...box.querySelectorAll("li")].filter((li) => li.querySelector("a[data-note]"))
    const live = rows.filter((li) => !li.hidden && passes(li.querySelector("a").dataset.note)).length
    const label = box.querySelector(".tree-count")
    if (label) label.textContent = String(live)
    if (box.classList.contains("list-section")) box.hidden = live === 0
  }
}

export function initSourced() {
  const button = document.querySelector(".sourced-toggle")
  button?.setAttribute("aria-pressed", String(sourcedOnly()))
  recount()

  button?.addEventListener("click", () => {
    if (sourcedOnly()) delete html.dataset.sourcedOnly
    else html.dataset.sourcedOnly = ""
    writeText(KEY, sourcedOnly() ? "1" : "0")
    button.setAttribute("aria-pressed", String(sourcedOnly()))
    recount()
    for (const fn of listeners) fn()
  })
}
