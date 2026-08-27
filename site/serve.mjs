// Small static server for previewing the built site.
//
//   node site/serve.mjs [--dir dist] [--port 8080]
//
// Serves directory/index.html and falls back to 404.html, which is what GitHub
// Pages does, so what you see locally is what gets published.

import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"
import { dirname, extname, join, normalize, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { readFlags } from "./lib/args.mjs"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const flag = readFlags()
const dir = resolve(repoRoot, flag("dir", "dist"))
const port = Number(flag("port", "8080"))

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
}

async function resolveFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "")
  const target = join(dir, clean)
  if (!target.startsWith(dir)) return null

  try {
    const info = await stat(target)
    if (info.isDirectory()) return resolveFile(join(clean, "index.html"))
    return target
  } catch {
    return null
  }
}

createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname
  let file = await resolveFile(pathname)
  let status = 200

  if (!file) {
    file = await resolveFile("/404.html")
    status = 404
  }
  if (!file) {
    res.writeHead(404, { "content-type": "text/plain" })
    res.end("Not found")
    return
  }

  const body = await readFile(file)
  res.writeHead(status, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    "cache-control": "no-store",
  })
  res.end(body)
}).listen(port, () => {
  console.log(`Serving ${dir} at http://localhost:${port}`)
})
