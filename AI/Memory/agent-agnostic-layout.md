---
name: agent-agnostic-layout
description: Instructions live in AGENTS.md and skills in .agents/skills so any coding agent can run this repo; one vendor named shim file at the root is the only exception.
metadata:
  type: project
---

Since 2026-09-15 the repo is laid out for any coding agent, not one vendor. Working instructions are in `AGENTS.md` at the root. The two node skills sit in `.agents/skills/`, the folder Codex, Cursor, Gemini CLI and GitHub Copilot scan at startup; their docs are linked from `AI/Skills/README.md`. The skill files name no tool or model. They say "spawn a subagent" and "a smaller model", and each agent maps that onto what it has.

**The one exception** is the vendor named instruction file at the repo root. That agent reads only its own filename and does not scan `.agents/skills/`, so the file holds an `@AGENTS.md` import and one sentence, nothing else. It does not register the skills, so for that agent they no longer appear as slash commands. `AGENTS.md` tells it to open the matching `SKILL.md` when asked to draft or source a node, which is enough for the skills to run.

**How to apply:**

- Write "the agent", "a subagent", "a smaller model". Never a vendor, product, tool or model name, anywhere but that one shim file. A case insensitive grep for the vendor name before committing should hit only the shim.
- New instructions go in `AGENTS.md`, never in the shim.
- The user decided on 2026-09-15 that this is enough. No vendor specific skills folder comes back, so do not suggest one.
