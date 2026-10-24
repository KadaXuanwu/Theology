---
name: sourced-with
description: Sourced and sourced-stale notes name their models at the foot of the page; only the sourcing run writes the list, and unrecorded earlier runs get Opus 5.5 and Sonnet 5.5.
metadata:
  type: project
---

# Sourced with

Every sourced note names the models that sourced it, very small at the foot of its page, from the `sourced-with` frontmatter list. The author asked for it on 30 September 2026. Only the sourcing run counts: `source-node` and `refresh-node` write it, drafting and stubs never do, and the lint fails a stub or draft that carries it and warns on a `sourced` or `sourced-stale` note without it.

List the model that actually answered for every agent in the run, not the alias that was requested. One run on 29 September 2026 asked for a family alias and got two different versions of it. On a local PC the served model is in each subagent's transcript under `~/.claude/projects/<project>/<session>/subagents/`, in its `"model"` field.

The claude.ai cloud sessions forbid the agent from writing model names into anything pushed to the repo. There the agent builds the node and gives the list in chat, and the author or a local session writes the key.

**What went wrong, found 24 October 2026.** 144 notes carried no key: 25 `sourced`, 119 `sourced-stale`. 138 were sourced between 22 August and 29 September, before the key existed; the other six, Creation Alone and its five people on 9 October, ran in a cloud session that gave the list in chat, and it was never written back. Two things hid it. The lint warned only on `sourced`, so no stale note was ever flagged, and the 25 warnings it did print sat among some 50 warnings about links the checker could not reach. The lint now warns on both statuses, with a test.

**How to apply:** where an earlier run's models were never recorded, write Claude Opus 5.5 and Claude Sonnet 5.5. The author set that default on 24 October 2026 and all 144 notes got it. After a cloud run, write the key from the chat list before anything else touches the node. Rules are in `.agents/skills/source-node/references/templates.md` under Sourced with. See [[pipeline-review-2026-09-18]].
