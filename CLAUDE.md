# OSRS Combat Achievements Tracker — Project Context

## What this is
A single-file HTML/CSS/JS web app (`ca-tracker.html`) that tracks Old School RuneScape
Combat Achievement (CA) progress for a player named **Link Noods**. It's a personal
checklist tool, not a game client — no API calls to Jagex, everything is manually checked
off by the player as they complete tasks in-game.

The player's actual goal: they need **318 more points to unlock Master tier**, which
requires finishing every remaining Easy / Medium / Hard / Elite task (untracked here —
they manage that backlog themselves) plus a specific hand-picked list of Master and
Grandmaster tasks they've decided are worth chasing. This app tracks the tasks they
picked, not the full 600+ task CA list.

## File layout
- `ca-tracker.html` — the entire app. No build step, no dependencies except a Google
  Fonts import (Cinzel) and inline `<style>`/`<script>`. Open it directly in a browser.

## Data model
Three arrays near the top of the `<script>` block hold the player's selected tasks:

- `eliteMisc` — Elite-tier tasks + a few misc entry-mode ones (4pt each in-game)
- `master` — Master-tier tasks (5pt each), sized to hit exactly **215pt / 43 tasks**
- `gm` — Grandmaster-tier tasks the player is considering (6pt each)

Each array is a list of **boss/activity groups**:
```js
{g:'Grotesque Guardians (GGS)', items:[ it(...), it(...) ]}
```
Each item is built with one of two helpers:
- `it(name, description, wikiSlug)` — task has been verified against the OSRS Wiki;
  links directly to `https://oldschool.runescape.wiki/w/<wikiSlug>`
- `itU(name, description, searchQuery)` — **not** individually re-verified this session;
  links to a wiki *search* instead of a direct page (marked with a ⚠ in the UI)

Roughly 40 of the ~91 total tasks are still `itU()` (unverified) — mostly deep Master/GM
tasks for ToA, ToB, Nightmare, Doom of Mokhaiotl, Phantom Muspah, Kree'arra, and Phosani's
Nightmare, because those raid/boss wiki pages are too large to fetch in full. If asked to
tighten accuracy, the fix is to look up each `itU()` task individually (via web search or
by fetching the specific boss's wiki page, which usually has a "Combat Achievements"
table near the bottom) and convert it to `it()` with the confirmed name/tier/slug.

## Corrections already made (don't reintroduce these mistakes)
- **"GGS" = Grotesque Guardians**, not General Graardor.
- **"TDS" in the player's notes = Tormented Demons**, not Thermonuclear Smoke Devil —
  those are a completely different monster with different CA tasks.
- The GM tasks "Denying the Healers II" and "Fight Caves Speed-Runner" are **Fight
  Caves** tasks, not Inferno, despite superficially reading like Jad/Inferno content.

## UI structure
- Top dashboard: 3 cards (Elite highlights / Master goal toward 215pt / GM picks),
  purely tier-scoped tallies.
- **"Boss Overview — every tier combined"** section: aggregates a boss's tasks across
  *all three* arrays (Elite + Master + GM) into one done/total count per boss, via
  `bossKey()`/`bossDisplay()`, which normalize group names (stripping parentheticals and
  text after `:`) so e.g. `"Grotesque Guardians (GGS)"` (Elite) and `"Grotesque
  Guardians"` (Master) merge into one "Grotesque Guardians" row. If you add a new boss
  group, make sure its `g:` name normalizes to the same key across tiers if it's meant
  to merge — check `bossKey()` before assuming a new group will merge correctly.
- Collapsible checklist sections per tier (Elite/Master/GM), each task a checkbox +
  description + wiki link.
- Save/restore code panel at the bottom (base64 JSON blob, manual copy/paste).

## Important technical caveat: persistence is NOT reliable
This was built to use `window.storage.get/set` — a key-value persistence API that
**only exists inside Anthropic's claude.ai Artifact preview sandbox.** It does not exist
in a normal browser, a local dev server, or anywhere outside that specific preview pane.

Consequences if you're now running/editing this outside claude.ai:
- `window.storage` will be `undefined`. The app already handles this gracefully — a
  `testStorage()` check on load shows an orange warning banner if storage isn't
  available or fails, and all the actual state/math still works fine in-memory for the
  current session regardless.
- Since persistence can't be trusted, there's a manual fallback: a "Save / restore
  progress code" button that base64-encodes `state.checks` into a textarea the player
  can copy into a notes app and paste back in later.
- **If you're taking this into a real dev environment (e.g. serving it locally, or
  turning it into a proper web app), the right move is to replace `window.storage`
  calls with `localStorage` (or a real backend) since that limitation goes away outside
  claude.ai.** The system prompt that built this explicitly disallowed localStorage
  inside claude.ai Artifacts, but that restriction doesn't apply to your own environment.

## Known-fixed bugs worth knowing about
- Task checkbox IDs are deliberately **index-based** (`prefix-groupIndex-itemIndex`,
  e.g. `ma-3-0`), not built from the boss name string. An earlier version used the raw
  name and broke for any boss with an apostrophe in it (Kree'arra, K'ril Tsutsaroth,
  Ket-Rak's Challenges, Phosani's Nightmare) because the name was interpolated into a
  single-quoted inline `onclick="..."` attribute and the apostrophe closed the string
  early. Don't reintroduce name-based IDs.

## If you're picking this up to keep improving it
Reasonable next steps, roughly in priority order:
1. Verify the remaining `itU()` tasks against the wiki and upgrade them to `it()`.
2. Decide whether to add the untracked Easy/Medium/Hard/general-Elite backlog back in
   (previously removed at the player's request — they're self-tracking that part).
3. If moving off claude.ai, swap `window.storage` for `localStorage` or a real backend.
4. Consider letting `itU()` unverified tasks also merge correctly into Boss Overview if
   new groups are added (they already do, since `bossKey()` runs on all groups
   regardless of verification status).
