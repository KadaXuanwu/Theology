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
}

// One step of the simulation. Pure apart from mutating node x/y/vx/vy, which
// keeps it testable outside a browser.
export function stepForces(nodes, links, alpha) {
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

  return alpha * FORCES.alphaDecay
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
    return () => {}
  }

  const canvas = document.createElement("canvas")
  el.appendChild(canvas)
  const ctx = canvas.getContext("2d")

  let colors = readColors(document.documentElement)
  const rand = seededRandom(focus ?? "global")

  const nodes = subset.nodes.map((n, i) => {
    const angle = (i / subset.nodes.length) * Math.PI * 2
    const spread = 60 + rand() * 90
    return {
      ...n,
      x: Math.cos(angle) * spread + (rand() - 0.5) * 24,
      y: Math.sin(angle) * spread + (rand() - 0.5) * 24,
      vx: 0,
      vy: 0,
      r: 4 + Math.sqrt(n.degree || 0) * 2.1 + (n.id === focus ? 2.5 : 0),
      pinned: false,
    }
  })

  const index = new Map(nodes.map((n) => [n.id, n]))
  const links = subset.links
    .map((l) => ({ source: index.get(l.source), target: index.get(l.target) }))
    .filter((l) => l.source && l.target)

  const adjacency = new Map(nodes.map((n) => [n.id, new Set()]))
  for (const link of links) {
    adjacency.get(link.source.id).add(link.target.id)
    adjacency.get(link.target.id).add(link.source.id)
  }

  const camera = { x: 0, y: 0, scale: 1 }
  let width = 0
  let height = 0
  let dpr = 1
  let alpha = 1
  let hovered = null
  let dragging = null
  let panning = null
  let pointerMoved = false
  let frame = null
  let running = false
  let hasFitted = false

  const toScreen = (x, y) => [(x - camera.x) * camera.scale + width / 2, (y - camera.y) * camera.scale + height / 2]
  const toWorld = (sx, sy) => [(sx - width / 2) / camera.scale + camera.x, (sy - height / 2) / camera.scale + camera.y]

  function applySize(nextWidth, nextHeight) {
    if (nextWidth < 1 || nextHeight < 1) return
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2)
    if (nextWidth === width && nextHeight === height && nextDpr === dpr) return

    dpr = nextDpr
    width = nextWidth
    height = nextHeight
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    fit()
    draw()
  }

  function resize() {
    const rect = el.getBoundingClientRect()
    applySize(rect.width, rect.height)
  }

  function fit() {
    if (nodes.length === 0 || width === 0) return
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, n.x - n.r)
      minY = Math.min(minY, n.y - n.r)
      maxX = Math.max(maxX, n.x + n.r)
      maxY = Math.max(maxY, n.y + n.r)
    }
    const pad = 26
    const spanX = Math.max(maxX - minX, 1)
    const spanY = Math.max(maxY - minY, 1)
    camera.scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY, 2.2)
    camera.x = (minX + maxX) / 2
    camera.y = (minY + maxY) / 2
    hasFitted = true
  }

  function draw() {
    if (width === 0) return
    ctx.clearRect(0, 0, width, height)

    const near = hovered ? adjacency.get(hovered.id) : null
    const dimmed = (node) => hovered && node !== hovered && !near.has(node.id)

    ctx.lineWidth = Math.max(0.8, camera.scale * 0.9)
    for (const link of links) {
      const active = hovered && (link.source === hovered || link.target === hovered)
      const faded = hovered && !active
      ctx.strokeStyle = active ? colors.accent : colors.line
      ctx.globalAlpha = faded ? 0.12 : active ? 0.85 : 0.5
      const [x1, y1] = toScreen(link.source.x, link.source.y)
      const [x2, y2] = toScreen(link.target.x, link.target.y)
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }

    ctx.globalAlpha = 1
    const labelEveryone = showLabels === "always" || camera.scale > 1.15

    for (const node of nodes) {
      const [x, y] = toScreen(node.x, node.y)
      const r = node.r * Math.max(camera.scale, 0.55)
      const faded = dimmed(node)

      ctx.globalAlpha = faded ? 0.2 : 1
      ctx.fillStyle = colors[node.kind] ?? colors.note
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()

      if (node.id === focus || node === hovered) {
        ctx.strokeStyle = colors.surface
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.strokeStyle = colors[node.kind] ?? colors.note
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(x, y, r + 3, 0, Math.PI * 2)
        ctx.stroke()
      }

      const showLabel = node === hovered || (near && near.has(node.id)) || (!hovered && labelEveryone)
      if (showLabel) {
        ctx.globalAlpha = faded ? 0.25 : node === hovered ? 1 : 0.85
        ctx.font = `${node === hovered ? 600 : 400} ${Math.min(13, 10 + camera.scale)}px system-ui, sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "top"
        ctx.fillStyle = node === hovered ? colors.text : colors.muted
        const label = node.id.length > 34 ? `${node.id.slice(0, 33)}…` : node.id
        ctx.fillText(label, x, y + r + 4)
      }
    }
    ctx.globalAlpha = 1
  }

  function loop() {
    if (alpha > FORCES.alphaMin) {
      alpha = stepForces(nodes, links, alpha)
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

  function nodeAt(sx, sy) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i]
      const [x, y] = toScreen(node.x, node.y)
      const r = Math.max(node.r * camera.scale, 6) + 4
      if ((sx - x) ** 2 + (sy - y) ** 2 <= r * r) return node
    }
    return null
  }

  const pointerPos = (event) => {
    const rect = canvas.getBoundingClientRect()
    return [event.clientX - rect.left, event.clientY - rect.top]
  }

  function onPointerDown(event) {
    const [sx, sy] = pointerPos(event)
    const node = nodeAt(sx, sy)
    pointerMoved = false
    canvas.setPointerCapture(event.pointerId)
    if (node) {
      dragging = node
      node.pinned = true
      reheat(0.3)
    } else {
      panning = { sx, sy, camX: camera.x, camY: camera.y }
    }
  }

  function onPointerMove(event) {
    const [sx, sy] = pointerPos(event)

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
      draw()
      return
    }

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
    if (dragging) {
      dragging.pinned = false
      if (!pointerMoved) open(dragging)
      dragging = null
      reheat(0.2)
    } else if (panning) {
      if (!pointerMoved) {
        const node = nodeAt(sx, sy)
        if (node) open(node)
      }
      panning = null
    }
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
  }

  function onPointerLeave() {
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

  resize()
  start()

  return () => {
    if (frame) cancelAnimationFrame(frame)
    observer.disconnect()
    themeWatcher.disconnect()
    canvas.remove()
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

  const keep = new Set([focus])
  let edge = [focus]
  for (let step = 0; step < depth; step++) {
    const next = []
    for (const id of edge) {
      for (const other of adjacency.get(id) ?? []) {
        if (!keep.has(other)) {
          keep.add(other)
          next.push(other)
        }
      }
    }
    edge = next
  }

  return {
    nodes: data.nodes.filter((n) => keep.has(n.id)),
    links: data.links.filter((l) => keep.has(l.source) && keep.has(l.target)),
  }
}
