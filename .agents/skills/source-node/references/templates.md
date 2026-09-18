# Node templates

Copy these exactly. Frontmatter keys and heading order do not change. `points` is the one optional key; see Points below.

## Argument (`Arguments For/`, `Arguments Against/`)

```
---
type: argument
status: stub
tags: []
points: []
---
# Description
# Based On
# Countered By
# Limits
# Related
```

- **Description**: the argument in plain prose. What it claims and why someone holds it. The first sentence is the claim, not a run up to it. Scope limits go in Limits, not in front of the claim.
- **Based On**: the passages, claims and evidence it rests on. Link them. If something is asserted here without a source, say so out loud rather than leaving it looking sourced.
- **Countered By**: the arguments and claims that answer it. Link them. Say which counter is the strong one.
- **Limits**: where the argument is weaker than it sounds, including cases where accepting it costs something elsewhere. The first bullet is the crux: the one premise the argument stands or falls on, and what would settle it. The rest follow.
- **Related**: nodes that touch it without countering it.

**Which folder.** An argument concludes something about Christianity, its truth or the rational standing of belief in it, from premises a person outside the faith can grant or fight. A node whose premises are Christian teaching and whose conclusion is that an objection fails is a claim, however Christian it reads: it goes in `Claims/`, and the objection it answers links down to it. The test is to delete every premise that is itself a Christian teaching. If the argument still runs, it is an argument. If it collapses, it is a claim. Hell Is Self-Chosen Separation collapses and is a claim. God Is the Reason Anything Exists at All still runs and is an argument.

## Claim (`Claims/`)

```
---
type: claim
status: stub
tags: []
points: []
---
# Description
# Origins
# Based On
# Carries
# Disputed By
# Limits
```

- **Description**: the claim stated in two or three sentences, starting with the claim.
- **Origins**: who made this claim and where. Named scholars, book titles, publishers, years.
- **Based On**: the evidence nodes, passages and other claims it rests on. Link them.
- **Carries**: what the claim licenses and how far it goes. Link the claims that lean on it, never an argument. The arguments that use it link down to here and the site lists them under "Linked from".
- **Disputed By**: named opponents and where they published the objection. Claims and evidence may be linked, arguments never.
- **Limits**: what the claim does not reach.

## Evidence (`Evidence/`)

```
---
type: evidence
kind: study
status: stub
tags: []
points: []
---
# Description
# Shows
# Limits
# Source
```

`kind` is `artefact` for physical finds and inscriptions, `study` for papers and datasets, `record` for documented practices, rites and institutional acts. The list is open. Add a value when nothing fits rather than forcing the note into the wrong one, and say in the delivery notes that you added it.

- **Description**: what the thing physically is and what it literally says or measured. No interpretation here at all. Include date, find spot, current location and catalogue number for artefacts. Include sample, method and result for studies.
- **Shows**: what the evidence establishes, stated flat. A reading that is not the obvious one names who holds it. Links only to other evidence, never up to a claim or an argument. The claims that use it link down to here.
- **Limits**: reconstruction problems, disputed readings, sample size, replication status, and what the evidence simply does not reach.
- **Source**: catalogue entry, publication, translation, in that order. Links where they exist.

The Description and Shows split is the load bearing rule of the whole vault. Description is what we actually have. Shows is what people make of it. Do not blur them.

## Person (`People/`)

```
---
type: person
kind: theologian
born: c. 1225, Aquino
died: 7 March 1274, Fossanova
location: Paris, Cologne, Rome, Naples
status: stub
tags: []
points: []
---
# Description
# Work
# Stated Position
```

`kind` is what the person is by trade: `theologian`, `philosopher`, `historian`, `archaeologist`, `psychologist`. Open list, same rule as evidence.

`born`, `died` and `location` are the three facts every person has, so they are frontmatter rather than prose. Date then place, in that order. The site renders them in one shape under the title, which is why they are not written into the Description as well.

Leave `died` out for someone still alive. The site says "living" and its tooltip says no death was recorded when the note was last updated, which is the honest version: nobody rechecks a living person every week, and the date it is true as of is already on the page.

`location` is where they worked, not where they were born.

- **Description**: who they are and what they worked on. Two sentences at most, and no dates, since the line above the note already carries those. This is what the site shows when someone hovers a link to them anywhere in the vault, so it carries the weight the prose no longer has to.
- **Work**: what they published, dated. The works the vault cites, plus the ones they are known for. Link an evidence node where a work already has one.
- **Stated Position**: what they said in their own words about the question, quoted and cited. If they never stated one, say so. Nothing here is inferred from someone's research, and there is no for, against or neutral label: most working scholars have never published a position on the truth of Christianity, and guessing one from their subject matter is the error this vault exists to avoid.

There is no Related section. A person node links another person inline where it matters, and everything else is the graph's job: what the vault uses someone for is already on their page under "Linked from", built by the site.

A person node never says who is right, and no word limit applies to it.

## Term (`Glossary/`)

```
---
type: term
kind: philosophy
status: stub
tags: []
---
# Description
# Source
```

`kind` is the field the term belongs to: `philosophy`, `logic`, `biblical studies`, `medicine`, `cosmology`, `psychology`. Open list, same rule as evidence.

- **Description**: the definition in one or two plain sentences, in the sense the vault uses it, with the reference work's own wording quoted where it is short. The first sentence is the definition, because it is what the site shows when a reader hovers the term anywhere in the vault. Where the term has another sense a reader might confuse it with, one more sentence says which is meant.
- **Source**: the signed reference work the definition comes from, linked, with the section.

A term links other terms and nothing else. No word limit applies, and a term is never longer than it has to be. Wikipedia is not a source for a term. The *Stanford Encyclopedia of Philosophy*, the *Internet Encyclopedia of Philosophy*, a signed *Britannica* entry or a field's standard handbook is; `agents/term.md` researches one.

## Link direction

Links never run up the stack.

| A node in | May link to |
| --- | --- |
| `Arguments For`, `Arguments Against` | `Claims`, `Evidence`, `People`, `Glossary`, and other arguments |
| `Claims` | `Claims`, `Evidence`, `People`, `Glossary` |
| `Evidence` | `Evidence`, `People`, `Glossary` |
| `People` | `People`, `Glossary` |
| `Glossary` | `Glossary` |

The `Description` of an argument may not link another argument. Every other section may.

Upward links are not written by hand. The site builds them and shows them under "Linked from", so a claim never lists the arguments that use it.

A term sits under everything, so any node links one on the first use of the term in its prose, aliased to the word as written: `[[Libertarian free will|libertarian]]`. `site/lint.mjs` checks every row of this table on every build.

## Tags

An empty tag list is written `tags: []`. A list with something in it is written the way Obsidian writes it, one per line indented two spaces:

```
tags:
  - hell
  - justice
```

Not `tags: [hell, justice]`. Obsidian rewrites an inline list into the block form the moment the note is opened, which turns every note the vault touches into a diff nobody made.

## Points

`points` is the author's list of what the node must address. It is frontmatter, not prose, so it never counts toward the word count, never goes through the verifier as a sentence and never trips the template check. Written like tags, one per line:

```
points:
  - The survival account has to explain the spear wound, not only the odds.
  - Say what the same evidential standard does to Tacitus.
```

- One line per point, plain text, no links or markdown. The site shows them folded at the foot of the note, exactly as written, under "Author's points".
- The author owns the list. No skill adds to it, reorders it or removes from it. A point that could not be carried is reported in chat, and the author decides whether it stays.
- In `source-node` every point is a mandatory lead: carried into the body with a source, or reported as not carried with the reason. In `draft-node` every point is placed in the draft where it does its work.
- The key is optional. A node without it, or with `points: []`, has none.

## Status

`status` is a promise about the node. Four values, each with a gate.

**`stub`.** The author's own notes, written by hand from the folder's `_Template.md`. Any length. Headings may be empty or hold one line. Nothing but the author writes a stub, and nothing checks one.

**`drafted`.** The idea in the node's shape, unverified. Every heading is filled or marked as a gap with a `Needs sources` line. The Description opens on the claim. Every `[[link]]` resolves to an existing node and runs down the stack. Sources are leads, each carrying the access the drafter achieved, and nothing is presented as checked. Set by `draft-node`, or by hand when the author has done the same work.

**`sourced`.** Every factual sentence passed the verifier, the body runs 500 to 2000 words of prose, and the balance rules hold or the shortfall is disclosed in the run record. Set by `source-node`. On a person or a term there is no word range, and `sourced` means every fact was read in the source it cites.

**`sourced-stale`.** Was `sourced`, and may no longer meet that gate. The name says both halves: it passed once, and it is due again. It passed a verifier under an earlier version of the pipeline, or findings made since have not been worked in. Its text is protected the way sourced text is, because it did pass a verifier once. Set by hand when the pipeline changes or new work turns up. The skill that takes a node from `sourced-stale` back to `sourced` does not exist yet; until it does, `source-node` in Source or Verify only mode is the route.

A stub or a draft is inspiration for the sourcing run and no more. Its body is not protected and its leads are not sources. The `points` list is the one thing in it that binds.

## Field values in use

- `status`: `stub`, `drafted`, `sourced`, `sourced-stale`. See Status above.
- `kind`: on evidence `artefact`, `study`, `record`; on a person their trade; on a term its field. All open lists, see above.
- `points`: optional, see Points above.

## Link conventions

- Internal: `[[Exact File Name Without Extension]]`. Get the exact titles from the librarian. A link to a node that does not exist is a broken link, not a to do.
- Bible passages: `[Joshua 6:20–21](https://www.biblegateway.com/passage/?search=Joshua%206:20-21&version=NIV)`. En dash in the display text, plain hyphen in the URL.
- Citations: a footnote, `[^surname-year]`, defined at the foot of the note. Form is in `references/citation-style.md`, which is the only place citation format is decided.
