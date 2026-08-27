// The second half of reading the vault: turning the notes content.mjs found
// into notes that know their own html, their excerpts and what they link to.
//
// Kept apart from content.mjs because it needs the markdown renderer and the
// whole set of notes at once, where reading a note needs neither.

import { createRenderer, htmlToText } from "./markdown.mjs"

// Cuts at a sentence, a clause or a word rather than mid syllable.
function trimTo(text, limit) {
  if (text.length <= limit) return text
  const cut = text.slice(0, limit)
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(", "), cut.lastIndexOf(" "))
  return `${cut.slice(0, stop > limit * 0.5 ? stop : limit).trim()}…`
}

// The description under a note title, and the line the chat catalogue carries.
// 155 characters: the second sentence of a note is usually a separate idea, and
// that is exactly what someone half remembering it searches on.
const EXCERPT = 155

// Wikilinks address notes by exact filename, with a case-insensitive fallback
// so a stray capital does not silently break a link.
function lookup(notes) {
  const byTitle = new Map(notes.map((n) => [n.title, n]))
  const byLower = new Map(notes.map((n) => [n.title.toLowerCase(), n]))
  return {
    byTitle,
    resolve: (title) => byTitle.get(title) ?? byLower.get(title.toLowerCase()) ?? null,
  }
}

// Renders every note, then wires them to each other. Mutates the notes in
// place, which is what the rest of the build already expects to be handed.
export function linkNotes(notes, { rootPrefix, warn } = {}) {
  const { byTitle, resolve } = lookup(notes)

  for (const note of notes) {
    // One renderer per note, so the headings and links it collects are its own.
    const renderer = createRenderer({ resolve, rootPrefix })
    note.html = renderer.render(note.body)
    note.headings = renderer.state.headings
    note.linkTitles = [...renderer.state.links].filter((t) => t !== note.title)

    for (const target of renderer.state.broken) {
      warn?.(`${note.title}: [[${target}]] does not match any note`)
    }

    note.text = htmlToText(note.html)
    // Every note opens with a Description heading, which says nothing about
    // this note in particular and would be the first thing every excerpt said.
    note.shortExcerpt = trimTo(note.text.replace(/^Description\s*/i, ""), EXCERPT)
  }

  for (const note of notes) {
    note.links = note.linkTitles.map((t) => byTitle.get(t)).filter(Boolean)
  }
  for (const note of notes) {
    note.backlinks = notes
      .filter((other) => other !== note && other.linkTitles.includes(note.title))
      .sort((a, b) => a.title.localeCompare(b.title, "en"))
  }

  return notes
}
