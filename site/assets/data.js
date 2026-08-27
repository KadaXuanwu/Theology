// The two data files the pages share, fetched once each and only when
// something actually needs them: opening the search, hovering a link, or
// mounting a graph. A reader who does none of those downloads neither.
//
// A failed fetch answers with an empty set rather than rejecting, because
// every caller's honest fallback is the same: show nothing, break nothing.

import { url } from "./nav.js"

let notes = null
export const loadNotes = () => {
  notes ??= fetch(url("search-index.json"))
    .then((r) => r.json())
    .catch(() => [])
  return notes
}

let graph = null
export const loadGraph = () => {
  graph ??= fetch(url("graph.json"))
    .then((r) => r.json())
    .catch(() => ({ nodes: [], links: [] }))
  return graph
}
