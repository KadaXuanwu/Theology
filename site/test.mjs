// Checks the parts that are easy to get quietly wrong: frontmatter, slugs,
// wikilink resolution, and whether the graph layout actually settles.
//
//   node site/test.mjs        (expects `node site/build.mjs` to have run)

import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import {
  BODY_BUDGET,
  MAX_NOTES,
  buildPrompt,
  catalogue,
  rankingText,
  resolveLinks,
  selectNotes,
} from "../worker/context.js"
import { splitAtOpenLink } from "../worker/index.js"
import { BROKEN, DECLINED, NO_ANSWER, TOO_BUSY, TOO_SLOW, noAnswer } from "../worker/providers.js"
import { loadHistory, render, saveHistory } from "./assets/chat.js"
import { parseFrontmatter, slugify } from "./lib/content.mjs"
import { createRenderer, htmlToText } from "./lib/markdown.mjs"
import {
  FIT,
  RING_EXTENT,
  fitCamera,
  labelExtent,
  neighbourhood,
  ringDash,
  seededRandom,
  stepForces,
  wrapLabel,
} from "./assets/graph.js"

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

  // The note the graph was opened for is ringed, and so is whatever the pointer
  // is on. One solid, one dotted, or the reader cannot tell where they are from
  // what they are reaching for.
  const ringBlock = source.match(/if \(seeded\.has\(node\.id\) \|\| touched\) \{[\s\S]*?\n      \}/)?.[0] ?? ""
  check("hover and drag are the same state to the ring", source.includes("const touched = node === hovered || node === dragging"))
  check("the dots go on only for that state", /if \(touched\) \{[\s\S]*?setLineDash\(ringDash\(/.test(ringBlock), ringBlock.length > 0 ? "found" : "no ring block")
  check("and come off again, so the seeded ring stays solid", ringBlock.includes("ctx.setLineDash([])"))
  check("the round cap is put back too, or the links inherit it", ringBlock.includes('ctx.lineCap = "butt"'))

  // A dash length that does not divide the circumference leaves a long or a
  // short piece at the seam, and node radii differ, so every ring would show a
  // different join.
  for (const radius of [4, 7.5, 11, 26]) {
    const [ink, gap] = ringDash(radius)
    const steps = (2 * Math.PI * radius) / (ink + gap)
    check(
      `the dots close the ring at r=${radius}`,
      Math.abs(steps - Math.round(steps)) < 1e-9 && ink > 0 && gap > ink,
      `${steps.toFixed(6)} steps of ${ink.toFixed(2)} on, ${gap.toFixed(2)} off`,
    )
  }

  // Bolding on hover re-measures the text, so the label rewraps and reads as
  // though it grew. The weight stays fixed and hover shows through colour.
  const font = source.match(/const labelFont = .*/)?.[0] ?? ""
  check("the label font is declared in one place", font.length > 0, font)
  check("its weight does not change on hover", !/hovered/.test(font), font)
  check("and both the drawing and the fit read it from there", source.includes("ctx.font = labelFont(size)"))
  check("hover is still signalled, by colour", source.includes("node === hovered ? colors.text : colors.muted"))

  // Leaving the canvas has to drop the tooltip with the highlight.
  const leave = source.match(/function onPointerLeave\(\) \{[\s\S]*?\n  \}/)?.[0] ?? ""
  check("leaving the canvas clears the tooltip", /canvas\.title = ""/.test(leave), leave.replace(/\s+/g, " ").slice(0, 90))
}

console.log("the opening view leaves room for the labels")
{
  const data = await readGraphData()

  // A stand-in for canvas text metrics at the size labels are drawn.
  const measure = (t) => t.length * 5.6
  const room = (node, scale) => labelExtent(measure, node.id, Math.min(13, 10 + scale))

  // Same start positions and same settling the graph itself uses, so the
  // layouts being fitted are the ones a reader actually gets.
  const layout = (focus, depth) => {
    const subset = focus ? neighbourhood(data, focus, depth) : data
    const rand = seededRandom(Array.isArray(focus) ? focus.join("\u0000") : (focus ?? "global"))
    const nodes = subset.nodes.map((n, i) => {
      const angle = (i / subset.nodes.length) * Math.PI * 2
      const spread = 60 + rand() * 90
      return {
        ...n,
        x: Math.cos(angle) * spread + (rand() - 0.5) * 24,
        y: Math.sin(angle) * spread + (rand() - 0.5) * 24,
        vx: 0,
        vy: 0,
        r: 4 + Math.sqrt(n.degree || 0) * 2.1,
      }
    })
    const index = new Map(nodes.map((n) => [n.id, n]))
    const links = subset.links
      .map((l) => ({ source: index.get(l.source), target: index.get(l.target) }))
      .filter((l) => l.source && l.target)
    let a = 1
    for (let step = 0; step < 600 && a > 0.004; step++) a = stepForces(nodes, links, a, 0)
    return nodes
  }

  // Every pixel the graph draws for a node, in canvas coordinates. The ring
  // counts: a section's graph rings every note in the section, so a whole edge
  // of the layout can be carrying one.
  const drawn = (node, camera, width, height) => {
    const x = (node.x - camera.x) * camera.scale + width / 2
    const y = (node.y - camera.y) * camera.scale + height / 2
    const r = node.r * Math.max(camera.scale, 0.55) + RING_EXTENT
    const { half, drop } = room(node, camera.scale)
    return { left: x - Math.max(r, half), right: x + Math.max(r, half), top: y - r, bottom: y + Math.max(r, r + drop) }
  }

  // The rail runs from 11rem to 20rem tall and shows one hop.
  const rail = [
    ["the smallest rail", 236, 176],
    ["a taller rail", 268, 320],
  ]
  // Full pages, measured off the built site. A note's landscape box is 27px
  // shorter than a section's, which is the breadcrumb row a note carries and a
  // section does not.
  const notePage = [
    ["the enlarged view", 900, 560],
    ["a phone", 340, 420],
    ["a tall phone", 337, 561],
    ["a phone on its side", 626, 145],
  ]
  const sectionPage = [
    ["a desktop", 838, 515],
    ["a phone", 371, 553],
    ["a phone on its side", 626, 172],
  ]

  const claims = data.nodes.filter((n) => n.kind === "claim").map((n) => n.id)
  const against = data.nodes.filter((n) => n.kind === "argument-against").map((n) => n.id)
  // Focus, hops, canvases: each layout at the depth its page actually asks for,
  // on the boxes that page actually gives it. A section is the shape the tree
  // opens when a folder is picked: every note of one kind at once.
  const cases = [
    ["God Is Brutal and Not Merciful", 1, rail],
    ["Jesus Existed", 1, rail],
    [data.nodes[0].id, 1, rail],
    ["God Is Brutal and Not Merciful", 2, notePage],
    ["General Revelation Leaves People Without Excuse", 2, notePage],
    [data.nodes[0].id, 2, notePage],
    [claims, 2, sectionPage],
    [against, 2, sectionPage],
  ]
  const nameOf = (focus) => (Array.isArray(focus) ? `a section of ${focus.length}` : focus)

  let worstBottom = 0
  let clipped = []
  let clippedAtFloor = []
  for (const [focus, depth, canvases] of cases) {
    const nodes = layout(focus, depth)
    for (const [name, width, height] of canvases) {
      const camera = fitCamera(nodes, width, height, room)
      // Once the fit is at its smallest zoom it has nothing left to give.
      const floored = camera.scale <= FIT.min + 1e-9
      for (const node of nodes) {
        const box = drawn(node, camera, width, height)
        if (box.left < 0 || box.right > width || box.top < 0 || box.bottom > height) {
          ;(floored ? clippedAtFloor : clipped).push(`${nameOf(focus)} on ${name}: ${node.id}`)
        }
        worstBottom = Math.max(worstBottom, box.bottom / height)
      }
    }
  }

  check("nothing is cut off while the fit still has room to zoom out", clipped.length === 0, clipped[0] ?? "")
  // The one shape that runs out of room is a busy note on a phone held sideways:
  // around twenty labelled nodes in 145px of height, already at the smallest
  // zoom the graph allows. The floor is what keeps the circles big enough to see
  // at all, and the graph pans, so this is the trade rather than a fit giving up.
  check(
    "and anything cut off had run out of zoom first",
    clippedAtFloor.every((c) => c.includes("on its side")),
    clippedAtFloor.find((c) => !c.includes("on its side")) ?? "",
  )
  check("and the lowest one still reaches the bottom of the canvas", worstBottom > 0.8, worstBottom.toFixed(3))

  // Without the label allowance the old fit really did cut text off, which is
  // what this is here to stop happening again.
  const nodes = layout("God Is Brutal and Not Merciful", 1)
  const blind = fitCamera(nodes, 236, 176, () => ({ half: 0, drop: 0 }))
  check(
    "ignoring labels would push them past the edge",
    nodes.some((n) => drawn(n, blind, 236, 176).bottom > 176),
  )

  // The label room is real screen pixels: two rows plus the ring it clears.
  const twoRows = labelExtent(measure, "The Covenant Changed with Christ", 12)
  const oneRow = labelExtent(measure, "Sin", 12)
  check("two rows reserve more than one", twoRows.drop > oneRow.drop, `${twoRows.drop.toFixed(1)} vs ${oneRow.drop.toFixed(1)}`)
  check("and a label never claims more than its wrap width", twoRows.half <= 92 / 2 + 0.01, twoRows.half.toFixed(1))
  check("the reserved drop clears the focus ring", oneRow.drop > 3 + 1.5 / 2 + 4)

  // A graph that only labels on hover should not reserve room it never uses.
  const spread = layout(null, 1)
  const withLabels = fitCamera(spread, 900, 560, room)
  const withoutLabels = fitCamera(spread, 900, 560)
  check("labels cost the view some room", withLabels.scale < withoutLabels.scale, `${withLabels.scale.toFixed(3)} vs ${withoutLabels.scale.toFixed(3)}`)

  // Same input, same camera, every time.
  const again = fitCamera(layout("Jesus Existed", 1), 268, 320, room)
  const once = fitCamera(layout("Jesus Existed", 1), 268, 320, room)
  check("the fit is deterministic", again.scale === once.scale && again.x === once.x && again.y === once.y)
  check("it never zooms past the cap", withoutLabels.scale <= 2.2 && withLabels.scale >= 0.25)
  // A graph that only labels once you zoom in should not reserve room for text
  // it never draws. Mirrors what the graph itself does: reserve from the first
  // pass that crosses the threshold, then keep reserving.
  const hoverRoom = () => {
    let on = false
    return (node, scale) => {
      on = on || scale > 1.15
      return on ? room(node, scale) : { half: 0, drop: 0 }
    }
  }
  const small = fitCamera(spread, 340, 420, hoverRoom())
  check(
    "a graph too far out to label costs nothing",
    small.scale === fitCamera(spread, 340, 420).scale && small.scale <= 1.15,
    small.scale.toFixed(3),
  )
  const close = layout("Jesus Existed", 1)
  check(
    "one zoomed in far enough still makes room",
    fitCamera(close, 268, 235, hoverRoom()).scale < fitCamera(close, 268, 235).scale,
    `${fitCamera(close, 268, 235, hoverRoom()).scale.toFixed(3)} vs ${fitCamera(close, 268, 235).scale.toFixed(3)}`,
  )

  check("an empty graph has no camera", fitCamera([], 300, 300, room) === null)
  check("nor does one with no canvas yet", fitCamera(spread, 0, 0, room) === null)
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

console.log("moving between notes keeps the view you are in")
{
  const dist = resolve(repoRoot, "dist")
  const read = (p) => readFile(resolve(dist, p), "utf8")
  // The backlinks list carries data-note too, so read only the explorer.
  const sidebarLinks = (html) => {
    const from = html.indexOf("<aside class=\"sidebar\" id=\"explorer\">")
    if (from < 0) return []
    const tree = html.slice(from, html.indexOf("</aside>", from))
    return [...tree.matchAll(/<li><a href="([^"]*)"[^>]*data-note=/g)].map((m) => m[1])
  }
  // strip the leading ../ hops and any trailing view segment
  const notePath = (href) => href.replace(/^(\.\.\/)+/, "").replace(/graph\/$/, "")

  const text = await read("claims/jesus-existed/index.html")
  const graph = await read("claims/jesus-existed/graph/index.html")

  const fromText = sidebarLinks(text)
  const fromGraph = sidebarLinks(graph)

  check(
    "both views list every note in the sidebar",
    fromText.length === fromGraph.length && fromText.length > 20,
    `${fromText.length} / ${fromGraph.length}`,
  )
  check("reading the text, the sidebar goes to text", fromText.every((h) => !h.endsWith("/graph/")), fromText[0])
  check("reading the graph, the sidebar goes to graph", fromGraph.every((h) => h.endsWith("/graph/")), fromGraph[0])
  check(
    "and both point at the same notes, in the same order",
    fromText.every((h, i) => notePath(h) === notePath(fromGraph[i])),
    fromText.findIndex((h, i) => notePath(h) !== notePath(fromGraph[i])).toString(),
  )

  // the note you are on stays marked in both
  check("the current note is marked while reading it", text.includes('aria-current="page" data-note="Jesus Existed"'))
  check("and while looking at its graph", graph.includes('aria-current="page" data-note="Jesus Existed"'))

  // clicking a node, and opening a search result, follow the same rule
  const app = await readFile(resolve(repoRoot, "site/assets/app.js"), "utf8")
  check("the view is read from the page, not guessed", app.includes('document.body.classList.contains("is-graph")'))
  check("clicking a node in the graph keeps the graph", app.includes("window.location.href = noteUrl(node.url)"))
  check("and so does opening a search result", app.includes("${noteUrl(note.url)}"))

  // a folder is not a note and has no graph view, so its links stay put
  const listPage = await read("arguments-for/index.html")
  check("list pages are unaffected", sidebarLinks(listPage).every((h) => !h.endsWith("/graph/")))

  // leaving by the breadcrumb still lands on the folder, not a graph
  const crumbs = graph.match(/<nav class="breadcrumbs"[\s\S]*?<\/nav>/)?.[0] ?? ""
  check("the breadcrumb still leads out to the folder", /href="[^"]*claims\/"/.test(crumbs), crumbs.replace(/\s+/g, " ").slice(0, 120))
}

console.log("the legend filters the graph")
{
  const dist = resolve(repoRoot, "dist")
  const read = (p) => readFile(resolve(dist, p), "utf8")
  const nodeGraph = await read("claims/jesus-existed/graph/index.html")
  const fullGraph = await read("graph/index.html")

  // the standing instructions are gone from both graph views
  for (const [name, html] of [["node graph", nodeGraph], ["full graph", fullGraph]]) {
    check(`${name} drops the explanatory paragraph`, !/<p class="lede">/.test(html))
  }

  // the legend is its own row after the heading, not crammed beside it
  for (const [name, html] of [["node graph", nodeGraph], ["full graph", fullGraph]]) {
    check(`${name} puts the legend row after the heading block`, /<\/div>\s*<div class="graph-tools">/.test(html), name)
    check(`${name} leads that row with the legend`, /<div class="graph-tools">\s*<ul class="legend"/.test(html), name)
    check(`${name} no longer stacks it beside the arrow`, !html.includes("graph-head-side"))
  }

  // every entry is a real control, on by default
  const toggles = [...fullGraph.matchAll(/<button type="button" class="legend-toggle" data-kind="([^"]+)" aria-pressed="([^"]+)">/g)]
  check("each category is a button", toggles.length >= 4, `${toggles.length} toggles`)
  check("all start switched on", toggles.every((m) => m[2] === "true"))
  check(
    "and carry the kind the graph filters by",
    toggles.map((m) => m[1]).join(",") === "argument-for,argument-against,claim,evidence",
    toggles.map((m) => m[1]).join(","),
  )

  // the drawing side has to honour it, links included
  const graphSource = await readFile(resolve(repoRoot, "site/assets/graph.js"), "utf8")
  check("the graph exposes a way to change what is shown", graphSource.includes("function setVisibleKinds"))
  check(
    "hiding a category drops the links through it",
    graphSource.includes("shown.has(l.source.id) && shown.has(l.target.id)"),
  )
  check("and hiding everything says so rather than going blank", graphSource.includes("Every category is hidden"))
  check(
    "but never the note the graph was opened for",
    graphSource.includes("kinds.has(n.kind) || seeded.has(n.id)"),
  )

  const appSource = await readFile(resolve(repoRoot, "site/assets/app.js"), "utf8")
  check("the choice is remembered", appSource.includes("hiddenGraphKinds"))
  check(
    "it reaches graphs on pages without a legend",
    appSource.includes("for (const node of data.nodes) allKinds.add(node.kind)"),
  )
  check("and every graph on the page updates together", appSource.includes("for (const graph of graphs) graph.setVisibleKinds(kinds)"))

  // the shrink arrow matches the enlarge arrow: no border of its own
  const sheet = await readFile(resolve(repoRoot, "site/assets/style.css"), "utf8")
  const collapseRule = sheet.match(/\.graph-collapse \{[^}]*\}/)?.[0] ?? ""
  check("the shrink arrow has no border", !/border:/.test(collapseRule), collapseRule.replace(/\s+/g, " "))
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
  const headAt = nodeGraph.indexOf("class=\"graph-head\"")
  const legendAt = nodeGraph.indexOf("<ul class=\"legend\"")
  const arrowAt = nodeGraph.indexOf("class=\"panel-expand graph-collapse\"")
  const mountAt = nodeGraph.indexOf("class=\"graph-full graph-mount\"")
  check("the heading row holds nothing but the heading", headAt >= 0 && legendAt > headAt, `head ${headAt}, legend ${legendAt}`)
  check("the shrink control takes the end of the legend row", arrowAt > legendAt, `legend ${legendAt}, arrow ${arrowAt}`)
  check("and the graph follows the whole row", mountAt > arrowAt, `arrow ${arrowAt}, mount ${mountAt}`)

  const fullGraph = await read("graph/index.html")
  const shrinkFull = collapse(fullGraph)
  check("the whole vault view has one too", shrinkFull !== null)
  check("returning to the overview", shrinkFull?.href === "../", String(shrinkFull?.href))

  // enlarge and shrink are a round trip
  const railPanel = note.match(/<section class="panel panel-graph">[\s\S]*?<\/section>/)?.[0] ?? ""
  const enlarge = railPanel.match(/class="panel-expand" href="([^"]*)"/)?.[1]
  check("enlarging and shrinking lead back to each other", enlarge === "../../claims/jesus-existed/graph/", String(enlarge))

  // The two arrows are a pair, so they go away together. Below the breakpoint
  // that drops the rail there is nothing left to enlarge from, and a lone
  // shrink arrow is half a control.
  const sheet = await readFile(resolve(repoRoot, "site/assets/style.css"), "utf8")
  const noRail = sheet.match(/@media \(max-width: 1260px\) \{[\s\S]*?\r?\n\}/)?.[0] ?? ""
  check("the rail is dropped at a breakpoint of its own", /\.sidebar-right \{[^}]*display: none/.test(noRail))
  check("and the shrink arrow goes with it", /\.graph-collapse \{[^}]*display: none/.test(noRail), noRail.replace(/\s+/g, " "))
  // Which only works because the header always offers the same trip.
  check(
    "leaving the header switch as the way back",
    nodeGraph.includes('<a class="view-tab" href="../../../claims/jesus-existed/"'),
    nodeGraph.match(/<a class="view-tab"[^>]*>/)?.[0] ?? "no text tab",
  )
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
  check(
    "it takes the end of the row above the preview",
    /<div class="panel-head">\s*<h2>[^<]*<\/h2>\s*<a class="panel-expand"/.test(panel(note)),
    panel(note).replace(/\s+/g, " ").slice(0, 150),
  )
  check("the overview is still one click away", panel(note).includes("See the overview"))

  // Enlarging the preview opens whatever that page is about. A section preview
  // used to show the whole map and enlarge to it, which made the rail the one
  // place on the page that had not heard of the section.
  for (const [page, expected, aboutSomething] of [
    ["index.html", "graph/", false],
    ["arguments-for/index.html", "../arguments-for/graph/", true],
    ["tags/historicity/index.html", "../../graph/", false],
  ]) {
    const html = await read(page)
    check(`${page} enlarges to its own graph`, expandHref(html) === expected, String(expandHref(html)))
    check(
      `${page} ${aboutSomething ? "offers the whole map besides" : "does not repeat itself with a second link"}`,
      panel(html).includes("See the overview") === aboutSomething,
    )
  }

  const section = await read("arguments-for/index.html")
  const mount = (html) => panel(html).match(/<div class="graph-mount graph-rail"[^>]*>/)?.[0] ?? ""
  check("a section previews itself", /data-graph="local" data-kind="argument-for"/.test(mount(section)), mount(section))
  check(
    "on hover labels, since a panel that size cannot name twenty notes at once",
    /data-labels="hover"/.test(mount(section)),
    mount(section),
  )
  check("the overview still previews everything", /data-graph="global"/.test(mount(await read("index.html"))))
  check("and a tag, having no graph of its own, does too", /data-graph="global"/.test(mount(await read("tags/historicity/index.html"))))
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
}

console.log("a note's two views share one heading")
{
  const dist = resolve(repoRoot, "dist")
  const sheet = await readFile(resolve(repoRoot, "site/assets/style.css"), "utf8")
  const text = await readFile(resolve(dist, "claims/jesus-existed/index.html"), "utf8")
  const graph = await readFile(resolve(dist, "claims/jesus-existed/graph/index.html"), "utf8")

  // The graph is a second view of the same note, not a page of its own, so the
  // heading has to stay put when the reader switches to it. The graph view used
  // to carry a category dot and a smaller size of its own, which pushed the
  // title right and up the moment you switched.
  const heading = (html) => html.match(/<h1[^>]*>[\s\S]*?<\/h1>/)?.[0] ?? ""
  const crumbs = (html) => html.match(/<nav class="breadcrumbs"[\s\S]*?<\/nav>/)?.[0] ?? ""

  check("the text view has a heading", heading(text).length > 0, heading(text))
  check("the graph view renders the same one", heading(text) === heading(graph), `${heading(text)} vs ${heading(graph)}`)
  // The links differ by a level of ../, since the graph view sits one deeper.
  // What the reader sees is what has to match.
  const trail = (html) => crumbs(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  check("with the same breadcrumbs above it", trail(text) === trail(graph), `${trail(text)} vs ${trail(graph)}`)

  // Matching markup is only half of it: a size set on the graph view alone
  // moves the title just as surely as a different tag would.
  const override = sheet.match(/body\.is-graph[^{]*\bh1\b[^{]*\{[^}]*\}/)?.[0] ?? ""
  check("and no rule resizes it on the graph view", override === "", override.replace(/\s+/g, " "))

  // Every page with two views now shares one heading between them, the root
  // included: it used to read "Theology" as a list and "Graph" as a map, which
  // named the subject in one view and the format in the other rather than
  // naming the page. Both say what the page is.
  const home = await readFile(resolve(dist, "index.html"), "utf8")
  const homeGraph = await readFile(resolve(dist, "graph/index.html"), "utf8")
  check("the root is named rather than labelled by its format", heading(home) === '<h1 class="page-title">Overview</h1>', heading(home))
  check("and its graph view says the same", heading(home) === heading(homeGraph), `${heading(home)} vs ${heading(homeGraph)}`)
  check("no page is titled after its format any more", !/<h1[^>]*>Graph<\/h1>/.test(homeGraph), heading(homeGraph))

  // One name for one destination. Everything that links to the root or names it
  // in a sentence uses it, so the reader never meets a second word for it.
  const named = [
    ["the tree row", home, /class="tree-home"><a[^>]*>(?:<svg[\s\S]*?<\/svg>)?([^<]+)</],
    ["the breadcrumb root", text, /<nav class="breadcrumbs"[^>]*><a[^>]*>([^<]+)</],
  ]
  for (const [where, html, pattern] of named) {
    check(`${where} calls it the overview`, html.match(pattern)?.[1].trim() === "Overview", html.match(pattern)?.[1])
  }
  check("and nothing reader facing still says vault", !/whole vault/.test(home + homeGraph + text + graph))

  // The site's own name still belongs to the site, not to a page in it.
  check("the header keeps the site name", /class="site-title"[^>]*>Theology</.test(home))
  check("and so does the root's browser tab", /<title>Theology<\/title>/.test(home), home.match(/<title>[^<]*<\/title>/)?.[0])
}

console.log("a section is somewhere you can be, in either view")
{
  const dist = resolve(repoRoot, "dist")
  const read = (p) => readFile(resolve(dist, p), "utf8")
  const list = await read("arguments-for/index.html")
  const graph = await read("arguments-for/graph/index.html")

  // Opening a folder used to leave nothing marked in the tree, because only the
  // notes and the home entry were ever compared against the current page.
  const head = (html) => html.match(/<li class="tree-folder[^"]*" data-folder="Arguments For">[\s\S]*?<\/a>/)?.[0] ?? ""
  for (const [name, html] of [["the list", list], ["its graph", graph]]) {
    check(`${name} marks the folder it is in`, /class="tree-folder is-current"/.test(html))
    check(`${name} marks it on the link too`, /class="tree-folder-name" href="[^"]*" aria-current="page"/.test(head(html)), head(html).replace(/\s+/g, " ").slice(-90))
  }
  check("and never marks two at once", (list.match(/tree-folder is-current/g) ?? []).length === 1)
  check("a note's page marks no folder", !/tree-folder is-current/.test(await read("claims/jesus-existed/index.html")))

  // The switch used to answer a folder with the whole vault.
  const otherTab = (html) => html.match(/<a class="view-tab" href="([^"]*)"/)?.[1]
  check("the list switches to that section's own graph", otherTab(list) === "../arguments-for/graph/", String(otherTab(list)))
  check("and the graph switches back to that list", otherTab(graph) === "../../arguments-for/", String(otherTab(graph)))

  // Every destination in the tree that has two views keeps the one you are
  // reading in, so nothing in there can drop you out of the graph. All tags is
  // the exception and is taken out here: a tag index has no graph of itself, so
  // it is the same page from either view.
  const tagsEntry = (html) => html.match(/<li class="tree-tags[^"]*"><a href="([^"]*)"/)?.[1]
  check(
    "the tags index is one page, opened from either view",
    tagsEntry(graph) === "../../tags/" && tagsEntry(list) === "../tags/",
    `${tagsEntry(graph)} from the graph, ${tagsEntry(list)} from the list`,
  )
  const treeLinks = (html) => {
    const tree = html.match(/<nav class="tree"[\s\S]*?<\/nav>/)?.[0] ?? ""
    return [...tree.replace(/<li class="tree-tags[\s\S]*?<\/li>/, "").matchAll(/<a[^>]*href="([^"]*)"/g)].map(
      (m) => m[1],
    )
  }
  check("the tree has links to check", treeLinks(graph).length > 10, `${treeLinks(graph).length} links`)
  check(
    "in the graph view every one of them stays in it",
    treeLinks(graph).every((h) => h.endsWith("/graph/")),
    treeLinks(graph).filter((h) => !h.endsWith("/graph/")).join(", "),
  )
  check(
    "and in the text view none of them leave it",
    treeLinks(list).every((h) => !h.endsWith("/graph/")),
    treeLinks(list).filter((h) => h.endsWith("/graph/")).join(", "),
  )

  // Same heading in both, the way a note's two views are.
  const heading = (html) => html.match(/<h1[^>]*>[\s\S]*?<\/h1>/)?.[0] ?? ""
  check("both views carry the same heading", heading(list) === heading(graph), `${heading(list)} vs ${heading(graph)}`)

  // Seeded from the whole section rather than from one note in it.
  const data = await readGraphData()
  for (const kind of ["argument-for", "argument-against", "claim", "evidence"]) {
    const seeds = data.nodes.filter((n) => n.kind === kind).map((n) => n.id)
    const sub = neighbourhood(data, seeds, 1)
    const inSection = sub.nodes.filter((n) => n.hop === 0).length
    check(`${kind} starts from every note in it`, inSection === seeds.length, `${inSection} of ${seeds.length}`)
    check(`and reaches what they link out to`, sub.nodes.length > seeds.length, `${sub.nodes.length} nodes from ${seeds.length} seeds`)
  }
  check("one note on its own still works", neighbourhood(data, "Jesus Existed", 1).nodes.length > 0)
  check("and a section with nothing in it draws nothing", neighbourhood(data, [], 1).nodes.length === 0)
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

console.log("tags are a way in, and they combine")
{
  const dist = resolve(repoRoot, "dist")
  const read = (p) => readFile(resolve(dist, p), "utf8")
  const index = await read("tags/index.html")
  const single = await read("tags/hell/index.html")
  const note = await read("claims/jesus-existed/index.html")
  const sheet = await readFile(resolve(repoRoot, "site/assets/style.css"), "utf8")
  const app = await readFile(resolve(repoRoot, "site/assets/app.js"), "utf8")

  // It used to hang off the bottom of the sidebar under the whole tree, small
  // and grey, where it read as a footnote rather than as a way in.
  const order = [...note.matchAll(/<li class="(tree-home|tree-tags|tree-folder)[^"]*"/g)].map((m) => m[1])
  check("the tags entry sits directly under Overview", order.slice(0, 3).join(",") === "tree-home,tree-tags,tree-folder", order.slice(0, 3).join(","))
  check("and nothing is left hanging under the tree", !/<\/nav>\s*<a class="tree-tags"/.test(note))

  // And it took no mark when you were on it, so the one page the sidebar could
  // not answer for was the page you were reading.
  const entry = (html) => html.match(/<li class="tree-tags([^"]*)"><a href="[^"]*"([^>]*)>/)
  check("it is marked current on the tags index", entry(index)?.[2].includes('aria-current="page"'))
  check("a single tag's page is marked there too", entry(single)?.[1].includes("is-current"))
  check("but not while reading a note", !entry(note)?.[1].includes("is-current") && !entry(note)?.[2].includes("aria-current"))
  check(
    "the mark is the violet the rest of the sidebar uses",
    /\.tree-tags a\[aria-current="page"\],\r?\n\.tree-tags\.is-current a \{\r?\n  background: var\(--accent-soft\);\r?\n  color: var\(--accent\);/.test(sheet),
  )

  // The heading used to be a bare <h1> with a lede under it, so it sat lower and
  // larger than the title on every other page.
  check("the title is the one every other page uses", /<h1 class="page-title">Tags<\/h1>/.test(index))
  check("with no lede under it", !/<div class="page page-tags">[\s\S]*?<p class="lede"/.test(index))

  // Both windows are in the page already, so combining tags costs no fetch and
  // no navigation.
  const chips = [...index.matchAll(/<a class="tag-chip" href="([^"]*)" data-tag="([^"]*)"/g)]
  check("every tag is a chip", chips.length > 20, `${chips.length} chips`)
  check("and each is still a plain link to its own page, with no script", chips.every(([, href, tag]) => href.endsWith(`tags/${tag}/`)))
  const rows = [...index.matchAll(/<li data-tags="([^"]*)"/g)].map((m) => m[1])
  // The tree lists every note in the vault, so it is what the filtered list has
  // to account for. One short means a note that can never be found by its tag.
  const inTree = [...(index.match(/<nav class="tree"[\s\S]*?<\/nav>/)?.[0] ?? "").matchAll(/data-note="/g)].length
  check("every note is in the list to be filtered", rows.length === inTree && inTree > 20, `${rows.length} rows for ${inTree} notes`)
  check("each one carries its tags where the filter can read them", rows.every((key) => /^\|[^|]+(\|[^|]+)*\|$/.test(key)), rows.find((key) => !/^\|/.test(key)) ?? "")
  // Delimited on both ends so #sin cannot match a note tagged #sinlessness.
  check("the filter tests a whole tag, not the start of one", app.includes("row.dataset.tags.includes(`|${tag}|`)"))

  check("a tag can be matched with all the others or with any of them", /mode === "all" \? selected\.every/.test(app) && /: selected\.some/.test(app))
  check("the selection is read back out of the URL", /params\.get\("tags"\)/.test(app) && /params\.get\("match"\) === "any"/.test(app))
  // Back belongs to the page the reader came from, not to every chip they tried.
  check("picking a tag replaces the URL rather than stacking history", /history\.replaceState/.test(app) && !/history\.pushState/.test(app))
  check("and a tag that no longer exists is dropped from an old link", /filter\(\(t\) => known\.has\(t\)\)/.test(app))

  // Arriving from a note's tag is how most readers get here, so that page says
  // the tags can be combined at all.
  check("a single tag's page leads back to the combination", /href="\.\.\/\.\.\/tags\/\?tags=hell"/.test(single))
  const linkcheck = await readFile(resolve(repoRoot, "site/linkcheck.mjs"), "utf8")
  check("and the link checker reads that as a page, not a folder", /split\(\/\[\?#\]\/\)/.test(linkcheck))

  // Two scroll windows on a desktop: the tags stay in reach while the notes
  // under them move.
  check("the page itself does not scroll", /body\.is-tags main \{\r?\n  overflow: hidden;/.test(sheet))
  check("the tags get a window of their own", /\.tag-picker \{[^}]*overflow-y: auto;/.test(sheet))
  check("and the notes take the rest of the column", /\.tag-results \{[^}]*flex: 1 1 auto;[^}]*overflow-y: auto;/.test(sheet))
  // A list that scrolls inside a page that scrolls is a trap for a thumb.
  const phone = sheet.slice(sheet.indexOf("@media (max-width: 820px)"))
  check("a phone keeps only one of them", /body\.is-tags main \{\r?\n    overflow: visible;/.test(phone) && /\.tag-results \{\r?\n    overflow: visible;/.test(phone))
}

console.log("the reader picks the reading font")
{
  const dist = resolve(repoRoot, "dist")
  const page = await readFile(resolve(dist, "claims/jesus-existed/index.html"), "utf8")
  const sheet = await readFile(resolve(repoRoot, "site/assets/style.css"), "utf8")
  const appSource = await readFile(resolve(repoRoot, "site/assets/app.js"), "utf8")

  const picker = page.match(/<span class="font-picker">[\s\S]*?<\/span>/)?.[0] ?? ""
  const options = [...picker.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)]

  check("the header carries the picker", picker.length > 0)
  check("with five faces to choose from", options.length === 5, `${options.length} options`)
  check("each one is named", options.every((o) => o[2].trim().length > 0), JSON.stringify(options.map((o) => o[2])))
  check("and it is labelled for a screen reader", picker.includes('aria-label="Reading font"'))

  // It belongs to the left of the search box, and after the view switch.
  const at = (needle) => page.indexOf(needle)
  check(
    "it sits between the view switch and search",
    at('class="view-switch"') < at('class="font-picker"') && at('class="font-picker"') < at('class="search-open"'),
  )

  // Every choice has to actually change something, or it is a dead entry.
  const stacks = new Map()
  for (const [, id] of options) {
    const head = ':root[data-font="' + id + '"] {'
    const at = sheet.indexOf(head)
    const rule = at === -1 ? "" : sheet.slice(at, sheet.indexOf("}", at))
    const from = rule.indexOf("--font-read:")
    stacks.set(id, from === -1 ? "" : rule.slice(from + "--font-read:".length, rule.indexOf(";", from)).trim())
  }
  check("every choice has a stack", [...stacks.values()].every((s) => s.length > 0), JSON.stringify([...stacks]))
  check(
    "no two choices are the same font",
    new Set(stacks.values()).size === stacks.size,
    JSON.stringify([...stacks.values()]),
  )
  check(
    "each stack ends in a generic family, so it always resolves",
    [...stacks.values()].every((s) => /(serif|sans-serif|monospace|cursive|fantasy)$/.test(s)),
    JSON.stringify([...stacks.values()]),
  )
  check(
    "and names more than one face, so a missing one still lands somewhere",
    [...stacks.values()].every((s) => s.split(",").length >= 3),
  )
  check("through the variable the body reads", /\.note-body \{[^}]*font-family: var\(--font-read\)/.test(sheet))
  check("and there is still a default for a reader who never picks", /:root \{[^}]*--font-read:/.test(sheet))

  // Chosen once, kept everywhere: applied before the page paints, not after.
  const headScript = page.match(/<script>[\s\S]*?<\/script>/)?.[0] ?? ""
  check("the choice is applied in the head, before the first paint", headScript.includes('localStorage.getItem("font")'))
  check(
    "only a name the site knows is applied",
    options.every((o) => headScript.includes(`"${o[1]}"`)) && headScript.includes("indexOf(f)>-1"),
  )
  // A phone header has no room for the name, so the closed control shows a
  // mark instead. Opening it still lists the faces in full.
  check("the closed control shrinks to a mark on a phone", sheet.includes('content: "Aa";'))
  check("and the list it opens is still coloured for the theme", sheet.includes(".font-select option {"))
  check("the client remembers the next pick", appSource.includes('localStorage.setItem("font", fontSelect.value)'))
  check(
    "and the control opens showing what is applied",
    appSource.includes("document.documentElement.dataset.font"),
  )
}

console.log("the graph fits a phone screen")
{
  const sheet = await readFile(resolve(repoRoot, "site/assets/style.css"), "utf8")
  const phone = sheet.match(/@media \(max-width: 820px\) \{[\s\S]*?\r?\n\}/)?.[0] ?? ""
  // A selector can appear more than once in the block, grouped by what it is
  // doing, so this collects every declaration of it rather than the first.
  const rule = (selector) =>
    [...phone.matchAll(new RegExp(`\n  ${selector} \{[^}]*\}`, "g"))].map((m) => m[0]).join("")

  check("there is a phone breakpoint", phone.length > 0)

  // A phone is taller than it is wide and the browser's own bars eat into the
  // top and the bottom, so a graph given a share of the viewport ran off the
  // screen. The page is pinned to the small viewport instead, the height left
  // once those bars are showing, and the graph takes what the chrome does not.
  check("the graph page is measured against the small viewport", /100svh/.test(rule("body\.is-graph")))
  check("and does not scroll past it", /overflow: hidden/.test(rule("body\.is-graph")))
  check("the column inside it is pinned to that height too", /height: 100%/.test(rule("body\.is-graph main")))
  check(
    "so the graph is what is left over, not a share of the screen",
    !/height: [\d.]+(vh|svh|dvh)/.test(rule("\.graph-full")),
    rule("\.graph-full") || "no .graph-full rule",
  )
  // 20rem of graph does not fit under a phone header in landscape, and a floor
  // taller than the room left is the cut off bottom coming back.
  check("with no floor to push it off the bottom again", /min-height: 0/.test(rule("\.graph-full")))

  // Only the graph page is pinned. Every other page still scrolls.
  check("and every other page still scrolls", /height: auto/.test(rule("body")))

  // The card holds its text closer to its own edge on a phone than on a
  // desktop, and the two views have to agree on it. A reader switching between
  // the text and the graph would see the frame jump otherwise.
  const sideMargin = (selector) => rule(selector).match(/padding: \S+ (\S+)/)?.[1] ?? ""
  check("the text view has a phone side margin", sideMargin("main").length > 0, sideMargin("main"))
  check(
    "and the graph view uses the same one",
    sideMargin("main") === sideMargin("body\.is-graph main"),
    `${sideMargin("main")} vs ${sideMargin("body\.is-graph main")}`,
  )

  // The heading starts at the same height in both views, which means the column
  // above it is padded the same in both.
  const topPad = (selector) => rule(selector).match(/padding: (\S+)/)?.[1] ?? ""
  check(
    "the graph view starts the column level with the text view",
    topPad("main") === topPad("body\.is-graph main"),
    `${topPad("main")} vs ${topPad("body\.is-graph main")}`,
  )


  // The desktop title runs to three lines on the longest notes at 320px, and
  // the graph below pays for every one of them, so a phone gets a smaller one.
  // It has to come off the class both views share, or the graph view shrinks
  // its heading while the text view keeps the big one.
  const titleRule = [...phone.matchAll(/\n {2}([^{}]+?) \{([^}]*)\}/g)]
    .map(([, selector, body]) => ({ selector, body }))
    .find((r) => r.selector.includes(".note-title") && /font-size/.test(r.body))
  check("a phone gets a smaller title", titleRule !== undefined)
  check("sized by a rule the graph view reads too", titleRule?.selector.includes(".page-title") === true, titleRule?.selector ?? "")
  const phoneSize = Number(titleRule?.body.match(/font-size: ([\d.]+)rem/)?.[1])
  const deskFloor = Number(sheet.match(/\.note-title[^{]*\{[^}]*clamp\(([\d.]+)rem/)?.[1])
  check("and it is smaller than the size a desktop floors at", phoneSize < deskFloor, `${phoneSize}rem vs floor ${deskFloor}rem`)

  // Four categories do not fit on one row of a phone, so the legend wraps. The
  // rows are tightened through the line height rather than the padding, so each
  // toggle keeps the width that makes it easy to hit.
  check("the legend rows are pulled together", /row-gap: 0/.test(rule("\.legend")))
  check("through the line, not the padding", /line-height:/.test(rule("\.legend-toggle")))
  check(
    "so a toggle is no narrower to hit",
    Number(rule("\.legend-toggle").match(/padding: \S+ ([\d.]+)rem/)?.[1]) >= 0.4,
    rule("\.legend-toggle"),
  )
}

console.log("the contents always say where you are")
{
  const app = await readFile(resolve(repoRoot, "site/assets/app.js"), "utf8")
  const block = app.match(/\{\r?\n {2}const links = \[\.\.\.document\.querySelectorAll\("\.toc a"\)\][\s\S]*?\r?\n\}/)?.[0] ?? ""
  check("there is a contents block", block.length > 0)

  // It used to ask for a heading inside a band 10% to 25% down the viewport.
  // At the top of a page no heading is in that band, so nothing was marked
  // until the reader scrolled; and a heading jumped to lands above the band,
  // so the section after it got marked instead of the one asked for.
  check("no heading has to sit in a band to count", !/rootMargin/.test(block), block.match(/rootMargin[^,]*/)?.[0] ?? "")
  check("and the whole page no longer leans on the observer for this", !/IntersectionObserver/.test(app))

  // Something is marked before any scrolling happens.
  check("a section is marked as soon as the page is read", /\r?\n {4}mark\(asked \?\? current\(\)\)/.test(block), block.slice(-120))

  // A reader who clicks a link in the contents has named the section, so it is
  // marked outright rather than inferred from a scroll still in flight.
  check("clicking a link marks what it names", /hashchange[\s\S]*?if \(asked\) mark\(asked\)/.test(block))

  // On a desktop the middle column scrolls, not the page, and scroll does not
  // bubble, so a plain window listener would never hear it.
  check("it hears the column scrolling, not just the page", /"scroll", schedule, \{ capture: true/.test(block))

  // The line a heading has to reach is the one the browser scrolls it to, read
  // off the CSS rather than guessed, so the two cannot drift apart.
  check("the line it measures against comes from the scroll padding", /scrollPaddingTop/.test(block))
  const sheet = await readFile(resolve(repoRoot, "site/assets/style.css"), "utf8")
  check("which the stylesheet does set", /scroll-padding-top:/.test(sheet))

  // At the bottom the remaining headings cannot reach the line, because there
  // is no scrolling left to bring them there.
  check("the end of the scroll is handled rather than left stuck", /atEnd/.test(block))
  check("and the reader's own choice settles it there", /if \(asked && onScreen\.includes\(asked\)\) return asked/.test(block))

  // The scrollport is the padding box, not the border box. The column draws a
  // border, so a line measured from getBoundingClientRect alone sits above where
  // the browser actually lands a heading, and the heading jumped to never counts
  // as having reached it: the section before it stays marked instead.
  check("the line clears the column's own border", /clientTop/.test(block), block.match(/const border = [^\r\n]*/)?.[0] ?? "no border term")
  check(
    "which the column really does draw",
    /\r?\nmain \{[^}]*border: [\d.]+px/.test(sheet),
    sheet.match(/\r?\nmain \{[^}]*?border: [^;]*/)?.[0].split(/\r?\n/).pop() ?? "no border on main",
  )
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
  // chat-corpus.json is the one deliberate exception: the chat Worker fetches
  // it by a fixed URL and re-reads it on a timer, which is what lets the notes
  // change daily while the Worker itself is never redeployed. A hashed name
  // would mean redeploying the Worker for every edit to a note.
  const cacheable = [
    ...assetFiles.filter((f) => /\.(js|css)$/.test(f)).map((f) => `assets/${f}`),
    ...rootFiles.filter((f) => /\.json$/.test(f) && f !== "chat-corpus.json"),
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

console.log("the reading column is a sheet on a page, not the page itself")
{
  const sheet = await readFile(resolve(repoRoot, "site/assets/style.css"), "utf8")
  const light = sheet.match(/^:root \{([\s\S]*?)^\}/m)?.[1] ?? ""
  const value = (name) => light.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim() ?? ""

  const page = value("bg")
  const centre = value("bg-center")
  check("the light theme sets both", Boolean(page && centre), `${page} / ${centre}`)
  check("the column is not screen white", centre.toLowerCase() !== "#ffffff", centre)

  // The column is drawn as a card: a 7px border in the page colour around a
  // fill in the column colour. Put the two close together and it has no edge.
  const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const gap = channels(centre).map((c, i) => c - channels(page)[i])
  check("and it stands off the page it sits on", Math.min(...gap) >= 12, gap.join(","))

  const frame = sheet.match(/^main \{[^}]*\}/m)?.[0] ?? ""
  check("which is what the frame around it is for", /border: 7px solid var\(--bg\)/.test(frame))

  // The gap the ring around a node is painted in has to be the colour the
  // canvas is sitting on, or a ringed node wears a halo.
  const mount = sheet.match(/\.graph-mount \{[^}]*\}/)?.[0] ?? ""
  const graphSource = await readFile(resolve(repoRoot, "site/assets/graph.js"), "utf8")
  check("the graph is mounted on the surface colour", /background: var\(--surface\)/.test(mount))
  check("and paints the ring gap in the same one", graphSource.includes("ctx.strokeStyle = colors.surface"))
}

console.log("a link wears the colour of what it points at")
{
  const sheet = await readFile(resolve(repoRoot, "site/assets/style.css"), "utf8")
  const KINDS = ["argument-for", "argument-against", "claim", "evidence", "note"]

  const linear = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4)
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const luminance = (hex) => {
    const [r, g, b] = rgb(hex).map(linear)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const contrast = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }
  const hue = (hex) => {
    const [r, g, b] = rgb(hex).map((c) => c / 255)
    const max = Math.max(r, g, b)
    const span = max - Math.min(r, g, b)
    if (!span) return 0
    const raw = max === r ? ((g - b) / span) % 6 : max === g ? (b - r) / span + 2 : (r - g) / span + 4
    return (raw * 60 + 360) % 360
  }
  // The shorter way round the wheel, so 350 and 10 are twenty apart, not 340.
  const apart = (a, b) => {
    const d = Math.abs(a - b) % 360
    return Math.min(d, 360 - d)
  }

  const light = sheet.match(/^:root \{([\s\S]*?)^\}/m)?.[1] ?? ""
  const value = (name) => light.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim() ?? ""
  const page = value("bg-center")

  // No fill. That was the complaint that started this, and nothing about
  // colouring by kind is a reason to put one back.
  const wikilinkRules = [...sheet.matchAll(/(^|\n)(a\.wikilink[^{]*)\{([^}]*)\}/g)].map((m) => m[3])
  const filled = wikilinkRules.filter((body) => /background|padding|border-radius/.test(body))
  check("nothing fills an internal link", filled.length === 0, filled.join(" ").replace(/\s+/g, " ") || "none")

  // The kind colours were drawn as dots. Read as words they have to clear the
  // line for body text, which none of them did before these were derived.
  const ratios = KINDS.map((kind) => contrast(value(`link-${kind}`), page))
  for (const [i, kind] of KINDS.entries()) {
    check(`${kind} reads on the page`, ratios[i] >= 4.5, `${ratios[i].toFixed(2)}:1`)
  }
  check("and no kind shouts over another", Math.max(...ratios) - Math.min(...ratios) < 0.5)

  // Derived, not invented: a link has to be the colour of the dot it goes to,
  // or the prose and the tree stop agreeing.
  const drifted = KINDS.filter((kind) => apart(hue(value(`link-${kind}`)), hue(value(kind))) > 6)
  check("each is the hue of the kind it belongs to", drifted.length === 0, drifted.join(", ") || "all in step")

  // A source is the link that is not a node, so it needs a hue no kind holds.
  const out = value("link-out")
  const nearest = Math.min(...KINDS.filter((k) => k !== "note").map((k) => apart(hue(out), hue(value(k)))))
  check("a link off the site has a hue of its own", nearest >= 30, `${nearest.toFixed(0)}° from the nearest kind`)
  check("which reads on the page too", contrast(out, page) >= 4.5, `${contrast(out, page).toFixed(2)}:1`)
  check("and is never the quiet one", contrast(out, page) >= Math.min(...ratios))

  // Six colours in three palettes, and the dark theme takes the kind colours
  // as they are, so only the light one derives anything.
  for (const name of [...KINDS.map((k) => `link-${k}`), "link-out"]) {
    check(`both themes set --${name}`, (sheet.match(new RegExp(`--${name}:`, "g")) ?? []).length === 3)
  }

  // Two links apart only by hue is no difference at all to a reader who cannot
  // separate the hues, so neither of the two things that do not need eyes for
  // colour may go: the underline under every link, the arrow on an outward one.
  check("the underline stays on", !/text-decoration:\s*none/.test(sheet.match(/^a \{[^}]*\}/m)?.[0] ?? ""))
  check("and the arrow stays on a link off the site", /^a\.external::after \{/m.test(sheet))

  // A wikilink with nothing behind it is not a link and must not be drawn as
  // one of the kinds, which is what it used to borrow.
  const brokenRule = sheet.match(/^\.wikilink\.is-broken \{[^}]*\}/m)?.[0] ?? ""
  check("a broken one wears no kind's colour", !KINDS.some((k) => brokenRule.includes(`var(--${k})`)), brokenRule.replace(/\s+/g, " "))

  // The gold still means something, just not this. Tags and search hits keep it.
  check("the highlight is still spent somewhere", (sheet.match(/var\(--highlight/g) ?? []).length >= 3)

  // And the pages really do carry the kind the colour is read from.
  const built = await readFile(resolve(repoRoot, "dist/arguments-for/personal-relationship-with-god/index.html"), "utf8")
  const tagged = [...built.matchAll(/<a class="wikilink"[^>]*data-kind="([^"]+)"/g)].map((m) => m[1])
  check("every wikilink on a page names its kind", tagged.length > 0, `${tagged.length} tagged`)
  check("and names one the stylesheet knows", tagged.every((k) => KINDS.includes(k)), [...new Set(tagged)].join(", "))
}

console.log("a finger gets the highlight a cursor gets for free")
{
  const graphSource = await readFile(resolve(repoRoot, "site/assets/graph.js"), "utf8")
  const down = graphSource.match(/function onPointerDown\([\s\S]*?\n  \}/)?.[0] ?? ""
  check("taking hold of a node hovers it", /dragging = node[\s\S]*?hovered = node/.test(down))

  // Touch never clears a hover by moving away from it, so every way out of a
  // drag has to put it down again.
  check("letting go on a touch screen drops it", /event\.pointerType === "touch" && hovered/.test(graphSource))
  const pinchStart = graphSource.match(/function startPinch\([\s\S]*?\n  \}/)?.[0] ?? ""
  check("and a second finger arriving drops it too", /if \(hovered === dragging\) hovered = null/.test(pinchStart))
}

console.log("the tree comes back to the note you are reading")
{
  const appSource = await readFile(resolve(repoRoot, "site/assets/app.js"), "utf8")
  const block = appSource.match(/const here = sidebar\?[\s\S]*?\n\}/)?.[0] ?? ""
  check("the tree looks for the entry the page marks", block.includes('aria-current="page"'))
  check("it scrolls the tree, not the page", block.includes("sidebar.scrollTop +="))
  check("only when the tree has somewhere to scroll", block.includes("sidebar.scrollHeight > sidebar.clientHeight"))
  check("and never at an entry a collapsed folder is hiding", block.includes("item?.height"))

  // Every page marks its own entry, which is the thing this has to find.
  const built = await readFile(resolve(repoRoot, "dist/claims/index.html"), "utf8")
  const tree = built.match(/<aside class="sidebar"[\s\S]*?<\/aside>/)?.[0] ?? ""
  const marked = tree.match(/aria-current="page"/g) ?? []
  check("a page really does mark one", marked.length === 1, `${marked.length} marked`)
}

console.log("a preview waits to be asked for")
{
  const appSource = await readFile(resolve(repoRoot, "site/assets/app.js"), "utf8")
  const delay = Number(appSource.match(/const PREVIEW_DELAY = (\d+)/)?.[1])
  check("the hover preview has a named delay", Number.isFinite(delay), String(delay))
  // Long enough that a cursor crossing links on its way somewhere else opens
  // none of them, short enough that stopping on one still feels answered.
  check("which is long enough not to fire in passing", delay >= 450, `${delay}ms`)
  check("and short enough to still feel like hovering", delay <= 700, `${delay}ms`)
  check(
    "the timer is the only thing that opens it",
    appSource.includes("setTimeout(() => showPreview(link), PREVIEW_DELAY)"),
  )
}

console.log("the tab icon has no plate behind it")
{
  const svg = await readFile(resolve(repoRoot, "site/assets/favicon.svg"), "utf8")
  check("nothing fills the square", !/<rect[^>]*width="32"/.test(svg), svg.match(/<rect[^>]*>/)?.[0] ?? "no rect")
  check("the mark itself is still there", (svg.match(/<circle/g) ?? []).length === 3)
  // With the plate gone the padding it needed goes too, or the mark sits small
  // in a square of nothing.
  check(
    "and it fills the room the plate used to take",
    /scale\(1\.\d+\)/.test(svg),
    svg.match(/transform="[^"]*"/)?.[0] ?? "no transform",
  )
}

console.log("both graph controls take the end of the row above their graph")
{
  const sheet = await readFile(resolve(repoRoot, "site/assets/style.css"), "utf8")
  const dist = resolve(repoRoot, "dist")
  const read = (p) => readFile(resolve(dist, p), "utf8")

  // Neither control is laid over its graph. The canvas takes drags, and a
  // control sitting on it eats the corner they can start from.
  const rule = sheet.match(/^\.panel-expand \{[^}]*\}/m)?.[0] ?? ""
  check("the control is not pinned over the canvas", !/position: absolute/.test(rule), rule.replace(/\s+/g, " "))
  for (const path of ["evidence/mesha-stele/index.html", "claims/jesus-existed/graph/index.html"]) {
    const html = await read(path)
    check(`${path} keeps the graph card empty`, !/graph-mount[^>]*>\s*<a /.test(html))
  }

  // Both rows push the control to the far end, which is what puts it flush
  // with the right edge of the graph under it.
  for (const name of ["panel-head", "graph-tools"]) {
    const row = sheet.match(new RegExp(`^\\.${name} \\{[^}]*\\}`, "m"))?.[0] ?? ""
    check(`the ${name} row is a flex row`, /display: flex/.test(row), row.replace(/\s+/g, " "))
    check(`and holds the control at its far end`, /justify-content: space-between/.test(row))
  }

  // The rail's row is its heading, the enlarged view's row is its legend, and
  // on both the row is exactly as wide as the graph beneath it.
  const railPanel = (await read("evidence/mesha-stele/index.html")).match(
    /<section class="panel panel-graph">[\s\S]*?<\/section>/,
  )?.[0] ?? ""
  check("the rail hangs it off the heading row", /<div class="panel-head">[\s\S]*?class="panel-expand"/.test(railPanel))
  for (const path of ["claims/jesus-existed/graph/index.html", "graph/index.html", "claims/graph/index.html"]) {
    const html = await read(path)
    const row = html.match(/<div class="graph-tools">[\s\S]*?<\/div>/)?.[0] ?? ""
    check(`${path} hangs it off the legend row`, row.includes("panel-expand graph-collapse"), row.replace(/\s+/g, " ").slice(0, 90))
    // It switches no category, so it is not inside the group that does.
    check(`${path} keeps it out of the legend's own group`, !/<ul class="legend"[^>]*>[\s\S]*?panel-expand[\s\S]*?<\/ul>/.test(row))
  }

  // The spacing under the row belongs to the row now, not to the legend in it.
  const legendRule = sheet.match(/^\.legend \{[^}]*\}/m)?.[0] ?? ""
  const toolsRule = sheet.match(/^\.graph-tools \{[^}]*\}/m)?.[0] ?? ""
  check("the legend carries no margin of its own", /margin: 0;/.test(legendRule), legendRule.replace(/\s+/g, " "))
  check("the row carries it instead", /margin: 0 0 0\.9rem/.test(toolsRule), toolsRule.replace(/\s+/g, " "))
  check(
    "and the phone rule tightens the row, not the legend",
    /body\.is-graph \.graph-tools \{\s*margin-bottom: 0\.6rem;/.test(sheet),
  )

  // The reading column draws a frame and the rail does not, so without this the
  // rail's row would sit 7px above the column's first line.
  const railRule = sheet.match(/^\.sidebar-right \{[^}]*\}/m)?.[0] ?? ""
  const frame = sheet.match(/^main \{[^}]*\}/m)?.[0]?.match(/border: (\d+)px solid var\(--bg\)/)?.[1]
  check("the reading column draws a frame", frame === "7", String(frame))
  check(
    "and the rail carries its width as padding, so both start level",
    railRule.includes(`padding: calc(2rem + ${frame}px)`),
    railRule.match(/padding: [^;]+;/)?.[0] ?? "no padding",
  )
}

console.log("the chat only ever shows the model notes from the vault")
{
  const corpus = JSON.parse(await readFile(resolve(repoRoot, "dist", "chat-corpus.json"), "utf8"))
  const notes = corpus.notes

  check("the corpus carries every note", notes.length > 0 && notes.every((n) => n.text && n.url))

  // Every answer has to be able to name the node it came from, so a note
  // missing from the catalogue is a note the model can neither find nor cite.
  const listed = catalogue(notes)
  check("the catalogue names every note", notes.every((n) => listed.includes(n.title)))

  // A url is the title and section under the site's own slug rules, so sending
  // it was the same thing twice: about 3,800 tokens per question at 300 notes.
  check("and carries no urls, because the title already is one", notes.every((n) => !listed.includes(n.url)))

  // The question a bubble on a page gets asked most is about that page.
  const somewhere = notes[notes.length - 1]
  const picked = selectNotes(notes, "what does this argue", somewhere.url)
  check("the note you are reading is always included", picked[0]?.url === somewhere.url)

  // A word in a title outranks the same word buried in someone else's body.
  const target = notes.find((n) => n.title.split(" ").length > 2) ?? notes[0]
  const byTitle = selectNotes(notes, target.title, null)
  check(`asking by title puts "${target.title}" first`, byTitle[0]?.url === target.url, byTitle[0]?.title)

  // The budget is what keeps this working at 300 notes without a rewrite, so
  // it has to actually bite when the vault outgrows it.
  const padded = notes.map((n) => ({ ...n, text: n.text.padEnd(20_000, " x") }))
  const capped = selectNotes(padded, "god", null, 50_000)
  const spent = capped.reduce((total, n) => total + n.text.length, 0)
  check("the body budget caps what gets sent", spent <= 50_000 && capped.length < padded.length, `${spent} chars`)
  check("the budget is set below any current context window", BODY_BUDGET <= 120_000)

  // The rules that stop it inventing an answer or picking a side are the whole
  // reason this is safe to put on a research vault.
  const { system, context, used } = buildPrompt(corpus, { question: "who wrote hebrews", pageUrl: null })
  check("the prompt refuses to answer beyond the notes", /does not have a note on that yet/.test(system))
  check("the prompt requires bracketed titles, not urls", /double square brackets/.test(system))
  check("the prompt tells it to own up to notes it has not read", /have not read it here/.test(system))
  check("the prompt forbids taking a side", /Do not take a side/.test(system))
  check("the prompt flags unverified notes", /stub or drafted/.test(system))
  // A question narrows which bodies are sent, so what has to be true is that
  // every note it did pick actually arrives in full, and that the catalogue
  // still names the ones it left out.
  check("a question picks the notes it needs", used.length > 0 && used.length <= notes.length, used.join(", "))
  check(
    "and every picked note reaches the model in full",
    used.every((url) => context.includes(notes.find((n) => n.url === url).text.slice(0, 60))),
  )
  check(
    "notes left out are still in the catalogue, so it can point at them",
    notes.filter((n) => !used.includes(n.url)).every((n) => context.includes(n.title)),
  )
}

console.log("the chat sends a handful of notes, not everything that matched")
{
  const corpus = JSON.parse(await readFile(resolve(repoRoot, "dist", "chat-corpus.json"), "utf8"))
  const notes = corpus.notes

  // Keyword ranking is useful for the first few notes and noise after that.
  // Before the cap a single question pulled in thirty-odd full note bodies,
  // roughly half the token cost of a question at 300 notes, for nothing.
  const wide = selectNotes(notes, "god evidence claim argument bible jesus", null)
  check(`never more than ${MAX_NOTES} bodies`, wide.length <= MAX_NOTES, `${wide.length} notes`)
  check("the cap is what bites, not the character budget", MAX_NOTES * 3000 < BODY_BUDGET)

  // A description in nobody's vocabulary matches nothing. Reading order used to
  // fill the gap, which under a cap means arbitrary notes: tokens spent on text
  // unrelated to the question, and a model invited to answer from it.
  const nothing = selectNotes(notes, "zzzqqq wobble frobnicate", null)
  check("a question matching nothing sends no bodies at all", nothing.length === 0)

  const { context: noneCtx } = buildPrompt(corpus, { question: "zzzqqq wobble frobnicate" })
  check("and says so, rather than leaving the model to guess why", /Work from the catalogue above/.test(noneCtx))
  check("while still listing every note", notes.every((n) => noneCtx.includes(n.title)))

  // "Tell me more" has no keywords of its own. Without the previous answer it
  // scores nothing and drops the very notes under discussion.
  const thread = [
    { role: "user", text: "what evidence is there for the resurrection" },
    { role: "assistant", text: "See Jesus Resurrected, which sets out the case." },
  ]
  check("a follow-up is ranked against the last answer too", rankingText("tell me more", thread).includes("Jesus Resurrected"))
  const followUp = buildPrompt(corpus, { question: "tell me more about that", history: thread })
  check(
    "so a bare follow-up still reaches the right note",
    followUp.used.some((url) => url.includes("jesus-resurrected")),
    followUp.used.join(", "),
  )
}

console.log("a bracketed title becomes a link, and only a real one")
{
  const corpus = JSON.parse(await readFile(resolve(repoRoot, "dist", "chat-corpus.json"), "utf8"))
  const notes = corpus.notes
  const real = notes[0]

  check(
    "a real title resolves to its url",
    resolveLinks(`See [[${real.title}]].`, notes) === `See [${real.title}](${real.url}).`,
  )
  // The model never sees a url now, so it cannot invent one. A title it made up
  // must not become a link to somewhere that does not exist.
  check("an invented title stays plain text", resolveLinks("See [[No Such Note]].", notes) === "See No Such Note.")
  check("case and stray spaces still resolve", resolveLinks(`[[ ${real.title.toUpperCase()} ]]`, notes).includes(real.url))

  // If it writes a markdown link anyway, the url can only have been guessed,
  // and a guessed slug that looks plausible is a broken link the page would
  // render without complaint. Flattened to words before titles are resolved.
  check(
    "a url the model invented is stripped, not linked",
    resolveLinks("See [Jesus Existed](claims/wrong-slug).", notes) === "See Jesus Existed.",
  )
  check(
    "and stripping does not damage the links we just made",
    resolveLinks(`[[${real.title}]]`, notes) === `[${real.title}](${real.url})`,
  )

  // A [[Title]] arrives split across stream chunks, so the half-written bracket
  // has to be held back or the reader watches "[[Jesus Exi" appear and vanish.
  check("an unclosed bracket is held back", JSON.stringify(splitAtOpenLink("see [[Jesus Exi")) === '["see ","[[Jesus Exi"]')
  check("a closed one flows straight through", splitAtOpenLink("see [[A]] ok")[1] === "")
  check("two closed ones in a row also flow", splitAtOpenLink("[[A]] and [[B]] done")[1] === "")
  check("a lone trailing bracket is held too", splitAtOpenLink("trailing [")[1] === "[")
  // A half written markdown link matters as much: the page rebuilds its markup
  // from the whole answer each chunk, so the two halves would meet there.
  check("half a markdown link is held", splitAtOpenLink("see [Jesus](claims/je")[1] === "[Jesus](claims/je")
  check("a whole one is not", splitAtOpenLink("see [Jesus](claims/x) ok")[1] === "")
  // A bracket that never closes must not stall the stream forever.
  check("but holding gives up eventually", splitAtOpenLink(`[[${"x".repeat(600)}`)[1] === "")

  // The property that actually matters: however the network happens to slice
  // the answer, the reader must end up with exactly what resolving it in one
  // go would have given. Tested at chunk sizes down to a single character.
  const answer = `That is [[${real.title}]] and [[Nope]]. Ignore [x](claims/bad).`
  const whole = resolveLinks(answer, notes)
  const mismatched = [1, 2, 3, 5, 7, 13, 50].filter((size) => {
    let held = ""
    let out = ""
    for (let i = 0; i < answer.length; i += size) {
      const [ready, rest] = splitAtOpenLink(held + answer.slice(i, i + size))
      held = rest
      if (ready) out += resolveLinks(ready, notes)
    }
    return out + (held ? resolveLinks(held, notes) : "") !== whole
  })
  check("streaming in any chunk size gives the same answer", mismatched.length === 0, `broke at ${mismatched}`)
}

console.log("the chat never turns model output into markup of its own")
{
  check("a note link becomes a real link", render("[A](claims/x)", "../") === '<p><a href="../claims/x/">A</a></p>')
  check(
    "a javascript url stays plain text",
    !render("[click](javascript:alert(1))").includes("<a"),
    render("[click](javascript:alert(1))"),
  )
  check(
    "a data url stays plain text",
    !render("[click](data:text/html,<script>)").includes("<a"),
  )
  check("raw html is escaped", render("<img src=x onerror=alert(1)>").includes("&lt;img"))
  check("an absolute url is not linked", !render("[out](https://example.com)").includes("<a"))
}

console.log("the conversation survives following a link out of the page")
{
  // Every good answer links other notes, so the reader navigates away almost
  // immediately. Losing the thread at that exact moment is what made the chat
  // feel like it was throwing history away.
  const store = new Map()
  globalThis.sessionStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
  }

  const thread = [
    { role: "user", text: "who wrote hebrews" },
    { role: "assistant", text: "The vault does not have a note on that yet." },
  ]
  saveHistory(thread)
  check("a thread saved on one page loads on the next", JSON.stringify(loadHistory()) === JSON.stringify(thread))

  store.set("chat-history", "{not json")
  check("garbage in storage is ignored rather than thrown", loadHistory().length === 0)

  store.set("chat-history", JSON.stringify(["nonsense", { role: "user" }]))
  check("entries with no text are dropped", loadHistory().length === 0)

  // Private browsing and blocked site data make the accessor itself throw.
  globalThis.sessionStorage = {
    getItem() {
      throw new Error("blocked")
    },
    setItem() {
      throw new Error("blocked")
    },
  }
  check("storage that throws leaves the chat working, just forgetful", loadHistory().length === 0)
  saveHistory(thread) // must not throw
  check("and saving into blocked storage is survivable", true)
  delete globalThis.sessionStorage
}

console.log("the question box grows with the question")
{
  const sheet = await readFile(resolve(repoRoot, "site", "assets", "style.css"), "utf8")
  const markup = await readFile(resolve(repoRoot, "site", "lib", "templates.mjs"), "utf8")

  // An input never wraps, so a long question scrolls sideways out of sight.
  check("the box is a textarea, not a single line input", /<textarea class="chat-input"/.test(markup))

  const inputRule = sheet.match(/^\.chat-input \{[^}]*\}/m)?.[0] ?? ""
  check("it grows only to a ceiling", /max-height: 8rem;/.test(inputRule), inputRule.replace(/\s+/g, " "))
  check("and scrolls past it", /overflow-y: auto;/.test(inputRule))
  // The script owns the height, so a drag handle would only fight it.
  check("the drag handle is off", /resize: none;/.test(inputRule))

  const formRule = sheet.match(/^\.chat-form \{[^}]*\}/m)?.[0] ?? ""
  check("the send button stays on the last line as the box grows", /align-items: flex-end;/.test(formRule))
}

console.log("a slow or failed answer is handled as a failure, not as an answer")
{
  const sheet = await readFile(resolve(repoRoot, "site", "assets", "style.css"), "utf8")
  const chat = await readFile(resolve(repoRoot, "site", "assets", "chat.js"), "utf8")
  const worker = await readFile(resolve(repoRoot, "worker", "index.js"), "utf8")
  const providers = await readFile(resolve(repoRoot, "worker", "providers.js"), "utf8")

  // The same question has answered in 0.7s and in 56s against the live
  // endpoint. A blinking caret alone cannot tell those apart from a hang.
  check("a slow answer says so after a few seconds", /dataset\.slow = "true"/.test(chat))
  check("and the stylesheet has something to show for it", /\.chat-assistant\[data-slow\]::before/.test(sheet))

  // A failure used to be pushed into history like any other answer: shown
  // again on the next page load as though the assistant had said it, and sent
  // back to the model as context for the following question.
  check("a failed turn is kept out of the history", /if \(!failed\) \{/.test(chat))
  check("and is marked as not being an answer", /\.chat-failed \{/.test(sheet))

  // Everything that usually goes wrong does so before any text exists, so the
  // headers are held back until the first token and those become real status
  // codes rather than error prose glued onto the answer.
  check("the worker waits for the first token before replying", /first = await answer\.next\(\)/.test(worker))
  check("so an early failure is a status code", /return fail\(502, error\.message, echo\)/.test(worker))

  check("the too-slow message tells the reader what to do", /Try asking again/.test(TOO_SLOW))
  check("and does not talk about timeouts", !/timeout|abort/i.test(TOO_SLOW), TOO_SLOW)

  // A quota rejection used to arrive in the bubble as raw API JSON telling a
  // visitor to go and check somebody else's billing details.
  for (const [name, message] of [["too busy", TOO_BUSY], ["broken", BROKEN], ["too slow", TOO_SLOW]]) {
    check(
      `the "${name}" message is a sentence, not an API response`,
      !/[{}]|quota|billing|http|gemini|\d{3}/i.test(message),
      message,
    )
  }
  check("a quota rejection says when to come back", /try again in a minute/i.test(TOO_BUSY))

  // A model can return a valid stream carrying no text at all, and without a
  // check for it the reader gets an empty bubble and no idea why. On a vault
  // about religion a safety filter is the likeliest reason, which deserves
  // different wording: nothing is broken and asking again will not help.
  check("a safety block says so", noAnswer("SAFETY") === DECLINED)
  check("so does a recitation block", noAnswer("RECITATION") === DECLINED)
  check("anything else is just no answer", noAnswer("MAX_TOKENS") === NO_ANSWER)
  check("and a missing reason does not throw", noAnswer(undefined) === NO_ANSWER)
  check("an empty answer is caught rather than streamed", /if \(first\.done\)/.test(worker))
  check("with the reason kept in the log", /finishReason: \$\{stats\.finishReason/.test(worker))

  // Thinking is spent out of maxOutputTokens, so this is not the length of an
  // answer. At 800 the model was measured spending 767 thinking and answering
  // in the 29 that were left, which truncates mid sentence. Answers run 30 to
  // 80 tokens, so the ceiling has to clear observed thinking by a wide margin.
  const ceiling = Number(providers.match(/maxOutputTokens: (\d+)/)?.[1])
  check("the output ceiling leaves room to think", ceiling >= 2000, `maxOutputTokens = ${ceiling}`)
  check("and the code says why, not just what", /Thinking is spent out of this same budget/.test(providers))

  // The detail is not lost, it moves. A wrong model id used to announce itself
  // in the chat, which is how the thinking_level mistake was caught.
  check("the status and the API's own words still reach the log", /console\.log\(`gemini \$\{response\.status\}/.test(providers))

  // Gemini's free tier limit for Flash is around five a minute, measured. Ours
  // was twelve, so it was not protecting the quota at all.
  const limit = Number(worker.match(/const RATE_LIMIT = (\d+)/)?.[1])
  check("our own limit is not looser than the model's", limit <= 6, `RATE_LIMIT = ${limit}`)

  // Measured on the live endpoint: about a quarter of free tier requests take
  // over twenty seconds while the rest answer in two or three, and spacing
  // them out does not change it. Waiting one out is worse than starting over.
  check("a stalled request is retried rather than waited out", /const ATTEMPTS = 2/.test(providers))
  check("and abandoned well before a reader would give up", /const FIRST_TOKEN_MS = 12_000/.test(providers))
  check(
    "but never retried once text has started, which would rewrite the answer",
    /!started && !last/.test(providers),
  )

  // The log is scrolled twice on purpose. The immediate assignment forces
  // layout and is correct for what exists now, and works in a tab the browser
  // is not painting, where requestAnimationFrame never fires. The deferred one
  // catches height added after layout, which is what the caret does. Doing
  // only the deferred half leaves the log stuck wherever it was.
  const scroller = chat.match(/const scrollToEnd = \(\) => \{[\s\S]*?\n  \}/)?.[0] ?? ""
  check("the log is scrolled immediately", /^\s*log\.scrollTop = log\.scrollHeight$/m.test(scroller), scroller)
  check("and again after the next frame", /requestAnimationFrame/.test(scroller))
  check("a new message always scrolls into view", /\/\/ Unconditional/.test(chat))

  // Following is state, not a per chunk measurement: the deferred scroll means
  // measuring during streaming reads the position from before it and wrongly
  // concludes the reader has scrolled away.
  check("whether to follow is held as state", /let following = true/.test(chat))
  check("and only a real scroll changes it", /log\.addEventListener\("scroll"/.test(chat))
  // \s+ rather than \n: git hands these files back with CRLF on Windows.
  check("asking something always re-follows", /following = true\s+say\("user"/.test(chat))
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`)
process.exitCode = failures === 0 ? 0 : 1
