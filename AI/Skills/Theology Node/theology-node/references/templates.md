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

- **Description**: the argument in plain prose. What it claims and why someone holds it.
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
# Evidence
# Supports
# Disputed By
# Limits
```

- **Description**: the claim stated in two or three sentences.
- **Origins**: who made this claim and where. Named scholars, book titles, publishers, years.
- **Evidence**: the evidence nodes and passages behind it. Link them.
- **Supports**: which arguments can lean on this claim. Link them.
- **Disputed By**: named opponents and where they published the objection.
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

`kind` is `artefact` for physical finds and inscriptions, `study` for papers and datasets.

- **Description**: what the thing physically is and what it literally says or measured. No interpretation here at all. Include date, find spot, current location and catalogue number for artefacts. Include sample, method and result for studies.
- **Shows**: the interpretation. Every reading here names who holds it, or is marked as the obvious one. Link the claims and arguments it bears on.
- **Limits**: reconstruction problems, disputed readings, sample size, replication status, and what the evidence simply does not reach.
- **Source**: catalogue entry, publication, translation, in that order. Links where they exist.

The Description and Shows split is the load bearing rule of the whole vault. Description is what we actually have. Shows is what people make of it. Do not blur them.

## Field values in use

- `status`: `stub`, `drafted`, `sourced`
- `kind`: `artefact`, `study`

Set `status: sourced` only when every factual sentence passed the verifier.

## Link conventions

- Internal: `[[Exact File Name Without Extension]]`. Get the exact titles from the librarian. A link to a node that does not exist is a broken link, not a to do.
- Bible passages: `[Joshua 6:20–21](https://www.biblegateway.com/passage/?search=Joshua%206:20-21&version=NIV)`. En dash in the display text, plain hyphen in the URL.
- Books: *Title* (Publisher Year), author named in the sentence.
