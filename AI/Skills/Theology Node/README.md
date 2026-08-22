# theology-node

A Claude skill that researches, writes and fact checks a single node for a Theology vault: an Obsidian style markdown collection of `Arguments For`, `Arguments Against`, `Claims` and `Evidence` nodes that cross reference each other with `[[Exact File Name]]` links.

The point of the vault is not to settle whether Christianity is true. It is to make every argument traceable back to the claims and evidence it rests on, so a reader can follow the reasoning themselves.

## What it does

The skill runs a multi agent pipeline over one node:

| Phase | Agent | Job |
| --- | --- | --- |
| 0 | Librarian | Reads the existing vault, reports which nodes already cover part of the topic and which sources are already cited |
| 1 | Four researchers, in parallel | Primary text, material evidence, scholarly consensus, and the strongest published case for the opposite reading |
| 2 | Writer | Builds the node to template and word budget |
| 3 | Verifier, cold | Re-opens every source itself and rules on each factual sentence |
| 4 | Arbiter | The main conversation applies the verdicts and reports what could not be fixed |

The verifier never sees the researcher notes or the writer's reasoning. That is deliberate. It only sees the draft and the sources.

## Rules the pipeline enforces

- Every factual sentence carries a source the verifier can open. No retrievable source, no entry.
- Node body stays between 300 and 1000 words.
- At least half the sources are academic register. Advocacy publishing never carries a fact on its own.
- The verifier may cut text written in the current session. It may not cut text that already existed in the node. Pre-existing problems get reported, never silently removed.
- Gaps are stated plainly instead of padded. A missing counter position is reported, not manufactured.

## Layout

```
theology-node/
  SKILL.md                 entry point and pipeline definition
  agents/                  one prompt file per agent
  references/              templates, source tiers, balance rules, style checklist
```

`references/` is loaded before the pipeline runs. `agents/` files get pasted into each subagent prompt, since agents start cold and cannot see the conversation.

## Install

**Claude Code.** Drop the `theology-node` folder into a skills directory. Personal scope is `~/.claude/skills/theology-node`, project scope is `.claude/skills/theology-node` in the repo root. Claude scans both at startup. See the [skills docs](https://code.claude.com/docs/en/skills).

**claude.ai.** Zip the `theology-node` folder on its own, so `SKILL.md` sits at the top of the archive, then upload it under Settings > Features. This needs a Pro, Max, Team or Enterprise plan with code execution enabled. See the [Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview).

Either way, ask Claude to create or rework a node and the skill triggers on its own.

## Adapting it

The skill writes the finished node straight into the vault on disk, then commits it. If your vault lives somewhere Claude cannot write to, like Google Drive, change step 1 and step 4 of `SKILL.md` to fetch the node and post it back as a block to copy. `agents/librarian.md` is the only other file that knows where the vault is.

Source tiers, register definitions and balance rules live in `references/source-policy.md` and `references/balance.md`. Those are the files to edit if you want to point the same pipeline at a different subject.
