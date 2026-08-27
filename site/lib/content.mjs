// Reading the vault: frontmatter, slugs, and the note index everything else builds on.

import { readdir, readFile } from "node:fs/promises"
import { basename, join } from "node:path"

// Folders the site knows about, in the order they should appear.
// A folder not listed here still gets built, it just sorts last and has no blurb.
export const SECTIONS = [
  {
    dir: "Arguments Against",
    kind: "argument-against",
    label: "Arguments Against",
    blurb: "Arguments that challenge the Christian position.",
  },
  {
    dir: "Arguments For",
    kind: "argument-for",
    label: "Arguments For",
    blurb: "Arguments that support it.",
  },
  {
    dir: "Claims",
    kind: "claim",
    label: "Claims",
    blurb: "Statements an argument depends on.",
  },
  {
    dir: "Evidence",
    kind: "evidence",
    label: "Evidence",
    blurb: "Artefacts, studies and texts a claim can point to.",
  },
]

// Frontmatter here is small and predictable: scalars, inline lists and block
// lists. Anything else is skipped with a warning rather than guessed at, so a
// surprise in a note shows up in the build log instead of silently vanishing.
export function parseFrontmatter(text, label, warn) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { data: {}, body: text }

  const data = {}
  const lines = match[1].split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim() || line.trimStart().startsWith("#")) continue

    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!kv) {
      warn?.(`${label}: could not read frontmatter line "${line.trim()}"`)
      continue
    }

    const [, key, rawValue] = kv
    const value = rawValue.trim()

    if (value === "") {
      // Either a block list on the following lines, or an empty value.
      const items = []
      while (i + 1 < lines.length && /^\s*-\s+/.test(lines[i + 1])) {
        items.push(unquote(lines[++i].replace(/^\s*-\s+/, "").trim()))
      }
      data[key] = items
    } else if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((part) => unquote(part.trim()))
        .filter(Boolean)
    } else {
      data[key] = unquote(value)
    }
  }

  return { data, body: text.slice(match[0].length) }
}

function unquote(value) {
  return value.replace(/^["'](.*)["']$/, "$1")
}

// URL segment for a note or tag. Obsidian filenames carry punctuation that has
// no business in a URL, so apostrophes are dropped rather than escaped and "&"
// is spelled out.
export function slugify(name) {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function listMarkdown(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("_"))
    .map((e) => e.name)
}

// Reads every note in the vault and returns them keyed by title, which is what
// [[wikilinks]] address. Folder order follows SECTIONS.
export async function readVault(vaultDir, warn) {
  const present = (await readdir(vaultDir, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)

  const known = new Set(SECTIONS.map((s) => s.dir))
  const sections = [
    ...SECTIONS.filter((s) => present.includes(s.dir)),
    ...present
      .filter((dir) => !known.has(dir))
      .sort((a, b) => a.localeCompare(b, "en"))
      .map((dir) => ({ dir, kind: "note", label: dir, blurb: null })),
  ]

  const notes = []
  const takenSlugs = new Map()

  for (const section of sections) {
    const files = await listMarkdown(join(vaultDir, section.dir))
    for (const file of files.sort((a, b) => a.localeCompare(b, "en"))) {
      const path = join(vaultDir, section.dir, file)
      const title = basename(file, ".md")
      const raw = await readFile(path, "utf8")
      const { data, body } = parseFrontmatter(raw, title, warn)

      const slug = slugify(title)
      const url = `${slugify(section.dir)}/${slug}`
      const clash = takenSlugs.get(url)
      if (clash) {
        throw new Error(`"${title}" and "${clash}" both slug to /${url}. Rename one.`)
      }
      takenSlugs.set(url, title)

      notes.push({
        title,
        file,
        path,
        url,
        section,
        body,
        frontmatter: data,
        status: data.status ?? null,
        tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
        links: [], // filled in once every title is known
        backlinks: [],
      })
    }
  }

  return { sections, notes }
}
