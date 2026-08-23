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

The site is built by `site/build.mjs`, a small generator written for this vault. It reads the notes, resolves `[[wikilinks]]`, works out backlinks and the link graph, and writes a plain static site into `dist/`. Nothing is ever written back into the vault.

What the site gives a reader: the folder tree, working note links, backlinks on every note, hover previews, full text search, tag pages, a light and dark theme, and an interactive graph of the whole vault or of one note and its neighbours.

The only dependency is [marked](https://marked.js.org/) for the markdown itself. The graph, the search and the rest are in `site/assets`.

```bash
npm ci
npm run build      # writes dist/
npm run serve      # preview at http://localhost:8080
npm run check      # build, then the tests and the link check CI runs
```

Note dates come from git history rather than file timestamps. `_Template.md` files and `.obsidian` never reach the site.

## Layout

```
Theology/                      the vault
site/                          the static site generator and its assets
.github/workflows/deploy.yml   builds and publishes the site on every push
.claude/skills/theology-node/  the skill that writes and fact checks nodes
AI/Skills/Theology Node/       notes on that skill
AI/Memory/                     what I should remember across sessions
CLAUDE.md                      working instructions for Claude
```

`.claude/skills/theology-node` is a Claude skill that runs a multi agent pipeline over one node: a librarian reads the existing vault so new work links instead of repeating, four researchers cover primary text, material evidence, scholarly consensus and the strongest opposing case, a writer builds the node to template, and a verifier reopens every source cold and rules on each factual sentence. Claude Code loads it automatically. See its [README](AI/Skills/Theology%20Node/README.md).
