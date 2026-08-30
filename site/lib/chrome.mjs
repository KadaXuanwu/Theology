// The chrome every page wears: the shell it is built into, the header, the
// folder tree, the search overlay and the chat panel. None of it knows which
// page it is wrapping, which is why it lives apart from the pages themselves.

import { slugify } from "./content.mjs"
import { icon } from "./icons.mjs"
import { escapeHtml } from "./markdown.mjs"

// The vault this site is built from. Linked in the header so a reader can go
// read the notes as files, and see the history behind any line of them.
const REPO_URL = "https://github.com/KadaXuanwu/Theology"

export function shell({
  title,
  description,
  root,
  current,
  sections,
  notes,
  main,
  rightRail = "",
  bodyClass = "",
  assets,
  view = "text",
  textUrl = "",
  graphUrl = "graph/",
}) {
  return `<!doctype html>
<html lang="en" data-root="${root}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<link rel="icon" href="${root}${assets.favicon}">
<link rel="stylesheet" href="${root}${assets.css}">
<script>
/* Set the theme and the reading font before first paint, so the page never
   flashes one and settles on the other. */
(function(){try{var d=document.documentElement;var t=localStorage.getItem("theme");if(t==="light"||t==="dark")d.dataset.theme=t;var f=localStorage.getItem("font");if(${JSON.stringify(FONT_IDS)}.indexOf(f)>-1)d.dataset.font=f}catch(e){}})()
</script>
</head>
<body class="${[rightRail ? "has-right" : "", bodyClass].filter(Boolean).join(" ")}"${notes.some((n) => n.url === current) ? ` data-note-url="${escapeHtml(current)}"` : ""}>
<a class="skip-link" href="#main">Skip to content</a>
${header({ root, view, textUrl, graphUrl })}
<div class="layout">
${explorer({ root, current, sections, notes, view })}
<main id="main">${main}</main>
${rightRail ? `<aside class="sidebar-right">${rightRail}</aside>` : ""}
</div>
${overlays()}
${assets.chat ? chat() : ""}
<script type="module" src="${root}${assets.app}"></script>
${assets.chat ? `<script type="module" src="${root}${assets.chat}"></script>` : ""}
</body>
</html>
`
}

// The reading font is the reader's to pick. Five faces that are already on the
// machines people read this on, so the choice costs no download and cannot be
// blocked: the stacks themselves live in the stylesheet, keyed by these ids.
const FONTS = [
  { id: "book", label: "Book" },
  { id: "georgia", label: "Georgia" },
  { id: "times", label: "Times" },
  { id: "system", label: "System" },
  { id: "verdana", label: "Verdana" },
]

export const FONT_IDS = FONTS.map((f) => f.id)

function fontPicker() {
  const options = FONTS.map((f) => `<option value="${f.id}">${f.label}</option>`).join("")
  return `<span class="font-picker"><select class="font-select" aria-label="Reading font">${options}</select></span>`
}

// Text and Graph are two views of the same thing, so they read as one control
// rather than as two separate destinations.
function header({ root, view, textUrl, graphUrl }) {
  const tab = (name, label, href, glyph) =>
    view === name
      ? `<span class="view-tab is-active" aria-current="page">${icon(glyph)}<span>${label}</span></span>`
      : `<a class="view-tab" href="${root}${href}">${icon(glyph)}<span>${label}</span></a>`

  return `<header class="site-header">
  <button class="icon-button nav-toggle" aria-label="Menu" aria-expanded="false" aria-controls="explorer">${icon("menu")}</button>
  <a class="site-title" href="${root}">Theology</a>
  <div class="view-switch" role="group" aria-label="View">${tab("text", "Text", textUrl, "text")}${tab("graph", "Graph", graphUrl, "graph")}</div>
  ${fontPicker()}
  <button class="search-open" aria-label="Search notes">${icon("search")}<span>Search</span><kbd>/</kbd></button>
  <button class="icon-button theme-toggle" aria-label="Switch theme">${icon("sun")}${icon("moon")}</button>
  <a class="icon-button github-link" href="${REPO_URL}" target="_blank" rel="noopener" aria-label="Source on GitHub" title="Source on GitHub">${icon("github")}</a>
</header>`
}

// The folder tree. Folders render open; the client only ever collapses one the
// reader collapsed themselves, so navigating never closes anything.
function explorer({ root, current, sections, notes, view }) {
  // Moving anywhere in the tree keeps whichever view you are reading in. Every
  // destination in here has both, so the switch never has to drop you out.
  const suffix = view === "graph" ? "graph/" : ""
  const groups = sections
    .map((section) => {
      const items = notes.filter((n) => n.section.dir === section.dir)
      if (items.length === 0) return ""
      const links = items
        .map(
          (n) =>
            `<li><a href="${root}${n.url}/${suffix}"${n.url === current ? ' aria-current="page"' : ""} data-note="${escapeHtml(n.title)}">${escapeHtml(n.title)}</a></li>`,
        )
        .join("")
      // A folder is current on its own list page and on the graph of it.
      const here = slugify(section.dir) === current
      return `<li class="tree-folder${here ? " is-current" : ""}" data-folder="${escapeHtml(section.dir)}">
  <div class="tree-folder-head">
    <button class="tree-toggle" aria-label="Toggle ${escapeHtml(section.label)}" aria-expanded="true">${icon("chevron")}</button>
    <a class="tree-folder-name" href="${root}${slugify(section.dir)}/${suffix}"${here ? ' aria-current="page"' : ""}><span class="dot dot-${section.kind}"></span>${escapeHtml(section.label)}</a>
    <span class="tree-count">${items.length}</span>
  </div>
  <ul class="tree-children">${links}</ul>
</li>`
    })
    .join("")

  const home = `<li class="tree-home"><a href="${root}${suffix}"${current === null ? ' aria-current="page"' : ""}>${icon("home")}Overview</a></li>`

  // Tags are a way into the vault, not a footnote to it, so the entry sits with
  // the other two ways in rather than under the tree it is not part of. A single
  // tag's own page counts as being here: the reader followed a tag to get there
  // and nothing else in the tree can hold the mark for them.
  const onTags = current === "tags" || current?.startsWith("tags/")
  const tags = `<li class="tree-tags${onTags ? " is-current" : ""}"><a href="${root}tags/${suffix}"${current === "tags" ? ' aria-current="page"' : ""}>${icon("hash")}All Tags</a></li>`

  return `<aside class="sidebar" id="explorer">
  <nav class="tree" aria-label="Notes">
    <ul class="tree-root">${home}${tags}${groups}</ul>
  </nav>
</aside>`
}

function overlays() {
  return `<div class="search-overlay" hidden>
  <div class="search-panel" role="dialog" aria-modal="true" aria-label="Search">
    <div class="search-field">${icon("search")}<input type="search" class="search-input" placeholder="Search notes" autocomplete="off" spellcheck="false" aria-label="Search notes"><button class="icon-button search-close" aria-label="Close search">${icon("close")}</button></div>
    <ul class="search-results"></ul>
    <p class="search-hint">Searches titles, tags and body text.</p>
  </div>
</div>
<div class="preview-card" hidden></div>
<div class="footnote-card" hidden><span class="fn-card-text"></span><button type="button" class="fn-copy">Copy</button></div>`
}

// Only rendered when a chat endpoint is configured, so the pages of a fork
// carry no dead button.
function chat() {
  return `<button class="chat-open" aria-label="Ask about these notes" aria-expanded="false">${icon("chat")}</button>
<div class="chat-panel" hidden role="dialog" aria-label="Ask about these notes">
  <div class="chat-head">
    <span class="chat-heading">Ask about these notes</span>
    <button class="icon-button chat-close" aria-label="Close">${icon("close")}</button>
  </div>
  <div class="chat-log" aria-live="polite"></div>
  <form class="chat-form">
    <textarea class="chat-input" rows="1" placeholder="Ask anything, or describe a note you half remember" autocomplete="off" aria-label="Your question"></textarea>
    <button class="icon-button chat-send" aria-label="Send">${icon("send")}</button>
  </form>
  <p class="chat-disclaimer">Answers are written by an AI reading the notes, and it can get things wrong. Follow the links and check the sources.</p>
</div>`
}
