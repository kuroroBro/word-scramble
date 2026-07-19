# Tasks: Word Scramble — Party Card Game

**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

## Phase 1 — Rules engine (US-1, US-2, US-2a, US-2b)
- [x] T001 `js/game.js`: state factory, `scrambleWord`, deck construction
      (combine selected categories, sort by difficulty tier, shuffle within
      tier, scramble each word once at deck-build time)
- [x] T002 `js/game.js`: `startGame`, `revealLetter` (random blank, no-op
      when hints disabled or word complete), `awardPoint`, `skipPuzzle`
- [x] T003 `js/game.js`: deck exhaustion → `gameover` phase, winner/draw
      logic; `targetScore` instant-win path (explicit-winner `endGame`)
- [x] T004 `js/game.js`: `TIMER_STATUS`, `startTimer`, `checkTimerExpired`
      (auto-skip only, host-clock-authoritative), `timerRemainingMs`
- [x] T005 `tests/game.test.mjs`: unit tests incl. hints-disabled no-op,
      deck never repeats, deck-exhaustion end-of-game, target-score instant
      win (never a draw), timer auto-skip, scramble never equals original
      word order

## Phase 2 — Content (US-1)
- [x] T006 `js/words.js`: category/word schema (word, difficulty, category)
- [x] T006a **Word authoring**: 4 categories (Animals, Food & Drinks, Movies
      & Shows, Everyday Objects), spread across easy/medium/hard by word
      length and familiarity
- [x] T007 `js/storage.js`: last-used settings (categories, hints toggle,
      timer, target score, team names, minimum word length) in localStorage

## Phase 3 — UI (US-1, US-2, US-2a, US-2b)
- [x] T008 `index.html` + `css/styles.css`: home, host-setup, host-lobby,
      host-panel, display, gameover screens; card-table theme (felt green +
      gold, red/blue teams) — Host screens mobile-first, Display screen
      landscape/TV-first
- [x] T009 `js/main.js`: host-setup screen (category checklist, hints toggle,
      minimum word length, timer select, target-score select, team-name inputs)
- [x] T010 `js/main.js`: shared `renderScramble`/`renderTiles` driving both
      the Host's own view and the Display's redacted view; answer visible
      only on Host
- [x] T011 `js/main.js`: point-award and letter-reveal animations
      (score-plaque bounce, confetti burst, tile pop-in — reused pattern)
- [x] T012 `index.html` + `css/styles.css`: "How to Play" dialog

## Phase 4 — One room, Host-authoritative (US-3)
- [x] T013 `js/room.js`: adapted PeerJS wrapper (`wscramble-room-` prefix),
      join by code, broadcast full-state snapshots, error surfacing
- [x] T014 `js/main.js`: host-side action handlers call `game.js`, build a
      redacted (no-`word`) copy of the resulting state via `redactState`,
      broadcast that; Display renders only incoming redacted snapshots
- [x] T015 `index.html`: room-code display + copy-to-clipboard on the Host
      screen, join-by-code input on the home screen (no QR)

## Phase 5 — Timer + Target Score (US-2a, US-2b, folded into initial build)
- [x] T016 `js/main.js`: Start Timer handler; shared 250ms tick repainting
      both roles' countdown locally, Host-only auto-skip polling
- [x] T017 `js/room.js`: pass `hostNow` through `onState` for clock-offset
      correction
- [x] T018 `js/main.js` + `css/styles.css`: blur the scrambled letters on
      Display while a timer is configured but not yet started for the
      current card ("Waiting for the Host to start the timer…" overlay)
- [x] T019 `index.html` + `css/styles.css`: Target Score select at setup;
      "First to N" pill (Host) / banner (Display)

## Phase 6 — Deploy
- [x] T020 `.github/workflows/deploy.yml`: GitHub Pages deployment from
      repo root on push to `main`; `.nojekyll`
- [x] T021 `README.md`: how to play, room requirement, categories, local
      dev, enabling Pages, SDD links

## Phase 7 — Custom art
- [x] T022 Home-screen background image via the `image-gen` skill —
      card-table scene distinct from Emoji Says' board-game scene

## Verified
- Unit tests: 20/20 passing (`node --test tests/game.test.mjs`).
- Manual E2E (real PeerJS broker, two Playwright browser contexts, Host +
  Display): room code exchange, peer-connect count, Start Game, scramble
  letters matching between Host and Display (and confirmed a true
  permutation of the answer), scramble blurred on Display before Start
  Timer / clear immediately after, Reveal a Letter syncing to both screens,
  and reaching a Target Score of 3 ending the game instantly with the
  correct winner shown on both screens.
- Fixed a real bug found during this verification: `css/styles.css`'s home
  background used a path relative to the CSS file itself
  (`images/home-bg.jpg`, resolving to the nonexistent `css/images/...`) —
  corrected to `../images/home-bg.jpg`. Note this is also a latent bug in
  the sibling `icon-guess-the-word` repo, which instead uses an
  *absolute* `/images/home-bg.jpg` path that 404s once deployed under a
  GitHub Pages subpath (confirmed live against
  `kuroroBro.github.io/icon-guess-the-word/`) — not fixed here since it's
  outside this project, flagging for a follow-up in that repo.

## Phase 6 — Minimum word length and expanded long-word content
- [x] Add a persisted 3–9 letter minimum setting (default 5) to setup and
      apply it to unused-card counts, reset behavior, and engine deck creation.
- [x] Add 32 additional 8+ letter words across all eight categories.
- [x] Add engine coverage for minimum-length filtering and update the SDD/README.

## Phase 7 — Long-word content expansion
- [x] Add 104 unique words longer than 8 letters across all eight categories.
- [x] Add a regression test confirming the expanded pool contains at least
      240 long words and every counted entry is longer than 8 letters.

## Phase 8 — Round timer, category prominence, balanced letter rows
- [x] Reworked the timer from a per-card countdown (auto-skip + reset every
      card) to a single continuous **Round Timer**: `startTimer` still fires
      once, but `dealCard` no longer touches timer state, so it keeps
      running through every award/skip and only `endGame` stops it. Expiry
      now ends the round immediately (score comparison, same as deck
      exhaustion) instead of auto-skipping just the current card. Added
      `endReason` (`exhausted`/`timeout`/`target`) to `game.js`'s state for
      game-over messaging, surfaced on both the Host/Solo and Display
      game-over screens.
- [x] `js/main.js`: `renderScramble`/`renderTiles` now split long words into
      explicitly balanced rows (`balancedRowCounts`, max 6 tiles/row)
      instead of relying on CSS flex-wrap, whose break point depended on
      exact screen width and produced uneven splits (e.g. 6+2). An
      8-letter word is always 4+4 now, on any device.
- [x] `index.html` + `css/styles.css`: the category name moved out of the
      small muted pill row into its own large, high-contrast accent badge
      (`.category-highlight` on Host/Solo, `.category-banner-main` on
      Display) — readable at a glance instead of blending into the other
      meta pills.
- [x] `tests/game.test.mjs`: rewrote the timer-expiry tests for the new
      end-the-round behavior, added coverage confirming the timer runs
      continuously across awards/skips without resetting, and added
      `endReason` coverage for all three end-of-game paths. 24/24 passing.
- [x] Live-verified via Playwright (Solo mode, no room needed): a forced
      9-letter word rendered a consistent balanced 5+4 split across
      scramble and answer tiles on every card; Start Timer stayed disabled
      (i.e. the round clock kept running, never reset) across three
      consecutive skips.

## Phase 9 — Single-line letter tiles (supersedes Phase 8's balanced rows)
- [x] `js/main.js`: `renderScramble`/`renderTiles` no longer split into
      multiple rows (`balancedRowCounts` removed entirely). Both set a
      `--tile-count` CSS custom property on their container instead, one
      per row/group, and always render every tile on a single line.
- [x] `css/styles.css`: `.scramble-row`/`.tile-word-group` compute
      `--scale: min(1, 6 / var(--tile-count, 6))` from that count — full
      size (unchanged) up to 6 tiles, shrinking past that — and every tile
      size/font-size/gap is `--scale` times a `clamp()`ed, viewport-aware
      base size. This also replaced the old fixed `@media (max-width:
      420px)` tile-size override, since the clamp()s already respond to
      viewport width on their own. `overflow-x: auto` is kept as a
      last-resort safety net, not the primary fit strategy.
- [x] Live-verified via Playwright at 360/420/800px viewports: the pool's
      longest word (18 letters, `THEGREATESTSHOWMAN`) renders as 18 tiles
      on one line with zero horizontal overflow at every width tested,
      screenshot-confirmed still legible at the smallest size.

## Open backlog (not blocking, intentionally deferred)
- **Solo Sprint mode** — single-team, personal-best timed run; named in the
  original concept but scoped out of this first build (see plan.md
  Decisions #1).
- **Multi-word phrases** — v1 content is single words only (see spec.md
  Non-goals).
- Display disconnect-detection hardening (ping/pong heartbeat) — same
  known gap as `icon-guess-the-word`, not yet a real problem, not built
  here either.
