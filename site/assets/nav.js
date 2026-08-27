// Where the pages are, relative to the one being read.
//
// Every page carries its own depth in data-root, so a link built by the client
// resolves the same way one built by the generator does.

const root = document.documentElement.dataset.root ?? ""

// Reading in the graph and picking another note keeps you in the graph.
const inGraphView = document.body.classList.contains("is-graph")

export const url = (path) => `${root}${path}`

export const noteUrl = (slug) => url(`${slug}/${inGraphView ? "graph/" : ""}`)
