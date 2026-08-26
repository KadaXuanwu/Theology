// Picking what the model gets to read.
//
// Two things go to the model. The catalogue is one line per note and is sent
// every time: it is what answers "which node covers this?" for a reader who
// only half remembers something, and it is the safety net for everything the
// keyword scoring below gets wrong. Full note bodies are sent for a handful of
// notes only.
//
// The split matters because the two costs scale differently. The catalogue
// grows with the vault but is identical on every request, so it sits at the
// front of the prompt where an implicit cache can reuse it. The bodies change
// with every question, which makes them the part worth being stingy with.

// A ceiling on characters, for the rare note that is enormous.
export const BODY_BUDGET = 90_000

// The real limit. Keyword ranking is good for the first few notes and noise
// after that, so sending thirty of them buys nothing and costs everything.
// Eight rather than five because a question phrased entirely in synonyms can
// push the right note down the list: a description of "Humans Are Primed to
// See Agents and Purpose" using none of its own words ranked it seventh.
export const MAX_NOTES = 8

// How much of the previous answer is used to rank notes for a follow-up.
const HISTORY_CONTEXT = 600

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

// One line per note, cheap enough to send all of them.
//
// No url. It is the title and the section run through the same slug rules the
// site uses, so sending it was the same information twice, and at 300 notes
// that duplication cost about 3,800 tokens on every question. The model writes
// [[Title]] instead and the Worker resolves it, which also means a broken link
// can no longer come from the model mistyping a slug.
export function catalogue(notes) {
  return notes
    .map((n) => {
      const tags = n.tags.length ? ` [${n.tags.join(", ")}]` : ""
      const status = n.status && n.status !== "sourced" ? ` (${n.status})` : ""
      return `- ${n.title} | ${n.section}${status}${tags} | ${n.excerpt}`
    })
    .join("\n")
}

// The text a follow-up should be ranked against. "Tell me more about that"
// carries no keywords of its own, so on its own it scores nothing and the very
// notes under discussion get dropped. The previous answer names them.
export function rankingText(question, history = []) {
  const lastAnswer = [...history].reverse().find((m) => m.role === "assistant")
  return lastAnswer ? `${question} ${lastAnswer.text.slice(0, HISTORY_CONTEXT)}` : question
}

// Which note bodies to include, best first. The note the reader is currently
// looking at always goes first: "what does this page say" is the most common
// question a chat bubble on a page gets asked.
export function selectNotes(notes, question, pageUrl, budget = BODY_BUDGET, maxNotes = MAX_NOTES) {
  const terms = words(question)

  const ranked = notes
    .map((note) => ({ note, score: note.url === pageUrl ? Infinity : score(note, terms) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.note.title.localeCompare(b.note.title, "en"))

  // Nothing matched. This used to fall back to reading order, which under a cap
  // of eight means eight arbitrary notes: tokens spent on text with nothing to
  // do with the question, and a model invited to answer from it. Sending none
  // is cheaper and more honest, and the catalogue still lists every note, so it
  // can name the right one and admit it has not read it.
  if (ranked.length === 0) return []

  const chosen = []
  let used = 0
  for (const { note } of ranked) {
    if (chosen.length >= maxNotes) break
    const cost = note.text.length + note.title.length + 20
    if (used + cost > budget && chosen.length > 0) break
    chosen.push(note)
    used += cost
  }
  return chosen
}

export function buildPrompt(corpus, { question, pageUrl = null, history = [] }) {
  const notes = corpus.notes ?? []
  const page = notes.find((n) => n.url === pageUrl) ?? null
  const chosen = selectNotes(notes, rankingText(question, history), pageUrl)

  const bodies = chosen.length
    ? chosen.map((n) => `### ${n.title}\n\n${n.text}`).join("\n\n---\n\n")
    : "(None. Nothing in the question matched a note closely enough to quote in full. Work from the catalogue above.)"

  const system = `You are a reading assistant for a research vault about arguments for and against Christianity. The vault maps arguments, claims and evidence as linked notes, so that any statement can be traced back to what it rests on.

Rules, in order of importance:

1. Answer only from the notes given below. If they do not cover something, say so plainly: "The vault does not have a note on that yet." Never fill a gap from your own knowledge, and never guess what a note probably says.
2. Refer to any note by writing its exact title in double square brackets, like [[Jesus Existed]]. Copy the title exactly as the catalogue spells it. Do not write urls or links of your own; the brackets become links on their own.
3. You are given the full text of only a few notes. The catalogue lists every note that exists. If the catalogue shows a note that would answer the question but its full text is not below, name it in brackets and say plainly that you have not read it, for example: "That sounds like [[Some Note]], though I have not read it here. Ask about it directly and I can."
4. Do not take a side. The vault exists to lay out both cases and show what each rests on, not to settle which is right. Describe what a note argues; do not endorse it or rebut it.
5. Do not soften or tidy an argument into something the note did not say. If you are paraphrasing, stay close. If precision matters, quote a short phrase.
6. Be short. A few sentences. This is a chat bubble, not an essay.
7. Notes marked stub or drafted have not been source checked. Say so if you lean on one.

Every note in the vault is in the catalogue. The full text section below covers only the notes most relevant to this question.`

  const context = `## Catalogue of every note

${catalogue(notes)}

## Full text of the most relevant notes

${bodies}`

  const asked = page ? `The reader is currently on the note "${page.title}".\n\n${question}` : question

  return { system, context, question: asked, used: chosen.map((n) => n.url) }
}

// Turns [[Title]] into a markdown link the page can render. The model is only
// ever given titles, so this is the single place a title becomes a url, and it
// is resolved against the corpus rather than against anything the model wrote.
//
// The order matters. Any markdown link in the text is flattened to plain words
// first, because the model was never given a url and so could only have guessed
// one, and a guessed slug that happens to look right is a broken link the page
// would render without complaint. Only after that do bracketed titles become
// links. A title matching no note stays plain text rather than pointing
// somewhere that does not exist.
export function resolveLinks(text, notes) {
  const byTitle = new Map(notes.map((n) => [n.title.toLowerCase(), n]))
  return text
    .replace(/\[([^\][]+)\]\([^)]*\)/g, "$1")
    .replace(/\[\[([^\][]+)\]\]/g, (whole, title) => {
      const note = byTitle.get(title.trim().toLowerCase())
      return note ? `[${note.title}](${note.url})` : title.trim()
    })
}
