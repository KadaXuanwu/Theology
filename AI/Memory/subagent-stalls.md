---
name: subagent-stalls
description: Long pipeline subagents stall and lose their whole report; have writers and verifiers save output to scratch files as they go, then resume them.
metadata:
  type: feedback
---

In the October 2026 refresh of Demanding Belief Without the Proof, subagents repeatedly died on the 600 second stream watchdog: the writer twice, all six person researchers at once, and the main verifier three times. Each death lost everything the agent had not yet returned, though its transcript survived.

**Why:** a long verdict report is generated in one go at the end, so a stall near the end throws away an hour of source checking. What worked was resuming the same agent with its saved context and asking it to append its report to a scratch file section by section, every few sentences. The verifier then finished across two resumes without losing the sections already written.

**How to apply:**

- Brief the writer, the verifier and any long researcher from the start to write their output to a named file in the scratch folder as they go, and to return one short line when done.
- When an agent stalls, resume it with its saved context rather than spawning a fresh one, and tell it which file holds its finished part.
- Several agents stalling together means the connection, not the task. Check what reached disk before relaunching. See [[pipeline-review-2026-09-18]] for the pipeline's shape.
