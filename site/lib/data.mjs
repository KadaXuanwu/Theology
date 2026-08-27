// The three JSON payloads the site ships beside its pages.
//
// Each one is a different reader with different needs, which is why they are
// three files rather than one: the graph wants ids and degrees, the search
// wants lowercased text it can scan, and the chat Worker wants the notes in
// their original case because a model reads them.

// One entry per pair of linked notes. Links are drawn undirected, so A -> B and
// B -> A are the same edge and only one of them is kept.
export function dedupeLinks(notes) {
  const seen = new Set()
  const links = []
  for (const note of notes) {
    for (const target of note.links) {
      const key = [note.title, target.title].sort().join("\u0000")
      if (seen.has(key)) continue
      seen.add(key)
      links.push({ source: note.title, target: target.title })
    }
  }
  return links
}

export const countLinks = (notes) => dedupeLinks(notes).length

export const graphData = (notes) =>
  JSON.stringify({
    nodes: notes.map((n) => ({
      id: n.title,
      url: n.url,
      kind: n.section.kind,
      degree: n.links.length + n.backlinks.length,
    })),
    links: dedupeLinks(notes),
  })

// Lowercased body text, because every query is lowercased before it is matched.
export const searchData = (notes) =>
  JSON.stringify(
    notes.map((n) => ({
      title: n.title,
      url: n.url,
      kind: n.section.kind,
      section: n.section.label,
      status: n.status,
      tags: n.tags,
      excerpt: n.shortExcerpt,
      text: n.text.toLowerCase(),
    })),
  )

// What the chat Worker reads. Deliberately not content hashed by the caller:
// the Worker fetches it by a fixed URL and re-reads it every ten minutes, which
// is what lets notes change daily while the Worker itself sits untouched.
export const chatCorpus = (notes) =>
  JSON.stringify({
    notes: notes.map((n) => ({
      title: n.title,
      url: n.url,
      section: n.section.label,
      kind: n.section.kind,
      status: n.status,
      tags: n.tags,
      excerpt: n.shortExcerpt,
      text: n.text,
    })),
  })
