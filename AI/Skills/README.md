# Node skills

Three skills build the nodes of the Theology vault, one per step of a node's life. A node starts as a `stub`, the author's own notes written by hand from the folder's `_Template.md`. `draft-node` turns the stub into a `drafted` node. `source-node` takes the draft to `sourced`. A `sourced` node that an older pipeline built, or that has something wrong in it, is marked `sourced-stale` by hand, and `refresh-node` takes it back to `sourced`. The gates each status has to pass are in `.agents/skills/source-node/references/templates.md`, section "Status".

The point of the vault is not to settle whether Christianity is true. It is to make every argument traceable back to the claims and evidence it rests on, so a reader can follow the reasoning themselves. The subject is Christianity; the evidence comes from theology, biblical studies, archaeology, history, philosophy, psychology, medicine and the natural sciences, and the sourcing pipeline commissions whichever of those a node needs.

## draft-node

Cheap by design: two agents, no source verification.

| Step | Agent | Job |
| --- | --- | --- |
| 1 | Librarian | Reads the vault, so the draft links to what exists and names the fields the node touches |
| 2 | Drafter | Shapes the notes to template: the claim first, the argument as premises with its crux, the strong objection, links, candidate sources as leads with their access, and every gap as a `Needs sources` line |

The drafter may search and fetch to confirm a work exists and says what it seems to. It records the access it achieved on every lead and invents nothing. A draft's sources are leads, not sources: `source-node` opens everything again.

## source-node

| Phase | Agent | Job |
| --- | --- | --- |
| 0 | Librarian | Reads the vault: what exists, what covers part of the topic, which sources are already cited, which nodes link here, which fields the node touches |
| 1 | Researchers, in parallel | Primary text, material evidence, scholarly consensus, the strongest published case for the opposite reading, and one domain researcher per field the node touches: medicine, cosmology, cognitive science, history of science and the rest, from the roster in `references/disciplines.md`. Each ends by naming the fields it brushed against, and a field the librarian missed gets its researcher before the debate |
| 2 | Debate | A skeptic and a theologian, both written as scholars in print, argue for and against the node's thesis over the researchers' claim lists, two rounds with forced concessions. A philosopher rules twice, with the cards in swapped order: formal reconstruction, premise grades, the crux, the strong counter, and who answered whom. A crux that flips between the orders is a finding. Requests for missing sources go to one more targeted researcher |
| 3 | Writer | Builds the node to template and word budget, the argument in the ruling's form, the crux as the first bullet under Limits |
| 4 | Verifier, cold | Re-opens every source itself and rules on each factual sentence, on whether each side got the same effort, and on sentences that join sourced facts into a conclusion no source draws. Never sees the research notes, the cards or the ruling |
| 5 | Arbiter | The main conversation applies the verdicts, writes the run record into `Verification/`, runs `npm run check` and reports what could not be fixed |

Step 3b sits alongside this: for every person the node names in its prose who has no node in `People/` yet, and every term of art with no entry in `Glossary/`, one more researcher runs and that node gets written too. Those are the only nodes outside the target the skill may create.

Evidence and People nodes skip the debate. Neither has a thesis to argue.

## refresh-node

The full pipeline's standard with less of its work, because the node has already done part of it. Each agent is the `source-node` prompt plus a short addendum from the refresh skill.

| Phase | Agent | Job |
| --- | --- | --- |
| 0 | Librarian | As in `source-node`, plus claim list `E`, the node's footnoted sentences with tier and register, and a gap map: fields touched against fields heard from, passages and finds without a primary source, best source each side, vintage, whether Limits names a crux |
| 1 | Researchers, in parallel | Steelman, scholarship and one domain researcher per field always; text and material when the node leans on passages or finds. Each returns only the delta: `ADDS` what the node lacks, `CORRECTS` an entry, `CHALLENGES` an entry, plus the newest work in scope |
| 2 | Debate | Runs when a finding bears on the thesis, the node has no crux, or the counter is under sourced. Whole when it runs: two rounds, the philosopher twice, and a `DELTA` block ruling `KEEP`, `CHANGE`, `ADD` or `DROP` per section. Skipped when the lists hold only corrections |
| 3 | Writer | Copies every `KEEP` section verbatim, changes only what the ruling, a correction or the template requires, and lists every protected sentence it changed, before and after |
| 4 | Verifier, cold | Not lite. Every sentence against its source, the whole old body protected, plus the density, inference and effort checks the old pipeline lacked, and a `CRUX` line |
| 5 | Arbiter | Applies the verdicts. A flagged protected sentence is fixed from its source, re-sourced by one targeted pass, removed when nothing carries it and the claim survives without it, or left for the user when its loss would change the claim |

A person or term target takes a short path: the mechanical pass, one person or term agent, the verifier, the arbiter. Every change to old text reaches the delivery quoted with the finding that caused it, and a node with a sentence left for the user stays `sourced-stale` until the user rules.

## Rules the pipeline enforces

- Every factual sentence carries a source the verifier can open. No retrievable source, no entry.
- A stub or a draft is inspiration. Its sentences are not protected, its leads are not sources and its outline is not the node's shape. Protection covers text that was already in a `sourced` node when the run started.
- The author's `points`, a list in the frontmatter, are binding. Every one is carried into the body with a source or reported as not carried with the reason. No skill edits the list.
- The debate is internal. Nothing from it is quoted as a debate in the node.
- A `sourced` node's body runs 500 to 2000 words, and most sit around 1000. A stub, a draft or a person node can be any length.
- At least half the sources are academic register. Advocacy publishing never carries a fact on its own.
- Gaps are stated plainly instead of padded. A missing counter position is reported, not manufactured.
- A node never says whether a source was checked. What the pipeline could not confirm goes to `Verification/<Node Title>.md` at the repo root, one entry per open question, for a human to settle. The same file opens with the run record: fields, ledger, the verifier's counts, whether the two rulings agreed, the crux and the strong counter. Short and complete; the cards and claim lists are not kept.
- The counter gets the same effort as the main case, not the same length. Its best defender is named and its best source sits at the same tier and register. A lopsided field is reported as lopsided.
- A term of art is never explained in the prose. It links its entry in `Glossary/`, and the site shows the definition on hover.
- `npm run check` runs `site/lint.mjs` over the vault. Template headings, link direction, dashes, footnotes, inline lists and dead source URLs fail the build; length and sentence length warn.
- Only the node it was asked for gets written, plus the `People/` nodes the names in it need and the `Glossary/` entries its terms need. Every other change another node needs is posted to chat for the user to apply.

## Layout

```
.agents/skills/
  draft-node/
    SKILL.md               stub to drafted
    agents/drafter.md
  refresh-node/
    SKILL.md               sourced-stale to sourced, no agents or references of its own
  source-node/
    SKILL.md               drafted to sourced, verify only, touch up
    agents/                one prompt file per agent: librarian, four researchers, the domain researcher, three debaters, writer, verifier, person, term
    references/            templates and status gates, source tiers, citation format, balance rules, style checklist, debate rules, the discipline roster
```

`draft-node` and `refresh-node` read the shared references and agents from `source-node`, so there is one policy in the repo rather than three. `references/` is read before a pipeline runs. `agents/` files get pasted into each subagent prompt, since agents start cold and cannot see the conversation.

## Models

The librarian, the person and term researchers, the domain researchers and the drafter may run on a smaller model, where the agent lets you pick one per subagent. The writer, the verifier and the philosopher run on the default, since a mistake there reaches the node or goes unseen. The two debaters run on different model families where the agent offers them. Widen any of this only against the run records' fixed and cut counts.

## Install

Both skills follow the [Agent Skills](https://agentskills.io/specification) standard and sit in `.agents/skills/`, the folder [Codex](https://developers.openai.com/codex/skills/), [Cursor](https://cursor.com/docs/context/skills), [Gemini CLI](https://geminicli.com/docs/cli/skills/) and [GitHub Copilot](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills) scan at startup, so a new session picks both up on its own. An agent that does not scan that folder is pointed at it by `AGENTS.md` and opens the `SKILL.md` when asked. To use the skills in other projects on one machine, copy both folders to `~/.agents/skills/`, which the same four agents read. `draft-node` and `refresh-node` read their references and agents from `source-node`, so the three folders travel together.

Ask the agent to draft, source or refresh a node and the right skill triggers on its own.

## Adapting it

The skills write the finished node straight into the vault on disk, then commit. If your vault lives somewhere the agent cannot write to, like Google Drive, change the baseline and delivery steps of each `SKILL.md` to fetch the node and post it back as a block to copy. `source-node/agents/librarian.md` is the only other file that knows where the vault is.

Source tiers, register definitions and balance rules live in `references/source-policy.md` and `references/balance.md`. The discipline roster in `references/disciplines.md` is what to extend when a node needs a field nobody has covered yet. Those are the files to edit if you want to point the same pipeline at a different subject.
