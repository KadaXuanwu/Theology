// Checks the parts that are easy to get quietly wrong: frontmatter, slugs,
// wikilink resolution, and whether the graph layout actually settles.
//
//   node site/test.mjs        (expects `node site/build.mjs` to have run)

import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { parseFrontmatter, slugify } from "./lib/content.mjs"
import { createRenderer, htmlToText } from "./lib/markdown.mjs"
import { neighbourhood, seededRandom, stepForces } from "./assets/graph.js"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

let failures = 0
const check = (name, condition, detail = "") => {
  if (condition) {
    console.log(`  ok   ${name}`)
  } else {
    failures++
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`)
  }
}

console.log("frontmatter")
{
  const inline = parseFrontmatter("---\ntype: claim\ntags: [a, b]\n---\nBody here", "t")
  check("inline list", inline.data.tags.join(",") === "a,b")
  check("scalar", inline.data.type === "claim")
  check("body split", inline.body === "Body here")

  const block = parseFrontmatter("---\ntags:\n  - one\n  - two\nstatus: stub\n---\nX", "t")
  check("block list", block.data.tags.join(",") === "one,two")
  check("key after block list", block.data.status === "stub")

  const none = parseFrontmatter("# Just markdown", "t")
  check("no frontmatter", Object.keys(none.data).length === 0 && none.body === "# Just markdown")

  const empty = parseFrontmatter("---\ntags: []\n---\nY", "t")
  check("empty inline list", Array.isArray(empty.data.tags) && empty.data.tags.length === 0)
}

console.log("slugs")
{
  check("apostrophes dropped", slugify("Coerced Love Isn't Love") === "coerced-love-isnt-love")
  check("ampersand spelled out", slugify("Peoples, Duda & Marlowe 2016") === "peoples-duda-and-marlowe-2016")
  check("accents folded", slugify("Café Naïve") === "cafe-naive")
  check("no leading or trailing dashes", slugify("  -- Hello --  ") === "hello")
}

console.log("wikilinks")
{
  const known = { "Jesus Existed": { title: "Jesus Existed", url: "claims/jesus-existed" } }
  const r = createRenderer({ resolve: (t) => known[t] ?? null, rootPrefix: "../../" })
  const html = r.render(
    "# One\nA [[Jesus Existed]], an alias [[Jesus Existed|him]], a miss [[Nope]] and [[Jesus Existed#Evidence]].",
  )
  check("resolved link", html.includes('href="../../claims/jesus-existed/"'))
  check("alias text", html.includes(">him</a>"))
  check("anchor kept", html.includes('href="../../claims/jesus-existed/#evidence"'))
  check("broken flagged", html.includes("is-broken") && r.state.broken[0] === "Nope")
  check("outgoing collected once", [...r.state.links].length === 1)
  check("heading id", r.state.headings[0].id === "one")
  check("text extraction", htmlToText("<p>a <em>b</em></p>") === "a b")

  const dupes = createRenderer({ resolve: () => null, rootPrefix: "" })
  dupes.render("# Limits\n\n# Limits\n")
  check("duplicate heading ids differ", dupes.state.headings.map((h) => h.id).join(",") === "limits,limits-2")
}

console.log("graph layout")
{
  const data = JSON.parse(await readFile(resolve(repoRoot, "dist/graph.json"), "utf8"))
  check("graph has nodes", data.nodes.length > 0, `${data.nodes.length}`)
  check("graph has links", data.links.length > 0, `${data.links.length}`)

  const ids = new Set(data.nodes.map((n) => n.id))
  check(
    "every link endpoint exists",
    data.links.every((l) => ids.has(l.source) && ids.has(l.target)),
  )
  check(
    "no self links",
    data.links.every((l) => l.source !== l.target),
  )

  const rand = seededRandom("global")
  const nodes = data.nodes.map((n, i) => {
    const angle = (i / data.nodes.length) * Math.PI * 2
    const spread = 60 + rand() * 90
    return { ...n, x: Math.cos(angle) * spread, y: Math.sin(angle) * spread, vx: 0, vy: 0, pinned: false }
  })
  const index = new Map(nodes.map((n) => [n.id, n]))
  const links = data.links.map((l) => ({ source: index.get(l.source), target: index.get(l.target) }))

  let alpha = 1
  let steps = 0
  while (alpha > 0.004 && steps < 5000) {
    alpha = stepForces(nodes, links, alpha)
    steps++
  }

  check("settles in reasonable time", steps < 400, `${steps} steps`)
  check(
    "no NaN positions",
    nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y)),
  )

  let minGap = Infinity
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      minGap = Math.min(minGap, Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y))
    }
  }
  check("nodes do not collapse together", minGap > 12, `closest pair ${minGap.toFixed(1)}`)

  const span = Math.max(...nodes.map((n) => Math.hypot(n.x, n.y)))
  check("layout stays bounded", span < 3000, `furthest node at ${span.toFixed(0)}`)

  const linkedAvg = links.reduce((s, l) => s + Math.hypot(l.source.x - l.target.x, l.source.y - l.target.y), 0) / links.length
  let allSum = 0
  let allCount = 0
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      allSum += Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y)
      allCount++
    }
  }
  const allAvg = allSum / allCount
  check(
    "linked nodes sit closer than average",
    linkedAvg < allAvg,
    `linked ${linkedAvg.toFixed(0)} vs all ${allAvg.toFixed(0)}`,
  )
}

console.log("local graph")
{
  const data = JSON.parse(await readFile(resolve(repoRoot, "dist/graph.json"), "utf8"))
  const focus = data.nodes.find((n) => n.degree > 2).id
  const local = neighbourhood(data, focus, 1)

  check("focus included", local.nodes.some((n) => n.id === focus))
  const expected = new Set([focus])
  for (const l of data.links) {
    if (l.source === focus) expected.add(l.target)
    if (l.target === focus) expected.add(l.source)
  }
  check("exactly the neighbours", local.nodes.length === expected.size, `${local.nodes.length} vs ${expected.size}`)
  check(
    "links stay inside the subset",
    local.links.every((l) => expected.has(l.source) && expected.has(l.target)),
  )
  check("unknown focus is empty", neighbourhood(data, "No Such Note", 1).nodes.length === 0)
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`)
process.exitCode = failures === 0 ? 0 : 1
