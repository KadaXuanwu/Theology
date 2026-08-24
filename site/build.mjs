// Builds the public site from the vault.
//
//   node site/build.mjs [--vault Theology] [--out dist]
//
// Reads the notes, resolves [[wikilinks]], works out backlinks and the graph,
// then writes a plain static site. Nothing is ever written back to the vault.

import { execFile } from "node:child_process"
import { cp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import { buildAssets } from "./lib/assets.mjs"
import { readVault, slugify } from "./lib/content.mjs"
import { createRenderer, htmlToText } from "./lib/markdown.mjs"
import {
  graphPage,
  listPage,
  nodeGraphPage,
  notFoundPage,
  notePage,
  sectionGraphPage,
  tagIndexPage,
} from "./lib/templates.mjs"

const run = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..")

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const vaultDir = resolve(repoRoot, flag("vault", "Theology"))
const outDir = resolve(repoRoot, flag("out", "dist"))
const assetsDir = join(here, "assets")

const LEDE = `A research vault mapping arguments for and against Christianity, and the claims and evidence each one rests on.
The goal is not to prove one position over the other. It is to make every argument traceable, so a reader can follow the reasoning back to its sources and judge it themselves.`

const warnings = []
const warn = (message) => warnings.push(message)

// Dates come from git so a rebuild does not restamp every note with today.
async function gitDates(paths) {
  const dates = new Map()
  let usable = true
  try {
    await run("git", ["-C", repoRoot, "rev-parse", "--git-dir"])
  } catch {
    usable = false
    warn("not a git checkout, falling back to file timestamps for dates")
  }

  for (const path of paths) {
    let modified = null
    let created = null
    if (usable) {
      try {
        const rel = path.slice(repoRoot.length + 1).split("\\").join("/")
        const { stdout } = await run("git", ["-C", repoRoot, "log", "-1", "--format=%aI", "--", rel])
        modified = stdout.trim() || null
        const { stdout: addedLog } = await run("git", [
          "-C",
          repoRoot,
          "log",
          "--follow",
          "--diff-filter=A",
          "--format=%aI",
          "--",
          rel,
        ])
        created = addedLog.trim().split("\n").filter(Boolean).pop() ?? modified
      } catch {
        // Falls through to the filesystem below.
      }
    }
    if (!modified) {
      const info = await stat(path)
      modified = new Date(info.mtimeMs).toISOString()
      created = new Date(info.birthtimeMs || info.mtimeMs).toISOString()
    }
    dates.set(path, { created, modified })
  }
  return dates
}

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })

const write = async (relPath, contents) => {
  const target = join(outDir, relPath)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, contents, "utf8")
}

const rootFor = (depth) => "../".repeat(depth)

async function build() {
  const started = Date.now()
  const { sections, notes } = await readVault(vaultDir, warn)

  if (notes.length === 0) {
    throw new Error(`No notes found in ${vaultDir}`)
  }

  // Wikilinks address notes by exact filename, with a case-insensitive fallback
  // so a stray capital does not silently break a link.
  const byTitle = new Map(notes.map((n) => [n.title, n]))
  const byLower = new Map(notes.map((n) => [n.title.toLowerCase(), n]))
  const resolveNote = (title) => byTitle.get(title) ?? byLower.get(title.toLowerCase()) ?? null

  const dates = await gitDates(notes.map((n) => n.path))

  for (const note of notes) {
    const renderer = createRenderer({ resolve: resolveNote, rootPrefix: rootFor(2) })
    note.html = renderer.render(note.body)
    note.headings = renderer.state.headings
    note.linkTitles = [...renderer.state.links].filter((t) => t !== note.title)

    for (const target of renderer.state.broken) {
      warn(`${note.title}: [[${target}]] does not match any note`)
    }

    const text = htmlToText(note.html)
    note.text = text
    note.excerpt = text.slice(0, 320)
    note.shortExcerpt = trimTo(text.replace(/^Description\s*/i, ""), 155)
    note.dates = dates.get(note.path)
  }

  for (const note of notes) {
    note.links = note.linkTitles.map((t) => byTitle.get(t)).filter(Boolean)
  }
  for (const note of notes) {
    note.backlinks = notes
      .filter((other) => other !== note && other.linkTitles.includes(note.title))
      .sort((a, b) => a.title.localeCompare(b.title, "en"))
  }

  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })

  const graphData = JSON.stringify({
    nodes: notes.map((n) => ({
      id: n.title,
      url: n.url,
      kind: n.section.kind,
      degree: n.links.length + n.backlinks.length,
    })),
    links: dedupeLinks(notes),
  })

  const searchData = JSON.stringify(
    notes.map((n) => ({
      title: n.title,
      url: n.url,
      kind: n.section.kind,
      section: n.section.label,
      status: n.status,
      tags: n.tags,
      excerpt: n.shortExcerpt,
      text: n.text.toLowerCase(),
    })),
  )

  // Hashed before any page is written, because each page references them.
  const { files: assetFiles, refs: assets } = await buildAssets(assetsDir, { graphData, searchData })
  for (const file of assetFiles) await write(file.name, file.contents)

  // Note pages
  for (const note of notes) {
    await write(
      `${note.url}/index.html`,
      notePage({
        note,
        root: rootFor(2),
        dateLabel: `Updated ${formatDate(note.dates.modified)}`,
        sections,
        notes,
        assets,
      }),
    )

    // The graph view of the same note, reachable from the header switch.
    await write(
      `${note.url}/graph/index.html`,
      nodeGraphPage({ note, root: rootFor(3), sections, notes, assets }),
    )
  }

  // Home
  const groups = sections
    .map((section) => ({
      kind: section.kind,
      label: section.label,
      blurb: section.blurb,
      items: notes.filter((n) => n.section.dir === section.dir),
    }))
    .filter((g) => g.items.length > 0)

  const unfinished = notes.filter((n) => n.status && n.status !== "sourced").length
  const summary = `<p class="summary">${notes.length} notes, ${countLinks(notes)} links between them.${
    unfinished ? ` ${unfinished} are still marked stub or drafted and have not been through source verification.` : ""
  }</p>`

  await write(
    "index.html",
    listPage({
      title: "Overview",
      lede: LEDE.split("\n").join("<br>"),
      groups,
      root: rootFor(0),
      current: null,
      sections,
      notes,
      assets,
      extra: summary,
    }),
  )

  // Folder pages, each with a graph view of its own so the header switch and
  // the tree never have to drop the reader back to the overview.
  for (const section of sections) {
    const items = notes.filter((n) => n.section.dir === section.dir)
    if (items.length === 0) continue
    const slug = slugify(section.dir)
    await write(
      `${slug}/index.html`,
      listPage({
        title: section.label,
        lede: section.blurb ?? `Notes in ${section.label}.`,
        groups: [{ kind: section.kind, label: section.label, blurb: null, items }],
        root: rootFor(1),
        current: slug,
        graphUrl: `${slug}/graph/`,
        sections,
        notes,
        assets,
      }),
    )
    await write(
      `${slug}/graph/index.html`,
      sectionGraphPage({ section, root: rootFor(2), sections, notes, assets }),
    )
  }

  // Tag pages
  const tagMap = new Map()
  for (const note of notes) {
    for (const tag of note.tags) {
      if (!tagMap.has(tag)) tagMap.set(tag, [])
      tagMap.get(tag).push(note)
    }
  }
  const tagList = [...tagMap.entries()].sort((a, b) => a[0].localeCompare(b[0], "en"))

  await write("tags/index.html", tagIndexPage({ tags: tagList, root: rootFor(1), sections, notes, assets }))

  for (const [tag, list] of tagList) {
    await write(
      `tags/${slugify(tag)}/index.html`,
      listPage({
        title: `#${tag}`,
        lede: `${list.length} ${list.length === 1 ? "note" : "notes"} tagged ${tag}.`,
        groups: sections
          .map((section) => ({
            kind: section.kind,
            label: section.label,
            blurb: null,
            items: list.filter((n) => n.section.dir === section.dir),
          }))
          .filter((g) => g.items.length > 0),
        root: rootFor(2),
        current: `tags/${slugify(tag)}`,
        sections,
        notes,
        assets,
      }),
    )
  }

  // Graph page and 404
  await write("graph/index.html", graphPage({ root: rootFor(1), sections, notes, assets }))
  await write("404.html", notFoundPage({ root: "/", sections, notes, assets }))

  // Assets and data now carry their content hash, written above.
  await write(".nojekyll", "")

  const pages = await countFiles(outDir, ".html")
  console.log(
    `Built ${notes.length} notes into ${pages} pages in ${((Date.now() - started) / 1000).toFixed(1)}s -> ${outDir}`,
  )
  if (warnings.length) {
    console.log(`\n${warnings.length} warning${warnings.length === 1 ? "" : "s"}:`)
    for (const message of warnings) console.log(`  ${message}`)
  }
}

function trimTo(text, limit) {
  if (text.length <= limit) return text
  const cut = text.slice(0, limit)
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(", "), cut.lastIndexOf(" "))
  return `${cut.slice(0, stop > limit * 0.5 ? stop : limit).trim()}…`
}

function dedupeLinks(notes) {
  const seen = new Set()
  const links = []
  for (const note of notes) {
    for (const target of note.links) {
      const key = [note.title, target.title].sort().join("\u0000")
      if (seen.has(key)) continue
      seen.add(key)
      links.push({ source: note.title, target: target.title })
    }
  }
  return links
}

const countLinks = (notes) => dedupeLinks(notes).length

async function countFiles(dir, ext) {
  let total = 0
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) total += await countFiles(join(dir, entry.name), ext)
    else if (entry.name.endsWith(ext)) total++
  }
  return total
}

build().catch((error) => {
  console.error(`\nBuild failed: ${error.message}`)
  process.exitCode = 1
})
