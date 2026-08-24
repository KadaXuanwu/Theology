// Everything the pages do in the browser: theme, the folder tree, search,
// hover previews, the table of contents and mounting the graphs.

import { mount as mountGraph } from "./graph.js"

const root = document.documentElement.dataset.root ?? ""
const url = (path) => `${root}${path}`

// Reading in the graph and picking another note keeps you in the graph.
const inGraphView = document.body.classList.contains("is-graph")
const noteUrl = (slug) => url(`${slug}/${inGraphView ? "graph/" : ""}`)

/* Theme ------------------------------------------------------------------- */

const themeToggle = document.querySelector(".theme-toggle")
themeToggle?.addEventListener("click", () => {
  const explicit = document.documentElement.dataset.theme
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  const currentlyDark = explicit ? explicit === "dark" : systemDark
  const next = currentlyDark ? "light" : "dark"
  document.documentElement.dataset.theme = next
  try {
    localStorage.setItem("theme", next)
  } catch {
    /* private mode, the theme just will not stick */
  }
})

/* Reading font ------------------------------------------------------------
 * The head script has already applied the stored choice; this only puts the
 * control in step with it and remembers what the reader picks next.
 */

const fontSelect = document.querySelector(".font-select")
if (fontSelect) {
  const stored = document.documentElement.dataset.font
  if (stored && [...fontSelect.options].some((o) => o.value === stored)) fontSelect.value = stored

  fontSelect.addEventListener("change", () => {
    document.documentElement.dataset.font = fontSelect.value
    try {
      localStorage.setItem("font", fontSelect.value)
    } catch {
      /* private mode, the font just will not stick */
    }
  })
}

/* Folder tree -------------------------------------------------------------
 * Folders render open. Only a folder the reader collapsed themselves stays
 * collapsed, and that is remembered. Navigating never closes anything.
 */

const COLLAPSED_KEY = "collapsedFolders"

const readCollapsed = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "[]")
    return new Set(Array.isArray(raw) ? raw : [])
  } catch {
    return new Set()
  }
}

const writeCollapsed = (set) => {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...set]))
  } catch {
    /* nothing to do, the tree just will not remember */
  }
}

{
  const collapsed = readCollapsed()
  for (const folder of document.querySelectorAll(".tree-folder")) {
    const name = folder.dataset.folder
    const isCollapsed = collapsed.has(name)
    folder.classList.toggle("is-collapsed", isCollapsed)
    folder.querySelector(".tree-toggle")?.setAttribute("aria-expanded", String(!isCollapsed))

    folder.querySelector(".tree-toggle")?.addEventListener("click", () => {
      const nowCollapsed = folder.classList.toggle("is-collapsed")
      folder.querySelector(".tree-toggle").setAttribute("aria-expanded", String(!nowCollapsed))
      const set = readCollapsed()
      if (nowCollapsed) set.add(name)
      else set.delete(name)
      writeCollapsed(set)
    })
  }
}

/* Mobile navigation -------------------------------------------------------- */

const sidebar = document.getElementById("explorer")
const navToggle = document.querySelector(".nav-toggle")

navToggle?.addEventListener("click", () => {
  const open = sidebar.classList.toggle("is-open")
  navToggle.setAttribute("aria-expanded", String(open))
})

document.addEventListener("click", (event) => {
  if (!sidebar?.classList.contains("is-open")) return
  if (sidebar.contains(event.target) || navToggle.contains(event.target)) return
  sidebar.classList.remove("is-open")
  navToggle.setAttribute("aria-expanded", "false")
})

/* Shared data -------------------------------------------------------------- */

let notesPromise = null
const loadNotes = () => {
  notesPromise ??= fetch(url("search-index.json"))
    .then((r) => r.json())
    .catch(() => [])
  return notesPromise
}

let graphPromise = null
const loadGraph = () => {
  graphPromise ??= fetch(url("graph.json"))
    .then((r) => r.json())
    .catch(() => ({ nodes: [], links: [] }))
  return graphPromise
}

/* Search ------------------------------------------------------------------- */

const overlay = document.querySelector(".search-overlay")
const input = document.querySelector(".search-input")
const results = document.querySelector(".search-results")
let activeIndex = 0
let matches = []

function openSearch() {
  if (!overlay) return
  overlay.hidden = false
  document.body.style.overflow = "hidden"
  loadNotes()
  input.focus()
  input.select()
}

function closeSearch() {
  if (!overlay) return
  overlay.hidden = true
  document.body.style.overflow = ""
}

document.querySelector(".search-open")?.addEventListener("click", openSearch)
document.querySelector(".search-close")?.addEventListener("click", closeSearch)
overlay?.addEventListener("click", (event) => {
  if (event.target === overlay) closeSearch()
})

document.addEventListener("keydown", (event) => {
  const typingElsewhere = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)

  if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typingElsewhere)) {
    event.preventDefault()
    openSearch()
    return
  }
  if (overlay?.hidden !== false) return

  if (event.key === "Escape") {
    closeSearch()
  } else if (event.key === "ArrowDown") {
    event.preventDefault()
    moveSelection(1)
  } else if (event.key === "ArrowUp") {
    event.preventDefault()
    moveSelection(-1)
  } else if (event.key === "Enter") {
    const link = results.children[activeIndex]?.querySelector("a")
    if (link) {
      event.preventDefault()
      window.location.href = link.href
    }
  }
})

function moveSelection(step) {
  if (matches.length === 0) return
  activeIndex = (activeIndex + step + matches.length) % matches.length
  for (const [i, li] of [...results.children].entries()) {
    li.classList.toggle("is-active", i === activeIndex)
  }
  results.children[activeIndex]?.scrollIntoView({ block: "nearest" })
}

input?.addEventListener("input", async () => {
  const query = input.value.trim().toLowerCase()
  const notes = await loadNotes()
  matches = query ? rank(notes, query) : []
  activeIndex = 0
  renderResults(matches, query)
})

function rank(notes, query) {
  const terms = query.split(/\s+/).filter(Boolean)
  const scored = []

  for (const note of notes) {
    const title = note.title.toLowerCase()
    const tags = note.tags.join(" ").toLowerCase()
    let score = 0

    for (const term of terms) {
      if (title === term) score += 120
      else if (title.startsWith(term)) score += 70
      else if (title.includes(term)) score += 45
      if (tags.includes(term)) score += 25
      const at = note.text.indexOf(term)
      if (at >= 0) score += 12
      if (!title.includes(term) && !tags.includes(term) && at < 0) {
        score = -1
        break
      }
    }

    if (score > 0) scored.push({ note, score })
  }

  return scored
    .sort((a, b) => b.score - a.score || a.note.title.localeCompare(b.note.title, "en"))
    .slice(0, 25)
    .map((s) => s.note)
}

function renderResults(list, query) {
  if (!query) {
    results.innerHTML = ""
    return
  }
  if (list.length === 0) {
    results.innerHTML = '<li class="search-none"><a>No notes match that.</a></li>'
    return
  }

  results.innerHTML = list
    .map(
      (note, i) => `<li${i === 0 ? ' class="is-active"' : ""}><a href="${noteUrl(note.url)}">
      <span class="result-title"><span class="dot dot-${note.kind}"></span>${escapeHtml(note.title)}<span class="result-where">${escapeHtml(note.section)}</span></span>
      <span class="result-snippet">${snippet(note, query)}</span>
    </a></li>`,
    )
    .join("")
}

function snippet(note, query) {
  const term = query.split(/\s+/)[0]
  const at = note.text.indexOf(term)
  if (at < 0) return escapeHtml(note.excerpt)
  const from = Math.max(0, at - 60)
  const raw = note.text.slice(from, from + 170)
  const safe = escapeHtml(`${from > 0 ? "…" : ""}${raw}…`)
  return safe.replace(new RegExp(escapeRegex(term), "gi"), (m) => `<mark>${m}</mark>`)
}

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  )
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/* Hover previews ----------------------------------------------------------- */

const card = document.querySelector(".preview-card")
let hoverTimer = null

if (card) {
  document.addEventListener(
    "mouseover",
    (event) => {
      const link = event.target.closest("a[data-note]")
      if (!link) return
      clearTimeout(hoverTimer)
      hoverTimer = setTimeout(() => showPreview(link), 320)
    },
    { passive: true },
  )

  document.addEventListener(
    "mouseout",
    (event) => {
      if (!event.target.closest("a[data-note]")) return
      clearTimeout(hoverTimer)
      card.hidden = true
    },
    { passive: true },
  )

  const hidePreview = () => {
    card.hidden = true
  }
  window.addEventListener("scroll", hidePreview, { passive: true })
  document.querySelector("main")?.addEventListener("scroll", hidePreview, { passive: true })
}

async function showPreview(link) {
  const notes = await loadNotes()
  const note = notes.find((n) => n.title === link.dataset.note)
  if (!note) return

  card.innerHTML = `<span class="preview-title"><span class="dot dot-${note.kind}"></span>${escapeHtml(note.title)}</span><span class="preview-text">${escapeHtml(note.excerpt)}</span>`
  card.hidden = false

  const rect = link.getBoundingClientRect()
  const size = card.getBoundingClientRect()
  const margin = 10
  let left = rect.left + window.scrollX
  let top = rect.bottom + window.scrollY + 8

  if (left + size.width > window.scrollX + document.documentElement.clientWidth - margin) {
    left = window.scrollX + document.documentElement.clientWidth - size.width - margin
  }
  if (rect.bottom + size.height + 20 > document.documentElement.clientHeight) {
    top = rect.top + window.scrollY - size.height - 8
  }

  card.style.left = `${Math.max(margin, left)}px`
  card.style.top = `${Math.max(margin, top)}px`
}

/* Table of contents -------------------------------------------------------- */

{
  const links = [...document.querySelectorAll(".toc a")]
  if (links.length) {
    const targets = links
      .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
      .filter(Boolean)

    const spy = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          for (const a of links) a.classList.toggle("is-active", a.hash === `#${entry.target.id}`)
        }
      },
      { rootMargin: "-10% 0px -75% 0px" },
    )
    for (const target of targets) spy.observe(target)
  }
}

/* Graphs ------------------------------------------------------------------- */

/* Category filter ---------------------------------------------------------
 * The legend switches categories in and out. It applies to every graph on the
 * page and is remembered, so the choice holds as you move around the site.
 */

const HIDDEN_KEY = "hiddenGraphKinds"

const readHidden = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]")
    return new Set(Array.isArray(raw) ? raw : [])
  } catch {
    return new Set()
  }
}

const writeHidden = (hidden) => {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]))
  } catch {
    /* private mode, the filter just will not be remembered */
  }
}

{
  const mounts = [...document.querySelectorAll(".graph-mount")]
  const toggles = [...document.querySelectorAll(".legend-toggle")]
  const graphs = []
  // Most pages show a graph without a legend, so the full list of categories
  // comes from the data rather than from the buttons.
  const allKinds = new Set(toggles.map((t) => t.dataset.kind))

  const visibleKinds = () => {
    if (allKinds.size === 0) return null
    const hidden = readHidden()
    return new Set([...allKinds].filter((k) => !hidden.has(k)))
  }

  const paintToggles = () => {
    const hidden = readHidden()
    for (const toggle of toggles) {
      toggle.setAttribute("aria-pressed", String(!hidden.has(toggle.dataset.kind)))
    }
  }

  paintToggles()

  for (const toggle of toggles) {
    toggle.addEventListener("click", () => {
      const hidden = readHidden()
      const kind = toggle.dataset.kind
      if (hidden.has(kind)) hidden.delete(kind)
      else hidden.add(kind)
      writeHidden(hidden)
      paintToggles()
      const kinds = visibleKinds()
      for (const graph of graphs) graph.setVisibleKinds(kinds)
    })
  }

  if (mounts.length) {
    loadGraph().then((data) => {
      for (const node of data.nodes) allKinds.add(node.kind)
      for (const el of mounts) {
        const local = el.dataset.graph === "local"
        // A section's graph names a category rather than a note, and starts
        // from every note in it.
        const kind = el.dataset.kind
        const focus = kind
          ? data.nodes.filter((n) => n.kind === kind).map((n) => n.id)
          : local
            ? el.dataset.focus
            : null
        graphs.push(
          mountGraph(el, data, {
            focus,
            // The rail shows immediate neighbours; the full page view goes a hop
            // further, because one hop leaves most notes looking almost isolated.
            depth: Number(el.dataset.depth) || 1,
            // A mount can ask for hover labels even when it is a local view:
            // a section in the rail has too many notes to name at that size.
            showLabels: el.dataset.labels ?? (local ? "always" : "hover"),
            kinds: visibleKinds(),
            onNavigate: (node) => {
              window.location.href = noteUrl(node.url)
            },
          }),
        )
      }
    })
  }
}
