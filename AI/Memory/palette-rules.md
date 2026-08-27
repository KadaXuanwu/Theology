---
name: palette-rules
description: What the site's colours mean, and why none of them should be picked by eye.
metadata:
  type: project
---

Rebuilt 2026-08-27. The stylesheet's tokens follow three rules, and `site/test.mjs` measures all three, so a colour changed by eye will fail the build rather than quietly break the system.

**Colour means the map. Ink means a source.** The four kinds own every hue in the prose: a coloured word goes to a node, and which colour says which kind. A link off the site carries no hue at all, only ink, a firmer underline and the arrow. It used to be a fifth hue (a red), which is exactly what made it read as a fifth kind of node instead of as the way out.

**A dot and a word are different jobs.** The dot is the only thing naming a kind in the graph and the tree, so the five `--<kind>` tokens are spaced in lightness as well as hue and clear 3:1 as graphics. The `--link-<kind>` tokens are the same hues levelled to one contrast (5.5:1 light, 6.4:1 dark) so no kind shouts in a paragraph carrying several. Anywhere a kind's colour becomes text, it takes the link token: that is what the pill under a note title got wrong, at 4:1.

**Deuteranopia and protanopia flatten hue.** Between them about one man in twelve, so the four dots are checked through simulated deutan and protan eyes and have to stay 0.09 apart in OKLab. That floor is why the four are not equally bright: four hues at one lightness collapse to two or three shapes of the same grey, which is what the old set did (argument-for and evidence were 0.059 apart for a protanope, effectively the same circle). Tritanopia is rarer than one in a thousand and is deliberately not optimised for, because it drags the palette toward a blue that helps nobody else.

**How to change one.** Work in OKLCH, solve for the contrast you want, then run `npm run check`. The scratch scripts that generated the current set are gone; the constraints they were solving are all in the test block "a link wears the colour of what it points at", which is the thing to read first.

**The light side is warm paper**, one hue through every neutral, and the reading column's ink is nearly full weight (`--ink-read`, about 13:1). Grey prose is most of why the light theme read as washed out. The dark side keeps the softer ink, because the same weight glares on a dark ground. See [[site-build]].
