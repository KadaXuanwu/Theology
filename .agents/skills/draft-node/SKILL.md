---
name: draft-node
description: Turn a stub in the Theology vault into a drafted node. Shapes the author's notes to template with the claim stated first, the argument laid out with its crux, links to the nodes that already exist, candidate sources named as leads, and every gap written in. Cheap by design, two agents, no source verification. Use when the user asks to draft a node, shape a stub, organise rough notes, or get the main points of an argument together before sourcing. To take a draft to sourced, use source-node.
---

# Draft Node

Turns one stub into one drafted node. It does not source anything.

A stub is the author's own notes, written by hand from the folder's `_Template.md`: an idea, any length, headings empty or one line. A draft is that idea in the shape the finished node will take, with the argument laid out, the links in place and every gap named. The gates for both are in `.agents/skills/source-node/references/templates.md`, section "Status".

Read `.agents/skills/source-node/references/templates.md` and `style.md` from the same folder before running. The link direction table and the voice rules apply to a draft as they do to a finished node.

## What a draft is and is not

- The claim is the first sentence. The argument is laid out as premises, and on an argument node the first bullet under Limits names the crux, the one premise it stands or falls on.
- Links go only to nodes that exist, by exact title, and never up the stack.
- Sources are leads: the work, the author, the year, and the access the drafter actually achieved. A lead the drafter opened is written as a footnote in the house style with its access noted. A lead nobody opened is a `Needs sources` line naming the candidate. Neither is a source. `source-node` opens everything again and keeps only what it can confirm.
- Every gap is written into the node as a `Needs sources` line saying what kind of source would fill it.
- The body may be thrown away by the sourcing run. The `points` list in the frontmatter may not. Anything the author insists on goes there.

## Step 1: Baseline

Ask for the node title and folder if not given. Read the file. Record `status` and `points`.

- `status: stub`: the normal case.
- `status: drafted`: a redraft. Same run.
- `status: sourced` or `status: sourced-stale`: stop. A sourced node is reworked with `source-node` and a sourced-stale one is refreshed with `refresh-node`. Neither is redrafted.
- No file: write the user's message into a new file from the folder's `_Template.md` with `status: stub`, then carry on. Say that you did this.

The `points` list is the author's. Never add to it, reorder it or remove from it.

## Step 2: Librarian

Spawn a subagent for `.agents/skills/source-node/agents/librarian.md`, on a smaller model if your agent lets you pick one. Paste the file as the top of the prompt, then the node title, folder and the stub body. It returns the exact titles a draft may link to, what the vault already covers, which nodes link here, and the fields the node touches.

## Step 3: Drafter

Spawn `agents/drafter.md` the same way, on the smaller model unless the notes are unusually dense. Paste the file, then the stub body as the author's notes, the `points` list, and the librarian's output in full.

The drafter may search and fetch to confirm that a work exists and what it argues. It records the access it achieved on every lead and invents nothing. Where it cannot confirm, it writes `Needs sources` with what would settle it.

## Step 4: Gate, write, deliver

Check the draft against the drafted gate in `templates.md`: every heading filled or marked as a gap, the Description opens on the claim, every link resolves to a title the librarian listed and runs down the stack, no dash used as punctuation, the frontmatter unchanged except `status` and any added tags.

Write the node to its file with `status: drafted`, then run `npm run check`. The lint has to pass; its warnings do not apply to a draft. Commit and push with a one line message.

Then post to chat:

1. The path of the file written
2. Any point that could not be placed in the draft, and why
3. Leads the drafter could not open, with their access level, so nobody mistakes them for sources
4. The fields the librarian named, which is what the sourcing run will commission
5. Any new Claim or Evidence node the notes imply, one line each

Keep it short. The draft is the deliverable.

## Rules

- One node. Nothing else in the vault is edited. A change another node needs is printed for the user.
- No `Verification/` file. Verification records belong to sourced runs.
- Tags may be added, never removed.
- No word limit, and no padding. A thin draft with its gaps named beats a full one with gaps papered over.
