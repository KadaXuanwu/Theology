// The two things the reader can change about how the page looks: light or
// dark, and the face the prose is set in. Both are stored, and both have
// already been applied by the inline script in the head before first paint,
// so this only puts the controls in step and remembers the next choice.

import { writeText } from "./store.js"

function initThemeToggle() {
  const toggle = document.querySelector(".theme-toggle")
  toggle?.addEventListener("click", () => {
    const explicit = document.documentElement.dataset.theme
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const currentlyDark = explicit ? explicit === "dark" : systemDark
    const next = currentlyDark ? "light" : "dark"
    document.documentElement.dataset.theme = next
    writeText("theme", next)
  })
}

function initFontPicker() {
  const select = document.querySelector(".font-select")
  if (!select) return

  const stored = document.documentElement.dataset.font
  if (stored && [...select.options].some((o) => o.value === stored)) select.value = stored

  select.addEventListener("change", () => {
    document.documentElement.dataset.font = select.value
    writeText("font", select.value)
  })
}

export function initAppearance() {
  initThemeToggle()
  initFontPicker()
}
