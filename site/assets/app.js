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
  const targets = links
    .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
    .filter(Boolean)

  if (targets.length) {
    const mark = (heading) => {
      for (const a of links) a.classList.toggle("is-active", a.hash === `#${heading.id}`)
    }

    // The middle column scrolls on a desktop; the page itself scrolls on a phone.
    const scroller = () => {
      const main = document.querySelector("main")
      return main && main.scrollHeight > main.clientHeight + 1 ? main : document.scrollingElement
    }

    // Where a heading comes to rest once something has scrolled it into place:
    // the top of the scrollport, plus the padding that scroll leaves above it.
    // Read off the CSS so the mark and the scroll cannot drift apart.
    //
    // The scrollport is the padding box, not the border box. The column draws a
    // 7px border, so measuring from getBoundingClientRect alone puts this line
    // 7px above where the browser actually lands a heading, and a heading
    // jumped to never counts as having reached it.
    const geometry = () => {
      const el = scroller()
      const page = el === document.scrollingElement
      const box = page ? { top: 0, bottom: innerHeight } : el.getBoundingClientRect()
      const border = page ? 0 : el.clientTop
      const pad = parseFloat(getComputedStyle(page ? document.documentElement : el).scrollPaddingTop) || 24
      return {
        line: box.top + border + pad + 4,
        bottom: box.bottom,
        atEnd: el.scrollTop + el.clientHeight >= el.scrollHeight - 2,
      }
    }

    // A heading the reader asked for by name. It only decides anything at the
    // bottom of the page, where the geometry alone cannot.
    let asked = null

    // The last heading to have reached the line, or the first one while the
    // reader is still above all of them, so a section is always marked. The old
    // rule wanted a heading inside a narrow band instead, which marked nothing
    // at all before the first scroll, and marked the following section after a
    // jump, because the one jumped to had already passed above the band.
    const current = () => {
      const { line, bottom, atEnd } = geometry()
      let found = targets[0]
      for (const target of targets) {
        if (target.getBoundingClientRect().top > line) break
        found = target
      }
      // The last headings can never reach the line: at the end of the scroll
      // there is nothing left to bring them up to it, and they share the bottom
      // of the page between them. The reader's own choice settles it when they
      // made one, and the last of them when they did not.
      if (atEnd) {
        const onScreen = targets.filter((target) => target.getBoundingClientRect().top < bottom)
        if (asked && onScreen.includes(asked)) return asked
        if (onScreen.length) return onScreen[onScreen.length - 1]
      }
      asked = null
      return found
    }

    let queued = false
    const schedule = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(() => {
        queued = false
        mark(current())
      })
    }

    const named = () => targets.find((target) => `#${target.id}` === location.hash)

    // Scroll does not bubble, and on a desktop it is the middle column that
    // scrolls rather than the page, so this listens in the capture phase.
    addEventListener("scroll", schedule, { capture: true, passive: true })
    addEventListener("resize", schedule, { passive: true })
    addEventListener("load", schedule)
    // Clicking a link in here says which section is wanted, so mark that one
    // rather than inferring it from a smooth scroll that has not arrived yet.
    addEventListener("hashchange", () => {
      asked = named() ?? null
      if (asked) mark(asked)
      schedule()
    })

    asked = named() ?? null
    mark(asked ?? current())
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
