// Content hashed asset names.
//
// Everything the browser caches gets its hash in the filename, so a deploy can
// never leave a reader running last week's JavaScript against this week's HTML.
// Without this the files are served as plain `assets/app.js` with a ten minute
// max-age, and a returning visitor keeps the stale copy well past that.

import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

const hash = (contents) => createHash("sha256").update(contents).digest("hex").slice(0, 10)

const stamp = (name, contents) => {
  const dot = name.lastIndexOf(".")
  return `${name.slice(0, dot)}.${hash(contents)}${name.slice(dot)}`
}

// The order matters: each file is hashed only after every reference inside it
// has been rewritten, otherwise its name would not describe what it contains.
export async function buildAssets(assetsDir, { graphData, searchData }) {
  const files = []

  const graphJson = stamp("graph.json", graphData)
  const searchJson = stamp("search-index.json", searchData)
  files.push({ name: graphJson, contents: graphData }, { name: searchJson, contents: searchData })

  const graphSource = await readFile(join(assetsDir, "graph.js"), "utf8")
  const graphJs = stamp("graph.js", graphSource)
  files.push({ name: `assets/${graphJs}`, contents: graphSource })

  let appSource = await readFile(join(assetsDir, "app.js"), "utf8")
  appSource = replaceOnce(appSource, './from "./graph.js"', `from "./${graphJs}"`, 'import of graph.js')
  appSource = replaceOnce(appSource, '"search-index.json"', `"${searchJson}"`, "search index fetch")
  appSource = replaceOnce(appSource, '"graph.json"', `"${graphJson}"`, "graph data fetch")
  const appJs = stamp("app.js", appSource)
  files.push({ name: `assets/${appJs}`, contents: appSource })

  const cssSource = await readFile(join(assetsDir, "style.css"), "utf8")
  const cssName = stamp("style.css", cssSource)
  files.push({ name: `assets/${cssName}`, contents: cssSource })

  const favicon = await readFile(join(assetsDir, "favicon.svg"), "utf8")
  files.push({ name: "assets/favicon.svg", contents: favicon })

  return {
    files,
    refs: { css: `assets/${cssName}`, app: `assets/${appJs}`, favicon: "assets/favicon.svg" },
  }
}

// A silent miss here would ship a stale reference, so make it loud.
function replaceOnce(source, needle, replacement, what) {
  const target = needle.startsWith("./") ? needle.slice(2) : needle
  if (!source.includes(target)) {
    throw new Error(`asset rewrite: could not find the ${what} in app.js`)
  }
  return source.replace(target, replacement)
}
