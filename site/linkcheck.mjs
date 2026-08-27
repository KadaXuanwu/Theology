// Walks every built page and checks that each internal link points at a file
// that exists. Catches a renamed note before it reaches the site.
//
//   node site/linkcheck.mjs [--dir dist]

import { readdir, readFile, stat } from "node:fs/promises"
import { dirname, join, normalize, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { readFlags } from "./lib/args.mjs"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const dist = resolve(repoRoot, readFlags()("dir", "dist"))

async function htmlFiles(dir, found = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await htmlFiles(path, found)
    else if (entry.name.endsWith(".html")) found.push(path)
  }
  return found
}

async function exists(target) {
  try {
    const info = await stat(target)
    if (info.isDirectory()) await stat(join(target, "index.html"))
    return true
  } catch {
    return false
  }
}

const files = await htmlFiles(dist)
const broken = []
let internal = 0
let external = 0
let anchors = 0

for (const file of files) {
  const html = await readFile(file, "utf8")
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const raw = match[1]
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
      external++
      continue
    }
    if (raw.startsWith("#")) {
      anchors++
      continue
    }
    // A query string is not part of the path. "tags/?tags=hell" is a link to
    // tags/index.html with something for the script to read, not to a directory
    // called "?tags=hell".
    const [pathPart] = raw.split(/[?#]/)
    if (!pathPart) continue
    internal++

    const target = pathPart.startsWith("/")
      ? join(dist, pathPart)
      : normalize(join(dirname(file), pathPart))

    if (!(await exists(target))) {
      broken.push(`${file.slice(dist.length + 1)} -> ${raw}`)
    }
  }
}

console.log(`${files.length} pages, ${internal} internal links, ${external} external, ${anchors} anchors`)

if (broken.length) {
  console.log(`\n${broken.length} broken internal link(s):`)
  for (const line of broken) console.log(`  ${line}`)
  process.exitCode = 1
} else {
  console.log("No broken internal links.")
}
