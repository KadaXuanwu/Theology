---
name: theology-node
description: Research, write and fact check nodes for the Theology vault (Arguments For, Arguments Against, Claims, Evidence, People). Use when the user asks to create a new theology node, rework an existing one, add sources to a node, check a node for accuracy, or turn rough notes on a religious argument into a sourced node. Runs a multi agent research and verification pipeline.
---

# Theology Node

Builds one node for the Theology vault at research grade, then writes it into the vault.

The vault is the `Theology` folder at the repo root, Obsidian style markdown. Folders: `Arguments For`, `Arguments Against`, `Claims`, `Evidence`, `People`. Nodes cross reference with `[[Exact File Name]]`.

Read `references/templates.md`, `references/source-policy.md`, `references/citation-style.md`, `references/balance.md` and `references/style.md` before running the pipeline. They are short.

## Non negotiables

1. Every factual sentence carries a source the verifier can open. No retrievable source, no entry into the node.
2. Every sentence carries a fact, a source or a limit. A sentence that carries none of the three gets cut however well it reads, and the Description opens on the claim itself with no setup in front of it. This is the rule a finished node fails most often. See the density section in `references/style.md`.
3. Length is set in `references/style.md`. It is a real gate on a `sourced` node, not a style note. At equal content, shorter is better. At equal length, more good sourced facts and arguments is better.
4. The verifier may delete text written in this session. It may not delete text that already existed in the node. Pre-existing problems get reported to the user, never silently cut.
5. At least half the sources in a node are academic register. Advocacy publishing never carries a fact on its own. See `references/balance.md`.
6. The finished node is written to its file in the vault, then committed and pushed. Working files never land in the vault.
7. Only the target node is written, plus the `People/` nodes the names in it need. Person nodes are the one exception to this rule: when the node names someone in its prose and no person node exists, research that person and write it, then say which ones you created. Everything else another node needs is reported to the user as a block to paste, never applied. That covers backlinks, links the new node breaks, and errors the research turned up elsewhere.
8. Links never run up the stack. An argument may link claims, evidence, people and other arguments, but not another argument in its `Description`. A claim may link claims, evidence and people. An evidence note may link evidence and people. A person node links only other people. See `references/templates.md`.

## Step 1: Establish the baseline

Ask the user for the node title and folder if not given.

If the node already exists, copy it verbatim to `existing.md` in a scratch directory outside the vault before anything touches it. This file is the protection list. If the node is new, create an empty `existing.md`.

Never skip this. The verifier's cut authority depends on it.

Then collect supplied sources. Anything the user attached to the conversation, or dropped in a `sources/` folder, goes to the researchers and the verifier. A supplied file is read at `full` access, which is what makes it worth having, but it earns no special tier or register and gets weighed like any other source. Tell the user this so they know what attaching something does and does not buy.

The repo is public. Never commit a supplied file and never ask the user to. See `references/source-policy.md`.

## Verification queue

A node never says whether a source was checked. It cites the source and stops. Everything the pipeline could not confirm goes to `Verification/<Node Title>.md` at the repo root instead, one entry per open question, for a human to approve or correct. See `Verification/README.md` for the entry format. Add a single pointer bullet to the node's last source bearing section and nothing more.

This applies to source verification only. A section that is simply not written yet still says so in the node, the way `Origins` and `Disputed By` already do on several claims. That is a content gap, not a verification state.

## Step 2: Pick the run mode

- **Full run**: new node, or a rework that adds or changes substance. Run all phases.
- **Verify only**: user asks to fact check or source an existing node. Run Phase 0 and Phase 3 only.
- **Touch up**: wording, links, formatting. No agents. Do it inline.

State which mode you picked in one line before starting.

## Step 3: Run the pipeline

Spawn agents with the Agent tool, `subagent_type: general-purpose`. For each agent, paste the matching file from `agents/` as the top of the prompt, then append the task specifics (node title, working thesis, the user's notes, and for Phase 1 the librarian's output).

Agents start cold and cannot see this conversation. Everything they need goes in the prompt.

### Phase 0: Librarian (1 agent, runs first)

`agents/librarian.md`. Reads the existing vault on disk. Returns the list of existing node titles, which ones already cover part of this topic, and which sources are already cited elsewhere.

Its output feeds every later agent so they link instead of re-proving.

### Phase 1: Researchers (4 agents, in parallel)

Split by domain, not by position. Their outputs should barely overlap.

- `agents/researcher-text.md` primary text, passages, manuscripts, translation and original language
- `agents/researcher-material.md` artefacts, excavations, inscriptions, dated finds, named excavators
- `agents/researcher-scholarship.md` where the scholarly consensus sits and who dissents, by name
- `agents/researcher-steelman.md` the strongest published case for the opposite reading

Each returns a numbered claim list. Every claim has a source with a URL or full bibliographic reference, a tier from `references/source-policy.md`, a register from `references/balance.md`, and the access level actually achieved.

### Phase 2: Writer (1 agent)

`agents/writer.md`. Gets the librarian output, all four researcher lists, the user notes, and `existing.md`. Produces the node to template and word budget. Saves it as `draft.md` in the scratch directory and returns it.

The writer decides framing. Do not run parallel framing agents. Merged framings produce longer, blander text.

### Phase 3: Verifier (1 agent, cold)

`agents/verifier.md`. Gets `draft.md`, the source list, the balance ledger, `existing.md` and anything in `sources/`. Does **not** get the researcher notes or the writer's reasoning. That is the point. It re-opens sources itself.

Returns a verdict per factual sentence (`pass`, `fix`, `cut`, `protected-flag`), a density pass over the sentences that carry no fact, source or limit, a recounted balance ledger, and a check for manufactured symmetry in the other direction.

### Phase 4: Arbiter (you, in the main conversation)

Apply the verifier's report:

- `cut` on session-written text: remove it
- `cut` on protected text: keep it, list it for the user with the reason
- `fix`: apply the correction, or drop the sentence if the fix cannot be sourced
- Density `cut` on session-written text: remove it. Do not rewrite it shorter, remove it
- Re-check the word count after edits. Under 500 means the node is thin, say so rather than padding it.

Then handle the balance audit. Failing rules are reported to the user, not silently patched. Never pad a section, invent a counter position or hedge a well supported finding to make the numbers balance. If the academic share is under half, say which points could only be reached through advocacy sources and what was tried. An honest gap beats a manufactured debate.

Then run the checklist in `references/style.md`.

## Step 3b: People

Every person the node names in its prose needs a node in `Theology/People/`. Check which ones exist, and for each one that does not, spawn a research agent with `agents/person.md` and write the node from what it returns. The template is in `references/templates.md`.

These are the only nodes outside the target that this skill may create. It may not edit an existing person node without being asked: that is a node like any other, and rule 7 covers it.

Then link the first prose mention of each person in the target node, aliasing where the citation form and the prose form differ: `[[C. A. Coulson|Charles Coulson]]`.

## Step 4: Deliver

Write the finished node to `Theology/<Folder>/<Exact Title>.md`, then commit and push.

Then post to chat:

1. The path of the file written
2. A short list of what changed and why, if this was a rework
3. Protected problems the verifier flagged but could not cut, with the reason
4. The balance ledger as recounted by the verifier, and any failing rule
5. Any new Claim or Evidence node the research surfaced that is worth splitting out, with a one line reason
6. Any change another node needs, written out as a block the user can paste
7. Anything that could not be independently checked, named plainly, with its access level

Keep this wrap up short. The node is the deliverable.

## Batching

For more than three nodes in one go, use the Workflow tool with the same phase structure instead of spawning agents by hand.
