// One-room networking over WebRTC data channels via PeerJS, adapted from
// icon-guess-the-word's room.js (itself adapted from timed-wordy). Only the
// Host ever acts — the Display is a pure render target and never sends a
// game action, so there's no per-connection role/permission system here.

const ID_PREFIX = 'wscramble-room-'; // distinct from the sibling games' prefixes
// No lookalikes (0/O, 1/I/L) so codes survive being shouted across a room.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function randomCode(len = 4) {
  let code = '';
  for (let i = 0; i < len; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeCode(raw) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function peerUnavailable() {
  return typeof window === 'undefined' || typeof window.Peer !== 'function';
}

// By default rooms use the free public PeerJS broker. `?broker=host:port`
// points at a self-hosted peerjs-server instead (also how we test offline).
function peerOptions() {
  const broker = new URLSearchParams(window.location.search).get('broker');
  if (!broker) return { debug: 0 };
  const [host, port] = broker.split(':');
  return {
    host,
    port: Number(port) || (window.location.protocol === 'https:' ? 443 : 80),
    path: '/',
    secure: window.location.protocol === 'https:',
    debug: 0,
  };
}

// Host a room. Calls:
//   onPeers(count)   — connected Display device count changed
//   onError(message) — fatal room error (room keeps out of the game's way)
// Resolves to { code, broadcast(msg), close() }.
// `broadcast` sends whatever object it's given as-is — redaction (stripping
// the answer before sending) is the caller's job (js/main.js), not this
// module's; room.js is a plain transport, not game-aware.
export function hostRoom({ onPeers, onError }, attempt = 0) {
  return new Promise((resolve, reject) => {
    if (peerUnavailable()) {
      reject(new Error('Room service failed to load. Check your connection and reload.'));
      return;
    }
    const code = randomCode();
    const peer = new Peer(ID_PREFIX + code, peerOptions());
    const conns = [];
    let settled = false;

    peer.on('open', () => {
      settled = true;
      resolve({
        code,
        broadcast(msg) {
          const data = JSON.stringify(msg);
          for (const c of conns) {
            if (c.open) c.send(data);
          }
        },
        close() {
          peer.destroy();
        },
      });
    });

    peer.on('connection', (conn) => {
      conn.on('open', () => {
        conns.push(conn);
        onPeers(conns.length);
      });
      conn.on('data', (data) => {
        try {
          const msg = JSON.parse(data);
          if (msg && msg.t === 'bye') drop(); // explicit goodbye beats slow ICE timeouts
        } catch { /* ignore malformed input from strangers */ }
      });
      const drop = () => {
        const i = conns.indexOf(conn);
        if (i === -1) return;
        conns.splice(i, 1);
        onPeers(conns.length);
      };
      conn.on('close', drop);
      conn.on('error', drop);
    });

    peer.on('error', (err) => {
      if (!settled && err.type === 'unavailable-id' && attempt < 5) {
        // Code collision on the broker — roll a new one.
        peer.destroy();
        hostRoom({ onPeers, onError }, attempt + 1).then(resolve, reject);
      } else if (!settled) {
        peer.destroy();
        reject(new Error('Could not reach the room service. A working room is required to play — see README.'));
      } else {
        onError('Room connection lost. Reload this screen to reconnect.');
      }
    });
  });
}

// Join a room as the Display. Calls:
//   onState(state, hostNow) — a redacted snapshot from the Host (no `word`
//                             field) plus the Host's clock at broadcast
//                             time, so the Display can offset-correct its
//                             own timer countdown to match the Host's.
//   onClose(message) — connection ended
// Resolves to { close() }. There is no `send()` — the Display never sends
// a game action, only an optional goodbye on page unload.
export function joinRoom(code, { onState, onClose }) {
  return new Promise((resolve, reject) => {
    if (peerUnavailable()) {
      reject(new Error('Room service failed to load. Check your connection and reload.'));
      return;
    }
    const peer = new Peer(peerOptions());
    let settled = false;

    peer.on('open', () => {
      const conn = peer.connect(ID_PREFIX + normalizeCode(code), { reliable: true });
      conn.on('open', () => {
        settled = true;
        // Closing the tab silently leaves the host waiting on an ICE timeout;
        // say goodbye so it can update its connected-device count right away.
        window.addEventListener('pagehide', () => {
          try { conn.send(JSON.stringify({ t: 'bye' })); } catch { /* leaving anyway */ }
        });
        resolve({
          close() {
            peer.destroy();
          },
        });
      });
      conn.on('data', (data) => {
        try {
          const msg = JSON.parse(data);
          if (msg && msg.t === 'state') onState(msg.state, msg.hostNow);
        } catch { /* ignore */ }
      });
      conn.on('close', () => {
        if (settled) onClose('The host closed the room.');
        peer.destroy();
      });
    });

    peer.on('error', (err) => {
      peer.destroy();
      if (settled) {
        onClose('Room connection lost.');
      } else if (err.type === 'peer-unavailable') {
        reject(new Error(`No room found with code ${normalizeCode(code)}. Double-check it with the host.`));
      } else {
        reject(new Error('Could not reach the room service. Try again in a moment.'));
      }
    });
  });
}
