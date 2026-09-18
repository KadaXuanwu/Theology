# Style and final checklist

## Density

Every sentence carries a fact, a source or a limit. A sentence that carries none of the three gets cut, however well it reads. This bites hardest in the Description, which is where padding hides.

The first sentence states the claim. Not what the node is about, not what it is not about, not who the reader should picture. The claim itself, so that someone who reads only that line already has the argument.

Cut on sight:

- Setups and throat clearing. "The case is narrower than the title", "two things go wrong at once", "before getting to that".
- Scope carving before the claim is on the page. If a distinction does work, make it in the sentence where it does the work. If it only guards against a misreading, it belongs in Limits.
- Instructions to the reader. "Set two people aside", "imagine", "picture someone who".
- The title said again in other words.
- Signposting what a later section will do.
- A point walked through as a story when the sources state it flat.
- A sentence whose whole content is that the previous sentence mattered.

The test is deletion. Take out the paragraph. If the node still carries every fact, source and limit it carried before, it stays out.

## Length

A `sourced` node's body runs 500 to 2000 words, frontmatter excluded. Around 1000 is where most of them sit, so treat that as the shape of a normal node rather than a limit. Longer is fine when the material earns it. A node that keeps growing is usually two nodes.

Nothing is ever added to reach a length. Say what the sources carry, then stop. Past about 1500 words the writer proposes the split instead of writing on.

No section has a share to fill, but a Description that outweighs the rest of the node is usually carrying detail that belongs in Based On or a qualification that belongs in Limits.

Word counts are of prose: frontmatter and the footnote definitions at the foot of the note are excluded. `site/lint.mjs` counts the same way and warns outside the range.

Any other status has no limit, and neither does a person node. A person node runs as short as the facts about them do.

## Names

A name a reader does not already know tells them nothing. A person named in the prose links to their node in `People/`, and the site shows who they are on hover, so the prose spends no words on it. A name that appears only in a footnote citation stays a footnote: Metzger cited once for a manuscript point is not a node.

Where the person has no node yet, the pipeline researches them and writes one, which is the one exception to writing only the node you were asked for. Outside the pipeline, gloss them in a clause on first mention instead and report the missing node. "Thomas Aquinas, the 13th century theologian behind the *Summa theologiae*". "The Second Vatican Council, the assembly of Catholic bishops that met from 1962 to 1965." Later mentions in the same node use the short form.

A clause is the budget for anything that is not a person: councils, documents, institutions.

Books of the Bible need no gloss.

## Terms

A term of art gets no explanation in the prose. It links to its entry in `Glossary/` on first use, aliased to the word as written, `[[Libertarian free will|libertarian]]`, and the site shows the definition when a reader hovers it. Where no entry exists yet, the pipeline researches the term and writes one, the same exception it makes for people. Outside the pipeline, gloss the term in a clause and report the missing entry.

A word a well read reader knows without a dictionary is not a term. "Premise", "consensus" and "manuscript" need nothing. "Incompatibilism", "reductio" and "effective population size" need an entry.

## Voice

Plain, direct, short sentences. Write the way a well read person explains something to a friend, not the way a paper opens.

- No dashes as punctuation. Commas, full stops, colons and brackets instead. The only permitted dash is the en dash in passage references like Genesis 2:16–17.
- No "it's not X, it's Y" constructions. No "delve", "tapestry", "crucial", "it is important to note", "moreover", "in conclusion".
- No hedging stacks. One qualifier is enough.
- Short sentences. Past 30 words a sentence is doing two jobs, so split it. The lint warns on every one over that line and the verifier rules on them.
- No "both sides", "critics say" or "believers say" framing inside a node. The folder already tells the reader where the node sits.
- No debate voice. Nothing reads as an exchange: no "the sceptic argues", "the theologian concedes", "the other camp". The crux is a sentence about the argument, not about who said what.
- Do not congratulate a position or editorialise about how strong it is, except in Limits and Countered By where saying which case is the strong one is the actual job.

## Neutrality

The node is written so that someone who disagrees with it can read it without wincing at the framing. The strongest version of a position goes in, not a version that is easy to knock over.

Neutrality is about sourcing and framing, not about conclusions. If the scholarly field is lopsided on a question, say so and cite someone qualified saying so. Do not split the difference to look fair. See the false balance guard in `references/balance.md`.

## Final checklist

Run every item before delivering.

1. Length as the Length section says, on `sourced` nodes only
2. Frontmatter matches the template exactly, `status` is honest
3. Every heading from the template is present, in order, none empty
4. Every factual sentence has a source at the required tier
5. Every `[[link]]` matches an exact existing node title from the librarian list
6. Bible links use the biblegateway NIV format
7. On evidence nodes, Description contains zero interpretation
8. Counter positions are sourced to the same tier **and register** as the main position
9. Academic register is at least half the distinct sources, or the shortfall is disclosed
10. No factual claim rests on an advocacy source alone, and advocacy is attributed by name in the prose
11. No manufactured symmetry: no fringe position dressed as a live debate, no padded counter section, no well supported finding hedged into mush
12. No dashes as punctuation
13. Nothing unchecked is presented as checked
14. Every source read only at snippet, abstract or none access has an entry in the node's file under `Verification/`, and no footnote says how a source was read
15. No `[[link]]` runs up the stack, per the link direction table in `references/templates.md`, and the Description of an argument links no other argument
16. Every paragraph fails the delete test: removing it would cost the node a fact, a source or a limit
17. The Description's first sentence states the claim, with no setup, scope carving or reader instruction in front of it
18. Every person named in the prose is linked to their node, or glossed in a clause and reported as a node to create. Every term of art links its entry in `Glossary/` on first use, or is glossed in a clause and reported as an entry to create. Councils and documents are identified the first time they appear
19. Nothing outside the target node was edited. A change another node needs is written out for the user, not applied
20. On an argument node, the first bullet under Limits is the crux: one premise the argument stands or falls on, and what would settle it
21. Every entry in `points` is carried in the body with a source or reported as not carried with its reason, and the list itself is unchanged
22. Nothing reads as a debate. No card language, no exchange, no concession reported as a concession
23. The strong counter got the same effort as the main case: its best defender named, its best source at the same tier and register, stated as fully as its sources carry. Length and count are not the test; see rule 9 in `references/balance.md`
24. `npm run check` passes. `site/lint.mjs` fails on the mechanical rules above and warns on length and sentence length; a warning is read and answered in the delivery, not ignored
