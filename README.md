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

Each folder has a `_Template.md` with the section headings for that node type. Frontmatter carries `type`, `status` (`stub`, `drafted` or `sourced`) and `tags`.

Nothing gets proved twice. If two arguments need the same claim, the claim becomes its own node and both link to it.

## Link direction

Links never run up the stack.

| A node in | May link to |
| --- | --- |
| `Arguments For`, `Arguments Against` | `Claims`, `Evidence`, and other arguments |
| `Claims` | `Claims`, `Evidence` |
| `Evidence` | `Evidence` |

One extra restriction: the `Description` of an argument may not link another argument. The argument gets stated on its own terms before anything is thrown at it. Every other section may link across.

Nothing points upward by hand, because the site fills that direction in. It works out who links to a note and lists them under "Linked from", which is why a claim does not name the arguments that lean on it.

## Rules for a node

- Every factual sentence carries a source someone else can open.
- Limits go in the node, not left out. A weak step in an argument is written down as a weak step.
- A `sourced` node's body stays between 300 and 1000 words. A stub or a draft can be any length.
- At least half the sources are academic register. Advocacy publishing never carries a fact on its own.

## Website

Every push to `main` that touches the vault rebuilds <https://kadaxuanwu.github.io/Theology> and publishes it to GitHub Pages.

The site is built by `site/build.mjs`, a small generator written for this vault. It reads the notes, resolves `[[wikilinks]]`, works out backlinks and the link graph, and writes a plain static site into `dist/`. Nothing is ever written back into the vault.

What the site gives a reader: the folder tree, working note links, backlinks on every note, hover previews, full text search, tag pages where any combination of tags can be picked, a light and dark theme, a choice of reading font, and an interactive graph of the whole vault, of one folder, or of one note and its neighbours.

The only dependency is [marked](https://marked.js.org/) for the markdown itself. `site/lib` reads the vault and writes the pages; `site/assets` is what runs in the browser.

```bash
npm ci
npm run build      # writes dist/
npm run serve      # preview at http://localhost:8080
npm run check      # build, then the tests and the link check CI runs
```

Note dates come from git history rather than file timestamps. `_Template.md` files and `.obsidian` never reach the site.

## Chat

The bubble on the site answers questions from the notes. It runs on a Cloudflare Worker in `worker/`, which holds the API key, reads the published vault, picks which notes the model may read, and streams the answer back. The browser only ever sends the question.

The Worker is deployed by hand rather than by CI, so no Cloudflare token is stored in this repo, and a change under `worker/` is not live until someone runs `wrangler deploy`. Building with `CHAT_ENDPOINT=""` leaves the bubble out of the site entirely, which is what a fork gets. See [worker/README.md](worker/README.md).

## Layout

```
Theology/                      the vault
site/                          the static site generator and its assets
worker/                        the Cloudflare Worker behind the chat bubble
.github/workflows/deploy.yml   builds and publishes the site on every push
.claude/skills/theology-node/  the skill that writes and fact checks nodes
AI/Skills/Theology Node/       notes on that skill
AI/Memory/                     what I should remember across sessions
CLAUDE.md                      working instructions for Claude
```

`.claude/skills/theology-node` is a Claude skill that runs a multi agent pipeline over one node: a librarian reads the existing vault so new work links instead of repeating, four researchers cover primary text, material evidence, scholarly consensus and the strongest opposing case, a writer builds the node to template, and a verifier reopens every source cold and rules on each factual sentence. Claude Code loads it automatically. See its [README](AI/Skills/Theology%20Node/README.md).
