---
name: site-build
description: How the public Quartz site is built and the one Quartz quirk the workflow works around.
metadata:
  type: project
---

The vault is published at <https://kadaxuanwu.github.io/Theology> by `.github/workflows/deploy.yml` on every push to `main` that touches `Theology/`, `site/` or the workflow itself. Set up 2026-08-23.

Quartz is not vendored. The workflow fetches `jackyzha0/quartz` at the commit pinned in the `QUARTZ_REF` env var, copies `Theology/` into its `content/`, applies `site/quartz.config.yaml`, then runs `site/stamp-dates.mjs` and `site/build-index.mjs`. Nothing is ever written back into the vault.

**Why:** Keeps the repo to two extra files instead of a few hundred, and pins the version so an upstream change cannot break the site without someone bumping the ref.

**How to apply:**

- To upgrade Quartz, change `QUARTZ_REF` to a newer commit on the `v5` branch and rerun the workflow. Nothing else moves.
- `npx quartz plugin install --from-config` does **not** install the package for the theme named in the `@quartz-themes/core` options. The build installs it itself but too late to load on the same run, so a first build fails with `Cannot find module '@quartz-themes/default'`. The workflow installs it explicitly beforehand. Keep that step if the theme changes, and change the package name to match.
- The `@quartz-community/cname` plugin is disabled on purpose. It writes a `CNAME` file from `baseUrl`, which breaks a project site served from the `/Theology` subpath.
- Verify changes by replaying the workflow steps locally rather than pushing to see what happens. See [[commit-message-style]] for how to commit the result.
