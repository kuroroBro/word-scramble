# Word Scramble

The ultimate pocket-sized word battle, brought to a shared screen. Flip a
card to reveal a scrambled mess of letters, then race to unscramble the
hidden word before anyone else. Free, ad-free, no accounts, no build step —
runs straight from GitHub Pages.

Two teams play together looking at one shared **Display** screen (a TV or
laptop everyone can see); a **Host** (emcee) holds a private second screen
showing the answer and a controller for the round. Teams shout out their
guess; the Host taps who got it. No typing, no per-player devices, no
drag-or-trace input.

This is the **Team Showdown** mode. A Solo Sprint mode is planned for later
(see [tasks.md](specs/001-word-scramble/tasks.md)).

## How to play

1. **Host a Game** — pick your categories, team names, minimum word length,
   whether Letter Hints are on, an optional Round Timer, and an optional
   Target Score. Tap **Start Room** for a 4-letter room code.
2. **Join as Display** — on the shared screen, open this same page and
   enter the Host's code.
3. **Start Game** once the Display is connected.
4. Each card shows a word's letters scrambled out of order, always on a
   single line — tiles shrink to fit as the word gets longer instead of
   wrapping onto a second row — plus a matching single-line row of blank
   letter tiles showing the word's length. The category is called out in
   a bold badge on both screens.
   Teams shout out the unscrambled word — the Host taps **Team A got it** /
   **Team B got it** to award the point, or **Skip** if nobody can get it.
5. If Letter Hints are on, the Host can **Reveal a Letter** at any time.
6. If a Round Timer is set, the Host taps **Start Timer** once, right when
   the round is ready — it's one clock for the whole round, not per card.
   Award and skip through as many cards as you can before it hits zero;
   when it does, the round ends immediately and the higher score wins.
7. If a Target Score is set, the first team to reach it wins instantly.
   Otherwise the game ends when the round timer runs out or the deck runs
   out — highest score wins (a tie is a draw, unless a target score was
   reached).

A working room is required to play: the Host screen shows the answer, so it
can't double as the shared Display.

The default minimum is **5 letters**. Choose a higher minimum for a harder
game; only words at or above that length enter the deck.

The pool now includes more than 100 additional words longer than 8 letters,
so higher minimum settings have plenty of challenging cards to choose from.

## Categories

Animals · Food & Drinks · Movies & Shows · Everyday Objects

## Local development

No build step — just serve the repo root and open it:

```
npx http-server .
# or: python3 -m http.server 8000
```

Run the rules-engine unit tests:

```
node --test tests/*.test.mjs
```

## Enabling GitHub Pages

Settings → Pages → Build and deployment → Source: **GitHub Actions**. Every
push to `main` runs the test suite, then deploys the repo root.

## Design docs

See [specs/001-word-scramble/](specs/001-word-scramble/) — `spec.md` (what
and why), `plan.md` (architecture and decisions), `tasks.md` (build
checklist).
