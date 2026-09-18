---
name: glossary-terms
description: Terms of art are nodes in Theology/Glossary, one file per term, linked on first use so the site shows the definition on hover. Never explained in the prose, never sourced from Wikipedia.
metadata:
  type: project
---

Since 2026-09-18 a technical term in a node is not explained in the prose. It links its entry in `Theology/Glossary/`, aliased to the word as written, `[[Libertarian free will|libertarian]]`, and the site shows the entry's first sentence when a reader hovers the link. That is why the first sentence of a term's Description is the definition and nothing else.

**Why a folder of nodes and not a single glossary page or Wikipedia links.** The site already shows a note's first sentence on hover for any wikilink, so one file per term gives the hover definition with no new site machinery; a single page with headings would have shown the page's opening instead. Wikipedia fails the vault's own source policy (unsigned, changes under you), so each entry cites a signed reference work: the *Stanford Encyclopedia of Philosophy*, the *Internet Encyclopedia of Philosophy*, a signed *Britannica* entry or a field's standard handbook. The user rejected in-text glosses on 2026-09-18 and left the mechanism to the agent; this is the mechanism.

**How to apply:**

- The template is in `.agents/skills/source-node/references/templates.md` under Term: `type: term`, `kind` is the field, headings Description and Source. `agents/term.md` researches one.
- Terms are the second reference layer beside People: grey in the site, hidden from the graphs by default, a term links only other terms, and any node may link a term. See [[link-direction]].
- The sourcing pipeline may create a term entry the way it creates a person node, and may not edit an existing one. See [[one-node-at-a-time]].
- What counts as a term: a word a well read reader would need a dictionary for. "Incompatibilism", "reductio", "effective population size" yes. "Premise", "consensus", "manuscript" no.
- The first three entries, written the same day as examples: Libertarian free will, Incompatibilism, Reductio ad absurdum. The one sourced argument that uses those words does not link them yet; that edit was posted to chat for approval, per [[one-node-at-a-time]].
