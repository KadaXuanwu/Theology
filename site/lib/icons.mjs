// The site's icons, drawn inline.
//
// One flat set rather than a sprite sheet or a font: at this count the markup
// is smaller than either, and an inline svg takes its colour from the text
// around it without anything having to be told what the theme is.

export function icon(name) {
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
    github:
      '<path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.55v-2.13c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.29-1.68-1.29-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.24 2.75.12 3.04.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .3.21.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/>',
  }
  // The GitHub mark is only itself as a solid shape, so it is the one icon
  // here drawn in fill rather than in stroke.
  if (name === "github")
    return `<svg class="icon icon-github" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${paths[name]}</svg>`
  return `<svg class="icon icon-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`
}
