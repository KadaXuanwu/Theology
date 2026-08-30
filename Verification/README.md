# Verification queue

Open source checks for the vault. One file per node, named after the node.

When a node is built, some of its sources cannot be opened. Journal paywalls, lending restricted scans, books nobody has a copy of. The node itself does not say so. It cites the source the way any paper would and leaves it at that. The open question comes here instead, so a reader of the site is not reading footnotes about our research process, and anyone who wants to know what has actually been confirmed can look.

Nothing in this folder is published. The site builds from `Theology/` only.

## What a file here does and does not tell you

A file lists what the pipeline knew it could not confirm. It is not an audit. Most of the vault was written before this folder existed, and those entries were recovered from hedges the nodes had already written into themselves, so they cover what somebody happened to flag rather than everything that is open.

**An entry missing is not proof a source was checked.** A node with no file here has not been cleared, it has only never been questioned in writing. Nodes built by the pipeline from now on get a file whether or not anything is open, and say so.

## How to answer one

Find the entry, fill in **Verdict**, put your name and the date in **Checked by**, and change **Status**.

- `open` nobody has looked
- `confirmed` the node is right as it stands
- `corrected` the node was wrong and has been fixed, say what changed
- `unresolvable` looked properly and it cannot be settled, say why

If the answer changes the node, change the node too. If you would rather not touch the vault, mark it `corrected`, write what the node should say, and leave it. Someone else will move it across.

You do not need to be exhaustive. A page number confirmed is worth more than a paragraph of hedging.

## Entry format

```
### V1. short title
**Status:** open
**Node:** `Arguments Against/Some Node`
**Source:** full citation
**What the node says:** the sentence or claim that rests on it
**What is open:** exactly what could not be confirmed, and how far the pipeline got
**What would settle it:** the specific thing someone needs to look at
**Verdict:**
**Checked by:**
```

IDs run per file and are never reused. A settled entry stays in place with its verdict rather than being deleted, so the record of what was checked survives.
