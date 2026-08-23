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

// One renderer per page so headings and links can be collected as they render.
// `resolve(title)` returns { url, title } for a known note, or null.
export function createRenderer({ resolve, rootPrefix }) {
  const state = { headings: [], links: new Set(), broken: [] }
  const usedIds = new Map()

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
          return `<a class="wikilink" href="${rootPrefix}${note.url}/${anchor}" data-note="${escapeHtml(
            note.title,
          )}">${text}</a>`
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

  return {
    render: (markdown) => marked.parse(markdown),
    state,
  }
}

// Readable text for the search index and the hover previews. The HTML is ours,
// so stripping tags is enough and avoids a second parse of the markdown.
export function htmlToText(html) {
  return html
    .replace(/<a class="anchor"[^>]*>#<\/a>/g, "")
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
