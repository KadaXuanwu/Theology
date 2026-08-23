# Theology

A research vault mapping arguments for and against Christianity, and the claims and evidence each one rests on.

The goal is not to prove one position over the other. It is to make every argument traceable, so a reader can follow the reasoning back to its sources and judge it themselves.

Read it online at <https://kadaxuanwu.github.io/Theology>.

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

## Website

Every push to `main` that touches the vault rebuilds <https://kadaxuanwu.github.io/Theology> and publishes it to GitHub Pages.

The site is built with [Quartz](https://quartz.jzhao.xyz/), which reads the vault as it stands and gives back wikilinks, backlinks, a graph, full text search and hover previews. Quartz is not checked into this repo. The workflow fetches it at a pinned commit, copies `Theology/` into it, and builds. Two files control that:

- `site/quartz.config.yaml` is the Quartz config, so the look and the enabled features live here rather than upstream.
- `site/build-index.mjs` writes the homepage from whatever is in the vault at build time. Nothing is written back into the vault.

Note dates come from git history, stamped in by `site/stamp-dates.mjs`, because the build copy loses the history Quartz would otherwise read. `_Template.md` files and `.obsidian` are left out of the site.

## Layout

```
Theology/                      the vault
site/                          config and scripts for the public website
.github/workflows/deploy.yml   builds and publishes the site on every push
.claude/skills/theology-node/  the skill that writes and fact checks nodes
AI/Skills/Theology Node/       notes on that skill
AI/Memory/                     what I should remember across sessions
CLAUDE.md                      working instructions for Claude
```

`.claude/skills/theology-node` is a Claude skill that runs a multi agent pipeline over one node: a librarian reads the existing vault so new work links instead of repeating, four researchers cover primary text, material evidence, scholarly consensus and the strongest opposing case, a writer builds the node to template, and a verifier reopens every source cold and rules on each factual sentence. Claude Code loads it automatically. See its [README](AI/Skills/Theology%20Node/README.md).
