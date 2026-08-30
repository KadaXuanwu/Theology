# Node templates

Copy these exactly. Frontmatter keys and heading order do not change.

## Argument (`Arguments For/`, `Arguments Against/`)

```
---
type: argument
status: stub
tags: []
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
- **Limits**: where the argument is weaker than it sounds, including cases where accepting it costs something elsewhere.
- **Related**: nodes that touch it without countering it.

## Claim (`Claims/`)

```
---
type: claim
status: stub
tags: []
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

## Link direction

Links never run up the stack.

| A node in | May link to |
| --- | --- |
| `Arguments For`, `Arguments Against` | `Claims`, `Evidence`, `People`, and other arguments |
| `Claims` | `Claims`, `Evidence`, `People` |
| `Evidence` | `Evidence`, `People` |
| `People` | `People` |

The `Description` of an argument may not link another argument. Every other section may.

Upward links are not written by hand. The site builds them and shows them under "Linked from", so a claim never lists the arguments that use it.

## Field values in use

- `status`: `stub`, `drafted`, `sourced`
- `kind`: on evidence `artefact`, `study`, `record`; on a person their trade. Both open lists, see above.

Set `status: sourced` only when every factual sentence passed the verifier.

## Link conventions

- Internal: `[[Exact File Name Without Extension]]`. Get the exact titles from the librarian. A link to a node that does not exist is a broken link, not a to do.
- Bible passages: `[Joshua 6:20–21](https://www.biblegateway.com/passage/?search=Joshua%206:20-21&version=NIV)`. En dash in the display text, plain hyphen in the URL.
- Citations: a footnote, `[^surname-year]`, defined at the foot of the note. Form is in `references/citation-style.md`, which is the only place citation format is decided.
