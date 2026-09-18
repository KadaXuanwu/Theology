// Lints every note in the vault against the rules the pipeline promises and a
// program can check: frontmatter shape, heading order, link direction, dashes,
// footnotes, and whether the sources' URLs still answer. The rules themselves
// are written in .agents/skills/source-node/references; this is the part of
// them that fails the build instead of waiting for a reader to notice.
//
//   node site/lint.mjs [--vault Theology] [--offline]
//
// A failure is a rule broken. A warning is a judgement call the pipeline's
// delivery step reads and the author decides: length, a long sentence, a URL
// that answered with something other than a page.

import { readFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { readFlags } from "./lib/args.mjs"
import { SECTIONS, parseFrontmatter, readVault } from "./lib/content.mjs"
import { extractFootnotes } from "./lib/markdown.mjs"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

// The template of each kind, from references/templates.md. Same order, no gaps.
export const HEADINGS = {
  argument: ["Description", "Based On", "Countered By", "Limits", "Related"],
  claim: ["Description", "Origins", "Based On", "Carries", "Disputed By", "Limits"],
  evidence: ["Description", "Shows", "Limits", "Source"],
  person: ["Description", "Work", "Stated Position"],
  term: ["Description", "Source"],
}

const TYPE = {
  "argument-for": "argument",
  "argument-against": "argument",
  claim: "claim",
  evidence: "evidence",
  person: "person",
  term: "term",
}

// Nothing links up the stack. An argument may link another argument, except
// from its Description, which is checked separately.
export const MAY_LINK = {
  argument: ["argument", "claim", "evidence", "person", "term"],
  claim: ["claim", "evidence", "person", "term"],
  evidence: ["evidence", "person", "term"],
  person: ["person", "term"],
  term: ["term"],
}

const STATUSES = ["stub", "drafted", "sourced", "sourced-stale"]
// Prose words on a sourced node, footnote definitions excluded. People and
// terms have no limit.
export const WORDS = { min: 500, max: 2000 }
export const SENTENCE = 30

const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g
const MARKER = /\[\^([^\]\s]+)\]/g
// A URL may carry one level of brackets of its own, "(1675-1729)" in a
// Wikisource title; the bracket that closes a markdown link is not part of it.
const URL = /https?:\/\/(?:[^\s()\]>"']|\([^\s()]*\))+/g

const typeOf = (note) => TYPE[note.section.kind] ?? null

// The body split at its top level headings, in order.
function sections(body) {
  const out = []
  let current = null
  for (const line of body.split(/\r?\n/)) {
    const h = /^# (.+?)\s*$/.exec(line)
    if (h) {
      current = { heading: h[1], lines: [] }
      out.push(current)
      continue
    }
    if (current) current.lines.push(line)
  }
  return out
}

// Markdown stripped down to the words a reader reads.
const plain = (text) =>
  text
    .replace(/\[\[[^\]]*\|([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(MARKER, "")
    .replace(/^#.*$/gm, "")
    .replace(/[*_`]/g, "")

const countWords = (text) => text.split(/\s+/).filter(Boolean).length

// `resolve` maps a title to a note or null. `raw` is the file as written, for
// the checks the parsed frontmatter cannot make.
export function lintNote(note, { resolve: resolveTitle, raw }) {
  const fails = []
  const warns = []
  const type = typeOf(note)
  if (!type) {
    fails.push(`the folder ${note.section.dir} is not one the vault knows`)
    return { fails, warns }
  }

  const fm = note.frontmatter
  if (fm.type !== type) fails.push(`type is "${fm.type ?? ""}", the folder says ${type}`)
  if (!STATUSES.includes(note.status)) fails.push(`status is "${note.status ?? ""}"`)
  // Obsidian rewrites an inline list into the block form the moment a note is
  // opened, so an inline list is a diff nobody made waiting to happen.
  for (const m of raw.matchAll(/^(tags|points):[ \t]*\[([^\]]*)\]/gm)) {
    if (m[2].trim() !== "") fails.push(`${m[1]} is an inline list, write it one per line`)
  }
  if (type === "term" && !fm.kind) warns.push("no kind in the frontmatter")

  const { body: prose, defs } = extractFootnotes(note.body)
  const parts = sections(prose)
  const found = parts.map((p) => p.heading)
  const want = HEADINGS[type]
  if (found.join("|") !== want.join("|")) {
    fails.push(`headings are [${found.join(", ")}], the template says [${want.join(", ")}]`)
  }
  if (note.status !== "stub") {
    for (const p of parts) if (p.lines.join("").trim() === "") fails.push(`${p.heading} is empty`)
  }

  for (const p of parts) {
    for (const m of p.lines.join("\n").matchAll(WIKILINK)) {
      const target = resolveTitle(m[1].trim())
      if (!target) {
        fails.push(`[[${m[1].trim()}]] matches no note`)
        continue
      }
      const to = typeOf(target)
      if (!MAY_LINK[type].includes(to)) {
        fails.push(`[[${target.title}]] runs up the stack (${type} to ${to})`)
      } else if (type === "argument" && to === "argument" && p.heading === "Description") {
        fails.push(`the Description links the argument [[${target.title}]]`)
      }
    }
  }
  for (const def of defs.values()) {
    for (const m of def.matchAll(WIKILINK)) {
      if (!resolveTitle(m[1].trim())) fails.push(`[[${m[1].trim()}]] in a citation matches no note`)
    }
  }

  // No dash is punctuation. The en dash lives inside a range and nowhere else.
  // Citations are exempt: a title is printed as its publisher printed it.
  for (const line of prose.split(/\r?\n/)) {
    const where = `"${line.trim().slice(0, 60)}"`
    if (line.includes("—")) fails.push(`an em dash in ${where}`)
    for (const m of line.matchAll(/–/g)) {
      const before = line[m.index - 1] ?? " "
      const after = line[m.index + 1] ?? " "
      if (!/[0-9A-Za-z]/.test(before) || !/[0-9A-Za-z]/.test(after)) fails.push(`an en dash as punctuation in ${where}`)
    }
    if (/\S\s+-{1,2}\s+\S/.test(line)) fails.push(`a hyphen as a dash in ${where}`)
  }

  const used = new Set([...prose.matchAll(MARKER)].map((m) => m[1]))
  for (const key of used) if (!defs.has(key)) fails.push(`[^${key}] has no citation at the foot of the note`)
  for (const key of defs.keys()) {
    if (!used.has(key)) fails.push(`the citation [^${key}] is never cited`)
    if (!/^[a-z0-9-]+$/.test(key)) fails.push(`[^${key}] is not a lower case surname-year key`)
  }

  // Length and sentence length are the pipeline's promises about a sourced
  // node, so they are read there and nowhere else: a stub is the author's
  // notes, a draft is unverified, and stale text predates the rule.
  const text = plain(parts.flatMap((p) => p.lines).join("\n"))
  const words = countWords(text)
  if (note.status === "sourced" && !["person", "term"].includes(type)) {
    if (words < WORDS.min) warns.push(`${words} words of prose, under ${WORDS.min}`)
    if (words > WORDS.max) warns.push(`${words} words of prose, over ${WORDS.max}`)
    // A line break ends a sentence too, so a list of bullets is not one
    // sentence, and a split needs a capital or a quote after the stop, so
    // "p. 652" and "c. 1225" stay whole.
    const long = text
      .split(/\n|(?<=[.!?])\s+(?=[A-Z"“(\[])/)
      .map(countWords)
      .filter((n) => n > SENTENCE)
    if (long.length) {
      warns.push(`${long.length} sentence${long.length === 1 ? "" : "s"} over ${SENTENCE} words, the longest ${Math.max(...long)}`)
    }
  }

  return { fails, warns }
}

export function urlsOf(defs) {
  const set = new Set()
  for (const def of defs.values()) for (const m of def.matchAll(URL)) set.add(m[0].replace(/[.,;:]+$/, ""))
  return [...set]
}

// A 404 or a host that does not exist is a dead source. Anything else the
// server says (a paywall's 403, a rate limit, a timeout) is unverified, not
// wrong, and comes back as a warning for a person to look at.
export async function probe(url) {
  const attempt = async (method) => {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; theology-lint; +https://github.com/KadaXuanwu/Theology)" },
    })
    return res.status
  }
  try {
    let status = await attempt("HEAD")
    if ([403, 404, 405].includes(status)) status = await attempt("GET")
    if (status === 404 || status === 410) return { dead: `answers ${status}` }
    if (status >= 400) return { unsure: `answers ${status}` }
    return {}
  } catch (error) {
    const code = error.cause?.code ?? error.name
    if (code === "ENOTFOUND") return { dead: "no such host" }
    return { unsure: code === "TimeoutError" ? "timed out" : code }
  }
}

async function main() {
  const flag = readFlags()
  const vaultDir = resolve(repoRoot, flag("vault", "Theology"))
  const offline = process.argv.includes("--offline")

  const { notes } = await readVault(vaultDir, () => {})
  const byTitle = new Map(notes.map((n) => [n.title, n]))
  const byLower = new Map(notes.map((n) => [n.title.toLowerCase(), n]))
  const resolveTitle = (t) => byTitle.get(t) ?? byLower.get(t.toLowerCase()) ?? null

  let failures = 0
  let warnings = 0
  const say = (title, { fails, warns }) => {
    if (!fails.length && !warns.length) return
    console.log(title)
    for (const f of fails) console.log(`  FAIL ${f}`)
    for (const w of warns) console.log(`  warn ${w}`)
    failures += fails.length
    warnings += warns.length
  }

  const urls = new Map()
  for (const note of notes) {
    const raw = await readFile(note.path, "utf8")
    say(note.title, lintNote(note, { resolve: resolveTitle, raw }))
    for (const url of urlsOf(extractFootnotes(note.body).defs)) {
      if (!urls.has(url)) urls.set(url, [])
      urls.get(url).push(note.title)
    }
  }

  // The templates are skipped by the build, so they are read here on their own.
  for (const section of SECTIONS) {
    const path = join(vaultDir, section.dir, "_Template.md")
    let raw
    try {
      raw = await readFile(path, "utf8")
    } catch {
      say(`${section.dir}/_Template.md`, { fails: ["missing"], warns: [] })
      continue
    }
    const { data, body } = parseFrontmatter(raw, path)
    const note = { title: `${section.dir}/_Template.md`, section, body, frontmatter: data, status: data.status }
    say(note.title, lintNote(note, { resolve: resolveTitle, raw }))
  }

  if (offline) {
    console.log(`\n${urls.size} source URLs not checked (--offline)`)
  } else {
    const list = [...urls.keys()]
    const results = new Map()
    let next = 0
    const worker = async () => {
      while (next < list.length) {
        const url = list[next++]
        results.set(url, await probe(url))
      }
    }
    await Promise.all(Array.from({ length: 8 }, worker))
    const dead = list.filter((u) => results.get(u).dead)
    const unsure = list.filter((u) => results.get(u).unsure)
    if (dead.length || unsure.length) console.log("\nsources")
    for (const u of dead) console.log(`  FAIL ${u} ${results.get(u).dead} (${urls.get(u).join(", ")})`)
    for (const u of unsure) console.log(`  warn ${u} ${results.get(u).unsure} (${urls.get(u).join(", ")})`)
    failures += dead.length
    warnings += unsure.length
    console.log(`\n${list.length} source URLs checked, ${dead.length} dead, ${unsure.length} unverified`)
  }

  console.log(`${notes.length} notes, ${failures} failure${failures === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}`)
  if (failures) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`\nLint failed: ${error.message}`)
    process.exitCode = 1
  })
}
