# Theology

A research vault mapping arguments for and against Christianity, and the claims and evidence each one rests on.

The goal is not to prove one position over the other. It is to make every argument traceable, so a reader can follow the reasoning back to its sources and judge it themselves.

## How it works

Every note is a node. Nodes link to each other with Obsidian style `[[Exact File Name]]` links, so a reasoning chain can be followed both ways: from an argument down to the evidence, or from a piece of evidence up to everything that leans on it.

| Folder | Holds |
| --- | --- |
| `Theology/Arguments For` | Arguments that support the Christian position |
| `Theology/Arguments Against` | Arguments that challenge it |
| `Theology/Claims` | Statements an argument depends on, used by both categories |
| `Theology/Evidence` | Artefacts, studies and texts a claim can point to |

Each folder has a `_Template.md` with the section headings for that node type. Frontmatter carries `type`, `status` (`stub` or `sourced`) and `tags`.

Nothing gets proved twice. If two arguments need the same claim, the claim becomes its own node and both link to it.

## Rules for a node

- Every factual sentence carries a source someone else can open.
- Limits go in the node, not left out. A weak step in an argument is written down as a weak step.
- Body stays between 300 and 1000 words.
- At least half the sources are academic register. Advocacy publishing never carries a fact on its own.

## Layout

```
Theology/                 the vault
AI/Skills/Theology Node/  the skill that writes and fact checks nodes
CLAUDE.md                 working instructions for Claude
```

`AI/Skills/Theology Node` holds `theology-node`, a Claude skill that runs a multi agent pipeline over one node: a librarian reads the existing vault so new work links instead of repeating, four researchers cover primary text, material evidence, scholarly consensus and the strongest opposing case, a writer builds the node to template, and a verifier reopens every source cold and rules on each factual sentence. See its own [README](AI/Skills/Theology%20Node/README.md).

## Note on this copy

The vault lives in Google Drive. The `Theology` folder here is a manual copy and can be behind. Treat Drive as the source of truth.
