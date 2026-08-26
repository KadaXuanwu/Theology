// Every page the site emits. Plain string building, no framework.

import { escapeHtml } from "./markdown.mjs"
import { slugify } from "./content.mjs"

const KIND_LABEL = {
  "argument-for": "Argument for",
  "argument-against": "Argument against",
  claim: "Claim",
  evidence: "Evidence",
  note: "Note",
}

// The graph that sits in the right rail. Shown on every page that has room for
// it; the media query hides the whole rail when there is not, and the header
// button is the way in from there.
// The strip between the heading and the graph. The legend doubles as the
// filter: each entry switches its category in and out of every graph on the
// site. The control that leaves the view takes the far end of the same row, so
// it sits directly above the graph it belongs to and ends flush with its right
// edge, which is the same place the rail's control ends up over its own graph.
// It is kept out of the legend's own group: it switches no category.
function graphTools(sections, control = "") {
  const items = sections
    .map(
      (sec) =>
        `<li><button type="button" class="legend-toggle" data-kind="${sec.kind}" aria-pressed="true"><span class="dot dot-${sec.kind}"></span>${escapeHtml(sec.label)}</button></li>`,
    )
    .join("")
  return `<div class="graph-tools">
    <ul class="legend" role="group" aria-label="Show or hide categories">${items}</ul>
    ${control}
  </div>`
}

// The rail previews whatever the page is about: one note, one section, or the
// whole map on the overview, which is about everything. Enlarging it opens that
// page's own graph view rather than always the overview's.
export function railGraph({ root, focus = null, kind = null, subject = null, expandUrl = "graph/" }) {
  const local = Boolean(focus || kind)
  const expandLabel = local ? `Enlarge the graph for ${subject ?? focus}` : "Open the full graph"
  // A section brings twenty odd notes into a panel this size, where naming them
  // all at once is a wall of text over circles too small to read. The preview
  // labels on hover the way the whole map does, and the section's own page is
  // where the names have the room.
  const attrs = focus
    ? ` data-focus="${escapeHtml(focus)}"`
    : kind
      ? ` data-kind="${escapeHtml(kind)}" data-labels="hover"`
      : ""
  // The rail has no legend, so the row directly above its graph is the heading
  // row. That is where its control goes, at the far end, the same rule the
  // enlarged view follows on its legend row.
  return `<section class="panel panel-graph">
  <div class="panel-head">
    <h2>${local ? "Connections" : "Graph"}</h2>
    <a class="panel-expand" href="${root}${expandUrl}" aria-label="${escapeHtml(expandLabel)}" title="${escapeHtml(expandLabel)}">${icon("expand")}</a>
  </div>
  <div class="graph-mount graph-rail" data-graph="${local ? "local" : "global"}"${attrs}></div>
  ${local ? `<a class="panel-link" href="${root}graph/">See the overview</a>` : ""}
</section>`
}

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
  const tags = `<li class="tree-tags${onTags ? " is-current" : ""}"><a href="${root}tags/"${current === "tags" ? ' aria-current="page"' : ""}>${icon("hash")}All tags</a></li>`

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
<div class="preview-card" hidden></div>`
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

export function notePage({ note, root, dateLabel, sections, notes, assets }) {
  const section = note.section
  const kindLabel = KIND_LABEL[section.kind] ?? "Note"
  const extraKind = note.frontmatter.kind ? ` · ${escapeHtml(note.frontmatter.kind)}` : ""

  const tags = note.tags.length
    ? `<ul class="tag-list">${note.tags.map((t) => `<li><a href="${root}tags/${slugify(t)}/">#${escapeHtml(t)}</a></li>`).join("")}</ul>`
    : ""

  const status = note.status
    ? `<span class="pill pill-status" data-status="${escapeHtml(note.status)}">${escapeHtml(note.status)}</span>`
    : ""

  const backlinks = note.backlinks.length
    ? `<ul class="card-list">${note.backlinks
        .map(
          (b) =>
            `<li><a href="${root}${b.url}/" data-note="${escapeHtml(b.title)}"><span class="dot dot-${b.section.kind}"></span><span class="card-title">${escapeHtml(b.title)}</span></a></li>`,
        )
        .join("")}</ul>`
    : `<p class="muted">Nothing links here yet.</p>`

  const tocItems = note.headings.filter((h) => h.depth <= 2)
  const toc = tocItems.length
    ? `<nav class="panel panel-toc toc" aria-label="On this page">
  <h2>On this page</h2>
  <ol>${tocItems.map((h) => `<li><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`).join("")}</ol>
</nav>`
    : ""

  const main = `<article class="note">
  <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${root}">Overview</a><span aria-hidden="true">/</span><a href="${root}${slugify(section.dir)}/">${escapeHtml(section.label)}</a></nav>
  <h1 class="note-title">${escapeHtml(note.title)}</h1>
  <div class="note-meta">
    <span class="pill pill-kind" data-kind="${section.kind}">${kindLabel}${extraKind}</span>
    ${status}
    <span class="muted">${dateLabel}</span>
  </div>
  ${tags}
  <div class="note-body">${note.html}</div>
  <section class="backlinks">
    <h2>Linked from</h2>
    ${backlinks}
  </section>
</article>`

  return shell({
    title: `${note.title} · Theology`,
    description: note.shortExcerpt,
    root,
    current: note.url,
    sections,
    notes,
    assets,
    main,
    rightRail: railGraph({ root, focus: note.title, expandUrl: `${note.url}/graph/` }) + toc,
    graphUrl: `${note.url}/graph/`,
  })
}

export function listPage({ title, lede, groups, root, current, sections, notes, extra = "", assets, graphUrl, railKind }) {
  const body = groups
    .map(
      (group) => `<section class="list-section">
  <h2><span class="dot dot-${group.kind}"></span>${escapeHtml(group.label)}<span class="tree-count">${group.items.length}</span></h2>
  ${group.blurb ? `<p class="muted">${escapeHtml(group.blurb)}</p>` : ""}
  <ul class="card-list">${group.items
    .map(
      (n) => `<li><a href="${root}${n.url}/" data-note="${escapeHtml(n.title)}">
      <span class="card-head"><span class="card-title">${escapeHtml(n.title)}</span>${n.status && n.status !== "sourced" ? `<span class="pill pill-status" data-status="${escapeHtml(n.status)}">${escapeHtml(n.status)}</span>` : ""}</span>
      <span class="card-excerpt">${escapeHtml(n.shortExcerpt)}</span>
    </a></li>`,
    )
    .join("")}</ul>
</section>`,
    )
    .join("")

  return shell({
    // The root keeps the site's name in the tab even though the page itself is
    // called the overview, so a bookmark of it reads as the site.
    title: current === null ? "Theology" : `${title} · Theology`,
    description: lede.replace(/<[^>]+>/g, "").slice(0, 180),
    root,
    current,
    sections,
    notes,
    assets,
    ...(graphUrl ? { graphUrl } : {}),
    main: `<div class="page">
  <h1 class="page-title">${escapeHtml(title)}</h1>
  <p class="lede">${lede}</p>
  ${extra}
  ${body}
</div>`,
    rightRail: railGraph({ root, kind: railKind, subject: title, expandUrl: graphUrl }),
  })
}

// Tags in an attribute the script can test without splitting or a false match
// on a tag that is the start of another one.
const tagKey = (list) => (list.length ? `|${list.map((t) => escapeHtml(t)).join("|")}|` : "")

// Two windows over the same thing: every tag on top, every note underneath.
// Picking tags filters the notes in place rather than moving the reader, so
// building up a combination never costs a page load.
//
// It is built as plain links to the single tag pages and the full list of
// notes, and the script upgrades that into the filter. With no script the page
// is still a working index rather than an empty frame.
export function tagIndexPage({ tags, root, sections, notes, assets }) {
  const chips = tags
    .map(
      ([tag, list]) =>
        `<li><a class="tag-chip" href="${root}tags/${slugify(tag)}/" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}<span class="tree-count">${list.length}</span></a></li>`,
    )
    .join("")

  // Grouped the way every other list on the site is grouped, so a filtered
  // result still reads as part of the vault rather than as a flat search dump.
  const groups = sections
    .map((section) => {
      const items = notes.filter((n) => n.section.dir === section.dir)
      if (items.length === 0) return ""
      const rows = items
        .map((n) => {
          const marks = n.tags
            .map((t) => `<span class="result-tag" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</span>`)
            .join("")
          return `<li data-tags="${tagKey(n.tags)}"><a href="${root}${n.url}/" data-note="${escapeHtml(n.title)}">
      <span class="card-head"><span class="dot dot-${section.kind}"></span><span class="card-title">${escapeHtml(n.title)}</span></span>
      <span class="result-tags">${marks}</span>
    </a></li>`
        })
        .join("")
      return `<section class="list-section">
  <h2><span class="dot dot-${section.kind}"></span>${escapeHtml(section.label)}<span class="tree-count">${items.length}</span></h2>
  <ul class="card-list">${rows}</ul>
</section>`
    })
    .join("")

  const total = `${notes.length} ${notes.length === 1 ? "note" : "notes"}`

  return shell({
    title: "Tags · Theology",
    description: "Every tag in the vault, and the notes under any combination of them.",
    root,
    current: "tags",
    sections,
    notes,
    assets,
    bodyClass: "is-tags",
    main: `<div class="page page-tags">
  <h1 class="page-title">Tags</h1>
  <div class="tag-picker">
    <ul class="tag-cloud" aria-label="Tags">${chips}</ul>
  </div>
  <div class="tag-bar">
    <p class="tag-count" role="status" aria-live="polite">${total}</p>
    <div class="tag-actions">
      <div class="tag-mode" role="group" aria-label="Match selected tags"><button type="button" class="tag-mode-option" data-mode="all" aria-pressed="true">All</button><button type="button" class="tag-mode-option" data-mode="any" aria-pressed="false">Any</button></div>
      <button type="button" class="tag-clear">Clear</button>
    </div>
  </div>
  <ul class="tag-selected" aria-label="Selected tags"><li class="tag-hint">No tags selected</li></ul>
  <div class="tag-results"><p class="tag-none" hidden></p>${groups}</div>
</div>`,
    rightRail: railGraph({ root }),
  })
}


export function graphPage({ root, sections, notes, assets }) {
  return shell({
    title: "Overview · Graph · Theology",
    description: "Every note in the vault and every link between them, as one map.",
    root,
    current: null,
    sections,
    notes,
    assets,
    main: `<div class="page page-graph">
  <div class="graph-head">
    <h1 class="page-title">Overview</h1>
  </div>
  ${graphTools(sections, `<a class="panel-expand graph-collapse" href="${root}" aria-label="Back to the text of the overview" title="Back to the text">${icon("collapse")}</a>`)}
  <div class="graph-full graph-mount" data-graph="global"></div>
</div>`,
    bodyClass: "is-graph",
    view: "graph",
  })
}

// The graph view of a single note: same chrome, same sidebar selection, the
// note's own neighbourhood filling the column instead of its prose.
export function nodeGraphPage({ note, root, sections, notes, assets }) {
  const section = note.section
  return shell({
    title: `${note.title} · Graph · Theology`,
    description: `How ${note.title} connects to the rest of the vault.`,
    root,
    current: note.url,
    sections,
    notes,
    assets,
    view: "graph",
    textUrl: `${note.url}/`,
    graphUrl: `${note.url}/graph/`,
    bodyClass: "is-graph",
    main: `<div class="page page-graph">
  <div class="graph-head">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${root}">Overview</a><span aria-hidden="true">/</span><a href="${root}${slugify(section.dir)}/">${escapeHtml(section.label)}</a></nav>
    <h1 class="note-title">${escapeHtml(note.title)}</h1>
  </div>
  ${graphTools(sections, `<a class="panel-expand graph-collapse" href="${root}${note.url}/" aria-label="Back to the text of ${escapeHtml(note.title)}" title="Back to the text">${icon("collapse")}</a>`)}
  <div class="graph-full graph-mount" data-graph="local" data-depth="2" data-focus="${escapeHtml(note.title)}"></div>
  <p class="graph-foot"><a href="${root}graph/">See the overview</a></p>
</div>`,
  })
}

// The graph view of one section: the same heading its list page carries, and
// every note in the section plus two hops out from them, the same reach a single
// note's page has. The section itself is ringed, the first hop is what it links
// to, and the second is faded back to context.
export function sectionGraphPage({ section, root, sections, notes, assets }) {
  const slug = slugify(section.dir)
  return shell({
    title: `${section.label} · Graph · Theology`,
    description: `How the notes in ${section.label} connect to the rest of the vault.`,
    root,
    current: slug,
    sections,
    notes,
    assets,
    view: "graph",
    textUrl: `${slug}/`,
    graphUrl: `${slug}/graph/`,
    bodyClass: "is-graph",
    main: `<div class="page page-graph">
  <div class="graph-head">
    <h1 class="page-title">${escapeHtml(section.label)}</h1>
  </div>
  ${graphTools(sections, `<a class="panel-expand graph-collapse" href="${root}${slug}/" aria-label="Back to the list of ${escapeHtml(section.label)}" title="Back to the list">${icon("collapse")}</a>`)}
  <div class="graph-full graph-mount" data-graph="local" data-kind="${section.kind}" data-depth="2"></div>
  <p class="graph-foot"><a href="${root}graph/">See the overview</a></p>
</div>`,
  })
}

export function notFoundPage({ root, sections, notes, assets }) {
  return shell({
    title: "Not found · Theology",
    description: "That page does not exist.",
    root,
    current: null,
    sections,
    notes,
    assets,
    main: `<div class="page">
  <h1>Not found</h1>
  <p class="lede">That page does not exist. Try the search, or start from the <a href="${root}">overview</a>.</p>
</div>`,
  })
}

function icon(name) {
  const paths = {
    menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    search: '<circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>',
    close: '<line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/>',
    chevron: '<polyline points="6 9 12 15 18 9"/>',
    sun: '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="7" y2="7"/><line x1="17" y1="17" x2="19.1" y2="19.1"/><line x1="4.9" y1="19.1" x2="7" y2="17"/><line x1="17" y1="7" x2="19.1" y2="4.9"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    home: '<path d="M4 11 12 4l8 7"/><path d="M6.5 9.6V19h11V9.6"/>',
    hash: '<line x1="9.5" y1="4" x2="7.5" y2="20"/><line x1="16.5" y1="4" x2="14.5" y2="20"/><line x1="4" y1="9" x2="19.5" y2="9"/><line x1="3.5" y1="15" x2="19" y2="15"/>',
    expand:
      '<polyline points="14 4 20 4 20 10"/><polyline points="10 20 4 20 4 14"/><line x1="20" y1="4" x2="13.5" y2="10.5"/><line x1="4" y1="20" x2="10.5" y2="13.5"/>',
    collapse:
      '<polyline points="20 10 14 10 14 4"/><polyline points="4 14 10 14 10 20"/><line x1="14" y1="10" x2="20.5" y2="3.5"/><line x1="10" y1="14" x2="3.5" y2="20.5"/>',
    text: '<line x1="5" y1="6" x2="19" y2="6"/><line x1="5" y1="10.5" x2="19" y2="10.5"/><line x1="5" y1="15" x2="15" y2="15"/><line x1="5" y1="19" x2="12" y2="19"/>',
    graph:
      '<circle cx="6" cy="7" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="17" r="2.5"/><line x1="7.6" y1="8.9" x2="10.6" y2="15"/><line x1="16.7" y1="8.2" x2="13.4" y2="15"/><line x1="8.4" y1="6.7" x2="15.5" y2="6.2"/>',
    chat: '<path d="M20 15.5a2.5 2.5 0 0 1-2.5 2.5H8l-4 3V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5z"/>',
    send: '<line x1="5" y1="12" x2="18" y2="12"/><polyline points="12.5 6.5 19 12 12.5 17.5"/>',
  }
  return `<svg class="icon icon-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`
}
