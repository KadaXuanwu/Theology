// Picking what the model gets to read.
//
// The catalogue (one line per note) always goes in: it is small, it is the same
// on every request, and it is what answers "which node covers this?" for a
// reader who only has a vague idea. Full note bodies are then added in
// relevance order until a character budget runs out.
//
// At 32 notes the budget swallows the whole vault, so this behaves like sending
// everything. At 300 it quietly becomes top-N retrieval with no change here.
// That is the point: the scaling decision is a number, not a rewrite.

// Roughly 3.7 characters per token for English prose, so 90k characters is
// about 25k tokens. Well inside any current model, small enough to stay fast
// and to keep a free tier's per-minute token cap out of the picture.
export const BODY_BUDGET = 90_000

// Words too common to say anything about which note is relevant. Deliberately
// short: this is a relevance nudge, not a search engine.
const STOPWORDS = new Set(
  ("a an the and or but if then than that this these those is are was were be been being do does did " +
    "have has had i you he she it we they what which who whom whose when where why how of in on at to " +
    "for with about against between into through during before after above below from up down out off " +
    "over under again further once here there all any both each few more most other some such no nor " +
    "not only own same so too very can will just should now would could does me my your").split(" "),
)

const words = (text) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))

// How well a note answers this question. Title and tag hits count for much more
// than body hits, because a word in a title is what the note is about while a
// word in the body may be one passing mention.
function score(note, terms) {
  if (terms.length === 0) return 0

  const title = note.title.toLowerCase()
  const tags = note.tags.join(" ").toLowerCase()
  const body = note.text.toLowerCase()

  let total = 0
  for (const term of terms) {
    if (title.includes(term)) total += 10
    if (tags.includes(term)) total += 5
    // Capped, so one note repeating a word does not outrank a note that is
    // actually about it.
    const hits = body.split(term).length - 1
    if (hits > 0) total += Math.min(hits, 5)
  }
  return total
}

// One line per note, cheap enough to send all of them. The url is here because
// every answer has to be able to link the node it came from.
export function catalogue(notes) {
  return notes
    .map((n) => {
      const tags = n.tags.length ? ` [${n.tags.join(", ")}]` : ""
      const status = n.status && n.status !== "sourced" ? ` (${n.status})` : ""
      return `- ${n.title} | ${n.section}${status}${tags} | ${n.url} | ${n.excerpt}`
    })
    .join("\n")
}

// Which note bodies to include, best first, up to the budget. The note the
// reader is currently looking at always goes first: "what does this page say"
// is the most common question a chat bubble on a page gets asked.
export function selectNotes(notes, question, pageUrl, budget = BODY_BUDGET) {
  const terms = words(question)

  const ranked = notes
    .map((note) => ({ note, score: note.url === pageUrl ? Infinity : score(note, terms) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.note.title.localeCompare(b.note.title, "en"))

  // Nothing matched any term. Rather than answer from excerpts alone, fall back
  // to reading order so short vague questions still get real text to work with.
  const pool = ranked.length ? ranked.map((e) => e.note) : notes

  const chosen = []
  let used = 0
  for (const note of pool) {
    const cost = note.text.length + note.title.length + 20
    if (used + cost > budget && chosen.length > 0) break
    chosen.push(note)
    used += cost
  }
  return chosen
}

export function buildPrompt(corpus, { question, pageUrl = null }) {
  const notes = corpus.notes ?? []
  const page = notes.find((n) => n.url === pageUrl) ?? null
  const chosen = selectNotes(notes, question, pageUrl)

  const bodies = chosen
    .map((n) => `### ${n.title}\nurl: ${n.url}\n\n${n.text}`)
    .join("\n\n---\n\n")

  const system = `You are a reading assistant for a research vault about arguments for and against Christianity. The vault maps arguments, claims and evidence as linked notes, so that any statement can be traced back to what it rests on.

Rules, in order of importance:

1. Answer only from the notes given below. If they do not cover something, say so plainly: "The vault does not have a note on that yet." Never fill a gap from your own knowledge, and never guess what a note probably says.
2. Link every note you refer to, as a markdown link to its url, for example [The Sacrifice Requirement Is Arbitrary](arguments-against/the-sacrifice-requirement-is-arbitrary). Use the url exactly as given.
3. Do not take a side. The vault exists to lay out both cases and show what each rests on, not to settle which is right. Describe what a note argues; do not endorse it or rebut it.
4. Do not soften or tidy an argument into something the note did not say. If you are paraphrasing, stay close. If precision matters, quote a short phrase.
5. Be short. A few sentences. This is a chat bubble, not an essay.
6. If the reader is vaguely describing something and you can tell which note they mean, name it and link it, then give one line on what it says.
7. Notes marked stub or drafted have not been source checked. Say so if you lean on one.

The catalogue lists every note in the vault. The full text below it covers only the notes most relevant to this question. If the catalogue shows a note that would answer better than the ones quoted in full, link it and say it is worth opening.`

  const context = `## Catalogue of every note

${catalogue(notes)}

## Full text of the most relevant notes

${bodies}`

  const asked = page
    ? `The reader is currently on the note "${page.title}" (${page.url}).\n\n${question}`
    : question

  return { system, context, question: asked, used: chosen.map((n) => n.url) }
}
