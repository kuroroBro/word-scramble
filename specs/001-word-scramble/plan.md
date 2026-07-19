# Plan: Word Scramble — Party Card Game

**Spec**: [spec.md](./spec.md)

## Architecture

Vanilla ES2020 modules, no build step, no framework — the repo IS the
deployable artifact for GitHub Pages, same convention as `timed-wordy` and
`icon-guess-the-word`.

```
index.html            screens (home, setup, host lobby, host panel, display, gameover)
css/styles.css         card-table visual theme
js/game.js              pure rules engine — no DOM, no network
js/words.js             built-in category/word content (data only)
js/storage.js           localStorage settings persistence (including minimum word length)
js/room.js              PeerJS room wrapper (adapted from icon-guess-the-word)
js/main.js              DOM wiring, redaction, render, networking glue
vendor/peerjs.min.js    vendored PeerJS client (no CDN dependency at runtime)
tests/game.test.mjs     node --test unit tests for js/game.js
.github/workflows/deploy.yml   test job → GitHub Pages deploy job
```

### The scramble/reveal model

This project's puzzle unit differs from `icon-guess-the-word`'s (icons +
blank tiles) but reuses the exact same *shape*: one thing that's always
fully visible as "the clue," and a separate row of blank tiles that fill in
only via hints.

- `card.scramble`: the answer word's letters, shuffled into a different
  order, always shown face-up on both Host and Display — this **is** the
  puzzle (the whole game is unscrambling it visually/mentally).
- `card.word` + `card.revealedIndexes` → `maskedAnswer()`: a letter-slot
  view exactly like Emoji Says' masked answer, filled in one random blank
  at a time via **Reveal a Letter**. This is the only thing redacted before
  broadcast — the scramble itself is never secret.

`scrambleWord(word, rng)` shuffles the word's characters and re-shuffles
(bounded retries) if the result equals the original order, so a card is
never accidentally "unscrambled" already. Scrambling happens once, at deck
build time (`buildDeck`), so each card's scramble is fixed for the game —
not re-shuffled on every render.

### Networking model (Host + Display, per US-3)

Identical pattern to `icon-guess-the-word`: host-authoritative,
full-snapshot broadcast, no per-connection roles (Display never sends an
action), PeerJS over the public broker. `js/room.js` is copied over near
verbatim with a distinct ID prefix (`wscramble-room-`, vs. `iguess-room-`
and `xsec-room-`) so rooms from different games never collide on the shared
broker.

- Redaction (`redactState` in `main.js`): strips `word` from the puzzle
  before broadcast, sends `masked` (from `maskedAnswer`) instead — same as
  Emoji Says. `scramble` itself is sent as-is (not secret).
- Clock-offset timer sync: Host broadcasts `hostNow: Date.now()`; Display
  computes `clockOffset` and ticks its own countdown locally off
  `Date.now() + clockOffset`. Absolute deadlines, not decrementing counters.

## Decisions

1. **Team Showdown only, this build.** Solo Sprint was named in the user's
   original concept but explicitly deferred to a fast-follow phase per the
   Step-0 clarifying questions — building both at once would roughly double
   the UI/screen surface for a mode with a different (single-team,
   personal-best) win condition. Nothing in the engine shape (deck, phases,
   card structure) should make adding it later hard.
2. **Host-judged, no per-player tracing input.** The user's concept
   describes "tracing" the hidden word (closer to the mobile game this
   style is inspired by), but confirmed at Step 0 that the no-keyboard,
   Host-judged model (matching Emoji Says) is what this build should use —
   simpler networking (no per-player device role), consistent with the
   sibling project's proven architecture.
3. **Single words only, no multi-word phrases, in v1 content.** Keeps
   `scrambleWord` simple (no space-handling edge cases) and keeps the
   `maskedAnswer` reveal logic unambiguous. Multi-word phrases are a
   plausible future content expansion (spec.md Non-goals), not blocked by
   anything in this architecture.
4. **Scramble is fixed at deck-build time, not re-rolled per render.** A
   card that scrambles differently every time the Display repaints would be
   confusing (and would break screen-reader/redaction consistency) — the
   scramble is part of the card's identity for that game, generated once.
5. **Card-table visual theme, distinct palette from Emoji Says.** Deep felt
   green + gold, red/blue team colors instead of Emoji Says' purple/yellow —
   visually distinguishes the two sibling games at a glance, still shares
   the same font family (Baloo 2 + Inter) and component shapes (pills,
   panels, plaques) for a consistent "family" feel across `gondoit.work`'s
   game portfolio. Explicitly **not** a literal playing-card look (no suit
   pips, no card-face iconography) — see Changelog v2.
6. **Custom hero/background image**, generated via the `image-gen` skill
   (Codex CLI) — a card-table scene distinct from Emoji Says' board-game
   scene, per the Step-0 custom-art decision.

## Changelog

- **v1** (2026-07-12): Initial build — Team Showdown mode, 4 word
  categories, Letter Hints, optional per-card timer, optional target score,
  Host + Display over PeerJS, GitHub Pages deploy, SDD docs.
- **v2** (2026-07-12): Removed the playing-card suit-pip corner marks
  (♠♥♦♣) from the scramble tiles and swapped the literal 🃏 (Joker card)
  emoji on the "Host a Game" button for 🔤 — the tiles are letter tiles,
  not a literal deck-of-cards face, per owner feedback.
- **v3** (2026-07-19): Replaced the per-card timer with a single continuous
  **Round Timer** (starts once, runs through every award/skip, ends the
  round on expiry — see spec.md US-2a and tasks.md Phase 8), promoted the
  category name from a small muted pill to a large high-contrast badge on
  every screen, and switched the scrambled-letter/answer-tile rows from
  CSS flex-wrap (uneven breaks) to an explicit balanced-row split in JS —
  all per owner feedback.
