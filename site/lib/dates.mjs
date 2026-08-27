// Note dates, read from git rather than from the filesystem.
//
// A checkout restamps every file with the moment it was cloned, so file
// timestamps would date the whole vault to the last CI run. Git knows when a
// note was actually added and last touched, which is what a reader wants.

import { execFile } from "node:child_process"
import { stat } from "node:fs/promises"
import { promisify } from "node:util"

const run = promisify(execFile)

// Git wants forward slashes even on Windows, and a path relative to the repo.
const relative = (path, repoRoot) => path.slice(repoRoot.length + 1).split("\\").join("/")

async function fromGit(path, repoRoot) {
  const rel = relative(path, repoRoot)
  const { stdout } = await run("git", ["-C", repoRoot, "log", "-1", "--format=%aI", "--", rel])
  const modified = stdout.trim() || null
  if (!modified) return null

  // --follow so a renamed note keeps the date it was first written, and the
  // last line of the log because git prints newest first.
  const { stdout: added } = await run("git", [
    "-C",
    repoRoot,
    "log",
    "--follow",
    "--diff-filter=A",
    "--format=%aI",
    "--",
    rel,
  ])
  return { created: added.trim().split("\n").filter(Boolean).pop() ?? modified, modified }
}

async function fromDisk(path) {
  const info = await stat(path)
  const modified = new Date(info.mtimeMs).toISOString()
  return { created: new Date(info.birthtimeMs || info.mtimeMs).toISOString(), modified }
}

// { created, modified } for every path, keyed by the path itself.
export async function gitDates(paths, repoRoot, warn) {
  let usable = true
  try {
    await run("git", ["-C", repoRoot, "rev-parse", "--git-dir"])
  } catch {
    usable = false
    warn?.("not a git checkout, falling back to file timestamps for dates")
  }

  const dates = new Map()
  for (const path of paths) {
    let found = null
    if (usable) {
      try {
        found = await fromGit(path, repoRoot)
      } catch {
        // A file git has never seen. The filesystem below is the answer.
      }
    }
    dates.set(path, found ?? (await fromDisk(path)))
  }
  return dates
}

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
