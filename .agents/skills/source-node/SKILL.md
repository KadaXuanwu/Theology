---
name: source-node
description: Take one node in the Theology vault to sourced. Researches it across every field it touches, runs a steelman debate over the evidence, writes it to template, fact checks every sentence cold and writes it into the vault. Use when the user asks to source a node, finish a draft, rework a sourced node, add sources to a node, or check a node for accuracy. Covers Arguments For, Arguments Against, Claims, Evidence, People and Glossary terms. To turn a stub into a draft, use draft-node instead.
---

# Source Node

Takes one node from stub or drafted to sourced, or reworks a sourced one, at research grade, then writes it into the vault.

The vault is the `Theology` folder at the repo root, Obsidian style markdown. Folders: `Arguments For`, `Arguments Against`, `Claims`, `Evidence`, `People`, `Glossary`. Nodes cross reference with `[[Exact File Name]]`. The subject is Christianity. The evidence comes from wherever it comes from: biblical studies, archaeology, history, philosophy, psychology, medicine, the natural sciences. The pipeline commissions whichever fields a node needs.

Read every file in `references/` before running the pipeline. They are short.

## Non negotiables

1. Every factual sentence carries a source. A load bearing sentence carries one the verifier opened in full. A sentence resting on a source nobody could open keeps its citation, says nothing about access, and gets one entry in the node's file under `Verification/`.
2. Every sentence carries a fact, a source or a limit. A sentence that carries none of the three gets cut however well it reads, and the Description opens on the claim itself with no setup in front of it. This is the rule a finished node fails most often. See the density section in `references/style.md`.
3. Length is set in `references/style.md`. It is a real gate on a `sourced` node, not a style note. At equal content, shorter is better. At equal length, more good sourced facts and arguments is better.
4. A stub or a draft is inspiration and nothing more. Its sentences are not protected, its leads are not sources and its outline is not the node's shape. The node is researched from the evidence up. Protection covers text that was already in a `sourced` or `sourced-stale` node when the run started, and nothing else.
5. The author's `points` are binding. Every one is carried into the body with a source, or reported as not carried with the reason. The list itself is never edited by the pipeline.
6. At least half the sources in a node are academic register. Advocacy publishing never carries a fact on its own. See `references/balance.md`.
7. The finished node is written to its file in the vault, then committed and pushed. Working files never land in the vault.
8. Only the target node is written, plus the `People/` nodes the names in it need and the `Glossary/` entries its terms of art need. Those are the two exceptions: when the node names someone with no person node, or uses a term with no entry, research it and write it, then say which ones you created. Everything else another node needs is reported to the user as a block to paste, never applied. That covers backlinks, links the new node breaks, and errors the research turned up elsewhere.
9. Links never run up the stack. An argument may link claims, evidence, people, terms and other arguments, but not another argument in its `Description`. A claim may link claims, evidence, people and terms. An evidence note may link evidence, people and terms. A person node links people and terms. A term links only other terms. See `references/templates.md`; `site/lint.mjs` checks it.
10. The debate is internal. Nothing from it is quoted or paraphrased as a debate in the node: no "the sceptic argues", no card language, no transcript. Its findings reach the node as a crux, a strong counter and an argument form, written in the vault's voice.
11. `npm run check` passes before the commit. The lint in `site/lint.mjs` fails on the mechanical rules and warns on length and sentence length, and every warning on the target node is answered in the delivery.

## Step 1: Establish the baseline

Ask the user for the node title and folder if not given. Read the node's file and record its `status` and its `points` list.

Then set up two files in a scratch directory outside the vault:

- `existing.md` is the verifier's protection list. If the node's status is `sourced` or `sourced-stale`, copy the body into it verbatim. If the status is `stub` or `drafted`, or the node does not exist, leave it empty. A stub or a draft is not protected.
- `notes.md` holds what the run may be inspired by: the body of a stub or a draft, or the user's message when there is no file yet. It goes to the researchers as leads to check and to the writer as notes. Nothing in it is a fact until a researcher returns it with a source.

Never skip this. The verifier's cut authority depends on `existing.md` being right.

Then collect supplied sources. Anything the user attached to the conversation, or dropped in a `sources/` folder, goes to the researchers and the verifier. A supplied file is read at `full` access, which is what makes it worth having, but it earns no special tier or register and gets weighed like any other source. Tell the user this so they know what attaching something does and does not buy.

The repo is public. Never commit a supplied file and never ask the user to. See `references/source-policy.md`.

## Verification queue

A node never says whether a source was checked. It cites the source and stops. Everything the pipeline could not confirm goes to `Verification/<Node Title>.md` at the repo root instead, one entry per open question, for a human to approve or correct. See `Verification/README.md` for the entry format. Add a single pointer bullet to the node's last source bearing section and nothing more.

This applies to source verification only. A section that is simply not written yet still says so in the node, the way `Origins` and `Disputed By` already do on several claims. That is a content gap, not a verification state.

Every Source run also writes a run record at the top of that file, in the form `Verification/README.md` gives: date and mode, the fields commissioned, the balance ledger, the verifier's counts, whether the two rulings agreed, the crux and strong counter lines, the points carried and the lint's verdict. Short and complete. The claim lists, cards and rulings stay in the scratch directory; the record is what a later reader needs to see how the node was built.

## Step 2: Pick the run mode

- **Source**: the node is a stub or a draft, or does not exist yet, or is sourced and the rework adds or changes substance. Run all phases. A sourced-stale node goes through `refresh-node` unless the user asks for a rebuild.
- **Verify only**: the user asks to fact check a sourced node without changing its status. Run Phase 0 and Phase 4 only. To take a sourced-stale node back to sourced, use `refresh-node`.
- **Touch up**: wording, links, formatting. No agents. Do it inline.

State which mode you picked in one line before starting.

## Step 3: Run the pipeline

Spawn each agent as a fresh subagent with whatever your agent uses to delegate. For each one, paste the matching file from `agents/` as the top of the prompt, then append the task specifics: node title and folder, the working thesis, the `points`, `notes.md` where the phase says so, and the outputs of earlier phases.

The working thesis is one sentence saying what the node claims, taken from the first line of the notes or from the user's message. It is a hypothesis for the run to test, not a fact it starts from.

Agents start cold and cannot see this conversation. Everything they need goes in the prompt.

### Models

The librarian, the person and term researchers and the domain researchers may run on a smaller model, if your agent lets you pick one per subagent. The writer, the verifier and the philosopher run on the default model, since a mistake there reaches the node or goes unseen. Run the two debaters on different model families where your agent offers more than one: two copies of one model is the setting in which debate has been found to add least. Widen any of this only against the run records: the fixed and cut counts per run are the comparison.

### Phase 0: Librarian (1 agent, runs first)

`agents/librarian.md`. Reads the existing vault on disk. Returns the target's status, points and body, the list of existing node titles, which ones already cover part of this topic, which sources are already cited elsewhere, which nodes link to the target, and the fields from `references/disciplines.md` this node touches.

Its output feeds every later agent so they link instead of re-proving.

### Phase 1: Researchers (4 agents plus one per field, in parallel)

Split by domain, not by position. Their outputs should barely overlap.

- `agents/researcher-text.md` primary text, passages, manuscripts, translation and original language
- `agents/researcher-material.md` artefacts, excavations, inscriptions, dated finds, named excavators
- `agents/researcher-scholarship.md` where the scholarly consensus sits and who dissents, by name
- `agents/researcher-steelman.md` the strongest published case for the opposite reading
- `agents/researcher-domain.md` once per field the librarian named, with a `FIELD:` line and that field's paragraph from `references/disciplines.md` pasted in. Medicine, cosmology, cognitive science, history of science and the rest live here.

Every researcher gets the `points` and `notes.md`. Each point is a mandatory lead: the researcher returns the claims that support it or an entry saying it is not supported and why. The notes are leads to check, and nothing in them is a claim until it comes back with a source.

Each returns a numbered claim list. Every claim has a source with a URL or full bibliographic reference, a tier from `references/source-policy.md`, a register from `references/balance.md`, and the access level actually achieved.

Each researcher ends with a `FIELDS TOUCHED` line. Compare those against the librarian's list, and for every field named that nobody was sent to, spawn one more domain researcher before the debate. The librarian judged from titles; the researchers have read the sources.

Before the debate, prefix the entries so the debaters can cite them: `T` for text, `M` for material, `S` for scholarship, `C` for the steelman, `D-<field>` for a domain list. `[S3]` is the third scholarship claim.

### Phase 2: Debate (2 agents, twice, then 1)

Skipped on Evidence and People nodes. An evidence note reports what a thing is and what it shows, and a person node reports a life; neither has a thesis to argue.

Two debaters argue over the claim lists and a philosopher rules. Everyone reads `references/debate-rules.md`, pasted into the prompt under their own file. Nobody in this phase searches the web or opens a source: they cite list entries by number, mark their own reasoning, or ask for what is missing under `NEEDS SOURCE`.

Roles by folder:

| Node in | `FOR` the thesis | `AGAINST` it |
| --- | --- | --- |
| `Arguments For` | `agents/debater-theologian.md` | `agents/debater-skeptic.md` |
| `Arguments Against` | `agents/debater-skeptic.md` | `agents/debater-theologian.md` |
| `Claims` | whichever persona's arguments lean on the claim, read off the librarian's Linked from list | the other |

Where a claim is used by both folders or by neither, the theologian takes `FOR` and the skeptic `AGAINST`. The fairness contract forces the concessions either way.

1. **Opening cards.** Both debaters in parallel. Each gets its role, the node title and folder, the working thesis, the `points`, and every claim list. Each returns an argument card.
2. **Response.** Both in parallel again. Each gets its own card and the other's, and answers: concessions first, then the objection that was actually made, then a revised card.
3. **Ruling, twice.** `agents/debater-philosopher.md` gets all four cards, the claim lists and the `points`. It formalises the argument, grades the premises, names the crux and the strong counter, rules on who answered whom, gives a verdict per point, and consolidates the `NEEDS SOURCE` requests. Run it twice in parallel, once with the `FOR` cards pasted before the `AGAINST` cards and once the other way round, since a judge favours the case it reads first when the two are close. Compare `CRUX`, `STRONG COUNTER` and the `POINTS` verdicts. Where they agree, the first ruling goes forward. Where they differ, both go to the writer with one line saying what differed, and the flip goes in the run record. `NEEDS SOURCE` is the union of both.

Then handle `NEEDS SOURCE`. For each request, spawn one targeted researcher, the one whose scope owns it or a domain researcher for its field, with the request as its task. One pass, no second round. Prefix its entries `N` and add them to the claim lists.

Only the ruling goes forward, or both where they differed. The cards stay in the scratch directory.

### Phase 3: Writer (1 agent)

`agents/writer.md`. Gets the librarian output, every claim list including `N`, the ruling, the `points`, `notes.md` and `existing.md`. Produces the node to template and word budget, saves it as `draft.md` in the scratch directory and returns it.

The writer decides framing. Do not run parallel framing agents. Merged framings produce longer, blander text.

The writer takes the argument's form and its crux from the ruling, not from the notes. On an argument node the first bullet under Limits is the crux. Countered By names the ruling's strong counter as the strong one. Each point is carried with a source or listed as not carried. Terms of art link their `Glossary/` entry on first use, and the ones with no entry come back under `TERMS`.

### Phase 4: Verifier (1 agent, cold)

`agents/verifier.md`. Gets `draft.md`, the source list, the balance ledger, `existing.md` and anything in `sources/`. Does **not** get the claim lists, the cards, the ruling, `notes.md` or the writer's reasoning. That is the point. It re-opens sources itself.

Returns a verdict per factual sentence (`pass`, `fix`, `cut`, `protected-flag`), a density pass over the sentences that carry no fact, source or limit, a recounted balance ledger, and a check for manufactured symmetry in the other direction.

### Phase 5: Arbiter (you, in the main conversation)

Apply the verifier's report:

- `cut` on session-written text: remove it
- `cut` on protected text: keep it, list it for the user with the reason
- `fix`: apply the correction, or drop the sentence if the fix cannot be sourced
- `unopened` on a load bearing sentence: cut it, or list it for the user if it is protected
- `unopened` on any other sentence: keep it, leave the footnote silent on access, add one entry to `Verification/<Node Title>.md`
- Density `cut` on session-written text: remove it. Do not rewrite it shorter, remove it
- Re-check the word count after edits. Under 500 means the node is thin, say so rather than padding it.

Then handle the balance audit. Failing rules are reported to the user, not silently patched. Never pad a section, invent a counter position or hedge a well supported finding to make the numbers balance. If the academic share is under half, say which points could only be reached through advocacy sources and what was tried. An honest gap beats a manufactured debate.

The effort verdict is handled the same way. `less effort` on either side is reported. Where the claim lists hold a better source or a fuller statement for the thin side, the text is corrected from them; nothing is padded. Inference check findings are applied like any `fix`.

Then run `npm run check`. A lint failure is fixed before anything is committed. A lint warning on the node, length or a long sentence, is fixed or answered in the delivery.

Then run the checklist in `references/style.md`.

## Step 3b: People and terms

Every person the node names in its prose needs a node in `Theology/People/`. Check which ones exist, and for each one that does not, spawn a research agent with `agents/person.md` and write the node from what it returns. Every term of art the node uses needs an entry in `Theology/Glossary/`. The writer's `TERMS` block names the ones without one; for each, spawn `agents/term.md` and write the entry from the Term template. Both templates are in `references/templates.md`.

These are the only nodes outside the target that this skill may create. It may not edit an existing person node or term without being asked: those are nodes like any other, and rule 8 covers them.

Then link the first prose mention of each person and each term in the target node, aliasing where the citation form and the prose form differ: `[[C. A. Coulson|Charles Coulson]]`, `[[Libertarian free will|libertarian]]`.

## Step 4: Deliver

Set the status. `sourced` when every factual sentence passed or was fixed, the body is at least 500 words, and every heading is filled. Otherwise the node keeps `drafted`, and the delivery says what stands between it and `sourced`. The rest of the frontmatter is written back as it was, `points` included.

Write the finished node to `Theology/<Folder>/<Exact Title>.md`. Write the run record at the top of `Verification/<Node Title>.md`, with its entries under it. Run `npm run check`. Then commit and push.

Then post to chat:

1. The path of the file written and the status it carries
2. One line per point: carried in which section with which source, or not carried and why
3. A short list of what changed and why, if this was a rework
4. Protected problems the verifier flagged but could not cut, with the reason
5. The run record's counts and ledger as the verifier recounted them, any failing rule, and the effort verdict
6. Any new Claim or Evidence node the research surfaced that is worth splitting out, with a one line reason
7. Any change another node needs, written out as a block the user can paste
8. The Verification entries added, one line each, and any lint warning left standing with the reason

Keep this wrap up short. The node is the deliverable.

## Batching

For more than three nodes in one go, use your agent's workflow or orchestration tool, if it has one, with the same phase structure instead of spawning agents by hand.
