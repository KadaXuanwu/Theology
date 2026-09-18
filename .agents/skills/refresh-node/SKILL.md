---
name: refresh-node
description: Take one sourced-stale node in the Theology vault back to sourced at the standard of a full sourcing run. Reads the node as a once verified claim list, commissions researchers for what it lacks or gets wrong across every field it touches, debates when the findings bear on the thesis, edits the node in place under the ruling, fact checks every sentence cold and writes the run record. Use when the user asks to refresh, recheck, re-verify, un-stale or bring up to date a node, or to bring an older sourced node up to the current pipeline. For a stub or a draft use source-node.
---

# Refresh Node

Takes one node from `sourced-stale` back to `sourced`.

A `sourced-stale` node passed a verifier once, under an earlier pipeline or before a rule existed, and `sourced` is a promise it may no longer keep. `sourced` means the node can be shown to the public with confidence: every factual sentence read in the source it cites, every field the question touches heard from, the strongest counter stated at matching tier, the template met, the run record written. A refresh re-earns that promise at the same standard as `source-node`, and gets there with less work because the node has already done part of it. Its sentences are a claim list somebody sourced once, its argument has a form, and its footnotes say which fields it has heard from. The pipeline spends its effort on what is missing, wrong or out of date, and re-checks everything cold at the end.

The vault is the `Theology` folder at the repo root. This skill owns no agents and no references. It reads `.agents/skills/source-node/references/` in full before running and pastes prompts from `.agents/skills/source-node/agents/`, each followed by the addendum this file gives for it. `source-node`'s non negotiables all hold here. The gates are in `references/templates.md`, section "Status".

## What lite means

- The node's footnoted sentences become claim list `E`. Researchers do not return what `E` already carries. They return what the node lacks, what it gets wrong and what has been published since, so their lists are short and the writer edits rather than composes.
- The steelman, the scholarship researcher and one domain researcher per field always run. The text and material researchers run when the node leans on passages or artefacts. A whole field the node never heard from, medicine on a crucifixion node, cognitive science on a belief formation node, is the gap this skill exists to close.
- The debate runs when a finding bears on the thesis, when the node has no crux, or when the counter is under sourced. It is skipped when the researchers return only corrections, since a date or a page needs no ruling.
- The writer copies every section the ruling marks `KEEP` verbatim and changes only what the ruling, a correction or the template requires.
- The verifier is not lite. It reads every sentence of the finished node against its source, cold, exactly as in a full run.

## What protection means here

The whole old body goes into `existing.md`, and the verifier may flag but never cut a sentence in it. That rule exists so verified work is never destroyed quietly. A refresh changes protected text, and does so loudly:

- The writer changes a protected sentence only where the ruling's `DELTA`, a `CORRECTS` entry or the template requires it, and lists every one under `CHANGED`, before and after.
- The arbiter removes a protected sentence only when the verifier opened its source in full and it does not carry the claim, or nothing carries it, no replacement came back from the research, and the node claims the same thing without it.
- A protected sentence whose loss would change what the node claims, and that nothing in the run supports, is the user's decision. It is listed with the finding and what would settle it, and the node stays `sourced-stale` until the user rules.
- Every change to old text reaches the delivery quoted, with the finding that caused it. The old text is one commit back.

Nothing is rewritten for style. The `points` list is never edited. Only the target is written, plus the `People/` and `Glossary/` nodes its prose needs.

## Step 1: Establish the baseline

Ask for the node title and folder if not given. Read the file and record `status` and `points`.

- `status: sourced-stale`: the normal case.
- `status: sourced`: stop. A fact check without a status change is `source-node` in Verify only mode.
- `status: stub` or `drafted`: stop and point at `draft-node` or `source-node`.

Read what the user says makes it stale and carry it into the run: a named paper goes to the researcher whose scope owns it as a mandatory lead, a doubted footnote goes to the verifier by name, a missing field goes to the librarian. Where the user says the node's thesis itself is wrong, or asks for a rebuild, stop and point at `source-node` in Source mode.

Set up the scratch directory outside the vault:

- `existing.md`: the body, verbatim. Every sentence in it is protected.
- `notes.md`: the user's message, if it names anything. Otherwise empty. The node is not notes; it is the case as it stands.

Read `Verification/<Node Title>.md` if it exists. Its open entries go to the researcher whose scope owns each one as leads, and its run record, if any, says what the last run commissioned. Collect supplied sources as `source-node` does: read at `full` access, no tier or register for being supplied, never committed.

## Step 2: Mechanical pass

No agents. Run `npm run check` and read every failure and warning on the node. Then, against the template for its kind in `references/templates.md` and `references/citation-style.md`, list:

- frontmatter keys the template carries and the node lacks (on a person: `born`, `died`, `location`)
- headings missing, out of order or empty
- citations off the house form: a colon for volume and issue, no comma before the year, a hyphen in a page range, "and colleagues", a numbered key
- footnotes that record access: "not opened", "could not be reached", "snippet", "only the abstract"
- names in the prose with no link to `People/`, and terms of art with no link to `Glossary/`, checked against `ls` of the two folders, each split into "node exists" and "no node"
- dashes as punctuation, inline `tags` or `points` lists, `[[links]]` that do not resolve or run up the stack

Fix the citation form, the dashes, the lists and the links to nodes that exist. Move each access note into a `Verification/` entry in the README's form and cut it from the footnote. Leave frontmatter gaps, missing nodes and everything about content to the pipeline.

## Step 3: Run the pipeline

Spawn each agent as a fresh subagent. Paste the matching file from `agents/`, then the addendum below for that role, then the task specifics. Agents start cold and cannot see this conversation.

The working thesis is the first sentence of the node's Description. It is what the node claims, and the run tests it.

Models as in `source-node`: the librarian, the person and term researchers and the domain researchers may run on a smaller model; the writer, the verifier and the philosopher run on the default; the two debaters run on different model families where your agent offers them.

### Phase 0: Librarian (1 agent, runs first)

`agents/librarian.md`, with this addendum and the node's folder and title:

```
## Refresh addendum
The target exists and is sourced-stale. Add two blocks to your output.

## Claim list E
Every factual sentence in the body that carries a footnote, numbered E1 onward, with its citation, and the tier from references/source-policy.md and the register from references/balance.md as the venue gives them. A sentence with two footnotes is one entry with two sources.

## Gap map
- Fields: the fields from the roster this node touches, and against each whether any source in E comes from that field's own literature. A field touched with no source from it is a gap.
- Passages and artefacts: the passages and material finds the node leans on, and whether E carries a primary text or material source for each.
- Best sources: the tier and register of the best source behind the main case and behind the counter, read off E.
- Vintage: the newest academic source's year, and any E entry over 25 years old that carries a live claim.
- Crux: on an argument, quote the bullet under Limits that names a premise the argument stands or falls on and what would settle it, or write none.
- Counter: on an argument or a claim, which named defender the Countered By or Disputed By section names, or none.
```

Its output feeds every later agent.

### Phase 1: Researchers (in parallel)

Always: `agents/researcher-steelman.md`, `agents/researcher-scholarship.md`, and `agents/researcher-domain.md` once per field the librarian named, with its `FIELD:` line and the field's paragraph from `references/disciplines.md`. When the gap map lists passages: `agents/researcher-text.md`. When it lists artefacts or finds: `agents/researcher-material.md`.

Every researcher gets the node body, claim list `E`, the `points`, `notes.md`, the open `Verification/` entries in its scope, and this addendum:

```
## Refresh addendum
The node below exists and passed a verifier once. Its footnoted sentences are claim list E. Do not return what E already carries with a source; the verifier re-opens every E source itself. Return only what bears on the node, each entry tagged:
- ADDS: an argument, a finding, a named position or a source in your scope that the node lacks and a reader of this question would expect to find, with the source
- CORRECTS E<n>: an entry whose date, number, page, quotation, attribution or framing your source shows to be wrong or narrower than written, with the source and the correction
- CHALLENGES E<n>: an entry that a source in your scope argues against, with the source and the argument
Also report the newest work in your scope on this question, and where the node leans on a paper from another field's journal, whether the field's own later literature cites it as sound.
An empty list closing with "the node carries what my scope holds" is a fine answer. Every entry still carries source, tier, register and access achieved, and every point in `points` is still a mandatory lead: the entries that carry it, or a line saying it is not supported and why.
```

Each researcher ends with `FIELDS TOUCHED`. For every field named that nobody was sent to, spawn one more domain researcher before going on. Prefix the lists as `source-node` does: `T`, `M`, `S`, `C`, `D-<field>`.

### Phase 2: Debate (conditional)

Skipped on Evidence and People nodes, as in `source-node`. On an argument or a claim, the debate runs when any of these holds, and is skipped otherwise:

- any delta list carries an `ADDS` or `CHALLENGES` entry
- the gap map says `Crux: none`
- the counter's best source sits below the main case's on tier or register, or no defender is named

When it runs, it runs whole: opening cards, response, the philosopher twice with the cards in swapped order, `NEEDS SOURCE` handled by one targeted researcher pass, all as `source-node` Phase 2 gives it, with the same roles table and `references/debate-rules.md` pasted under each debater's file. Both debaters get the node body as the case as it stands, claim list `E` and every delta list, with this addendum:

```
## Refresh addendum
The node pasted below is the case as it currently stands, and it passed a verifier once. Argue over E and the delta lists as the rules say. Your card carries two extra sections. AGAINST THE NODE: what the node lacks, states more strongly than its entries carry, or gets wrong, each with the entry that shows it. THE NODE HOLDS: what in it your role has no answer to. A card that restates the node is not a card.
```

The philosopher gets this addendum:

```
## Refresh addendum
Rule as usual, then add a DELTA block for the writer: for each section of the node, KEEP, CHANGE <what, from which entries>, ADD <what, from which entries>, or DROP <which E entries, and why>. Then say whether the node's existing crux bullet, quoted, is the crux you found, and whether the counter the node names as the strong one is the strong one.
```

Compare `CRUX`, `STRONG COUNTER`, the `POINTS` verdicts and `DELTA` across the two rulings. Where they agree, the first goes forward. Where they differ, both go to the writer with one line on what differed, and the flip goes in the run record.

When the debate is skipped, the `CORRECTS` entries and the template gaps are the whole instruction to the writer, and the run record says the debate was not run and why.

### Phase 3: Writer (1 agent)

`agents/writer.md`, with the librarian output, `E`, every delta list including `N`, the ruling where there is one, the `points`, `notes.md`, `existing.md` and this addendum:

```
## Refresh addendum
existing.md is a node that passed a verifier once. Copy every section the ruling marks KEEP verbatim. Change only what the ruling's DELTA, a CORRECTS entry or the template requires, and carry every ADD the ruling accepted with its source. Where no ruling was made, apply the CORRECTS entries and the template and nothing else. Never reword a protected sentence for style. On an argument the first bullet under Limits is the crux the ruling gives, or the node's own where the ruling says it holds. Add a CHANGED block to your output: every protected sentence you changed or dropped, before and after, with the entry or template rule that required it.
```

### Phase 3b: People and terms

As `source-node` Step 3b: for every person the node names with no node in `People/`, spawn `agents/person.md` and write the node; for every term the writer lists under `TERMS`, spawn `agents/term.md` and write the entry. Link first mentions with aliases. On a person target, see the short path below.

### Phase 4: Verifier (1 agent, cold)

`agents/verifier.md`, with `draft.md`, the writer's source list and ledger, `existing.md`, anything in `sources/`, and this addendum. It does not get `E`, the delta lists, the cards, the ruling, `notes.md` or the writer's `CHANGED` block.

```
## Refresh addendum
This is a refresh of a sourced-stale node. existing.md holds the whole body as it stood before this run, and every sentence in it is protected: protected-flag in place of cut, with the finding. Sentences and frontmatter values not in existing.md were written this run and are yours to cut. Write every ACTION line as the exact correction you would make, or remove, so the arbiter can apply it as written.
Add to the structural checks: every frontmatter key the template gives for this kind is present; every citation follows references/citation-style.md; no footnote says how a source was read; every person named in the prose links a node and every term of art links its entry; the points list is identical to the file on disk.
On an argument add a line CRUX: first bullet | bullet <n> | none, saying which bullet under Limits names the one premise the argument stands or falls on and what would settle it. Quote it.
The pipeline that built this node had no density rule, no inference check and no effort check. Apply all three to the whole node as if it were new.
```

### Phase 5: Arbiter (you, in the main conversation)

Apply the verifier's report as `source-node` Phase 5 does, with one difference in what a flag on protected text leads to:

1. **Fix from the source.** The verifier opened the source and wrote the correction. Apply the ACTION line as written. The verifier read the source and said what it says, so the corrected sentence has passed.
2. **Source failed, claim may stand.** The verifier could not open the source, or it carries something weaker, and no delta list already supplies a replacement. Spawn one targeted researcher, the one whose scope owns the claim, with the sentence and the failed citation. One pass. A source opened in full that carries the claim replaces the citation and the sentence is marked for re-check. Otherwise the sentence goes to 3 or 4.
3. **Remove.** The sentence carries no fact, source or limit and the delete test in `references/style.md` passes, or nothing carries it and the node claims the same thing without it. Remove it. Do not shorten or soften it.
4. **The user's decision.** Removing the sentence would change what the node claims, or it is load bearing and rests on a source nobody could open. Leave it, list it in the delivery with the finding and what would settle it. The node stays `sourced-stale`.

If anything was re-sourced under 2, spawn the verifier once more, cold, with only those sentences and their new citations. Nothing else is re-checked.

Then the balance audit and the effort verdict, as `source-node` gives them: report, never pad, never manufacture a counter. Then `npm run check`, fix every failure, read every warning, and run the checklist in `references/style.md`.

## People and terms

A person or term target takes a short path. Step 2 as above. Then one `agents/person.md` or `agents/term.md` run, on the smaller model, with the node body pasted as what the vault currently says: it returns the facts it can source, `UNKNOWN` where it cannot, and the stated position it found in print or `NONE FOUND`. Fill each empty frontmatter field from a source the agent opened in full and cite it; `UNKNOWN` leaves the field empty with one `Verification/` entry; `LIVING` leaves `died` out. A person fact resting on Wikipedia alone is re-sourced from what the agent returned or goes to the verifier as it stands. Then Phase 4 with this line added to the addendum:

```
On a person or a term, skip the balance audit, the effort check and the adversarial pass. Rule on every fact and every frontmatter value: pass only on a source you opened in full at Tier A or B. A date or a place with no such source is protected-flag with no source at Tier A or B.
```

Then Phase 5. No debate, no delta lists, no writer: the arbiter edits the node directly and lists every change.

## Step 4: Gate and deliver

The node goes to `sourced` when all of these hold:

- every factual sentence passed, was fixed from its source, or was re-sourced and passed the re-check, and nothing is left under Phase 5 item 4
- on an argument, a claim or an evidence note, the body runs 500 to 2000 words of prose; on an argument the verifier's `CRUX` line reads `first bullet`
- the balance rules hold or the shortfall is disclosed in the run record, and where the effort verdict is `less effort on the counter` the steelman's list held nothing better
- every heading is filled, the frontmatter matches the template, the `points` list is unchanged
- the lint passes, and every warning on the node is fixed or answered in the delivery

Otherwise the node keeps `sourced-stale`. Keep every fix that was made, and say in the run record and the delivery which line failed and why.

Write the node to `Theology/<Folder>/<Exact Title>.md`. The frontmatter is as it was, `points` included, with `status` set here and the fields the run filled. Write the run record at the top of `Verification/<Node Title>.md`, above any entries already there, in the form `Verification/README.md` gives, with `Built: <date>, refresh-node, Refresh mode` and the outcome on that line; `Rulings` reads `not run, <why>` when the debate was skipped. On a person or a term the record is the `Built`, `Sentences` and `Lint` lines, and the file is written only when an entry is open or a sentence was removed. Run `npm run check`. Commit and push with a one line message.

Then post to chat:

1. The path written and the status it carries, and if it stayed stale, the one gate that failed
2. Every change to the old text, quoted before and after, with the entry or finding that caused it
3. Sentences left for the user under Phase 5 item 4, each with what would settle it
4. What the researchers added, by field, and which fields came back with nothing the node lacked
5. Whether the debate ran and why, and whether the crux and strong counter held, changed or flipped
6. One line per point: carried where with which source, or not carried and why
7. Frontmatter filled with its sources, and the person and term nodes created
8. The run record's counts and ledger, any failing rule, the effort verdict and the `CRUX` line
9. The `Verification/` entries added or closed, one line each, and any lint warning left standing with the reason
10. Any change another node needs, as a block to paste

Keep it short. The node is the deliverable.

## Batching

Most stale nodes are people, each a few hundred words. Up to five person targets may share one verifier call, each with its own verdict block, and their person agents run in parallel. Arguments, claims and evidence get the full pipeline each. For more than three nodes in one go, use your agent's workflow or orchestration tool with the same phases, one commit per batch, and report each node in one line with the items above folded under it only where something changed or stayed open.
