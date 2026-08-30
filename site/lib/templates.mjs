// Every page the site emits, as html. Plain string building, no framework.
//
// Each page hands its middle column and its right rail to `shell`, which is
// what makes the header, the tree and the overlays the same on all of them.

import { shell } from "./chrome.mjs"
import { slugify } from "./content.mjs"
import { icon } from "./icons.mjs"
import { escapeHtml } from "./markdown.mjs"

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
export function railGraph({
  root,
  focus = null,
  focusList = null,
  kind = null,
  subject = null,
  expandUrl = "graph/",
  driven = false,
}) {
  const local = Boolean(focus || focusList || kind)
  const expandLabel = driven
    ? "Enlarge the graph for these tags"
    : local
      ? `Enlarge the graph for ${subject ?? focus}`
      : "Open the full graph"
  // A section brings twenty odd notes into a panel this size, where naming them
  // all at once is a wall of text over circles too small to read. The preview
  // labels on hover the way the whole map does, and the section's own page is
  // where the names have the room.
  // A driven mount takes its focus from the page rather than from the markup:
  // the tags filter names the notes, and it names different ones every time the
  // reader picks a tag. Labels on hover for the same reason a section's do, the
  // panel is too small to name a dozen notes at once.
  const attrs = driven
    ? ` data-labels="hover"`
    : focus
      ? ` data-focus="${escapeHtml(focus)}"`
      : focusList
        ? ` data-focus-list="|${focusList.map((t) => escapeHtml(t)).join("|")}|" data-labels="hover"`
        : kind
          ? ` data-kind="${escapeHtml(kind)}" data-labels="hover"`
          : ""
  // The rail has no legend, so the row directly above its graph is the heading
  // row. That is where its control goes, at the far end, the same rule the
  // enlarged view follows on its legend row.
  return `<section class="panel panel-graph">
  <div class="panel-head">
    <h2>Graph</h2>
    <a class="panel-expand" href="${root}${expandUrl}" aria-label="${escapeHtml(expandLabel)}" title="${escapeHtml(expandLabel)}">${icon("expand")}</a>
  </div>
  <div class="graph-mount graph-rail" data-graph="${driven ? "tags" : local ? "local" : "global"}"${attrs}></div>
  ${local ? `<a class="panel-link" href="${root}graph/">See the overview</a>` : ""}
</section>`
}

// Born, died and where, on a person's note. The same three facts sit on every
// one of them, so they are frontmatter and get rendered in one shape rather
// than written into the prose in whatever order each note felt like.
//
// No `died` means no death was recorded when the note was last updated, which
// is all anyone can honestly say. The date that qualifies it is already on the
// line below, so the word carries the detail in its tooltip instead of in six
// more words of prose.
function lifeLine(note) {
  const { born, died, location } = note.frontmatter
  if (!born && !died && !location) return ""

  const parts = []
  if (born) parts.push(`Born ${escapeHtml(born)}`)
  if (died) parts.push(`died ${escapeHtml(died)}`)
  else if (born) parts.push('<span title="No death recorded when this note was last updated">living</span>')
  if (location) parts.push(escapeHtml(location))

  return `<p class="life">${parts.join('<span aria-hidden="true"> · </span>')}</p>`
}

export function notePage({ note, root, dateLabel, sections, notes, assets }) {
  const section = note.section
  const kindLabel = section.pill ?? KIND_LABEL[section.kind] ?? "Note"
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
  ${lifeLine(note)}
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

export function listPage({
  title,
  lede,
  groups,
  root,
  current,
  sections,
  notes,
  extra = "",
  assets,
  graphUrl,
  railKind,
  railNotes,
}) {
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
    rightRail: railGraph({ root, kind: railKind, focusList: railNotes, subject: title, expandUrl: graphUrl }),
  })
}

// The tag picker, and the two rows of controls under it. The same block heads
// both views of the tags, because picking is the same act whether the answer is
// a list of notes or a map of them.
//
// Each chip carries the notes it covers. That is the whole index the filter
// needs, so the map view can answer "how many, and which" without a list of
// notes on the page to count.
function tagControls({ tags, root, total }) {
  const chips = tags
    .map(
      ([tag, list]) =>
        `<li><a class="tag-chip" href="${root}tags/${slugify(tag)}/" data-tag="${escapeHtml(tag)}" data-notes="${noteKey(list)}">#${escapeHtml(tag)}<span class="tree-count">${list.length}</span></a></li>`,
    )
    .join("")

  return `<div class="tag-picker">
    <ul class="tag-cloud" aria-label="Tags" data-total="${total}">${chips}</ul>
  </div>
  <div class="tag-bar">
    <p class="tag-count" role="status" aria-live="polite">${total} ${total === 1 ? "note" : "notes"}</p>
    <div class="tag-actions">
      <div class="tag-mode" role="group" aria-label="Match selected tags"><button type="button" class="tag-mode-option" data-mode="all" aria-pressed="true">All</button><button type="button" class="tag-mode-option" data-mode="any" aria-pressed="false">Any</button></div>
      <button type="button" class="tag-clear">Clear</button>
    </div>
  </div>
  <ul class="tag-selected" aria-label="Selected tags"><li class="tag-hint">No tags selected</li></ul>`
}

// Note titles in an attribute, delimited at both ends so a title can never be
// matched by half of another one. Titles carry no bar character.
const noteKey = (list) => `|${list.map((n) => escapeHtml(n.title)).join("|")}|`

// The text view of the tags: every tag on top, every note underneath, and the
// picking filters the notes in place rather than moving the reader, so building
// a combination up one tag at a time never costs a page load.
//
// It is built as plain links to the single tag pages and the full list of
// notes, and the script upgrades that into the filter. With no script the page
// is still a working index rather than an empty frame.
export function tagIndexPage({ tags, root, sections, notes, assets }) {
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
          return `<li><a href="${root}${n.url}/" data-note="${escapeHtml(n.title)}">
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

  return shell({
    title: "Tags · Theology",
    description: "Every tag in the vault, and the notes under any combination of them.",
    root,
    current: "tags",
    sections,
    notes,
    assets,
    bodyClass: "is-tags",
    graphUrl: "tags/graph/",
    main: `<div class="page page-tags">
  <h1 class="page-title">Tags</h1>
  ${tagControls({ tags, root, total: notes.length })}
  <div class="tag-results"><p class="tag-none" hidden></p>${groups}</div>
</div>`,
    rightRail: railGraph({ root, driven: true, expandUrl: "tags/graph/" }),
  })
}

// The map view of the same picking. The controls are the ones the list view
// carries, in the same order and the same place, and the graph stands where the
// list of notes stands: what came through, and what it connects to.
export function tagGraphPage({ tags, root, sections, notes, assets }) {
  return shell({
    title: "Tags · Graph · Theology",
    description: "The notes under any combination of tags, and how they connect.",
    root,
    current: "tags",
    sections,
    notes,
    assets,
    view: "graph",
    textUrl: "tags/",
    graphUrl: "tags/graph/",
    bodyClass: "is-graph",
    main: `<div class="page page-graph page-tag-graph">
  <div class="graph-head">
    <h1 class="page-title">Tags</h1>
  </div>
  ${tagControls({ tags, root, total: notes.length })}
  ${graphTools(sections, `<a class="panel-expand graph-collapse" href="${root}tags/" aria-label="Back to the list of notes" title="Back to the list">${icon("collapse")}</a>`)}
  <div class="graph-full graph-mount" data-graph="tags" data-depth="2"></div>
</div>`,
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
