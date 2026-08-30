// What every page runs in the browser.
//
// Each piece is its own module and wires itself to the markup it needs, or
// does nothing when that markup is not on the page. This file is the order
// they run in, and nothing else.

import { initFootnotes } from "./footnotes.js"
import { initGraphs } from "./graphs.js"
import { initPreviews } from "./preview.js"
import { initSearch } from "./search.js"
import { initTags } from "./tags.js"
import { initAppearance } from "./theme.js"
import { initContents } from "./toc.js"
import { initTree } from "./tree.js"

initAppearance()
initTree()
initSearch()
initPreviews()
initFootnotes()
initContents()
// The tags filter tells the graphs which notes came through, so a combination
// carried in on the URL is already picked by the time the graph data lands.
initTags()
initGraphs()
