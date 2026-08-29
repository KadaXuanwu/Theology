---
name: theology-node
description: Research, write and fact check nodes for the Theology vault (Arguments For, Arguments Against, Claims, Evidence). Use when the user asks to create a new theology node, rework an existing one, add sources to a node, check a node for accuracy, or turn rough notes on a religious argument into a sourced node. Runs a multi agent research and verification pipeline.
---

# Theology Node

Builds one node for the Theology vault at research grade, then writes it into the vault.

The vault is the `Theology` folder at the repo root, Obsidian style markdown. Folders: `Arguments For`, `Arguments Against`, `Claims`, `Evidence`. Nodes cross reference with `[[Exact File Name]]`.

Read `references/templates.md`, `references/source-policy.md`, `references/balance.md` and `references/style.md` before running the pipeline. They are short.

## Non negotiables

1. Every factual sentence carries a source the verifier can open. No retrievable source, no entry into the node.
2. A node marked `sourced` keeps its body between 500 and 2000 words, frontmatter excluded. Aim for about 1000. Go past that only when there is more that genuinely has to be said. Any other status has no limit.
   Optimise in both directions: at equal content, shorter is better, so cut every phrase that does not earn its place. At equal length, more good sourced facts and arguments is better. Never pad to reach a number.
3. The verifier may delete text written in this session. It may not delete text that already existed in the node. Pre-existing problems get reported to the user, never silently cut.
4. At least half the sources in a node are academic register. Advocacy publishing never carries a fact on its own. See `references/balance.md`.
5. The finished node is written to its file in the vault, then committed and pushed. Working files never land in the vault.
6. Only the target node is written. A change any other node needs is reported to the user as a block to paste, never applied. This covers backlinks, links the new node breaks, and errors the research turned up elsewhere.
7. Links never run up the stack. An argument may link claims, evidence and other arguments, but not another argument in its `Description`. A claim may link claims and evidence. An evidence note may link only other evidence. See `references/templates.md`.

## Step 1: Establish the baseline

Ask the user for the node title and folder if not given.

If the node already exists, copy it verbatim to `existing.md` in a scratch directory outside the vault before anything touches it. This file is the protection list. If the node is new, create an empty `existing.md`.

Never skip this. The verifier's cut authority depends on it.

Then collect supplied sources. Anything the user attached to the conversation, or dropped in a `sources/` folder, goes to the researchers and the verifier. A PDF the user provided is Tier A at full access and beats anything findable online, so tell the user up front that attaching paywalled material they have legitimate access to is the single biggest quality lever available.

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

Returns a verdict per factual sentence (`pass`, `fix`, `cut`, `protected-flag`), a recounted balance ledger, and a check for manufactured symmetry in the other direction.

### Phase 4: Arbiter (you, in the main conversation)

Apply the verifier's report:

- `cut` on session-written text: remove it
- `cut` on protected text: keep it, list it for the user with the reason
- `fix`: apply the correction, or drop the sentence if the fix cannot be sourced
- Re-check the word count after edits. Under 500 means the node is thin, say so rather than padding it.

Then handle the balance audit. Failing rules are reported to the user, not silently patched. Never pad a section, invent a counter position or hedge a well supported finding to make the numbers balance. If the academic share is under half, say which points could only be reached through advocacy sources and what was tried. An honest gap beats a manufactured debate.

Then run the checklist in `references/style.md`.

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
