// Mounting the graphs a page carries, and the legend that filters them.
//
// Two things steer them: the legend, which switches whole categories in and
// out and is remembered across pages, and the tags filter, which changes which
// notes are on the map at all. A different set of notes is a different graph,
// so a change from either rebuilds rather than repaints.

import { loadGraph } from "./data.js"
import { mount as mountGraph } from "./graph.js"
import { noteUrl } from "./nav.js"
import { readSet, writeSet } from "./store.js"

const HIDDEN_KEY = "hiddenGraphKinds"

const graphs = []
// null is the whole map. A list, even an empty one, is a selection: an empty
// one means the reader picked a combination no note carries.
let tagFocus = null
// A no-op until the data lands. The tags filter paints before that, so its
// first call has nothing to rebuild and the mount reads tagFocus when it runs.
let rebuild = () => {}

export function setTagFocus(notes) {
  tagFocus = notes
  rebuild()
}

// What a mount is focused on. Most say so in their own markup; the ones the
// tags filter drives are told by the page instead.
function focusOf(el, data) {
  if (el.dataset.graph === "tags") return tagFocus
  // A section's graph names a category rather than a note, and starts from
  // every note in it.
  if (el.dataset.kind) return data.nodes.filter((n) => n.kind === el.dataset.kind).map((n) => n.id)
  // A tag's rail names its notes outright, the way a note's names one.
  if (el.dataset.focusList) return el.dataset.focusList.split("|").filter(Boolean)
  return el.dataset.graph === "local" ? el.dataset.focus : null
}

export function initGraphs() {
  const mounts = [...document.querySelectorAll(".graph-mount")]
  const toggles = [...document.querySelectorAll(".legend-toggle")]
  // Most pages show a graph without a legend, so the full list of categories
  // comes from the data rather than from the buttons.
  const allKinds = new Set(toggles.map((t) => t.dataset.kind))

  const visibleKinds = () => {
    if (allKinds.size === 0) return null
    const hidden = readSet(HIDDEN_KEY)
    return new Set([...allKinds].filter((k) => !hidden.has(k)))
  }

  const paintToggles = () => {
    const hidden = readSet(HIDDEN_KEY)
    for (const toggle of toggles) {
      toggle.setAttribute("aria-pressed", String(!hidden.has(toggle.dataset.kind)))
    }
  }

  paintToggles()

  for (const toggle of toggles) {
    toggle.addEventListener("click", () => {
      const hidden = readSet(HIDDEN_KEY)
      const kind = toggle.dataset.kind
      if (hidden.has(kind)) hidden.delete(kind)
      else hidden.add(kind)
      writeSet(HIDDEN_KEY, hidden)
      paintToggles()
      const kinds = visibleKinds()
      for (const graph of graphs) graph.setVisibleKinds(kinds)
    })
  }

  if (mounts.length === 0) return

  loadGraph().then((data) => {
    for (const node of data.nodes) allKinds.add(node.kind)

    // Every mount is built from scratch. Only the tags pages ever ask for that
    // twice, and there it is the honest answer: a different combination is a
    // different set of notes, so it is a different graph rather than the same
    // one drawn differently.
    const build = () => {
      for (const graph of graphs) graph.destroy()
      graphs.length = 0

      for (const el of mounts) {
        const driven = el.dataset.graph === "tags"
        const local = el.dataset.graph === "local"
        const focus = focusOf(el, data)
        graphs.push(
          mountGraph(el, data, {
            focus,
            // The rail shows immediate neighbours; the full page view goes a
            // hop further, because one hop leaves most notes looking almost
            // isolated.
            depth: Number(el.dataset.depth) || 1,
            // A mount can ask for hover labels even when it is a local view: a
            // section in the rail has too many notes to name at that size.
            showLabels: el.dataset.labels ?? (local || (driven && focus) ? "always" : "hover"),
            kinds: visibleKinds(),
            emptyLabel: driven ? "No note carries that combination." : undefined,
            onNavigate: (node) => {
              window.location.href = noteUrl(node.url)
            },
          }),
        )
      }
    }

    rebuild = build
    // A filter that painted before the data arrived still gets its notes on
    // the map.
    build()
  })
}
