// Generates the site homepage from whatever is in the vault.
// Usage: node site/build-index.mjs <content-dir>
// Writes <content-dir>/index.md. Nothing is written into the vault itself.

import { readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

const contentDir = process.argv[2]
if (!contentDir) {
  console.error("usage: node build-index.mjs <content-dir>")
  process.exit(1)
}

// Folders in the order they should appear, with the line that explains each one.
// Any folder not listed here is appended alphabetically without a blurb.
const SECTIONS = [
  ["Arguments For", "Arguments that support the Christian position."],
  ["Arguments Against", "Arguments that challenge it."],
  ["Claims", "Statements an argument depends on."],
  ["Evidence", "Artefacts, studies and texts a claim can point to."],
]

const INTRO = `A research vault mapping arguments for and against Christianity, and the claims and evidence each one rests on.

The goal is not to prove one position over the other. It is to make every argument traceable, so a reader can follow the reasoning back to its sources and judge it themselves. Every node links to the others it leans on, so a chain can be followed in both directions: from an argument down to the evidence, or from a piece of evidence up to everything that uses it.

Use the graph in the sidebar to see the whole map, or the search to jump straight to a node.`

function frontmatterValue(text, key) {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fm) return null
  const line = fm[1].match(new RegExp(`^${key}:\s*(.+)$`, "m"))
  return line ? line[1].trim() : null
}

async function listNodes(dir) {
  let entries
  try {
    entries = await readdir(join(contentDir, dir), { withFileTypes: true })
  } catch {
    return null // folder does not exist
  }

  const nodes = []
  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (!entry.name.endsWith(".md")) continue
    if (entry.name.startsWith("_") || entry.name === "index.md") continue

    const name = entry.name.slice(0, -3)
    const text = await readFile(join(contentDir, dir, entry.name), "utf8")
    nodes.push({ name, status: frontmatterValue(text, "status") })
  }

  return nodes.sort((a, b) => a.name.localeCompare(b.name, "en"))
}

const known = new Set(SECTIONS.map(([name]) => name))
const all = await readdir(contentDir, { withFileTypes: true })
const extra = all
  .filter((e) => e.isDirectory() && !e.name.startsWith(".") && !known.has(e.name))
  .map((e) => [e.name, null])
  .sort((a, b) => a[0].localeCompare(b[0], "en"))

const parts = ["---", "title: Theology", "---", "", INTRO, ""]
let total = 0

for (const [folder, blurb] of [...SECTIONS, ...extra]) {
  const nodes = await listNodes(folder)
  if (!nodes || nodes.length === 0) continue
  total += nodes.length

  parts.push(`## ${folder}`, "")
  if (blurb) parts.push(blurb, "")
  for (const node of nodes) {
    const suffix = node.status && node.status !== "sourced" ? ` (${node.status})` : ""
    parts.push(`- [[${node.name}]]${suffix}`)
  }
  parts.push("")
}

parts.push(`${total} nodes. Anything marked stub or drafted has not been through source verification yet.`, "")

await writeFile(join(contentDir, "index.md"), parts.join("\n"), "utf8")
console.log(`wrote ${join(contentDir, "index.md")} (${total} nodes)`)
