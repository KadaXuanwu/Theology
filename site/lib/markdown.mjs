// Markdown to HTML, plus the two things Obsidian adds that marked does not
// know about: [[wikilinks]] and the heading ids the table of contents needs.

import { Marked } from "marked"
import { slugify } from "./content.mjs"

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// [[Target]], [[Target|shown text]], [[Target#Heading]] and the two combined.
const WIKILINK = /^\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/

// Footnotes carry the citations. `[^key]` in the prose, `[^key]: ...` at the
// foot of the note. Obsidian and GitHub both render that shape on their own,
// which is the point: the raw file has to read properly outside this site.
const FOOTNOTE_REF = /^\[\^([^\]\s]+)\]/
const FOOTNOTE_DEF = /^\[\^([^\]\s]+)\]:[ \t]*(.*)$/

// Definitions are lifted out before marked sees the body, so a citation is
// rendered once and every place that cites it points at the same list item.
// A line indented under a definition continues it.
export function extractFootnotes(markdown) {
  const defs = new Map()
  const kept = []
  let open = null

  for (const line of markdown.split(/\r?\n/)) {
    const def = FOOTNOTE_DEF.exec(line)
    if (def) {
      open = def[1]
      defs.set(open, def[2].trim())
      continue
    }
    if (open && /^[ \t]+\S/.test(line)) {
      defs.set(open, `${defs.get(open)} ${line.trim()}`.trim())
      continue
    }
    open = null
    kept.push(line)
  }

  return { body: kept.join("\n"), defs }
}

// One renderer per page so headings and links can be collected as they render.
// `resolve(title)` returns { url, title } for a known note, or null.
export function createRenderer({ resolve, rootPrefix }) {
  const state = {
    headings: [],
    links: new Set(),
    broken: [],
    footnotes: [],
    brokenFootnotes: [],
    orphanFootnotes: [],
  }
  const usedIds = new Map()

  // Per render: the definitions lifted off the top of the file, the order the
  // prose first reaches for each one, and how many times each has been cited.
  const notes = { defs: new Map(), order: [], seen: new Map() }

  const headingId = (text) => {
    const base = slugify(text) || "section"
    const seen = usedIds.get(base) ?? 0
    usedIds.set(base, seen + 1)
    return seen === 0 ? base : `${base}-${seen + 1}`
  }

  const marked = new Marked({ gfm: true, breaks: false })

  marked.use({
    extensions: [
      {
        name: "wikilink",
        level: "inline",
        start: (src) => src.indexOf("[["),
        tokenizer(src) {
          const match = WIKILINK.exec(src)
          if (!match) return undefined
          return {
            type: "wikilink",
            raw: match[0],
            target: match[1].trim(),
            anchor: match[2]?.trim() ?? null,
            label: match[3]?.trim() ?? null,
          }
        },
        renderer(token) {
          const note = resolve(token.target)
          const text = escapeHtml(token.label ?? token.target)

          if (!note) {
            state.broken.push(token.target)
            return `<span class="wikilink is-broken" title="No note named &quot;${escapeHtml(
              token.target,
            )}&quot;">${text}</span>`
          }

          state.links.add(note.title)
          const anchor = token.anchor ? `#${slugify(token.anchor)}` : ""
          // The kind rides along so the link can wear the colour of the node it
          // goes to, the same colour its dot carries in the tree and its circle
          // in the graph. A folder the site does not know about has no kind and
          // falls back to the neutral one.
          const kind = note.section?.kind ?? "note"
          return `<a class="wikilink" href="${rootPrefix}${note.url}/${anchor}" data-kind="${escapeHtml(
            kind,
          )}" data-note="${escapeHtml(note.title)}">${text}</a>`
        },
      },
      {
        name: "footnote",
        level: "inline",
        start: (src) => src.indexOf("[^"),
        tokenizer(src) {
          const match = FOOTNOTE_REF.exec(src)
          if (!match) return undefined
          return { type: "footnote", raw: match[0], key: match[1] }
        },
        renderer(token) {
          const { key } = token
          if (!notes.defs.has(key)) {
            state.brokenFootnotes.push(key)
            return `<sup class="fn is-broken" title="No footnote named &quot;${escapeHtml(
              key,
            )}&quot;">?</sup>`
          }

          if (!notes.order.includes(key)) notes.order.push(key)
          const number = notes.order.indexOf(key) + 1

          // A citation used twice needs two distinct anchors, or the jump back
          // from the list lands on whichever the browser saw first.
          const nth = (notes.seen.get(key) ?? 0) + 1
          notes.seen.set(key, nth)
          const slug = slugify(key)
          const refId = nth === 1 ? `fnref-${slug}` : `fnref-${slug}-${nth}`

          // An anchor rather than a button, so it still works as a jump to the
          // list with no JavaScript at all. The card is the enhancement.
          return `<sup class="fn"><a class="fn-ref" id="${refId}" href="#fn-${slug}" data-fn="${escapeHtml(
            slug,
          )}" aria-label="Reference ${number}">${number}</a></sup>`
        },
      },
    ],
    renderer: {
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens)
        const text = this.parser.parseInline(tokens, this.parser.textRenderer)
        const id = headingId(text)
        state.headings.push({ id, text, depth })
        return `<h${depth} id="${id}">${html}<a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${depth}>\n`
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens)
        const attrs = title ? ` title="${escapeHtml(title)}"` : ""
        if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith("#")) {
          return `<a href="${escapeHtml(href)}"${attrs} class="external" target="_blank" rel="noopener noreferrer">${text}</a>`
        }
        return `<a href="${escapeHtml(href)}"${attrs}>${text}</a>`
      },
    },
  })

  // The list under the note. It is the one copy of each citation: the hover
  // card reads from it, so there is nothing to keep in step. With no
  // JavaScript, or on paper, it is the ordinary apparatus a reader expects.
  const footnoteList = () => {
    if (!notes.order.length) return ""
    const items = notes.order
      .map((key) => {
        const slug = slugify(key)
        const html = marked.parseInline(notes.defs.get(key))
        state.footnotes.push({ key: slug, html })
        return `<li id="fn-${slug}"><span class="fn-text">${html}</span> <a class="fn-back" href="#fnref-${slug}" aria-label="Back to reference">↩</a></li>`
      })
      .join("\n")
    return `\n<section class="footnotes" aria-label="References">\n<ol>\n${items}\n</ol>\n</section>\n`
  }

  return {
    render: (markdown) => {
      const { body, defs } = extractFootnotes(markdown)
      notes.defs = defs
      notes.order = []
      notes.seen = new Map()

      const html = marked.parse(body)
      const list = footnoteList()

      // A citation nobody cites is dead weight, and silently dropping it is how
      // a reference goes missing without anyone noticing.
      for (const key of defs.keys()) {
        if (!notes.order.includes(key)) state.orphanFootnotes.push(key)
      }

      return html + list
    },
    state,
  }
}

// Readable text for the search index and the hover previews. The HTML is ours,
// so stripping tags is enough and avoids a second parse of the markdown.
export function htmlToText(html) {
  return html
    .replace(/<a class="anchor"[^>]*>#<\/a>/g, "")
    // Reference markers are numbers with no space around them, so left in they
    // would weld a digit onto the end of a sentence in every excerpt.
    .replace(/<sup class="fn[^"]*">[\s\S]*?<\/sup>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}
