import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PHASE, TIMER_STATUS, createGame, startGame, revealLetter, awardPoint, skipPuzzle,
  scrambleWord, startTimer, checkTimerExpired, timerRemainingMs, maskedAnswer, checkGuess,
} from '../js/game.js';

const POOL = [
  {
    id: 'cat-a',
    name: 'Category A',
    words: [
      { word: 'CAT', difficulty: 'easy' },
      { word: 'DOG', difficulty: 'easy' },
    ],
  },
  {
    id: 'cat-b',
    name: 'Category B',
    words: [
      { word: 'ELEPHANT', difficulty: 'hard' },
    ],
  },
];

function seq(values) {
  let i = 0;
  return () => values[i++ % values.length];
}

test('scrambleWord returns a different order than the original word', () => {
  const rng = seq([0, 0.99, 0.5, 0.1, 0.9, 0.3]);
  const scrambled = scrambleWord('TIGER', rng);
  assert.equal(scrambled.length, 5);
  assert.notEqual(scrambled.join(''), 'TIGER');
  assert.equal(scrambled.slice().sort().join(''), 'TIGER'.split('').sort().join(''));
});

test('scrambleWord handles single-letter words without looping forever', () => {
  assert.deepEqual(scrambleWord('A'), ['A']);
});

test('createGame builds a deck from only the selected categories', () => {
  const game = createGame({ categoryIds: ['cat-a'] }, POOL);
  assert.equal(game.deck.length, 2);
  assert.ok(game.deck.every((c) => c.categoryId === 'cat-a'));
});

test('each dealt card has a scramble that is a permutation of its word', () => {
  const game = createGame({ categoryIds: ['cat-a', 'cat-b'] }, POOL);
  startGame(game);
  for (const card of game.deck) {
    assert.equal(card.scramble.slice().sort().join(''), card.word.split('').sort().join(''));
  }
});

test('hints disabled: revealLetter is a no-op', () => {
  const game = createGame({ categoryIds: ['cat-a'], hintsEnabled: false }, POOL);
  startGame(game);
  const before = game.card.revealedIndexes.length;
  assert.equal(revealLetter(game), false);
  assert.equal(game.card.revealedIndexes.length, before);
});

test('revealLetter fills a random blank, never repeats, no-ops once full', () => {
  const game = createGame({ categoryIds: ['cat-b'], hintsEnabled: true }, POOL);
  startGame(game); // ELEPHANT — 8 letters
  for (let i = 0; i < 8; i++) {
    assert.equal(revealLetter(game, Math.random), true);
  }
  assert.equal(game.card.revealedIndexes.length, 8);
  assert.equal(new Set(game.card.revealedIndexes).size, 8);
  assert.equal(revealLetter(game), false); // fully revealed already
});

test('deck never repeats a card within a game', () => {
  const game = createGame({ categoryIds: ['cat-a'] }, POOL);
  startGame(game);
  const seen = new Set([game.card.word]);
  awardPoint(game, 'a');
  seen.add(game.card.word);
  assert.equal(seen.size, 2);
});

test('deck exhaustion ends the game; tie is a draw', () => {
  const game = createGame({ categoryIds: ['cat-a'] }, POOL); // 2 cards
  startGame(game);
  awardPoint(game, 'a');
  awardPoint(game, 'b');
  assert.equal(game.phase, PHASE.GAMEOVER);
  assert.equal(game.winner, null);
  assert.equal(game.card, null);
});

test('deck exhaustion: higher score wins', () => {
  const game = createGame({ categoryIds: ['cat-a'] }, POOL); // 2 cards
  startGame(game);
  awardPoint(game, 'a');
  awardPoint(game, 'a');
  assert.equal(game.phase, PHASE.GAMEOVER);
  assert.equal(game.winner, 'a');
});

test('skipPuzzle deals the next card with no score change', () => {
  const game = createGame({ categoryIds: ['cat-a'] }, POOL);
  startGame(game);
  skipPuzzle(game);
  assert.equal(game.teams.a.score, 0);
  assert.equal(game.teams.b.score, 0);
  assert.equal(game.phase, PHASE.PLAYING);
});

test('targetScore off by default', () => {
  const game = createGame({ categoryIds: ['cat-a'] }, POOL);
  assert.equal(game.targetScore, null);
});

test('reaching targetScore ends the game instantly with that team as winner', () => {
  const game = createGame({ categoryIds: ['cat-a', 'cat-b'], targetScore: 2 }, POOL);
  startGame(game);
  awardPoint(game, 'a');
  assert.equal(game.phase, PHASE.PLAYING); // 1 point, not there yet
  awardPoint(game, 'a');
  assert.equal(game.phase, PHASE.GAMEOVER);
  assert.equal(game.winner, 'a');
});

test('targetScore win is never a draw even at otherwise-tied scores', () => {
  const game = createGame({ categoryIds: ['cat-a', 'cat-b'], targetScore: 1 }, POOL);
  startGame(game);
  awardPoint(game, 'b');
  assert.equal(game.phase, PHASE.GAMEOVER);
  assert.equal(game.winner, 'b');
});

test('targetScore does not fire early; deck exhaustion still works otherwise', () => {
  const game = createGame({ categoryIds: ['cat-a'], targetScore: 5 }, POOL); // 2 cards
  startGame(game);
  awardPoint(game, 'a');
  awardPoint(game, 'b');
  assert.equal(game.phase, PHASE.GAMEOVER);
  assert.equal(game.winner, null); // tied 1-1, deck exhausted, target never reached
});

test('timer disabled by default when timerSeconds is 0', () => {
  const game = createGame({ categoryIds: ['cat-a'], timerSeconds: 0 }, POOL);
  startGame(game);
  assert.equal(startTimer(game, 1000), false);
});

test('startTimer starts a paused-to-running countdown once', () => {
  const game = createGame({ categoryIds: ['cat-a'], timerSeconds: 30 }, POOL);
  startGame(game);
  assert.equal(game.timerStatus, TIMER_STATUS.PAUSED);
  assert.equal(startTimer(game, 1000), true);
  assert.equal(game.timerStatus, TIMER_STATUS.RUNNING);
  assert.equal(startTimer(game, 2000), false); // already running
});

test('timerRemainingMs shows full duration while paused', () => {
  const game = createGame({ categoryIds: ['cat-a'], timerSeconds: 30 }, POOL);
  startGame(game);
  assert.equal(timerRemainingMs(game, 1000), 30_000);
});

test('checkTimerExpired auto-skips with no score change and resets to paused', () => {
  const game = createGame({ categoryIds: ['cat-a'], timerSeconds: 30 }, POOL);
  startGame(game);
  startTimer(game, 1000);
  assert.equal(checkTimerExpired(game, 1000 + 29_000), false);
  assert.equal(checkTimerExpired(game, 1000 + 30_000), true);
  assert.equal(game.teams.a.score, 0);
  assert.equal(game.teams.b.score, 0);
  assert.equal(game.timerStatus, TIMER_STATUS.PAUSED);
  assert.equal(game.timerDeadline, null);
});

test('timer expiry at deck exhaustion still ends the game', () => {
  const game = createGame({ categoryIds: ['cat-a'], timerSeconds: 30 }, POOL); // 2 cards
  startGame(game);
  startTimer(game, 0);
  checkTimerExpired(game, 30_000); // skip card 1
  startTimer(game, 30_000);
  checkTimerExpired(game, 60_000); // skip card 2 -> deck exhausted
  assert.equal(game.phase, PHASE.GAMEOVER);
  assert.equal(game.winner, null);
});

test('maskedAnswer shows only revealed letters', () => {
  const game = createGame({ categoryIds: ['cat-a'], hintsEnabled: true }, POOL);
  startGame(game);
  const word = game.card.word;
  const beforeMask = maskedAnswer(game.card);
  assert.ok(beforeMask.every((slot) => slot.char === null));
  revealLetter(game);
  const afterMask = maskedAnswer(game.card);
  const revealedCount = afterMask.filter((slot) => slot.char !== null).length;
  assert.equal(revealedCount, 1);
  assert.ok(word.includes(afterMask.find((slot) => slot.char !== null).char));
});

test('checkGuess matches exactly, ignoring case and surrounding whitespace', () => {
  assert.equal(checkGuess('ELEPHANT', 'elephant'), true);
  assert.equal(checkGuess('ELEPHANT', '  Elephant  '), true);
  assert.equal(checkGuess('ELEPHANT', 'ELEPHANTS'), false);
  assert.equal(checkGuess('ELEPHANT', 'ELEPHAN'), false);
  assert.equal(checkGuess('ELEPHANT', ''), false);
});
