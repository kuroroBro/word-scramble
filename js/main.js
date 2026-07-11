import {
  PHASE, TIMER_STATUS, createGame, startGame, revealLetter, awardPoint, skipPuzzle,
  maskedAnswer, startTimer, checkTimerExpired, timerRemainingMs,
} from './game.js';
import { CATEGORIES } from './words.js';
import { loadSettings, saveSettings } from './storage.js';
import { hostRoom, joinRoom, normalizeCode } from './room.js';

const $ = (id) => document.getElementById(id);

const SCREENS = [
  'screen-home', 'screen-setup', 'screen-host-lobby',
  'screen-host-panel', 'screen-display', 'screen-gameover',
];

function showScreen(id) {
  for (const s of SCREENS) $(s).hidden = s !== id;
}

function categoryName(id) {
  return CATEGORIES.find((c) => c.id === id)?.name || id;
}

// ---------- module state ----------
let settings = loadSettings();
let selectedCategoryIds = new Set(settings.categoryIds);
let game = null;        // Host: full state. Display: last redacted snapshot received.
let room = null;        // { code, broadcast, close } (host) or { close } (display)
let role = null;        // 'host' | 'display'
let peerCount = 0;
let clockOffset = 0;    // Display only: hostNow - Date.now() at last snapshot

// ---------- shared render helpers (scrambled letters / answer tiles) ----------
// Every card's scramble is a plain array of single-character strings — see
// game.js's scrambleWord. Rendered as face-up "card" tiles, always visible
// (the scramble itself is never secret, only the correctly-ordered answer
// underneath it is — see redactState below).
function renderScramble(container, scramble) {
  container.innerHTML = '';
  const suits = ['♠', '♥', '♦', '♣'];
  (scramble || []).forEach((letter, i) => {
    const tile = document.createElement('div');
    tile.className = 'scramble-tile';
    tile.innerHTML = `<span class="scramble-pip">${suits[i % suits.length]}</span>${letter}`;
    container.appendChild(tile);
  });
}

// Takes the *masked* array ({char, isSpace}[]) from game.js's maskedAnswer,
// not the raw card — this is what keeps the Display's render path identical
// whether it's driven by the Host's own card or a redacted network snapshot.
function renderTiles(container, masked) {
  container.innerHTML = '';
  if (!masked || masked.length === 0) return;
  let group = document.createElement('div');
  group.className = 'tile-word-group';
  container.appendChild(group);
  for (const { char, isSpace } of masked) {
    if (isSpace) {
      group = document.createElement('div');
      group.className = 'tile-word-group';
      container.appendChild(group);
      continue;
    }
    const tile = document.createElement('div');
    tile.className = 'letter-tile' + (char ? ' revealed' : '');
    tile.textContent = char || '';
    group.appendChild(tile);
  }
}

// ---------- redaction: what the Display is allowed to see ----------
// The Host never sends the raw word. `masked` only ever contains letters
// that have already been revealed (plus spaces, which are never secret) —
// so there is nothing for a curious Display-side devtools session to find.
// `scramble` is sent as-is: it's the puzzle everyone's meant to see, not a
// secret.
function redactState(state) {
  return {
    phase: state.phase,
    hintsEnabled: state.hintsEnabled,
    // Timer fields are never secret — safe to send as-is. The Display uses
    // these plus its own clock-offset (see hostNow below) to render an
    // independently-ticking countdown, not a value pushed every animation
    // frame over the network.
    timerSeconds: state.timerSeconds,
    timerStatus: state.timerStatus,
    timerDeadline: state.timerDeadline,
    targetScore: state.targetScore, // not secret either — just a number
    teams: state.teams,
    winner: state.winner,
    card: state.card
      ? {
        scramble: state.card.scramble,
        categoryId: state.card.categoryId,
        masked: maskedAnswer(state.card),
      }
      : null,
  };
}

function broadcastState() {
  if (room && role === 'host') {
    room.broadcast({ t: 'state', state: redactState(game), hostNow: Date.now() });
  }
}

// ---------- confetti (small, dependency-free) ----------
const CONFETTI_COLORS = ['#d64545', '#2f6fed', '#f4c542', '#3fae6b'];

function confettiBurst(side) {
  for (let i = 0; i < 24; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const originX = side === 'left' ? Math.random() * 30 : 70 + Math.random() * 30;
    piece.style.left = originX + 'vw';
    piece.style.animationDuration = (1.1 + Math.random() * 0.8) + 's';
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 2200);
  }
}

function bumpPlaque(team) {
  const el = $(`display-plaque-${team}`);
  el.classList.remove('bump');
  void el.offsetWidth; // restart the animation
  el.classList.add('bump');
  confettiBurst(team === 'a' ? 'left' : 'right');
}

// ---------- timer display (Host and Display both repaint independently
// from their own clock — nothing is pushed over the wire every tick) ----------
function updateTimerDisplay(el, remainingMs) {
  el.textContent = String(Math.ceil(remainingMs / 1000));
  el.classList.toggle('timer-urgent', remainingMs > 0 && remainingMs <= 10_000);
}

// ==================================================================
// HOME
// ==================================================================
$('btn-how-to-play').addEventListener('click', () => {
  $('dialog-how-to-play').showModal();
});

$('btn-close-how-to-play').addEventListener('click', () => {
  $('dialog-how-to-play').close();
});

$('btn-host').addEventListener('click', () => {
  selectedCategoryIds = new Set(settings.categoryIds);
  renderCategoryChips();
  $('input-team-a').value = settings.teamNames.a;
  $('input-team-b').value = settings.teamNames.b;
  $('input-hints').checked = settings.hintsEnabled;
  $('input-timer').value = String(settings.timerSeconds || 0);
  $('input-target-score').value = String(settings.targetScore || 0);
  $('setup-error').hidden = true;
  showScreen('screen-setup');
});

$('btn-join').addEventListener('click', () => {
  const code = normalizeCode($('input-join-code').value);
  $('home-error').hidden = true;
  if (!code) {
    $('home-error').hidden = false;
    $('home-error').textContent = 'Enter the 4-letter room code from the Host.';
    return;
  }
  $('btn-join').disabled = true;
  joinRoom(code, { onState: handleDisplayState, onClose: handleDisplayClose })
    .then((result) => {
      $('btn-join').disabled = false;
      room = result;
      role = 'display';
      game = null;
      resetDisplayView();
      showScreen('screen-display');
    })
    .catch((err) => {
      $('btn-join').disabled = false;
      $('home-error').hidden = false;
      $('home-error').textContent = err.message;
    });
});

// ==================================================================
// SETUP
// ==================================================================
function renderCategoryChips() {
  const container = $('category-chips');
  container.innerHTML = '';
  for (const cat of CATEGORIES) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (selectedCategoryIds.has(cat.id) ? ' selected' : '');
    chip.textContent = cat.name;
    chip.addEventListener('click', () => {
      if (selectedCategoryIds.has(cat.id)) selectedCategoryIds.delete(cat.id);
      else selectedCategoryIds.add(cat.id);
      chip.classList.toggle('selected');
    });
    container.appendChild(chip);
  }
}

$('btn-setup-back').addEventListener('click', () => showScreen('screen-home'));

$('btn-start-room').addEventListener('click', () => {
  if (selectedCategoryIds.size === 0) {
    $('setup-error').hidden = false;
    $('setup-error').textContent = 'Pick at least one category.';
    return;
  }
  settings = {
    categoryIds: [...selectedCategoryIds],
    hintsEnabled: $('input-hints').checked,
    timerSeconds: Number($('input-timer').value),
    targetScore: Number($('input-target-score').value),
    teamNames: {
      a: $('input-team-a').value.trim() || 'Team A',
      b: $('input-team-b').value.trim() || 'Team B',
    },
  };
  saveSettings(settings);
  game = createGame(settings, CATEGORIES);
  role = 'host';

  $('btn-start-room').disabled = true;
  $('setup-error').hidden = true;
  hostRoom({ onPeers: handlePeers, onError: handleHostRoomError })
    .then((result) => {
      $('btn-start-room').disabled = false;
      room = result;
      peerCount = 0;
      $('room-code').textContent = room.code;
      $('room-peers').textContent = '0';
      $('host-lobby-error').hidden = true;
      showScreen('screen-host-lobby');
    })
    .catch((err) => {
      $('btn-start-room').disabled = false;
      $('setup-error').hidden = false;
      $('setup-error').textContent = err.message;
    });
});

// ==================================================================
// HOST LOBBY (room open, game not started yet)
// ==================================================================
function handlePeers(count) {
  peerCount = count;
  $('room-peers').textContent = String(count);
  $('host-peers').textContent = count > 0 ? `${count} connected` : 'Display not connected';
  // A freshly-joined Display has nothing until the next broadcast — send one
  // immediately so it doesn't wait for the Host's next action.
  broadcastState();
}

function handleHostRoomError(message) {
  $('host-lobby-error').hidden = false;
  $('host-lobby-error').textContent = message;
}

$('btn-copy-code').addEventListener('click', () => {
  if (!room) return;
  navigator.clipboard?.writeText(room.code).then(() => {
    const btn = $('btn-copy-code');
    const original = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = original; }, 1500);
  }).catch(() => { /* clipboard permission denied — code is visible on screen anyway */ });
});

$('btn-start-game').addEventListener('click', () => {
  startGame(game);
  renderHostPanel();
  showScreen('screen-host-panel');
  broadcastState();
});

// ==================================================================
// HOST CONTROL PANEL
// ==================================================================
function renderHostPanel() {
  const card = game.card;
  $('host-category').textContent = card ? categoryName(card.categoryId) : '';
  $('host-target').hidden = !game.targetScore;
  if (game.targetScore) $('host-target').textContent = `First to ${game.targetScore}`;
  $('host-room-code').textContent = room ? room.code : '';
  $('host-peers').textContent = peerCount > 0 ? `${peerCount} connected` : 'Display not connected';
  $('host-score-a').textContent = game.teams.a.score;
  $('host-score-b').textContent = game.teams.b.score;
  $('host-answer').textContent = card ? card.word : '';
  renderScramble($('host-scramble'), card?.scramble);
  renderTiles($('host-tiles'), maskedAnswer(card));
  $('btn-reveal-letter').hidden = !game.hintsEnabled;
  $('award-a-name').textContent = game.teams.a.name;
  $('award-b-name').textContent = game.teams.b.name;

  const timerWrap = $('host-timer-wrap');
  timerWrap.hidden = !game.timerSeconds;
  if (game.timerSeconds) {
    updateTimerDisplay($('host-timer'), timerRemainingMs(game, Date.now()));
    $('btn-start-timer').disabled = game.timerStatus === TIMER_STATUS.RUNNING;
  }
}

function afterHostAction() {
  if (game.phase === PHASE.GAMEOVER) {
    renderGameOver();
    showScreen('screen-gameover');
  } else {
    renderHostPanel();
  }
  broadcastState();
}

$('btn-reveal-letter').addEventListener('click', () => {
  if (revealLetter(game)) renderHostPanel();
  broadcastState();
});

$('btn-start-timer').addEventListener('click', () => {
  if (startTimer(game, Date.now())) {
    renderHostPanel();
    broadcastState();
  }
});

// The Host's clock is the only authority on timer expiry. Both roles
// otherwise just repaint their own countdown digits every tick from their
// own clock — nothing is pushed over the network except when the game
// state actually changes (timer started, or a card dealt). See
// timerTick() below.

$('btn-skip').addEventListener('click', () => {
  skipPuzzle(game);
  afterHostAction();
});

$('btn-award-a').addEventListener('click', () => {
  awardPoint(game, 'a');
  afterHostAction();
});

$('btn-award-b').addEventListener('click', () => {
  awardPoint(game, 'b');
  afterHostAction();
});

// ==================================================================
// GAME OVER (host)
// ==================================================================
function renderGameOver() {
  const { a, b } = game.teams;
  $('winner-title').textContent = game.winner == null
    ? "It's a draw!"
    : `${game.teams[game.winner].name} wins!`;
  const scores = $('final-scores');
  scores.innerHTML = '';
  for (const t of [a, b]) {
    const span = document.createElement('span');
    span.textContent = `${t.name}: ${t.score}`;
    scores.appendChild(span);
  }
}

$('btn-play-again').addEventListener('click', () => {
  game = createGame(settings, CATEGORIES);
  startGame(game);
  renderHostPanel();
  showScreen('screen-host-panel');
  broadcastState();
});

// ==================================================================
// DISPLAY
// ==================================================================
function resetDisplayView() {
  $('display-name-a').textContent = settings.teamNames.a;
  $('display-name-b').textContent = settings.teamNames.b;
  $('display-score-a').textContent = '0';
  $('display-score-b').textContent = '0';
  $('display-category').textContent = '';
  $('display-target').hidden = true;
  $('display-timer').hidden = true;
  $('display-scramble').classList.remove('scramble-blurred');
  $('display-waiting').hidden = false;
  $('display-playing').hidden = true;
  $('display-gameover').hidden = true;
}

function handleDisplayState(state, hostNow) {
  game = state; // so the shared tick loop below can keep the timer ticking between snapshots
  clockOffset = (hostNow ?? Date.now()) - Date.now();

  const prevA = Number($('display-score-a').textContent) || 0;
  const prevB = Number($('display-score-b').textContent) || 0;

  $('display-name-a').textContent = state.teams.a.name;
  $('display-name-b').textContent = state.teams.b.name;
  $('display-score-a').textContent = state.teams.a.score;
  $('display-score-b').textContent = state.teams.b.score;
  if (state.teams.a.score > prevA) bumpPlaque('a');
  if (state.teams.b.score > prevB) bumpPlaque('b');

  $('display-category').textContent = state.card ? categoryName(state.card.categoryId) : '';
  $('display-target').hidden = !state.targetScore;
  if (state.targetScore) $('display-target').textContent = `First to ${state.targetScore}`;

  const waiting = $('display-waiting');
  const playing = $('display-playing');
  const over = $('display-gameover');
  const timerEl = $('display-timer');

  if (state.phase === PHASE.PLAYING && state.card) {
    waiting.hidden = true;
    playing.hidden = false;
    over.hidden = true;
    timerEl.hidden = !state.timerSeconds;
    if (state.timerSeconds) {
      updateTimerDisplay(timerEl, timerRemainingMs(state, Date.now() + clockOffset));
    }
    renderScramble($('display-scramble'), state.card.scramble);
    renderTiles($('display-tiles'), state.card.masked);
    // Blur the scrambled letters until the Host actually starts the timer
    // for this card — stops teams from getting a head start while the Host
    // is still setting up the round. Only applies when a timer is
    // configured at all; without one there's no "not started yet" moment,
    // so the scramble shows immediately (unchanged from before this existed).
    const scrambleBlocked = state.timerSeconds && state.timerStatus === TIMER_STATUS.PAUSED;
    $('display-scramble').classList.toggle('scramble-blurred', scrambleBlocked);
  } else if (state.phase === PHASE.GAMEOVER) {
    waiting.hidden = true;
    playing.hidden = true;
    over.hidden = false;
    $('display-winner-title').textContent = state.winner == null
      ? "It's a draw!"
      : `${state.teams[state.winner].name} wins!`;
  } else {
    waiting.hidden = false;
    playing.hidden = true;
    over.hidden = true;
  }
}

function handleDisplayClose(message) {
  $('home-error').hidden = false;
  $('home-error').textContent = message;
  showScreen('screen-home');
}

// ==================================================================
// SHARED TICK — repaints the countdown every 250ms on whichever role is
// active. Only the Host's tick can mutate state (checkTimerExpired); the
// Display only ever repaints from the last snapshot + its clock offset.
// ==================================================================
setInterval(() => {
  if (!game || game.phase !== PHASE.PLAYING || !game.timerSeconds) return;

  if (role === 'host') {
    if (checkTimerExpired(game, Date.now())) {
      afterHostAction();
    } else {
      updateTimerDisplay($('host-timer'), timerRemainingMs(game, Date.now()));
    }
  } else if (role === 'display') {
    updateTimerDisplay($('display-timer'), timerRemainingMs(game, Date.now() + clockOffset));
  }
}, 250);

showScreen('screen-home');
