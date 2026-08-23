// Force directed link map on a canvas. No dependencies.
//
// mount(el, data, options) draws either the whole vault or the neighbourhood of
// one note. Drag a node to move it, drag the background to pan, scroll to zoom,
// click to open. Hovering dims everything that is not a direct neighbour.

const FORCES = {
  repulsion: 5200, // how hard unconnected nodes push apart
  linkDistance: 78, // rest length of a link
  linkStrength: 0.045,
  centering: 0.012,
  damping: 0.82,
  alphaDecay: 0.981,
  alphaMin: 0.004,
  // Letting a released node settle under plain decay is not enough: the decay
  // gives a fixed movement budget, and a long drag spends more than it. Holding
  // alpha at this floor until the layout stops moving lets it always come back
  // to a centred arrangement instead of stranding nodes where they were let go.
  settleFloor: 0.12,
  restSpeed: 0.15,
}

// How far a node past the first hop recedes. The circle drops hard because it is
// only there for context, but its label stays readable: knowing which note it is
// is the whole reason for showing it at all. Links sit in between, enough to
// read the shape without competing with the real connections.
const HOP_FADE = { node: 0.22, label: 0.62, link: 0.45 }

// Node names are long here, and one long line stretches a label across a good
// part of the canvas. Two short lines sit under the circle instead. Below this
// zoom a graph that only labels on hover leaves them off entirely.
const LABEL = { maxWidth: 92, maxLines: 2, lineGap: 1.12, gap: 4, zoom: 1.15 }

// What the opening view is allowed to do: keep this much clear of the canvas
// edge, and never zoom past these bounds to fill it. The margin is small
// because the labels bring their own: the room they need is measured in.
const FIT = { pad: 14, min: 0.25, max: 2.2 }

const labelSize = (scale) => Math.min(13, 10 + scale)
const labelFont = (size) => `400 ${size}px system-ui, sans-serif`

// The focused and hovered nodes carry a second ring outside the circle. Labels
// clear it on every node, not just the ringed ones, so hovering never nudges a
// label down and the spacing stays even across the graph.
const RING = { gap: 3, width: 1.5 }
const RING_EXTENT = RING.gap + RING.width / 2

// Wraps on words, and trims the last line rather than dropping the rest.
export function wrapLabel(measure, text, maxWidth, maxLines) {
  const words = String(text).split(" ").filter(Boolean)
  if (words.length === 0) return []

  const lines = []
  let line = ""

  for (let i = 0; i < words.length; i++) {
    const candidate = line ? `${line} ${words[i]}` : words[i]
    if (!line || measure(candidate) <= maxWidth) {
      line = candidate
    } else if (lines.length + 1 < maxLines) {
      lines.push(line)
      line = words[i]
    } else {
      lines.push(ellipsize(measure, `${line} ${words.slice(i).join(" ")}`, maxWidth))
      return lines
    }
  }

  if (line) lines.push(measure(line) > maxWidth ? ellipsize(measure, line, maxWidth) : line)
  return lines
}

function ellipsize(measure, text, maxWidth) {
  let cut = text
  while (cut.length > 1 && measure(`${cut}…`) > maxWidth) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}

// Where a label ends up, in screen pixels around the node it belongs to. It is
// drawn at a fixed size, so this room does not shrink as the graph zooms out.
export function labelExtent(measure, text, size) {
  const lines = wrapLabel(measure, text, LABEL.maxWidth, LABEL.maxLines)
  if (lines.length === 0) return { half: 0, drop: 0 }
  let widest = 0
  for (const line of lines) widest = Math.max(widest, measure(line))
  // A whole line height past the last row, which leaves the descenders room.
  return { half: widest / 2, drop: RING_EXTENT + LABEL.gap + lines.length * size * LABEL.lineGap }
}

const noLabel = () => ({ half: 0, drop: 0 })

// How far a node reaches on screen from its own centre. The circle grows with
// the camera, the label does not, and the label hangs below.
function extentBox(nodes, scale, labelRoom) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    const r = n.r * Math.max(scale, 0.55)
    const { half, drop } = labelRoom(n, scale)
    const side = Math.max(r, half)
    minX = Math.min(minX, n.x * scale - side)
    maxX = Math.max(maxX, n.x * scale + side)
    minY = Math.min(minY, n.y * scale - r)
    maxY = Math.max(maxY, n.y * scale + r + drop)
  }
  return {
    spanX: Math.max(maxX - minX, 1),
    spanY: Math.max(maxY - minY, 1),
    midX: (minX + maxX) / 2,
    midY: (minY + maxY) / 2,
  }
}

// The camera that puts every node inside the canvas, labels included. Node
// spread scales with the camera while label room stays the same size, so one
// division cannot answer it: start wide and settle onto the scale that fits.
export function fitCamera(nodes, width, height, labelRoom = noLabel, pad = FIT.pad) {
  if (nodes.length === 0 || width < 1 || height < 1) return null
  const availWidth = Math.max(width - pad * 2, 1)
  const availHeight = Math.max(height - pad * 2, 1)

  const closer = (scale, room) => {
    const box = extentBox(nodes, scale, room)
    const filled = Math.min((scale * availWidth) / box.spanX, (scale * availHeight) / box.spanY)
    return Math.min(Math.max(filled, FIT.min), FIT.max)
  }
  const settle = (scale, room, passes) => {
    for (let pass = 0; pass < passes; pass++) {
      const next = closer(scale, room)
      const done = Math.abs(next - scale) < 0.0005
      scale = next
      if (done) break
    }
    return scale
  }

  // The circles alone first. A graph that only labels past a zoom level has to
  // know whether it even gets there before it reserves room for text.
  let scale = settle(FIT.max, noLabel, 4)
  scale = settle(scale, labelRoom, 8)

  const box = extentBox(nodes, scale, labelRoom)
  return { scale, x: box.midX / scale, y: box.midY / scale }
}
// One step of the simulation. Pure apart from mutating node x/y/vx/vy, which
// keeps it testable outside a browser.
export function stepForces(nodes, links, alpha, alphaTarget = 0) {
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]
      let dx = b.x - a.x
      let dy = b.y - a.y
      let distSq = dx * dx + dy * dy
      if (distSq < 0.01) {
        // Perfectly coincident nodes have no direction to separate along.
        dx = 0.1 + i * 0.01
        dy = 0.1 + j * 0.01
        distSq = dx * dx + dy * dy
      }
      const dist = Math.sqrt(distSq)
      const force = FORCES.repulsion / distSq
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      a.vx -= fx
      a.vy -= fy
      b.vx += fx
      b.vy += fy
    }
  }

  for (const link of links) {
    const { source: a, target: b } = link
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
    const force = (dist - FORCES.linkDistance) * FORCES.linkStrength
    const fx = (dx / dist) * force
    const fy = (dy / dist) * force
    a.vx += fx
    a.vy += fy
    b.vx -= fx
    b.vy -= fy
  }

  for (const n of nodes) {
    n.vx -= n.x * FORCES.centering
    n.vy -= n.y * FORCES.centering
    if (n.pinned) {
      n.vx = 0
      n.vy = 0
      continue
    }
    n.vx *= FORCES.damping
    n.vy *= FORCES.damping
    n.x += n.vx * alpha
    n.y += n.vy * alpha
  }

  return alphaTarget + (alpha - alphaTarget) * FORCES.alphaDecay
}

// Deterministic start positions, so the layout is the same on every load.
export function seededRandom(seed) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function readColors(root) {
  const style = getComputedStyle(root)
  const get = (name, fallback) => style.getPropertyValue(name).trim() || fallback
  return {
    "argument-for": get("--argument-for", "#5b6ee8"),
    "argument-against": get("--argument-against", "#d4802f"),
    claim: get("--claim", "#2f9e8f"),
    evidence: get("--evidence", "#9a6bc8"),
    note: get("--note", "#8a8f98"),
    line: get("--border-strong", "#d5d0c7"),
    text: get("--text", "#1d2025"),
    muted: get("--muted", "#6c7280"),
    accent: get("--accent", "#4a56c8"),
    surface: get("--surface", "#ffffff"),
  }
}

export function mount(el, data, options = {}) {
  const { focus = null, depth = 1, showLabels = "hover", onNavigate } = options

  const subset = focus ? neighbourhood(data, focus, depth) : data
  if (subset.nodes.length === 0) {
    el.innerHTML = '<p class="graph-empty">Nothing links here yet.</p>'
    return { setVisibleKinds() {}, destroy() {} }
  }

  const canvas = document.createElement("canvas")
  el.appendChild(canvas)
  const ctx = canvas.getContext("2d")

  let colors = readColors(document.documentElement)
  const rand = seededRandom(focus ?? "global")

  const allNodes = subset.nodes.map((n, i) => {
    const angle = (i / subset.nodes.length) * Math.PI * 2
    const spread = 60 + rand() * 90
    return {
      ...n,
      x: Math.cos(angle) * spread + (rand() - 0.5) * 24,
      y: Math.sin(angle) * spread + (rand() - 0.5) * 24,
      vx: 0,
      vy: 0,
      hop: n.hop ?? 0,
      r: 4 + Math.sqrt(n.degree || 0) * 2.1 + (n.id === focus ? 2.5 : 0),
      pinned: false,
    }
  })

  const allIndex = new Map(allNodes.map((n) => [n.id, n]))
  const allLinks = subset.links
    .map((l) => ({ source: allIndex.get(l.source), target: allIndex.get(l.target) }))
    .filter((l) => l.source && l.target)

  let nodes = allNodes
  let links = allLinks
  let adjacency = buildAdjacency(nodes, links)

  function buildAdjacency(ns, ls) {
    const map = new Map(ns.map((n) => [n.id, new Set()]))
    for (const link of ls) {
      map.get(link.source.id)?.add(link.target.id)
      map.get(link.target.id)?.add(link.source.id)
    }
    return map
  }

  // Hiding a category takes its notes out of the layout entirely, so the links
  // that ran through them go too and the rest closes up around the gap.
  function setVisibleKinds(kinds) {
    nodes = kinds ? allNodes.filter((n) => kinds.has(n.kind)) : allNodes
    const shown = new Set(nodes.map((n) => n.id))
    links = allLinks.filter((l) => shown.has(l.source.id) && shown.has(l.target.id))
    adjacency = buildAdjacency(nodes, links)
    hovered = null
    dragging = null
    canvas.title = ""
    presettle()
    fit()
    draw()
  }

  const camera = { x: 0, y: 0, scale: 1 }
  let width = 0
  let height = 0
  let dpr = 1
  let alpha = 1
  let alphaTarget = 0
  let settling = false
  let settleTicks = 0
  let hovered = null
  let dragging = null
  let panning = null
  const pointers = new Map()
  let pinch = null
  let pointerMoved = false
  let frame = null
  let running = false
  let hasFitted = false
  const labelRooms = new Map()

  const toScreen = (x, y) => [(x - camera.x) * camera.scale + width / 2, (y - camera.y) * camera.scale + height / 2]
  const toWorld = (sx, sy) => [(sx - width / 2) / camera.scale + camera.x, (sy - height / 2) / camera.scale + camera.y]

  // Returns true when the backing store actually changed.
  function syncSize(nextWidth, nextHeight) {
    if (nextWidth < 1 || nextHeight < 1) return false
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2)
    if (nextWidth === width && nextHeight === height && nextDpr === dpr) return false

    dpr = nextDpr
    width = nextWidth
    height = nextHeight
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return true
  }

  function applySize(nextWidth, nextHeight) {
    if (syncSize(nextWidth, nextHeight)) {
      fit()
      draw()
    }
  }

  function resize() {
    const rect = el.getBoundingClientRect()
    applySize(rect.width, rect.height)
  }

  // Only reserve room for labels that are actually drawn. Once a pass decides
  // they are on the rest of the fit keeps them on, or the scale would flip back
  // and forth across the threshold that switches them.
  function labelRoom() {
    let on = showLabels === "always"
    return (node, scale) => {
      on = on || scale > LABEL.zoom
      if (!on) return { half: 0, drop: 0 }
      const size = Math.round(labelSize(scale) * 10) / 10
      const key = `${size}|${node.id}`
      let room = labelRooms.get(key)
      if (!room) {
        ctx.font = labelFont(size)
        room = labelExtent((t) => ctx.measureText(t).width, node.id, size)
        labelRooms.set(key, room)
      }
      return room
    }
  }

  function fit() {
    const placed = fitCamera(nodes, width, height, labelRoom())
    if (!placed) return
    camera.scale = placed.scale
    camera.x = placed.x
    camera.y = placed.y
    hasFitted = true
  }

  function draw() {
    // The observer is the fast path, but it does not fire while the page is not
    // rendering (background tab, hidden pane). Catching up here means the canvas
    // can never be left drawing at a stale size.
    if (syncSize(canvas.clientWidth, canvas.clientHeight)) fit()
    if (width === 0) return
    ctx.clearRect(0, 0, width, height)

    if (nodes.length === 0) {
      ctx.globalAlpha = 1
      ctx.fillStyle = colors.muted
      ctx.font = "400 13px system-ui, sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("Every category is hidden", width / 2, height / 2)
      return
    }

    const near = hovered ? adjacency.get(hovered.id) : null
    const dimmed = (node) => hovered && node !== hovered && !near.has(node.id)
    // Past the first hop a node is context, not a connection of the focus.
    const fade = (node, part) => (node.hop > 1 ? HOP_FADE[part] : 1)

    ctx.lineWidth = Math.max(0.8, camera.scale * 0.9)
    for (const link of links) {
      const active = hovered && (link.source === hovered || link.target === hovered)
      const faded = hovered && !active
      ctx.strokeStyle = active ? colors.accent : colors.line
      const base = 0.5 * Math.min(fade(link.source, "link"), fade(link.target, "link"))
      ctx.globalAlpha = faded ? 0.12 : active ? 0.85 : base
      const [x1, y1] = toScreen(link.source.x, link.source.y)
      const [x2, y2] = toScreen(link.target.x, link.target.y)
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }

    ctx.globalAlpha = 1
    const labelEveryone = showLabels === "always" || camera.scale > LABEL.zoom

    for (const node of nodes) {
      const [x, y] = toScreen(node.x, node.y)
      const r = node.r * Math.max(camera.scale, 0.55)
      const faded = dimmed(node)

      ctx.globalAlpha = faded ? 0.2 : fade(node, "node")
      ctx.fillStyle = colors[node.kind] ?? colors.note
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()

      if (node.id === focus || node === hovered) {
        ctx.strokeStyle = colors.surface
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.strokeStyle = colors[node.kind] ?? colors.note
        ctx.lineWidth = RING.width
        ctx.beginPath()
        ctx.arc(x, y, r + RING.gap, 0, Math.PI * 2)
        ctx.stroke()
      }

      const showLabel = node === hovered || (near && near.has(node.id)) || (!hovered && labelEveryone)
      if (showLabel) {
        ctx.globalAlpha = faded ? 0.25 : node === hovered ? 1 : 0.85 * fade(node, "label")
        const size = labelSize(camera.scale)
        ctx.font = labelFont(size)
        ctx.textAlign = "center"
        ctx.textBaseline = "top"
        ctx.fillStyle = node === hovered ? colors.text : colors.muted
        const lines = wrapLabel((t) => ctx.measureText(t).width, node.id, LABEL.maxWidth, LABEL.maxLines)
        for (const [row, text] of lines.entries()) {
          ctx.fillText(text, x, y + r + RING_EXTENT + LABEL.gap + row * size * LABEL.lineGap)
        }
      }
    }
    ctx.globalAlpha = 1
  }

  const fastestNode = () => {
    let fastest = 0
    for (const n of nodes) fastest = Math.max(fastest, Math.hypot(n.vx, n.vy) * alpha)
    return fastest
  }

  function loop() {
    if (alpha > FORCES.alphaMin) {
      alpha = stepForces(nodes, links, alpha, alphaTarget)

      // Hold the floor until the layout has actually come to rest, then let it
      // decay away so an idle graph costs nothing.
      if (settling) {
        settleTicks++
        if ((settleTicks > 30 && fastestNode() < FORCES.restSpeed) || settleTicks > 3000) {
          settling = false
          alphaTarget = 0
        }
      }
      if (!hasFitted || alpha > 0.35) fit()
      draw()
      frame = requestAnimationFrame(loop)
    } else {
      running = false
      frame = null
      draw()
    }
  }

  function start() {
    if (running) return
    running = true
    frame = requestAnimationFrame(loop)
  }

  function reheat(value = 0.45) {
    alpha = Math.max(alpha, value)
    start()
  }

  // Each step is O(n^2), so a large vault gets fewer of them rather than a
  // frozen page. At this size the whole thing costs a couple of milliseconds.
  function presettle() {
    const maxSteps = nodes.length > 150 ? 200 : 600
    let a = 1
    let steps = 0
    while (a > FORCES.alphaMin && steps < maxSteps) {
      a = stepForces(nodes, links, a, 0)
      steps++
    }
    alpha = 0
    for (const n of nodes) {
      n.vx = 0
      n.vy = 0
    }
  }

  // Fingers are blunter than a cursor, so touch gets a wider hit area.
  function nodeAt(sx, sy, slop = 4) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i]
      const [x, y] = toScreen(node.x, node.y)
      const r = Math.max(node.r * camera.scale, 6) + slop
      if ((sx - x) ** 2 + (sy - y) ** 2 <= r * r) return node
    }
    return null
  }

  const pointerPos = (event) => {
    const rect = canvas.getBoundingClientRect()
    return [event.clientX - rect.left, event.clientY - rect.top]
  }

  const slopFor = (event) => (event.pointerType === "touch" ? 14 : 4)

  // Capture keeps a drag alive if the finger slides off the canvas, but it is
  // only a convenience and it throws if the pointer has already gone. Letting
  // that escape would abort the rest of the handler and kill the gesture.
  const capturePointer = (event) => {
    try {
      canvas.setPointerCapture(event.pointerId)
    } catch {
      /* the gesture still works without it */
    }
  }

  function startPinch() {
    const [a, b] = [...pointers.values()]
    pinch = {
      dist: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1,
      mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
    }
    // A two finger gesture is never a node drag and never a tap.
    if (dragging) {
      dragging.pinned = false
      dragging = null
      alphaTarget = FORCES.settleFloor
      settling = true
      settleTicks = 0
    }
    panning = null
    pointerMoved = true
  }

  function onPointerDown(event) {
    const pos = pointerPos(event)
    pointers.set(event.pointerId, pos)
    capturePointer(event)

    if (pointers.size === 2) {
      startPinch()
      return
    }
    if (pointers.size > 2) return

    pointerMoved = false
    const node = nodeAt(pos[0], pos[1], slopFor(event))
    if (node) {
      dragging = node
      node.pinned = true
      // Keep the layout live for the whole drag. Without a target, alpha decays
      // away after a few seconds and the other nodes stop responding.
      alphaTarget = 0.3
      reheat(0.3)
    } else {
      panning = { sx: pos[0], sy: pos[1], camX: camera.x, camY: camera.y }
    }
  }

  function onPointerMove(event) {
    const pos = pointerPos(event)
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, pos)
    const [sx, sy] = pos

    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()]
      const dist = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]

      // Whatever sat under the old midpoint should sit under the new one at the
      // new scale. That is pinch zoom and two finger pan in a single step.
      const [wx, wy] = toWorld(pinch.mid[0], pinch.mid[1])
      camera.scale = Math.min(Math.max(camera.scale * (dist / pinch.dist), 0.25), 6)
      const [nx, ny] = toWorld(mid[0], mid[1])
      camera.x += wx - nx
      camera.y += wy - ny

      pinch = { dist, mid }
      hasFitted = true
      draw()
      return
    }

    if (dragging) {
      pointerMoved = true
      const [wx, wy] = toWorld(sx, sy)
      dragging.x = wx
      dragging.y = wy
      draw()
      return
    }

    if (panning) {
      pointerMoved = true
      camera.x = panning.camX - (sx - panning.sx) / camera.scale
      camera.y = panning.camY - (sy - panning.sy) / camera.scale
      hasFitted = true
      draw()
      return
    }

    // Touch has no hover state, and leaving one set would strand a highlight.
    if (event.pointerType === "touch") return

    const node = nodeAt(sx, sy)
    if (node !== hovered) {
      hovered = node
      canvas.style.cursor = node ? "pointer" : "grab"
      canvas.title = node ? node.id : ""
      draw()
    }
  }

  function onPointerUp(event) {
    const [sx, sy] = pointerPos(event)
    pointers.delete(event.pointerId)
    try {
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }

    if (pinch) {
      pinch = null
      // Hand the gesture back to the finger still down instead of jumping.
      if (pointers.size === 1) {
        const [p] = [...pointers.values()]
        panning = { sx: p[0], sy: p[1], camX: camera.x, camY: camera.y }
        pointerMoved = true
      }
      return
    }

    if (dragging) {
      dragging.pinned = false
      if (!pointerMoved) open(dragging)
      dragging = null
      alphaTarget = FORCES.settleFloor
      settling = true
      settleTicks = 0
      reheat(0.3)
    } else if (panning) {
      if (!pointerMoved) {
        const node = nodeAt(sx, sy, slopFor(event))
        if (node) open(node)
      }
      panning = null
    }

    if (event.pointerType === "touch" && hovered) {
      hovered = null
      draw()
    }
  }

  function onPointerLeave() {
    // The tooltip has to go with the highlight. Leaving it set means the last
    // node's name hangs around over empty canvas.
    canvas.title = ""
    canvas.style.cursor = "grab"
    if (hovered) {
      hovered = null
      draw()
    }
  }

  function onWheel(event) {
    event.preventDefault()
    const [sx, sy] = pointerPos(event)
    const [wx, wy] = toWorld(sx, sy)
    const factor = Math.exp(-event.deltaY * 0.0015)
    camera.scale = Math.min(Math.max(camera.scale * factor, 0.25), 6)
    const [nx, ny] = toWorld(sx, sy)
    camera.x += wx - nx
    camera.y += wy - ny
    hasFitted = true
    draw()
  }

  function open(node) {
    if (onNavigate) onNavigate(node)
  }

  canvas.addEventListener("pointerdown", onPointerDown)
  canvas.addEventListener("pointermove", onPointerMove)
  canvas.addEventListener("pointerup", onPointerUp)
  canvas.addEventListener("pointercancel", onPointerUp)
  canvas.addEventListener("pointerleave", onPointerLeave)
  canvas.addEventListener("wheel", onWheel, { passive: false })

  // contentRect is the authoritative size here. Reading it from the entry also
  // covers the case where the element was still laying out when mount() ran.
  const observer = new ResizeObserver((entries) => {
    const box = entries[entries.length - 1]?.contentRect
    if (box) applySize(box.width, box.height)
    else resize()
  })
  observer.observe(el)

  // Re-read the palette when the theme changes.
  const themeWatcher = new MutationObserver(() => {
    colors = readColors(document.documentElement)
    draw()
  })
  themeWatcher.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })

  // Run the layout to rest before anything is drawn. Watching it scramble into
  // place reads as a glitch rather than as an animation, so the reader only
  // ever sees the settled graph. The start positions are seeded, so this lands
  // in the same place every load.
  if (options.kinds) setVisibleKinds(options.kinds)
  else presettle()
  resize()

  return {
    setVisibleKinds,
    destroy() {
      if (frame) cancelAnimationFrame(frame)
      observer.disconnect()
      themeWatcher.disconnect()
      canvas.remove()
    },
  }
}

// Everything within `depth` hops of one note, plus the links among them.
export function neighbourhood(data, focus, depth) {
  const byId = new Map(data.nodes.map((n) => [n.id, n]))
  if (!byId.has(focus)) return { nodes: [], links: [] }

  const adjacency = new Map(data.nodes.map((n) => [n.id, new Set()]))
  for (const link of data.links) {
    adjacency.get(link.source)?.add(link.target)
    adjacency.get(link.target)?.add(link.source)
  }

  const hops = new Map([[focus, 0]])
  let edge = [focus]
  for (let step = 0; step < depth; step++) {
    const next = []
    for (const id of edge) {
      for (const other of adjacency.get(id) ?? []) {
        if (!hops.has(other)) {
          hops.set(other, step + 1)
          next.push(other)
        }
      }
    }
    edge = next
  }

  // Copies, not the shared nodes: several graphs share one data object and each
  // focuses somewhere different, so hop counts must not leak between them.
  return {
    nodes: data.nodes.filter((n) => hops.has(n.id)).map((n) => ({ ...n, hop: hops.get(n.id) })),
    links: data.links.filter((l) => hops.has(l.source) && hops.has(l.target)),
  }
}
