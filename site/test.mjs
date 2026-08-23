// Checks the parts that are easy to get quietly wrong: frontmatter, slugs,
// wikilink resolution, and whether the graph layout actually settles.
//
//   node site/test.mjs        (expects `node site/build.mjs` to have run)

import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { parseFrontmatter, slugify } from "./lib/content.mjs"
import { createRenderer, htmlToText } from "./lib/markdown.mjs"
import { neighbourhood, seededRandom, stepForces, wrapLabel } from "./assets/graph.js"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

// The graph data carries a content hash in its name, so find it rather than
// hard coding a filename that changes with the content.
const readGraphData = async () => {
  const dir = resolve(repoRoot, "dist")
  const { readdir } = await import("node:fs/promises")
  const name = (await readdir(dir)).find((f) => /^graph.[a-f0-9]+.json$/.test(f))
  if (!name) throw new Error("no hashed graph.json in dist, run the build first")
  return JSON.parse(await readFile(resolve(dir, name), "utf8"))
}

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
  const data = await readGraphData()
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

console.log("dragging keeps the layout live")
{
  // A held node must keep pulling its neighbours for as long as it is held.
  // Without an alpha target the simulation cools after a few seconds and the
  // rest of the graph freezes mid drag.
  const a = { id: "a", x: 0, y: 0, vx: 0, vy: 0, pinned: true }
  const b = { id: "b", x: 40, y: 0, vx: 0, vy: 0, pinned: false }
  const links = [{ source: a, target: b }]
  const nodes = [a, b]

  let alpha = 1
  for (let i = 0; i < 600; i++) alpha = stepForces(nodes, links, alpha, 0)
  check("alpha reaches zero with no target", alpha < 0.004, alpha.toExponential(2))

  let held = 1
  for (let i = 0; i < 600; i++) held = stepForces(nodes, links, held, 0.3)
  check("alpha holds at the target while dragging", Math.abs(held - 0.3) < 0.01, held.toFixed(4))

  // drag the pinned node far away; the free one should follow it
  a.x = 600
  a.y = 0
  const startGap = Math.abs(b.x - a.x)
  let live = 0.3
  for (let i = 0; i < 400; i++) live = stepForces(nodes, links, live, 0.3)
  const endGap = Math.abs(b.x - a.x)
  check("a held node still drags its neighbour along", endGap < startGap, `gap ${startGap.toFixed(0)} -> ${endGap.toFixed(0)}`)
  check("the held node itself never drifts", a.x === 600 && a.y === 0)
}

console.log("a released node comes back to the middle")
{
  // Dragging a node far out and letting go must not leave it parked there.
  // Plain alpha decay gives a fixed movement budget, so a long drag ends with
  // the layout stretched and off centre. Holding a floor until it stops moving
  // is what brings it home.
  const data = await readGraphData()
  const build = () => {
    const rand = seededRandom("global")
    const nodes = data.nodes.map((n, i) => {
      const angle = (i / data.nodes.length) * Math.PI * 2
      const spread = 60 + rand() * 90
      return {
        ...n,
        x: Math.cos(angle) * spread + (rand() - 0.5) * 24,
        y: Math.sin(angle) * spread + (rand() - 0.5) * 24,
        vx: 0,
        vy: 0,
        pinned: false,
      }
    })
    const index = new Map(nodes.map((n) => [n.id, n]))
    return { nodes, links: data.links.map((l) => ({ source: index.get(l.source), target: index.get(l.target) })) }
  }
  const radius = (ns) => Math.max(...ns.map((n) => Math.hypot(n.x, n.y)))
  const centroid = (ns) => Math.hypot(
    ns.reduce((s, n) => s + n.x, 0) / ns.length,
    ns.reduce((s, n) => s + n.y, 0) / ns.length,
  )
  const fastest = (ns, a) => Math.max(...ns.map((n) => Math.hypot(n.vx, n.vy) * a))

  const g = build()
  let a = 1
  while (a > 0.004) a = stepForces(g.nodes, g.links, a, 0)
  const baseRadius = radius(g.nodes)

  // hold one node far outside the layout, long enough for the rest to follow
  const victim = g.nodes[0]
  victim.pinned = true
  let held = 0.3
  for (let t = 0; t < 300; t++) {
    victim.x = 1500
    victim.y = 900
    held = stepForces(g.nodes, g.links, held, 0.3)
  }
  check("the drag really did pull the layout out of shape", radius(g.nodes) > baseRadius * 3)

  // release, exactly as the code does
  victim.pinned = false
  let r = Math.max(held, 0.3)
  let ticks = 0
  while (ticks < 6000) {
    r = stepForces(g.nodes, g.links, r, 0.12)
    ticks++
    if (ticks > 30 && fastest(g.nodes, r) < 0.15) break
  }

  check("it comes to rest rather than running forever", ticks < 3000, `${ticks} ticks`)
  check(
    "the layout is compact again",
    radius(g.nodes) < baseRadius * 1.35,
    `${radius(g.nodes).toFixed(0)} vs base ${baseRadius.toFixed(0)}`,
  )
  check("and centred again", centroid(g.nodes) < 40, `centroid ${centroid(g.nodes).toFixed(0)} from origin`)
  check(
    "the dragged node is back inside the layout",
    Math.hypot(victim.x, victim.y) < baseRadius,
    `at ${Math.hypot(victim.x, victim.y).toFixed(0)}, layout radius ${baseRadius.toFixed(0)}`,
  )
}

console.log("the layout is settled before it is shown")
{
  const data = await readGraphData()
  const build = () => {
    const rand = seededRandom("global")
    const nodes = data.nodes.map((n, i) => {
      const angle = (i / data.nodes.length) * Math.PI * 2
      const spread = 60 + rand() * 90
      return {
        ...n,
        x: Math.cos(angle) * spread + (rand() - 0.5) * 24,
        y: Math.sin(angle) * spread + (rand() - 0.5) * 24,
        vx: 0,
        vy: 0,
        pinned: false,
      }
    })
    const index = new Map(nodes.map((n) => [n.id, n]))
    return { nodes, links: data.links.map((l) => ({ source: index.get(l.source), target: index.get(l.target) })) }
  }
  const settle = (g) => {
    let a = 1
    let steps = 0
    while (a > 0.004 && steps < 600) {
      a = stepForces(g.nodes, g.links, a, 0)
      steps++
    }
    return steps
  }

  const first = build()
  const started = Date.now()
  const steps = settle(first)
  const took = Date.now() - started
  check("settles within the step budget", steps < 600, `${steps} steps`)
  check("cheap enough to do before painting", took < 120, `${took}ms`)

  const second = build()
  settle(second)
  const same = first.nodes.every(
    (n, i) => Math.abs(n.x - second.nodes[i].x) < 1e-9 && Math.abs(n.y - second.nodes[i].y) < 1e-9,
  )
  check("same layout every time, so the graph does not jump between loads", same)

  // A settled force layout is not the ring it starts from: the distance of each
  // node from the centre should vary a lot more than it did at the start.
  const spreadOf = (nodes) => {
    const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length
    const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length
    const radii = nodes.map((n) => Math.hypot(n.x - cx, n.y - cy))
    const mean = radii.reduce((s, r) => s + r, 0) / radii.length
    return Math.sqrt(radii.reduce((s, r) => s + (r - mean) ** 2, 0) / radii.length) / mean
  }
  const ringSpread = spreadOf(build().nodes)
  const settledSpread = spreadOf(first.nodes)
  check(
    "settled layout differs from the ring it starts as",
    settledSpread > ringSpread,
    `ring ${ringSpread.toFixed(3)} -> settled ${settledSpread.toFixed(3)}`,
  )
}

console.log("the graph is never left invisible")
{
  // The canvas must not need an animation to become visible. Anywhere the
  // animation does not progress, an opacity keyframe leaves a blank graph.
  const sheet = await readFile(resolve(repoRoot, "site/assets/style.css"), "utf8")
  const canvasRule = sheet.match(/\.graph-mount canvas \{[^}]*}/s)?.[0] ?? ""
  check("found the canvas rule", canvasRule.length > 0)
  check(
    "it does not depend on an animation to be visible",
    !/animation|opacity/.test(canvasRule),
    canvasRule.replace(/\s+/g, " ").slice(0, 100),
  )
}

console.log("reheating never yanks the camera")
{
  // The loop auto-fits the view while alpha is above 0.35, which is meant for
  // the first settle only. A reheat above that would re-fit mid gesture and
  // drag the camera out from under the reader.
  const source = await readFile(resolve(repoRoot, "site/assets/graph.js"), "utf8")
  const threshold = Number(source.match(/alpha > ([\d.]+)\) fit\(\)/)?.[1])
  const reheats = [...source.matchAll(/reheat\(([\d.]+)\)/g)].map((m) => Number(m[1]))
  check("found the auto-fit threshold", Number.isFinite(threshold), String(threshold))
  check("found the reheat calls", reheats.length > 0, reheats.join(", "))
  check(
    "every reheat stays below it",
    reheats.every((v) => v < threshold),
    `${reheats.join(", ")} vs ${threshold}`,
  )
}

console.log("the enlarged graph separates neighbours from context")
{
  const data = await readGraphData()
  const focus = data.nodes.find((n) => n.degree > 3).id

  const direct = new Set([focus])
  for (const l of data.links) {
    if (l.source === focus) direct.add(l.target)
    if (l.target === focus) direct.add(l.source)
  }

  const sub = neighbourhood(data, focus, 2)
  const hopOf = new Map(sub.nodes.map((n) => [n.id, n.hop]))

  check("the focus is hop zero", hopOf.get(focus) === 0)
  check(
    "everything it links to is hop one",
    [...direct].filter((id) => id !== focus).every((id) => hopOf.get(id) === 1),
  )
  check(
    "everything else it pulls in is further out",
    sub.nodes.filter((n) => !direct.has(n.id)).every((n) => n.hop === 2),
  )
  check("there is something to dim", sub.nodes.some((n) => n.hop === 2), `${sub.nodes.length} nodes`)

  // depth 1 must stay exactly what the sidebar shows, all of it undimmed
  const rail = neighbourhood(data, focus, 1)
  check("the sidebar view has nothing past the first hop", rail.nodes.every((n) => n.hop <= 1))
  check("and matches the direct neighbours exactly", rail.nodes.length === direct.size, `${rail.nodes.length} vs ${direct.size}`)

  // several graphs share one data object, so hop counts must not leak
  const other = data.nodes.find((n) => n.id !== focus && !direct.has(n.id))?.id
  if (other) {
    const second = neighbourhood(data, other, 2)
    check(
      "focusing elsewhere does not inherit the previous hop counts",
      second.nodes.find((n) => n.id === other)?.hop === 0,
    )
    check(
      "and the shared data is left untouched",
      data.nodes.every((n) => n.hop === undefined),
    )
  }

  // the drawing has to actually act on the hop
  const source = await readFile(resolve(repoRoot, "site/assets/graph.js"), "utf8")
  const fades = source.match(/const HOP_FADE = {([^}]*)}/)?.[1] ?? ""
  const amount = (part) => Number(fades.match(new RegExp(part + ": ([0-9.]+)"))?.[1])
  check("the circle, its label and its links fade by their own amounts", ["node", "label", "link"].every((p) => amount(p) > 0 && amount(p) < 1), fades.trim())
  check("the circle recedes furthest", amount("node") < amount("link") && amount("node") < amount("label"), `node ${amount("node")}, link ${amount("link")}, label ${amount("label")}`)
  check("the label stays the most readable of the three", amount("label") > amount("link"), `label ${amount("label")} vs link ${amount("link")}`)
  check("and the drawing actually uses them", ["fade(node, \"node\")","fade(node, \"label\")","fade(link.source, \"link\")"].every((needle) => source.includes(needle)))
}

console.log("node labels wrap to two short rows")
{
  // A rough stand-in for canvas text metrics at the size labels are drawn.
  const measure = (t) => t.length * 5.6
  const maxWidth = 92
  const wrap = (t) => wrapLabel(measure, t, maxWidth, 2)

  const data = await readGraphData()
  const titles = data.nodes.map((n) => n.id)

  check(
    "no label runs past the width limit",
    titles.every((t) => wrap(t).every((line) => measure(line) <= maxWidth)),
    titles.find((t) => wrap(t).some((line) => measure(line) > maxWidth)) ?? "",
  )
  check(
    "and none runs to a third row",
    titles.every((t) => wrap(t).length <= 2),
    titles.find((t) => wrap(t).length > 2) ?? "",
  )
  check(
    "long titles actually use the second row",
    titles.filter((t) => wrap(t).length === 2).length > 0,
    `${titles.filter((t) => wrap(t).length === 2).length} of ${titles.length} wrap`,
  )
  check(
    "short titles stay on one row",
    wrap("Jesus Existed").length === 1,
    JSON.stringify(wrap("Jesus Existed")),
  )

  // It splits on spaces. A regex that lost its backslash would split on the
  // letter s instead, quietly shredding every title that contains one.
  check("it breaks on words, not on letters", wrap("Jesus Existed")[0] === "Jesus Existed")
  check(
    "a title too long for two rows is trimmed, not dropped",
    wrap("God Punishes Humans for a Flaw He Built into Them").at(-1).endsWith("…"),
  )
  check("a single unbreakable word is trimmed too", wrap("Supercalifragilisticexpialidocious").length === 1)
  check("empty text yields nothing to draw", wrap("").length === 0)
  check(
    "punctuation and ampersands survive",
    wrap("Peoples, Duda & Marlowe 2016").join(" ").startsWith("Peoples, Duda &"),
    JSON.stringify(wrap("Peoples, Duda & Marlowe 2016")),
  )
}

console.log("labels clear the ring and hold their size")
{
  const source = await readFile(resolve(repoRoot, "site/assets/graph.js"), "utf8")

  // The focused and hovered nodes carry a ring outside the circle. If the label
  // offset ignores it, it sits hard against that ring.
  const num = (name, key) => Number(source.match(new RegExp(name + "[^}]*" + key + ":\\s*([0-9.]+)"))?.[1])
  const ringGap = num("const RING = \\{", "gap")
  const ringWidth = num("const RING = \\{", "width")
  const labelGap = num("const LABEL = \\{", "gap")

  check("the ring geometry is declared", Number.isFinite(ringGap) && Number.isFinite(ringWidth), `gap ${ringGap}, width ${ringWidth}`)
  check("the label gap is declared", Number.isFinite(labelGap), String(labelGap))

  const ringOuter = ringGap + ringWidth / 2
  check(
    "the label starts outside the ring, not on it",
    ringOuter + labelGap > ringOuter,
    `ring reaches r+${ringOuter}, label starts r+${ringOuter + labelGap}`,
  )
  check("and the drawing uses the ring extent, not the bare radius", source.includes("r + RING_EXTENT + LABEL.gap"))
  check("the ring is drawn at the same radius the label allows for", source.includes("arc(x, y, r + RING.gap"))

  // Bolding on hover re-measures the text, so the label rewraps and reads as
  // though it grew. The weight stays fixed and hover shows through colour.
  const font = source.match(/ctx\.font = `[^`]*`/)?.[0] ?? ""
  check("the label font is declared", font.length > 0, font)
  check("its weight does not change on hover", !/hovered/.test(font), font)
  check("hover is still signalled, by colour", source.includes("node === hovered ? colors.text : colors.muted"))

  // Leaving the canvas has to drop the tooltip with the highlight.
  const leave = source.match(/function onPointerLeave\(\) \{[\s\S]*?\n  \}/)?.[0] ?? ""
  check("leaving the canvas clears the tooltip", /canvas\.title = ""/.test(leave), leave.replace(/\s+/g, " ").slice(0, 90))
}

console.log("local graph")
{
  const data = await readGraphData()
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

console.log("text and graph are two views of the same note")
{
  const { readdir } = await import("node:fs/promises")
  const dist = resolve(repoRoot, "dist")
  const read = (p) => readFile(resolve(dist, p), "utf8")

  const notePath = "claims/jesus-existed"
  const text = await read(`${notePath}/index.html`)
  const graph = await read(`${notePath}/graph/index.html`)

  const tabs = (html) =>
    [...html.matchAll(/<(a|span) class="view-tab([^"]*)"([^>]*)>(?:<svg[\s\S]*?<\/svg>)<span>([^<]+)<\/span>/g)].map((m) => ({
      label: m[4],
      active: m[2].includes("is-active"),
      href: m[3].match(/href="([^"]+)"/)?.[1] ?? null,
    }))

  const onText = tabs(text)
  const onGraph = tabs(graph)

  check("both views offer both tabs", onText.length === 2 && onGraph.length === 2, `${onText.length} / ${onGraph.length}`)
  check("text view marks Text active", onText.find((t) => t.label === "Text")?.active === true)
  check("graph view marks Graph active", onGraph.find((t) => t.label === "Graph")?.active === true)
  check(
    "the active tab is not a link, so it cannot navigate to itself",
    onText.find((t) => t.active)?.href === null && onGraph.find((t) => t.active)?.href === null,
  )
  check(
    "each links to the other view of the same note",
    onText.find((t) => t.label === "Graph")?.href?.endsWith(`${notePath}/graph/`) === true &&
      onGraph.find((t) => t.label === "Text")?.href?.endsWith(`${notePath}/`) === true,
  )

  check("the graph view focuses that note", graph.includes('data-focus="Jesus Existed"'))
  check("and reaches further than the sidebar graph does", graph.includes('data-depth="2"'))
  check("the note stays selected in the sidebar", graph.includes('aria-current="page" data-note="Jesus Existed"'))
  check("the graph view drops the prose", !graph.includes('class="note-body"'))

  // every note gets one
  const notes = JSON.parse(await readFile(resolve(dist, (await readdir(dist)).find((f) => /^search-index\./.test(f))), "utf8"))
  let missing = []
  for (const n of notes) {
    try {
      await readFile(resolve(dist, `${n.url}/graph/index.html`), "utf8")
    } catch {
      missing.push(n.url)
    }
  }
  check("every note has a graph view", missing.length === 0, missing.join(", "))
}

console.log("the rail leads with the graph, and the enlarged view can shrink back")
{
  const dist = resolve(repoRoot, "dist")
  const read = (p) => readFile(resolve(dist, p), "utf8")

  const note = await read("claims/jesus-existed/index.html")
  const rail = note.match(/<aside class="sidebar-right">[\s\S]*?<\/aside>/)?.[0] ?? ""
  check("the rail has both panels", rail.includes("panel-graph") && rail.includes("panel-toc"))
  check(
    "the graph sits above the contents",
    rail.indexOf("panel-graph") < rail.indexOf("panel-toc"),
    `graph at ${rail.indexOf("panel-graph")}, contents at ${rail.indexOf("panel-toc")}`,
  )

  // the shrink control mirrors the enlarge arrow it came from
  const collapse = (html) => {
    const m = html.match(/<a class="panel-expand graph-collapse" href="([^"]*)" aria-label="([^"]*)"/)
    return m ? { href: m[1], label: m[2] } : null
  }

  const nodeGraph = await read("claims/jesus-existed/graph/index.html")
  const shrink = collapse(nodeGraph)
  check("the enlarged view has a shrink control", shrink !== null)
  check("it returns to that note's text", shrink?.href === "../../../claims/jesus-existed/", String(shrink?.href))
  check("and says so", /Back to the text/.test(shrink?.label ?? ""), String(shrink?.label))
  check("it sits opposite the legend, at the top right", nodeGraph.includes('<div class="graph-head-side">'))

  const fullGraph = await read("graph/index.html")
  const shrinkFull = collapse(fullGraph)
  check("the whole vault view has one too", shrinkFull !== null)
  check("returning to the overview", shrinkFull?.href === "../", String(shrinkFull?.href))

  // enlarge and shrink are a round trip
  const railPanel = note.match(/<section class="panel panel-graph">[\s\S]*?<\/section>/)?.[0] ?? ""
  const enlarge = railPanel.match(/class="panel-expand" href="([^"]*)"/)?.[1]
  check("enlarging and shrinking lead back to each other", enlarge === "../../claims/jesus-existed/graph/", String(enlarge))
}

console.log("the sidebar preview can be enlarged")
{
  const dist = resolve(repoRoot, "dist")
  const read = (p) => readFile(resolve(dist, p), "utf8")
  const panel = (html) => html.match(/<section class="panel panel-graph">[\s\S]*?<\/section>/)?.[0] ?? ""
  const expandHref = (html) => panel(html).match(/class="panel-expand" href="([^"]*)"/)?.[1] ?? null

  const note = await read("evidence/mesha-stele/index.html")
  check("the preview has an enlarge control", expandHref(note) !== null)
  check(
    "it opens that note's graph, not the whole vault",
    expandHref(note) === "../../evidence/mesha-stele/graph/",
    String(expandHref(note)),
  )
  check(
    "it is labelled for a screen reader",
    /class="panel-expand"[^>]*aria-label="Enlarge the graph for Mesha Stele"/.test(panel(note)),
  )
  check("it sits in the heading row, on the preview it belongs to", panel(note).includes('<div class="panel-head">'))
  check("the whole vault is still one click away", panel(note).includes("See the whole vault"))

  // On a list page there is no note to focus, so enlarging means the full graph.
  for (const [page, expected] of [
    ["index.html", "graph/"],
    ["arguments-for/index.html", "../graph/"],
    ["tags/historicity/index.html", "../../graph/"],
  ]) {
    const html = await read(page)
    check(`${page} enlarges to the full graph`, expandHref(html) === expected, String(expandHref(html)))
    check(`${page} does not repeat itself with a second link`, !panel(html).includes("See the whole vault"))
  }
}

console.log("the two whole-vault links look the same")
{
  // Setting the colour on the paragraph loses to the global link rule, so the
  // anchor itself has to carry it. That is what made one of these two identical
  // links come out accent coloured while the other stayed muted.
  const sheet = await readFile(resolve(repoRoot, "site/assets/style.css"), "utf8")
  const footRule = sheet.match(/\.graph-foot a \{[^}]*\}/)?.[0] ?? ""
  const panelRule = sheet.match(/\.panel-link \{[^}]*\}/)?.[0] ?? ""
  const colourOf = (rule) => rule.match(/color:\s*(var\([^)]*\))/)?.[1] ?? null

  check("the graph view link colours the anchor, not its wrapper", colourOf(footRule) !== null, footRule.replace(/\s+/g, " "))
  check(
    "and matches the same link in the sidebar",
    colourOf(footRule) === colourOf(panelRule),
    `${colourOf(footRule)} vs ${colourOf(panelRule)}`,
  )

  // A tiny inline-block dot baseline-aligned in a 1.5rem heading sits low and
  // hard against the first letter, so the heading has to lay it out instead.
  const heading = sheet.match(/body\.is-graph \.graph-head h1 \{[^}]*\}/)?.[0] ?? ""
  check(
    "the graph heading lays its dot out rather than leaving it on the baseline",
    /display:\s*flex/.test(heading) && /gap:/.test(heading) && /align-items:\s*center/.test(heading),
    heading.replace(/\s+/g, " "),
  )
}

console.log("home is reachable and knows when it is current")
{
  const dist = resolve(repoRoot, "dist")
  const read = (p) => readFile(resolve(dist, p), "utf8")
  const home = await read("index.html")
  const fullGraph = await read("graph/index.html")
  const note = await read("claims/jesus-existed/index.html")

  const homeItem = (html) => html.match(/<li class="tree-home"><a href="([^"]*)"([^>]*)>/)
  check("the tree starts with Home", /<ul class="tree-root"><li class="tree-home">/.test(note))
  check("home links to the site root from a nested page", homeItem(note)?.[1] === "../../")
  check("home is marked current on the overview", homeItem(home)?.[2].includes('aria-current="page"'))
  check("and on the overview's graph view", homeItem(fullGraph)?.[2].includes('aria-current="page"'))
  check("but not while reading a note", !homeItem(note)?.[2].includes("aria-current"))
  check("the overview's Graph tab opens the whole vault", home.includes('href="graph/"'))
  check("and that page graphs everything, not one note", fullGraph.includes('data-graph="global"'))
}

console.log("cached assets carry a content hash")
{
  // Without this a deploy leaves returning readers on the old JavaScript: the
  // files are served under a fixed name with a ten minute max-age, so a browser
  // that already has them keeps them. Every cacheable asset must change name
  // when its bytes change.
  const { readdir } = await import("node:fs/promises")
  const dist = resolve(repoRoot, "dist")
  const assetFiles = await readdir(resolve(dist, "assets"))
  const rootFiles = await readdir(dist)

  const hashed = /\.[a-f0-9]{10}\.(js|css|json)$/
  const cacheable = [
    ...assetFiles.filter((f) => /\.(js|css)$/.test(f)).map((f) => `assets/${f}`),
    ...rootFiles.filter((f) => /\.json$/.test(f)),
  ]

  check("found the cacheable assets", cacheable.length >= 4, cacheable.join(", "))
  check(
    "every one is content hashed",
    cacheable.every((f) => hashed.test(f)),
    cacheable.filter((f) => !hashed.test(f)).join(", ") || "all hashed",
  )

  const page = await readFile(resolve(dist, "graph/index.html"), "utf8")
  const referenced = [...page.matchAll(/(?:href|src)="[^"]*assets\/([^"]+)"/g)].map((m) => m[1])
  const missing = referenced.filter((f) => !assetFiles.includes(f))
  check("the html points at files that exist", missing.length === 0, missing.join(", "))
  check(
    "and at the hashed names, not the bare ones",
    referenced.filter((f) => /\.(js|css)$/.test(f)).every((f) => hashed.test(f)),
    referenced.join(", "),
  )
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`)
process.exitCode = failures === 0 ? 0 : 1
