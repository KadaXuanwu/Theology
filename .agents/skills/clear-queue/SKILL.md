---
name: clear-queue
description: Work the gaps in the Theology vault's verification queue. Tries every free route to each source a node could not confirm, has a cold checker rule on what was found, records every entry as closed, partial or still open with what was tried, and regenerates the gap list. Use when the user asks to clear, work or close the verification queue or the gaps, for one node or for all of them. It is also the last step of every source-node and refresh-node run. To build or rebuild a node, use source-node or refresh-node.
---

# Clear Queue

Every entry in `Verification/` gets a full attempt before anyone is asked to look at it. The run closes what it can, narrows the rest to exactly what is still missing, and leaves that in `Verification/_Gaps.md`, where anyone can see the vault's possible gaps and the works that would close them.

Read `Verification/README.md` and `.agents/skills/source-node/references/access-routes.md` first. `source-policy.md` and `citation-style.md` in the same folder govern every fix.

## What it may change

- **The entries.** Status, Kind, What is open, Needs, Tried, Verdict and Checked by. The ID, the title, Source and What the node says stay as written, so the record of what was asked survives.
- **The node, citation details only,** and only when the user named that node for this run, or the run is the last step of a `source-node` or `refresh-node` run on it. A citation detail is a page, a page range, a title, a forename, a volume or issue, a date, a quotation's wording brought into line with the source, or the copy a footnote cites under citation style rule 8. The entry becomes `corrected`.
- **Everything else is `pending`.** The change goes into the Verdict word for word and into the delivery as a block to paste. A finding that changes what the node argues is `pending` and named for `refresh-node`.

A node's `status` never changes here.

## Step 1: Pick the entries

The user names a node, or asks for the whole queue. For the whole queue take the files one at a time, those with a `pending` entry first, then by the most gaps.

Work every `open` and `partial` entry. A `pending` entry is applied when the node may be edited and left alone otherwise. A settled entry is reopened only when the user asks.

An entry with no Kind gets one from the README's list. An entry holding two questions of different kinds takes the kind of the part the node leans on most, and What is open names the other.

An `unchecked` entry does not go to the finder. Run `source-node`'s `agents/verifier.md` over the sentences it names, at the Verify only standard, and rule from its verdicts.

## Step 2: Finder

`agents/finder.md`, one fresh subagent per file, on the smaller model. More than six entries in a file: split them, six to a finder. Paste the agent file, then the entries verbatim, the node's body, `access-routes.md`, and the path of a scratch file outside the vault for its findings.

Where the run is the last step of a node run, give the finder that run's attempts too, so it starts from the routes the run did not try.

## Step 3: Checker, cold

`agents/checker.md`, one fresh subagent per file, on the default model. It gets each entry and, from the finder, only `FOUND`, `VERSION` and `ACCESS`: where the answer is said to be. It never gets the finder's quotes, its `SAYS` line or its routes. An entry where the finder found nothing skips the checker.

The checker re-opens every location itself. A location it cannot open is a ruling of `open`, whatever the finder reported.

## Step 4: Arbiter

You, in the main conversation. For each entry:

- **Status** is the checker's ruling, held to the table in `access-routes.md`. Never higher. `wrong` becomes `corrected` when the node may be edited and the change is a citation detail, otherwise `pending`.
- **What is open** is rewritten to what is still missing and nothing else. On a closed entry it reads `nothing`.
- **Needs** is the one work that would close what is left, as `Surname Year, Short Title`. Use the spelling `_Gaps.md` already has for that work. Leave it out on a closed entry, and on a `pending` one with nothing left to fetch.
- **Tried** gets one more line: `<date>, clear-queue: ` and each route with what it returned, a clause each. Earlier lines stay.
- **Verdict** says what was confirmed and from what: the location, the page or section, the version. On a `pending` entry it ends with the change for the node, word for word. An entry still `open` leaves it empty.
- **Checked by** reads `clear-queue run, <date> (pipeline, not a human)` wherever there is a verdict.

A `lead` read in full that changes nothing in the node is `confirmed`, with the reason. One that adds to or contradicts the node is `pending` for `refresh-node`.

Apply the node changes this run may make, and keep the node's footnotes in the house form.

## Step 5: Write and deliver

Run `npm run queue`, then `npm run check`. Commit and push with a one line message. On a whole queue run, commit every five files as well, so a stalled agent costs one batch at most.

Then post to chat, short:

1. Anything that showed the node wrong, first: `corrected` with what changed, and every `pending` change as a block to paste
2. Counts for the run: entries worked, closed, partial, still open
3. The top five lines of "By what would close them" in `_Gaps.md`

## Batching

For more than three files in one go, use your agent's workflow or orchestration tool, if it has one, with the same steps per file instead of spawning agents by hand.
