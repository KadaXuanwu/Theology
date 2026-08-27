// The sidebar: the folder tree, the menu button that opens it on a phone, and
// keeping the note being read in view inside it.

import { readSet, writeSet } from "./store.js"

const COLLAPSED_KEY = "collapsedFolders"

// Folders render open. Only a folder the reader collapsed themselves stays
// collapsed, and that is remembered. Navigating never closes anything.
function initFolders() {
  const collapsed = readSet(COLLAPSED_KEY)

  for (const folder of document.querySelectorAll(".tree-folder")) {
    const name = folder.dataset.folder
    const toggle = folder.querySelector(".tree-toggle")
    const isCollapsed = collapsed.has(name)

    folder.classList.toggle("is-collapsed", isCollapsed)
    toggle?.setAttribute("aria-expanded", String(!isCollapsed))

    toggle?.addEventListener("click", () => {
      const nowCollapsed = folder.classList.toggle("is-collapsed")
      toggle.setAttribute("aria-expanded", String(!nowCollapsed))
      const set = readSet(COLLAPSED_KEY)
      if (nowCollapsed) set.add(name)
      else set.delete(name)
      writeSet(COLLAPSED_KEY, set)
    })
  }
}

function initMobileNav(sidebar) {
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
}

// Following a link is a full page load, so the tree always comes back scrolled
// to the top. On a vault this size the note that was just opened is often below
// the fold, which reads as nothing being selected at all. Bring it into view,
// and only when it is not already there, so the tree does not jump on a note
// near the top.
function showCurrent(sidebar) {
  const here = sidebar?.querySelector('[aria-current="page"]')
  const item = here?.getBoundingClientRect()
  // A folder the reader collapsed hides the entry, and a hidden entry has no
  // box to scroll to. There is nothing to bring into view in that case.
  if (!item?.height || sidebar.scrollHeight <= sidebar.clientHeight + 1) return

  const box = sidebar.getBoundingClientRect()
  // Enough room that the entry lands inside the list rather than flush against
  // an edge, where it looks cut off.
  const margin = 48
  if (item.top < box.top + margin) sidebar.scrollTop += item.top - box.top - margin
  else if (item.bottom > box.bottom - margin) sidebar.scrollTop += item.bottom - box.bottom + margin
}

export function initTree() {
  const sidebar = document.getElementById("explorer")
  initFolders()
  initMobileNav(sidebar)
  showCurrent(sidebar)
}
