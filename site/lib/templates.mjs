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
export function railGraph({ root, focus = null }) {
  return `<section class="panel panel-graph">
  <h2>${focus ? "Connections" : "Graph"}</h2>
  <div class="graph-mount graph-rail" data-graph="${focus ? "local" : "global"}"${focus ? ` data-focus="${escapeHtml(focus)}"` : ""}></div>
  <a class="panel-link" href="${root}graph/">Open the full graph</a>
</section>`
}

export function shell({ title, description, root, current, sections, notes, main, rightRail = "", bodyClass = "", assets }) {
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
/* Set the theme before first paint so the page never flashes the wrong one. */
(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}})()
</script>
</head>
<body class="${[rightRail ? "has-right" : "", bodyClass].filter(Boolean).join(" ")}">
<a class="skip-link" href="#main">Skip to content</a>
${header(root)}
<div class="layout">
${explorer({ root, current, sections, notes })}
<main id="main">${main}</main>
${rightRail ? `<aside class="sidebar-right">${rightRail}</aside>` : ""}
</div>
${overlays()}
<script type="module" src="${root}${assets.app}"></script>
</body>
</html>
`
}

function header(root) {
  return `<header class="site-header">
  <button class="icon-button nav-toggle" aria-label="Menu" aria-expanded="false" aria-controls="explorer">${icon("menu")}</button>
  <a class="site-title" href="${root}">Theology</a>
  <a class="graph-button" href="${root}graph/" aria-label="Open the full graph" title="Open the full graph">${icon("graph")}<span>Graph</span></a>
  <button class="search-open" aria-label="Search notes">${icon("search")}<span>Search</span><kbd>/</kbd></button>
  <button class="icon-button theme-toggle" aria-label="Switch theme">${icon("sun")}${icon("moon")}</button>
</header>`
}

// The folder tree. Folders render open; the client only ever collapses one the
// reader collapsed themselves, so navigating never closes anything.
function explorer({ root, current, sections, notes }) {
  const groups = sections
    .map((section) => {
      const items = notes.filter((n) => n.section.dir === section.dir)
      if (items.length === 0) return ""
      const links = items
        .map(
          (n) =>
            `<li><a href="${root}${n.url}/"${n.url === current ? ' aria-current="page"' : ""} data-note="${escapeHtml(n.title)}">${escapeHtml(n.title)}</a></li>`,
        )
        .join("")
      return `<li class="tree-folder" data-folder="${escapeHtml(section.dir)}">
  <div class="tree-folder-head">
    <button class="tree-toggle" aria-label="Toggle ${escapeHtml(section.label)}" aria-expanded="true">${icon("chevron")}</button>
    <a class="tree-folder-name" href="${root}${slugify(section.dir)}/"><span class="dot dot-${section.kind}"></span>${escapeHtml(section.label)}</a>
    <span class="tree-count">${items.length}</span>
  </div>
  <ul class="tree-children">${links}</ul>
</li>`
    })
    .join("")

  return `<aside class="sidebar" id="explorer">
  <nav class="tree" aria-label="Notes">
    <ul class="tree-root">${groups}</ul>
  </nav>
  <a class="tree-tags" href="${root}tags/">All tags</a>
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
  <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${root}">Theology</a><span aria-hidden="true">/</span><a href="${root}${slugify(section.dir)}/">${escapeHtml(section.label)}</a></nav>
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
    rightRail: toc + railGraph({ root, focus: note.title }),
  })
}

export function listPage({ title, lede, groups, root, current, sections, notes, extra = "", assets }) {
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
    title: title === "Theology" ? "Theology" : `${title} · Theology`,
    description: lede.replace(/<[^>]+>/g, "").slice(0, 180),
    root,
    current,
    sections,
    notes,
    assets,
    main: `<div class="page">
  <h1>${escapeHtml(title)}</h1>
  <p class="lede">${lede}</p>
  ${extra}
  ${body}
</div>`,
    rightRail: railGraph({ root }),
  })
}

export function tagIndexPage({ tags, root, sections, notes, assets }) {
  const items = tags
    .map(
      ([tag, list]) =>
        `<li><a href="${root}tags/${slugify(tag)}/">#${escapeHtml(tag)}<span class="tree-count">${list.length}</span></a></li>`,
    )
    .join("")

  return shell({
    title: "Tags · Theology",
    description: "Every tag used across the vault.",
    root,
    current: "tags",
    sections,
    notes,
    assets,
    main: `<div class="page">
  <h1>Tags</h1>
  <p class="lede">Every tag used across the vault.</p>
  <ul class="tag-cloud">${items}</ul>
</div>`,
    rightRail: railGraph({ root }),
  })
}

export function graphPage({ root, sections, notes, assets }) {
  return shell({
    title: "Graph · Theology",
    description: "The whole vault as a link map.",
    root,
    current: "graph",
    sections,
    notes,
    assets,
    main: `<div class="page page-graph">
  <div class="graph-head">
    <div>
      <h1>Graph</h1>
      <p class="lede">Every note and every link between them. Drag to move, scroll to zoom, click to open.</p>
    </div>
    <ul class="legend">${sections.map((s) => `<li><span class="dot dot-${s.kind}"></span>${escapeHtml(s.label)}</li>`).join("")}</ul>
  </div>
  <div class="graph-full graph-mount" data-graph="global"></div>
</div>`,
    bodyClass: "is-graph",
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
    graph:
      '<circle cx="6" cy="7" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="17" r="2.5"/><line x1="7.6" y1="8.9" x2="10.6" y2="15"/><line x1="16.7" y1="8.2" x2="13.4" y2="15"/><line x1="8.4" y1="6.7" x2="15.5" y2="6.2"/>',
  }
  return `<svg class="icon icon-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`
}
