---
name: site-build
description: The public site is built by our own generator in site/, not Quartz, and why we moved off Quartz.
metadata:
  type: project
---

The vault is published at <https://kadaxuanwu.github.io/Theology> by `.github/workflows/deploy.yml` on every push to `main` that touches `Theology/`, `site/` or the build files. Built by `site/build.mjs`, written for this vault. Only dependency is `marked`.

It ran on Quartz v5 first, from 2026-08-23. Replaced the same week.

**Why we left Quartz:** two bugs in `@quartz-community/explorer` that were not ours to fix. Its `folderDefaultState` option is rendered into the DOM as `data-collapsed` and then never read by the client script, so the option does nothing. And the explorer rebuilds its whole tree on navigation, keeping a folder open only if localStorage says so or if it is on the path to the current page, so a folder opened by clicking its title closed again on the next navigation. The graph had problems too. With 36 plugins delivering about six features we used, patching upstream repeatedly was the worse trade for a 28 note vault.

**How to apply:**

- `npm run check` runs the build, `site/test.mjs` and `site/linkcheck.mjs`, which is exactly what CI runs. Run it before pushing.
- `site/test.mjs` covers frontmatter parsing, slugs, wikilink resolution and whether the force layout settles without NaN or collapsing. `site/linkcheck.mjs` walks every built page and fails on a dead internal link, which catches a renamed note.
- `npm run serve` previews `dist/` the way GitHub Pages serves it, including the 404 fallback.
- Folder state in the sidebar is deliberate: folders render open and only a folder the reader collapsed stays collapsed, remembered in localStorage. Never make navigation change it, that was the Quartz bug.
- Note dates come from git history in `site/build.mjs`, so never commit dates into frontmatter to fix a date.
- See [[commit-message-style]] for how to commit.
