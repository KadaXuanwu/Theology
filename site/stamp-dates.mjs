// Copies real dates out of git history into the frontmatter of the build copy.
// Usage: node site/stamp-dates.mjs <repo-root> <vault-subdir> <content-dir>
//
// The build copies the vault out of the repo, so Quartz loses the git history it
// would normally read dates from and falls back to file mtime, which in CI is
// just the checkout time. This writes the dates in before Quartz parses them.
// Only the copy is touched, never the vault.

import { execFile } from "node:child_process"
import { readdir, readFile, writeFile } from "node:fs/promises"
import { join, relative, sep } from "node:path"
import { promisify } from "node:util"

const run = promisify(execFile)
const [repoRoot, vaultSubdir, contentDir] = process.argv.slice(2)

if (!repoRoot || !vaultSubdir || !contentDir) {
  console.error("usage: node stamp-dates.mjs <repo-root> <vault-subdir> <content-dir>")
  process.exit(1)
}

async function git(args) {
  try {
    const { stdout } = await run("git", ["-C", repoRoot, ...args], { maxBuffer: 1024 * 1024 })
    return stdout.trim()
  } catch {
    return ""
  }
}

async function datesFor(repoPath) {
  const modified = await git(["log", "-1", "--format=%aI", "--", repoPath])
  const addedLog = await git(["log", "--follow", "--diff-filter=A", "--format=%aI", "--", repoPath])
  const added = addedLog.split("\n").filter(Boolean).pop()
  return { created: added || modified, modified }
}

async function* markdownFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".")) continue
      yield* markdownFiles(full)
    } else if (entry.name.endsWith(".md")) {
      yield full
    }
  }
}

let stamped = 0
let skipped = 0

for await (const file of markdownFiles(contentDir)) {
  const rel = relative(contentDir, file).split(sep).join("/")
  const { created, modified } = await datesFor(`${vaultSubdir}/${rel}`)

  if (!modified) {
    skipped++ // not committed yet, let Quartz fall back to the filesystem
    continue
  }

  const text = await readFile(file, "utf8")
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fm) {
    skipped++
    continue
  }
  if (/^(created|modified):/m.test(fm[1])) {
    skipped++ // the note sets its own dates, leave them alone
    continue
  }

  const patched = text.replace(fm[0], `---\n${fm[1]}\ncreated: ${created}\nmodified: ${modified}\n---`)
  await writeFile(file, patched, "utf8")
  stamped++
}

console.log(`stamped dates on ${stamped} files, skipped ${skipped}`)
