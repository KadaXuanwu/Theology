# Sourced with

Every sourced note names the models that sourced it, very small at the foot of its page, from the `sourced-with` frontmatter list. The author asked for it on 30 September 2026. Only the sourcing run counts: `source-node` and `refresh-node` write it, drafting and stubs never do, and the lint fails a stub or draft that carries it and warns on a sourced note without it.

List the model that actually answered for every agent in the run, not the alias that was requested. One run on 29 September 2026 asked for a family alias and got two different versions of it.

The claude.ai cloud sessions forbid the agent from writing model names into anything pushed to the repo. There the agent builds the node and gives the list in chat, and the author or a local session writes the key.

Rules are in `.agents/skills/source-node/references/templates.md` under Sourced with.
