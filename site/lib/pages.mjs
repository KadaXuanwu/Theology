// Which pages the site has, as a list of { path, html }.
//
// Nothing here touches the filesystem. The build writes what this yields, which
// keeps "which pages exist and what is on them" separate from "where the bytes
// go", and lets the whole page set be built and inspected without a disk.

import { slugify } from "./content.mjs"
import { formatDate } from "./dates.mjs"
import { escapeHtml } from "./markdown.mjs"
import { countLinks } from "./data.mjs"
import {
  graphPage,
  listPage,
  nodeGraphPage,
  notFoundPage,
  notePage,
  sectionGraphPage,
  tagGraphPage,
  tagIndexPage,
} from "./templates.mjs"

const LEDE = `A research vault mapping arguments for and against Christianity, and the claims and evidence each one rests on.
The goal is not to prove one position over the other. It is to make every argument traceable, so a reader can follow the reasoning back to its sources and judge it themselves.`

// How far up a page sits from the site root, as a prefix its links can use.
// Every page is served from a directory, so the depth is the number of segments
// in its url.
const rootFor = (depth) => "../".repeat(depth)

const inSection = (notes, section) => notes.filter((n) => n.section.dir === section.dir)

// Notes grouped the way every list on the site groups them, with empty folders
// dropped rather than left as a heading with nothing under it.
const groupBySection = (sections, notes) =>
  sections
    .map((section) => ({
      kind: section.kind,
      label: section.label,
      blurb: section.blurb,
      items: inSection(notes, section),
    }))
    .filter((group) => group.items.length > 0)

function* notePages({ notes, sections, assets }) {
  for (const note of notes) {
    yield {
      path: `${note.url}/index.html`,
      html: notePage({
        note,
        root: rootFor(2),
        dateLabel: `Updated ${formatDate(note.dates.modified)}`,
        sections,
        notes,
        assets,
      }),
    }
    // The graph view of the same note, reachable from the header switch.
    yield {
      path: `${note.url}/graph/index.html`,
      html: nodeGraphPage({ note, root: rootFor(3), sections, notes, assets }),
    }
  }
}

function* homePage({ notes, sections, assets }) {
  const unfinished = notes.filter((n) => n.status && n.status !== "sourced").length
  const summary = `<p class="summary">${notes.length} notes, ${countLinks(notes)} links between them.${
    unfinished ? ` ${unfinished} are still marked stub or drafted and have not been through source verification.` : ""
  }</p>`

  yield {
    path: "index.html",
    html: listPage({
      title: "Overview",
      lede: LEDE.split("\n").join("<br>"),
      groups: groupBySection(sections, notes),
      root: rootFor(0),
      current: null,
      sections,
      notes,
      assets,
      extra: summary,
    }),
  }
}

// Folder pages, each with a graph view of its own so the header switch and the
// tree never have to drop the reader back to the overview.
function* sectionPages({ notes, sections, assets }) {
  for (const section of sections) {
    const items = inSection(notes, section)
    if (items.length === 0) continue
    const slug = slugify(section.dir)

    yield {
      path: `${slug}/index.html`,
      html: listPage({
        title: section.label,
        lede: section.blurb ?? `Notes in ${section.label}.`,
        groups: [{ kind: section.kind, label: section.label, blurb: null, items }],
        root: rootFor(1),
        current: slug,
        graphUrl: `${slug}/graph/`,
        railKind: section.kind,
        sections,
        notes,
        assets,
      }),
    }
    yield {
      path: `${slug}/graph/index.html`,
      html: sectionGraphPage({ section, root: rootFor(2), sections, notes, assets }),
    }
  }
}

// Every tag, and the notes under it. Sorted so the cloud reads alphabetically.
function tagsOf(notes) {
  const tags = new Map()
  for (const note of notes) {
    for (const tag of note.tags) {
      if (!tags.has(tag)) tags.set(tag, [])
      tags.get(tag).push(note)
    }
  }
  return [...tags.entries()].sort((a, b) => a[0].localeCompare(b[0], "en"))
}

function* tagPages({ notes, sections, assets }) {
  const tagList = tagsOf(notes)

  yield {
    path: "tags/index.html",
    html: tagIndexPage({ tags: tagList, root: rootFor(1), sections, notes, assets }),
  }
  // The tags have two views like everything else the site can be on, so
  // enlarging their graph stays with the tags instead of dropping the reader on
  // the overview with their combination thrown away.
  yield {
    path: "tags/graph/index.html",
    html: tagGraphPage({ tags: tagList, root: rootFor(2), sections, notes, assets }),
  }

  for (const [tag, list] of tagList) {
    yield {
      path: `tags/${slugify(tag)}/index.html`,
      html: listPage({
        title: `#${tag}`,
        // A tag is usually arrived at from a note, so this is where the reader
        // finds out the tags can be combined at all.
        lede: `${list.length} ${list.length === 1 ? "note" : "notes"} tagged #${escapeHtml(tag)}. <a href="${rootFor(2)}tags/?tags=${encodeURIComponent(tag)}">Combine it with other tags</a>.`,
        groups: sections
          .map((section) => ({
            kind: section.kind,
            label: section.label,
            blurb: null,
            items: list.filter((n) => n.section.dir === section.dir),
          }))
          .filter((group) => group.items.length > 0),
        root: rootFor(2),
        current: `tags/${slugify(tag)}`,
        // The map of one tag is the tags graph with that tag picked, so the
        // switch lands somewhere the reader can carry on picking from.
        graphUrl: `tags/graph/?tags=${encodeURIComponent(tag)}`,
        // The rail previews what the page is about, which here is the notes
        // under this one tag rather than the whole vault.
        railNotes: list.map((n) => n.title),
        sections,
        notes,
        assets,
      }),
    }
  }
}

export function* renderPages({ notes, sections, assets }) {
  yield* notePages({ notes, sections, assets })
  yield* homePage({ notes, sections, assets })
  yield* sectionPages({ notes, sections, assets })
  yield* tagPages({ notes, sections, assets })

  yield { path: "graph/index.html", html: graphPage({ root: rootFor(1), sections, notes, assets }) }
  // The 404 is served from any depth, so its links are absolute.
  yield { path: "404.html", html: notFoundPage({ root: "/", sections, notes, assets }) }
}
