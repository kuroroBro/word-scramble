// Pure rules engine for Word Scramble. No DOM, no network — same convention
// as icon-guess-the-word/timed-wordy: never read the clock or randomness
// internally without it being passed in, so the engine stays unit-testable.

export const PHASE = {
  LOBBY: 'lobby',
  PLAYING: 'playing',
  GAMEOVER: 'gameover',
};

export const TIMER_STATUS = {
  PAUSED: 'paused',   // not counting down — waiting for the Host to start it
  RUNNING: 'running',
};

const DIFFICULTY_TIERS = ['easy', 'medium', 'hard'];

function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffles a word's letters into a different order than the original. Bails
// out after a bounded number of attempts (e.g. very short words, or words
// made of a single repeated letter) rather than looping forever.
export function scrambleWord(word, rng = Math.random) {
  const letters = word.split('');
  if (letters.length <= 1) return letters;
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = shuffle(letters, rng);
    if (candidate.join('') !== word) return candidate;
  }
  return shuffle(letters, rng); // extremely unlikely fallback (e.g. "AAAA")
}

// Combine words from every selected category into one deck, grouped by
// difficulty tier *across* all selected categories (not grouped by
// category), shuffled within each tier — same deck-building convention as
// icon-guess-the-word. Each card's scramble is generated once, here, so it's
// fixed for the rest of the game rather than re-rolled on every render.
function buildDeck(categoryIds, categoryPool, rng, minWordLength) {
  const selected = categoryPool.filter((c) => categoryIds.includes(c.id));
  const byTier = { easy: [], medium: [], hard: [] };
  for (const category of selected) {
    for (const entry of category.words) {
      if (entry.word.length < minWordLength) continue;
      const tier = byTier[entry.difficulty] ? entry.difficulty : 'easy';
      byTier[tier].push({
        word: entry.word,
        difficulty: tier,
        categoryId: category.id,
        scramble: scrambleWord(entry.word, rng),
      });
    }
  }
  return DIFFICULTY_TIERS.flatMap((tier) => shuffle(byTier[tier], rng));
}

export function createGame(settings, categoryPool, rng = Math.random) {
  return {
    phase: PHASE.LOBBY,
    hintsEnabled: settings.hintsEnabled ?? false,
    // null/0 = timer disabled entirely (no timer UI, no auto-skip).
    timerSeconds: settings.timerSeconds || null,
    timerStatus: TIMER_STATUS.PAUSED,
    timerDeadline: null,
    // null/0 = no target — play through the whole deck, same as before this
    // existed. Otherwise the first team to reach this score wins instantly.
    targetScore: settings.targetScore || null,
    teams: {
      a: { id: 'a', name: settings.teamNames?.a || 'Team A', score: 0 },
      b: { id: 'b', name: settings.teamNames?.b || 'Team B', score: 0 },
    },
    deck: buildDeck(
      settings.categoryIds ?? [],
      categoryPool,
      rng,
      Number.isInteger(settings.minWordLength) ? settings.minWordLength : 0,
    ),
    cardIndex: -1,
    card: null,
    winner: null,
    // Why the game ended: 'exhausted' (deck ran out), 'timeout' (round
    // timer hit zero), or 'target' (a team reached the target score).
    // Purely descriptive, set only by endGame, null until then.
    endReason: null,
  };
}

// Copies deck[cardIndex] into state.card with a fresh revealedIndexes list,
// or ends the game if the deck is exhausted. Returns false if the game
// ended (deck exhausted), true if a card was dealt. The round timer (if
// any) is *not* touched here — it's a single continuous clock for the
// whole round, not a per-card one, so award/skip transitions never pause
// or reset it. Only `createGame` and `endGame` ever change timer status.
function dealCard(state) {
  state.cardIndex += 1;
  const next = state.deck[state.cardIndex];
  if (!next) {
    endGame(state, undefined, 'exhausted');
    return false;
  }
  state.card = { ...next, revealedIndexes: [] };
  return true;
}

// `explicitWinner` is used for a target-score win, where the team that just
// scored is unambiguously the winner — no need to compare totals. Without
// it (deck exhaustion or round-timer expiry), the winner is decided by
// comparing scores, with a tie counting as a draw (`null`). `reason` is
// purely descriptive (for game-over messaging) and never affects who wins.
function endGame(state, explicitWinner, reason) {
  if (explicitWinner !== undefined) {
    state.winner = explicitWinner;
  } else {
    const { a, b } = state.teams;
    state.winner = a.score === b.score ? null : a.score > b.score ? 'a' : 'b';
  }
  state.endReason = reason ?? null;
  state.card = null;
  state.timerStatus = TIMER_STATUS.PAUSED;
  state.timerDeadline = null;
  state.phase = PHASE.GAMEOVER;
}

export function startGame(state) {
  if (state.phase !== PHASE.LOBBY) return false;
  if (state.deck.length === 0) return false;
  state.phase = PHASE.PLAYING;
  dealCard(state);
  return true;
}

// Reveals one random blank letter (not left-to-right, for the same reason
// as icon-guess-the-word: a fixed order makes the word too predictable to
// give away). A no-op (returns false) when hints are off, outside PLAYING,
// or the word is already fully revealed — deliberately not an error, so the
// UI never needs to special-case a disabled control.
export function revealLetter(state, rng = Math.random) {
  if (state.phase !== PHASE.PLAYING || !state.hintsEnabled) return false;
  const { word, revealedIndexes } = state.card;
  const blanks = [];
  for (let i = 0; i < word.length; i++) {
    if (word[i] === ' ') continue;
    if (!revealedIndexes.includes(i)) blanks.push(i);
  }
  if (blanks.length === 0) return false; // fully revealed already
  const pick = blanks[Math.floor(rng() * blanks.length)];
  revealedIndexes.push(pick);
  return true;
}

export function awardPoint(state, teamId) {
  if (state.phase !== PHASE.PLAYING) return false;
  if (!state.teams[teamId]) return false;
  state.teams[teamId].score += 1;
  if (state.targetScore && state.teams[teamId].score >= state.targetScore) {
    endGame(state, teamId, 'target'); // reaching the target wins outright, no draw possible
    return true;
  }
  dealCard(state);
  return true;
}

export function skipPuzzle(state) {
  if (state.phase !== PHASE.PLAYING) return false;
  dealCard(state);
  return true;
}

// Starts the countdown for the whole round. A no-op if there's no timer
// configured for this game, outside PLAYING, or already running —
// deliberately not an error, same convention as revealLetter. Unlike a
// per-card timer, this only ever needs to be started once per game: it
// keeps running continuously across every award/skip until it expires or
// the game ends some other way (deck exhaustion, target score).
export function startTimer(state, now) {
  if (state.phase !== PHASE.PLAYING) return false;
  if (!state.timerSeconds) return false;
  if (state.timerStatus === TIMER_STATUS.RUNNING) return false;
  state.timerDeadline = now + state.timerSeconds * 1000;
  state.timerStatus = TIMER_STATUS.RUNNING;
  return true;
}

// Call this periodically (e.g. every 200-250ms) from the Host's own clock
// only. If the deadline has passed, the round ends immediately — the goal
// is to name as many cards as possible before time runs out, so expiry
// ends the game rather than skipping just the current card. The card on
// screen when time ran out is simply abandoned, unscored. Returns true if
// the game just ended (the caller should re-render and re-broadcast).
export function checkTimerExpired(state, now) {
  if (state.phase !== PHASE.PLAYING) return false;
  if (state.timerStatus !== TIMER_STATUS.RUNNING) return false;
  if (now < state.timerDeadline) return false;
  endGame(state, undefined, 'timeout');
  return true;
}

// Milliseconds left to show on screen. Full duration while paused (so the
// Host/Display see the configured length before it starts), 0 if no timer.
export function timerRemainingMs(state, now) {
  if (!state.timerSeconds) return 0;
  if (state.timerStatus !== TIMER_STATUS.RUNNING) return state.timerSeconds * 1000;
  return Math.max(0, state.timerDeadline - now);
}

// Letter-slot view of the current card's word: one entry per character,
// letters shown only once revealed. Used by both the Host's own render and
// (via room.js) the redacted snapshot sent to the Display — this is the one
// place that decides what a blank tile looks like. Space-handling is kept
// (even though v1 content is single words only) so multi-word phrases can
// be added later without touching this function.
export function maskedAnswer(card) {
  if (!card) return [];
  return card.word.split('').map((char, i) => ({
    char: char === ' ' ? ' ' : card.revealedIndexes.includes(i) ? char : null,
    isSpace: char === ' ',
  }));
}

// Solo mode's answer check: case/whitespace-insensitive exact match, used to
// auto-validate a typed guess. Words here are always plain A-Z with no
// spaces (see words.js), so no punctuation stripping is needed — just fold
// case and trim stray whitespace from the input.
function normalizeGuess(s) {
  return s.trim().toUpperCase().replace(/\s+/g, ' ');
}

export function checkGuess(word, guess) {
  return normalizeGuess(word) === normalizeGuess(guess);
}
