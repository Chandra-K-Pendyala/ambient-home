// LG's remote-control service (wss://TV:3001), the one LG's phone app uses. Shared by tv-sync-apps.mjs and
// tv-helper-key.mjs. Keys the TV grants are kept in .lgtv-key.json (git-ignored, readable only by you; never share it).
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// The TV's certificate comes from LG's own authority, so these scripts alone skip the certificate check.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.removeAllListeners('warning');

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEY_FILE = join(ROOT, '.lgtv-key.json');

export function loadKeys() {
  try { return JSON.parse(readFileSync(KEY_FILE, 'utf8')); } catch { return {}; }
}

export function saveKey(name, key) {
  const keys = loadKeys();
  if (keys[name] === key) return;
  keys[name] = key;
  writeFileSync(KEY_FILE, JSON.stringify(keys, null, 1));
  chmodSync(KEY_FILE, 0o600);
}

export function connect(host, permissions) {
  const ws = new WebSocket(`wss://${host}:3001`);
  const waiting = new Map();
  let registered = null;
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'registered' && registered) registered.resolve(msg.payload['client-key']);
    else if (msg.type === 'error' && msg.id === 'register_0' && registered) registered.reject(new Error(msg.error));
    else if (waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id); }
  };
  let n = 0;
  return {
    open: () => new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error(`cannot reach ${host}:3001`)); }),
    register(key) {
      return new Promise((resolve, reject) => {
        registered = { resolve, reject };
        const payload = { forcePairing: false, pairingType: 'PROMPT',
          manifest: { manifestVersion: 1, appVersion: '1.1', permissions } };
        if (key) payload['client-key'] = key;
        ws.send(JSON.stringify({ type: 'register', id: 'register_0', payload }));
        setTimeout(() => reject(new Error('no answer to the prompt on the TV within 90 seconds')), 90000);
      });
    },
    call(uri) {
      const id = `c${++n}`;
      ws.send(JSON.stringify({ type: 'request', id, uri, payload: {} }));
      return new Promise((resolve, reject) => {
        waiting.set(id, (msg) => (msg.type === 'error' ? reject(new Error(`${uri}: ${msg.error}`)) : resolve(msg.payload || {})));
        setTimeout(() => reject(new Error(`${uri}: no reply`)), 20000);
      });
    },
    close: () => ws.close(),
  };
}
