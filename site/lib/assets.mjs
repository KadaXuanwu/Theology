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

// The client is a handful of sibling modules importing each other, so this is
// the only import shape there is to find.
const LOCAL_IMPORT = /from "\.\/([\w.-]+\.js)"/g

const importsOf = (source) => [...new Set([...source.matchAll(LOCAL_IMPORT)].map((m) => m[1]))]

// Depth first, so a module is hashed only after every name inside it has been
// rewritten. Its hash has to describe what it will actually contain, or a
// changed dependency would leave the parent under its old name.
async function hashModule(name, ctx) {
  const done = ctx.named.get(name)
  if (done) return done
  if (ctx.open.has(name)) throw new Error(`asset rewrite: ${name} is part of an import cycle`)
  ctx.open.add(name)

  let source = await readFile(join(ctx.dir, name), "utf8")
  for (const dep of importsOf(source)) {
    const hashed = await hashModule(dep, ctx)
    source = source.split(`"./${dep}"`).join(`"./${hashed}"`)
  }
  for (const [needle, replacement] of ctx.rewrites) {
    if (!source.includes(needle)) continue
    source = source.split(needle).join(replacement)
    ctx.replaced.add(needle)
  }

  const hashed = stamp(name, source)
  ctx.files.push({ name: `assets/${hashed}`, contents: source })
  ctx.named.set(name, hashed)
  ctx.open.delete(name)
  return hashed
}

export async function buildAssets(assetsDir, { graphData, searchData, chatEndpoint = "" }) {
  const files = []

  const graphJson = stamp("graph.json", graphData)
  const searchJson = stamp("search-index.json", searchData)
  files.push({ name: graphJson, contents: graphData }, { name: searchJson, contents: searchData })

  // The names and values the client cannot know for itself: two hashed data
  // files, and the endpoint the chat talks to.
  const rewrites = new Map([
    ['"graph.json"', `"${graphJson}"`],
    ['"search-index.json"', `"${searchJson}"`],
  ])
  if (chatEndpoint) rewrites.set('"__CHAT_ENDPOINT__"', JSON.stringify(chatEndpoint))

  const ctx = { dir: assetsDir, files, rewrites, named: new Map(), open: new Set(), replaced: new Set() }

  const app = await hashModule("app.js", ctx)
  // The chat is its own entry point rather than part of app.js, so that with no
  // endpoint configured the browser never downloads it and the pages carry no
  // trace of it. That is the state a fork or a CI build is in.
  const chat = chatEndpoint ? await hashModule("chat.js", ctx) : null

  // A silent miss here would ship a stale reference, so make it loud.
  const missed = [...rewrites.keys()].filter((needle) => !ctx.replaced.has(needle))
  if (missed.length) throw new Error(`asset rewrite: nothing to replace for ${missed.join(", ")}`)

  const cssSource = await readFile(join(assetsDir, "style.css"), "utf8")
  const cssName = stamp("style.css", cssSource)
  files.push({ name: `assets/${cssName}`, contents: cssSource })

  // Not hashed: it is named in a link tag the browser re-reads anyway, and a
  // hashed favicon is the one file whose stale copy nobody would notice.
  const favicon = await readFile(join(assetsDir, "favicon.svg"), "utf8")
  files.push({ name: "assets/favicon.svg", contents: favicon })

  return {
    files,
    refs: {
      css: `assets/${cssName}`,
      app: `assets/${app}`,
      favicon: "assets/favicon.svg",
      chat: chat ? `assets/${chat}` : null,
    },
  }
}
