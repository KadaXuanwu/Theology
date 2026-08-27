// The table of contents, and keeping it on the section being read.

export function initContents() {
  const links = [...document.querySelectorAll(".toc a")]
  const targets = links
    .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
    .filter(Boolean)

  if (targets.length === 0) return

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
