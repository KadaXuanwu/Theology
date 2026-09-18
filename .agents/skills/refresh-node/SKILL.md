---
name: refresh-node
description: Take one sourced-stale node in the Theology vault back to sourced. Re-opens every source cold, applies the verdicts, fills the gaps the current template has opened since the node was built, writes the run record and sets sourced only when the gate holds. Use when the user asks to refresh, recheck, re-verify or un-stale a node, or to bring an older sourced node up to the current pipeline. Adds no substance: new findings or a new argument go through source-node.
---

# Refresh Node

Takes one node from `sourced-stale` back to `sourced`, or says exactly what stands in the way.

A `sourced-stale` node passed a verifier once, under an earlier version of the pipeline or before some rule existed, and `sourced` is a promise it may no longer keep: every factual sentence read in the source it cites, the balance rules held or disclosed, the template met, the run record written. `sourced` means the node can be shown to the public with confidence. A refresh re-earns that promise for text that already exists. It does not research the topic again, hold a debate or reframe anything. Where the node needs new substance, the route is `source-node` in Source mode, and this skill says so and stops.

This skill owns no agents and no references. It reads `.agents/skills/source-node/references/` in full before running and pastes prompts from `.agents/skills/source-node/agents/`. The gates are in `references/templates.md`, section "Status".

## What a refresh may and may not change

May:

- Correct a sentence to what its source says, as the verifier's `ACTION` line gives it.
- Replace a source that failed with one a researcher opened in full that carries the same claim.
- Remove a sentence that carries no fact, source or limit, when the delete test in `references/style.md` passes.
- Remove a sentence whose cited source was opened in full and does not carry it, when no replacement came back and the node claims the same thing without it.
- Fill a frontmatter field the current template carries and the node lacks, from a source opened in full.
- Reorder the bullets under Limits so the one that names the crux comes first, when one of them does.
- Link a person or a term on first use, and create the `People/` node or `Glossary/` entry it needs, the same two exceptions `source-node` makes.
- Bring citations to `references/citation-style.md`, move any access note out of a footnote and into `Verification/`, and fix whatever the lint fails on.

May not:

- Rewrite a sentence for style, reorder sections, or change what the node claims.
- Write a crux, a counter or an argument form that is not already in the node. Those come from the debate, which this skill does not hold.
- Add a fact no source in this run carries.
- Remove a sentence whose loss would change what the node claims. That is the user's decision, and the node stays stale until it is made.
- Edit the `points` list, or any node other than the target and the person and term nodes it creates.

Every change to the stale text is quoted in the delivery, before and after. Protection exists so verified work is never destroyed quietly. A refresh is loud: the reason for every change is the verifier's finding, and the old text is one commit back.

## Step 1: Baseline

Ask for the node title and folder if not given. Read the file and record `status` and `points`.

- `status: sourced-stale`: the normal case.
- `status: sourced`: stop. Nothing to refresh. A fact check without a status change is `source-node` in Verify only mode.
- `status: stub` or `drafted`: stop and point at `draft-node` or `source-node`.

Ask, or read from the user's message, why the node is stale. "Older pipeline", "predates the template", "a footnote looks wrong" are refresh reasons. "New paper", "the counter is missing", "work in what X found" are Source mode reasons: stop and say so, since a refresh adds no substance.

Then set up the scratch directory outside the vault:

- `existing.md`: the body, verbatim. Every sentence in it is protected.
- No `notes.md`. Nothing here is inspiration; the node is the text.

Read `Verification/<Node Title>.md` if it exists. Its open entries are leads for Step 3, and its run record, if any, says which pipeline built the node. Collect supplied sources the same way `source-node` does; a supplied file is read at `full` access and earns no tier or register for being supplied.

## Step 2: Mechanical pass

No agents. Run `npm run check` and read every failure and warning on the node. Then, against the template for its kind in `references/templates.md` and the rules in `references/citation-style.md`, list:

- frontmatter keys the template carries and the node lacks, with the value empty (on a person: `born`, `died`, `location`)
- headings missing, out of order or empty
- citations off the house form: colon for volume and issue, no comma before the year, a hyphen in a page range, "and colleagues", a numbered key
- footnotes that record access: "not opened", "could not be reached", "snippet", "only the abstract"
- names in the prose with no link to `People/`, and terms of art with no link to `Glossary/`, checked against `ls` of the two folders. Split each list into "node exists, link it" and "no node"
- dashes as punctuation, inline `tags` or `points` lists, `[[links]]` that do not resolve or run up the stack

Fix the citation form, the dashes, the lists and the links to nodes that exist now. Move each access note into a `Verification/` entry in the README's form and cut it from the footnote. Leave the frontmatter gaps, the missing nodes and everything about content for the next steps.

## Step 3: Fill the gaps that need research

Only what Step 2 found, one pass each, on a smaller model where your agent lets you pick one.

- A person node missing `born`, `died` or `location`, or a person fact resting on Wikipedia alone: spawn `agents/person.md` with the name. Fill each field from a source the agent opened in full and cite it. `UNKNOWN` leaves the field empty and gets one `Verification/` entry. `LIVING` leaves `died` out.
- A person named in the prose with no node: spawn `agents/person.md`, write the node from the Person template, link the first mention.
- A term of art with no entry: spawn `agents/term.md`, write the entry from the Term template, link the first use with an alias. A term nothing signed defines is glossed in a clause and reported.

Everything written here goes to the verifier in Step 4 as part of the node, so it is checked before anything is committed.

## Step 4: Verifier, cold

One agent, on the default model. Paste `agents/verifier.md`, then this addendum, then `draft.md` as the node now stands, `existing.md`, and anything in `sources/`. It gets nothing else.

```
## Refresh addendum

This is a refresh of a sourced-stale node, not a build. Where this differs from the text above, this wins.

- `existing.md` holds the whole body as it stood before this run. Every sentence in it is protected: `protected-flag` in place of `cut`, with the finding. Sentences and frontmatter values not in `existing.md` were written this run and are yours to `cut`. The arbiter may act on a flag in this run, so write the ACTION line as the exact correction you would make, or `remove`, and put the source finding that justifies it in FINDING.
- There is no writer's source list and no ledger. The footnotes at the foot of the note are the source list. Give each its tier and register and build the ledger yourself.
- Add to the structural checks: every frontmatter key the template gives for this kind is present; every citation follows `references/citation-style.md`; no footnote says how a source was read; every person named in the prose links a node and every term of art links its entry; the `points` list is identical to the file on disk.
- On an argument, add a line `CRUX: first bullet | bullet <n> | none`, saying which bullet under Limits, if any, names the one premise the argument stands or falls on and what would settle it. Quote it.
- On a person or a term, skip the balance audit, the effort check and the adversarial pass. Rule on every fact and every frontmatter value: `pass` only on a source you opened in full at Tier A or B. A date or place with no such source is `protected-flag` with `no source at Tier A or B`.
- The old pipeline did not have the density rule, the inference check or the effort check. Apply all three to the whole node as if it were new, and flag rather than cut.
```

The verifier does not search for replacement sources. It rules on what is there.

## Step 5: Patch and re-check

Take every `fix`, `protected-flag` and `unopened` and sort it:

1. **Fix from the source.** The verifier opened the source and wrote the correction. Apply the ACTION line as written. The verifier read the source and said what it says, so the corrected sentence has passed and needs no second look.
2. **Source failed, claim may stand.** The source was not opened, or was opened and carries something weaker. Spawn one targeted researcher, the one from `agents/` whose scope owns the claim, with the sentence and the failed citation as its task. One pass, no second round. Where it returns a source opened in full that carries the claim, swap the citation and mark the sentence for re-check. Where it does not, the sentence goes to 3 or 4.
3. **Remove.** The sentence carries no fact, source or limit and the delete test passes, or nothing carries it and the node claims the same thing without it. Remove it. Do not shorten it, do not soften it.
4. **The user's decision.** Removing the sentence would change what the node claims, or it is load bearing and rests on a source nobody could open. Leave it. List it in the delivery with the finding and what would settle it. The node stays `sourced-stale`.

On a person, a field the researcher could not fill stays empty and gets its `Verification/` entry.

If anything was re-sourced in 2, spawn the verifier once more, cold, with only the re-sourced sentences and their new citations. Sentences it fails go to 3 or 4. Nothing else is re-checked.

Then the balance audit and the effort verdict, as `source-node` Phase 5 handles them: report, never pad, never manufacture a counter. Where the ledger fails a rule or the effort verdict is `less effort on the counter`, and no source in this run closes the gap, that is Step 6.

Re-run `npm run check`. Fix every failure. Read every warning.

## Step 6: Gate

The node goes to `sourced` when all of these hold:

- every factual sentence passed, was fixed from its source, or was re-sourced and passed the re-check
- nothing is left under 4 in Step 5
- on an argument or a claim, the body runs 500 to 2000 words of prose; on an argument, `CRUX` is `first bullet` after any reorder
- the balance rules hold, or the shortfall is disclosed in the run record and is not one new research would close
- every heading is filled, the frontmatter matches the template, the `points` list is unchanged
- the lint passes, and every warning on the node is fixed or answered in the delivery

Otherwise the node keeps `sourced-stale`. Keep every fix that was made, since the node is better for them, and write in the run record and the delivery which line above failed and why. `CRUX: none`, a balance gap that needs a researcher, a counter with no named defender, or a body outside the range after the cuts, each means the node needs `source-node` in Source mode. A sentence under 4 means the user decides. Say which.

## Step 7: Deliver

Write the node back to `Theology/<Folder>/<Exact Title>.md`. The frontmatter is as it was, `points` included, with `status` set by Step 6 and any fields Step 3 filled.

Write the run record at the top of `Verification/<Node Title>.md`, above any entries already there, in the form `Verification/README.md` gives, with `Built: <date>, refresh-node, Refresh mode` and the outcome on the same line. On a person or a term the record is the `Built`, `Sentences` and `Lint` lines only, and the file is written only when an entry is open or a sentence was removed. Run `npm run check`. Commit and push with a one line message.

Then post to chat:

1. The path of the file written and the status it carries, and if it stayed stale, the one gate that failed
2. Every change to the stale text, quoted before and after, with the verifier's finding as the reason
3. Sentences left for the user under Step 5, item 4, each with what would settle it
4. Frontmatter filled and the source for each value
5. Person and term nodes created
6. The run record's counts and ledger, any failing rule, the effort verdict, and the `CRUX` line
7. The `Verification/` entries added or closed, one line each, and any lint warning left standing with the reason
8. Any change another node needs, as a block to paste

Keep it short. The node is the deliverable.

## Batching

Most stale nodes are people, and each is a few hundred words. Up to five person nodes may share one verifier call, each with its own verdict block, and their Step 3 agents run in parallel. Arguments, claims and evidence get one verifier each. For more than three nodes in one go, use your agent's workflow or orchestration tool with the same steps, one commit per batch, and report each node in one line with the same eight items folded under it only where something changed or stayed open.
