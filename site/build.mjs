// Builds the public site from the vault.
//
//   node site/build.mjs [--vault Theology] [--out dist]
//
// Read the notes, wire them to each other, hash the assets, write the pages.
// Each of those steps lives in site/lib; this file is the order they happen in.
// Nothing is ever written back to the vault.

import { mkdir, readdir, rm, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { readFlags } from "./lib/args.mjs"
import { buildAssets } from "./lib/assets.mjs"
import { readVault } from "./lib/content.mjs"
import { chatCorpus, graphData, searchData } from "./lib/data.mjs"
import { gitDates } from "./lib/dates.mjs"
import { linkNotes } from "./lib/notes.mjs"
import { renderPages } from "./lib/pages.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..")

const flag = readFlags()
const vaultDir = resolve(repoRoot, flag("vault", "Theology"))
const outDir = resolve(repoRoot, flag("out", "dist"))
const assetsDir = join(here, "assets")

// The chat Worker's URL, printed by `wrangler deploy`. Set CHAT_ENDPOINT="" in
// the environment to build without it: no bubble is rendered at all, which is
// what a fork wanting nothing to do with Cloudflare should get.
const CHAT_ENDPOINT = process.env.CHAT_ENDPOINT ?? "https://theology-chat.kadaxuanwu.workers.dev"

// Every note page sits two directories deep, which is the prefix its links back
// to the site root need.
const NOTE_DEPTH = 2

const warnings = []
const warn = (message) => warnings.push(message)

const write = async (relPath, contents) => {
  const target = join(outDir, relPath)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, contents, "utf8")
}

async function build() {
  const started = Date.now()

  const { sections, notes } = await readVault(vaultDir, warn)
  if (notes.length === 0) throw new Error(`No notes found in ${vaultDir}`)

  linkNotes(notes, { rootPrefix: "../".repeat(NOTE_DEPTH), warn })

  const dates = await gitDates(
    notes.map((n) => n.path),
    repoRoot,
    warn,
  )
  for (const note of notes) note.dates = dates.get(note.path)

  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })

  // Hashed before any page is written, because every page references them.
  const { files: assetFiles, refs: assets } = await buildAssets(assetsDir, {
    graphData: graphData(notes),
    searchData: searchData(notes),
    chatEndpoint: CHAT_ENDPOINT,
  })
  for (const file of assetFiles) await write(file.name, file.contents)
  await write("chat-corpus.json", chatCorpus(notes))

  for (const page of renderPages({ notes, sections, assets })) {
    await write(page.path, page.html)
  }

  // Tells GitHub Pages to serve the files as they are rather than running them
  // through Jekyll, which would drop anything with a leading underscore.
  await write(".nojekyll", "")

  report(notes.length, await countFiles(outDir, ".html"), started)
}

function report(noteCount, pageCount, started) {
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  console.log(`Built ${noteCount} notes into ${pageCount} pages in ${seconds}s -> ${outDir}`)
  if (warnings.length === 0) return
  console.log(`\n${warnings.length} warning${warnings.length === 1 ? "" : "s"}:`)
  for (const message of warnings) console.log(`  ${message}`)
}

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
