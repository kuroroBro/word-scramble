# Feature Specification: Word Scramble — Party Card Game

**Feature branch**: `001-word-scramble`
**Status**: Draft
**Created**: 2026-07-12

## Overview

A free, ad-free party game that runs entirely in the browser and is hosted on
GitHub Pages — no backend, no build step to serve. The pocket-sized word
battle, brought to a shared screen: flip a card to reveal a scrambled mess of
letters, then race to unscramble the hidden word before anyone else. Two
teams play together looking at one shared **Display** screen (a TV or laptop
everyone can see); a **Host** (emcee) holds a private second screen showing
the answer and a controller for the round. Teams shout out their answer as
soon as they think they've cracked it; the Host taps which team got it
right. No typing, no per-player devices, no drag-or-trace input — the Host's
judgment and a tap are the entire input model, same convention as the sibling
project `icon-guess-the-word` ("Emoji Says").

This is the **Team Showdown** mode. A **Solo Sprint** mode (single team
racing the clock for a personal best) is an intended fast-follow and is
explicitly out of scope for this first build (see Non-goals).

## User Stories

### US-1: Set up a game (host)
As a host, I want to pick which word categories to play and whether letter
hints are available, so the game fits my group and how much challenge they
want.

**Acceptance criteria**
- Can select one or more built-in categories; at least one must be selected
  to start. Words from every selected category are combined into one deck
  and grouped by difficulty tier (easy → medium → hard) *across* all chosen
  categories, shuffled within each tier — so easy words from different
  categories are mixed together early on, rather than finishing one whole
  category before starting the next.
- Can rename the two teams (default "Team A" / "Team B").
- Can set a **Minimum word length** from 3–9 letters (default 5). Words
  shorter than the selected minimum are excluded from the deck.
- The built-in pool contains at least 100 additional words longer than 8
  letters, distributed across the categories for more challenging rounds.
- Can toggle **Letter Hints** on or off for the whole game at setup time —
  a one-time choice per game, not a per-round spend. When off, no hint
  control appears anywhere in the game.
- Can set a **Round Timer** (Off, 60/90/120/180/300 seconds) at setup time —
  one clock for the whole round, not per card. When Off, no timer UI
  appears anywhere and play works exactly as before this feature existed.
- Can set a **Target Score** (Off/"play through the deck", or First to
  3/5/7/10/15) at setup time. When set, the first team to reach that score
  wins immediately — the deck doesn't need to run out, and this outcome is
  never a draw. When off (the default), the game plays exactly as before:
  the deck runs out and the higher score wins (a tie is a draw).
- Setup choices are made once, before the room opens; no mid-game category
  switching in this version (see Non-goals).

### US-2a: Timed rounds (optional)
As a host, I want an optional round-length countdown so the group races to
name as many cards as possible before time runs out, without taking control
away from me.

**Acceptance criteria**
- If a Round Timer is set, both screens show a countdown. It starts
  **paused** at the full duration — the Host taps **Start Timer** once, when
  the round is actually ready to go, not automatically the instant the game
  starts.
- Once started, the countdown runs **continuously across every card** —
  awarding a point or skipping never pauses or resets it. The goal is to get
  through as many cards as possible before it hits zero, not to beat a
  per-card clock.
- When the countdown reaches zero, the **round ends immediately** — same as
  deck exhaustion, the higher score wins (a tie is a draw unless a target
  score was already reached). The card on screen at that moment is simply
  abandoned, unscored.
- The Host can still award a point or skip manually at any time regardless
  of whether the timer is running, paused, or off.
- The countdown is visually urgent (color change) in the last 10 seconds.
- While a Round Timer is configured but not yet started, the Display blurs
  the scrambled letters (with a "Waiting for the Host to start the timer…"
  message) instead of showing them — so teams can't get a head start while
  the Host is still setting up the round. This only ever happens once, right
  at the start of the round (never again once the timer is running, since it
  no longer pauses between cards). The Host's own screen is unaffected (it
  always shows the scramble clearly, same as the answer). This blur never
  applies when no timer is configured at all.

### US-2: Play a round (host-judged, no typing)
As a host running the game, I want to flip a card, reveal its scrambled
letters, optionally give letter hints, and award the point to whichever team
answers first, so the group can just play without anyone typing or dragging
tiles.

**Acceptance criteria**
- The Display always shows: the current card's **scrambled letters** (every
  letter of the answer, shown face-up but out of order), blank letter-slot
  tiles beneath them (word length indicator, filled in only as hints are
  given), the category name in a **large, high-contrast badge** (readable
  at a glance from across the room, not a small muted label), and both team
  scores fixed in the **top-left** (Team A) and **top-right** (Team B)
  corners.
- Scrambled letters (and the matching blank tiles beneath them) always
  stay on a **single row**, however long the word — tiles shrink smoothly
  as the letter count grows rather than wrapping onto a second line. (An
  earlier revision of this behavior split long words into balanced
  multi-row groups instead; superseded by owner feedback in favor of a
  single row.)
- The Host screen shows everything the Display shows (including the same
  prominent category badge), **plus** the full answer spelled out, and the
  round controls.
- If Letter Hints is on, the Host has a **Reveal a Letter** control that
  fills in one random remaining blank slot on both screens (not left to
  right — a fixed order makes the word too predictable to give away).
  No cost, no limit beyond the word's own length — pressing it once the
  whole word is revealed does nothing.
- The Host has two big buttons, **Team A got it** / **Team B got it** —
  tapping one scores a point for that team and deals the next card.
- The Host has a **Skip** control — deals the next card with no point
  awarded (for a card nobody can get).
- Cards are never repeated within a game. When the deck is exhausted, the
  game ends and shows the final score and winner (a tie is a draw).

### US-2b: Race to a target score (optional)
As a host, I want the option to end the game as soon as a team hits a target
score, so game night doesn't always require playing the whole deck.

**Acceptance criteria**
- If a Target Score is set, the moment a team's score reaches it, the game
  ends immediately with that team as the winner — never a draw, since only
  one team can reach the target on a given award.
- Both screens show a small "First to N" indicator whenever a target is set.
- If the deck runs out before either team reaches the target, the game still
  ends normally by score comparison (a tie is still possible in that case).
- Off by default — the game plays through the whole deck unless the Host
  opts in at setup.

### US-3: One Host, one Display, one room
As a host, I want my controller screen and the shared TV/laptop screen to
show the same live game, so I don't need anyone else's phone.

**Acceptance criteria**
- Setup (categories, hints toggle, team names) is completed first; only then
  does the Host tap **Start Room**, which opens the room and shows a short,
  human-friendly code. The Display can't join before this point.
- The Display device joins by typing in the code — no QR code in this
  version, no accounts, no server we operate — peer-to-peer WebRTC via the
  public PeerJS broker, the same approach proven in `timed-wordy` and
  `icon-guess-the-word`.
- Only the Host device can act (reveal a letter, award a point, skip). The
  Display is a pure render target and never sends actions.
- The Display never receives the answer over the network, not just hides it
  in the UI: the Host sends a redacted snapshot (answer field stripped) to
  the room, and renders the full answer only in its own local view. The
  scrambled letters themselves are *not* secret (they're the puzzle
  everyone's meant to see) — only the correctly-ordered answer is withheld.
- If the room service is unreachable, the app says so in plain language.
  This game has no meaningful single-device mode (the Host screen shows the
  answer, so it can't double as the shared Display) — a working room is a
  real requirement of play.

## Functional Requirements

- **FR-1** Static site only: must run from GitHub Pages (no backend, no
  build step required to serve).
- **FR-2** Game logic must be a pure, testable module (no DOM reads/writes
  inside the rules).
- **FR-3** Host-authoritative networking: only the Host mutates state; the
  Display renders whatever snapshot it last received. No client ever sends
  an action.
- **FR-4** No in-game currency or lives — score is the only
  persistent-within-a-game number. An optional round timer exists (§US-2a)
  but it's a pacing tool the Host starts, not an automated judge: it can
  only ever end the round with the scores as they stand, never award a
  point itself.
- **FR-5** Mobile-first UI with large tap targets on the Host screen; the
  Display screen is optimized for being read from across a room (big letter
  tiles that stay on one shrink-to-fit row, a large high-contrast category
  badge, big score plaques).
- **FR-6** No ads, no analytics, no tracking.

## Non-goals

- No per-player devices or drag/trace/typing input — answers are spoken
  aloud and judged by the Host. Tracing letters on a personal device (the
  input model of the mobile game this concept is inspired by) is explicitly
  out of scope here.
- No hint "coins" or any spendable in-game currency — Letter Hints is a
  single on/off setting for the whole game, chosen at setup.
- No mid-game category switching — categories are chosen once, at setup.
- No accounts, matchmaking, or cross-room/cross-game history.
- No **Solo Sprint** mode in this build — only Team Showdown. Solo Sprint
  (single-team, personal-best timed run) is an intended later phase; nothing
  in this version's architecture should make it hard to add, but it isn't
  built yet.
- No multi-word phrases in this version's content — every card scrambles a
  single word (no spaces). Multi-word phrases are a possible future content
  extension, not part of v1.
- No lives/elimination mechanic — this is a running-score game.
- No per-card timer — the Round Timer (§US-2a) is a single continuous clock
  for the whole round; a per-card countdown that auto-skips and resets was
  the v1 design and is explicitly superseded, not offered as an alternative
  mode.

## Key Entities

- **Settings**: selected category ids, minimum word length, hints-enabled flag,
  timer seconds (0/null = off), target score (0/null = off), team names.
- **Team**: id, name, score.
- **Card** (the puzzle unit): the answer word, its scrambled letter order,
  category id, difficulty, revealed-letter indexes.
- **Game**: phase (`lobby → playing → gameover`), teams, deck (shuffled
  cards from selected categories, easy → hard across categories), card
  index, hints-enabled flag, round timer seconds, timer status (`paused` |
  `running` — starts once per game and, once running, is untouched by
  card transitions), timer deadline (absolute epoch ms, set only while
  running), target score (0/null = play through the whole deck instead),
  end reason (`exhausted` | `timeout` | `target`, set only at game end —
  purely descriptive, never affects who wins).
- **Category**: id, name, list of words (each with a difficulty tier);
  built-in only (no custom categories in this version).
- **Room**: 4-letter code, host peer connection, display connection(s).
