'use strict';

/* =========================================================================
   TV link: moves the series list from the phone to the TV page (tv.html).
   There's no server, so the list goes through ntfy.sh (a free public relay)
   for a few hours. It's encrypted on the phone with a key made from the TV's
   pairing code, so the relay only ever sees scrambled text.
   ========================================================================= */

const TvLink = (() => {
  const RELAY = 'https://ntfy.sh/';
  const CHUNK = 3000;                 // ntfy keeps messages under 4096 bytes as plain text
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function newCode() {
    const b = crypto.getRandomValues(new Uint8Array(8));
    const s = Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join('');
    return s.slice(0, 4) + '-' + s.slice(4);
  }
  // "k7p2 qm9x" → "K7P2-QM9X"; returns '' if it isn't a valid code.
  function cleanCode(v) {
    const s = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (s.length !== 8 || [...s].some((c) => !ALPHABET.includes(c))) return '';
    return s.slice(0, 4) + '-' + s.slice(4);
  }

  async function topicFor(code) {
    const h = await crypto.subtle.digest('SHA-256', enc.encode('my-series-topic:' + code));
    return 'myseries-' + Array.from(new Uint8Array(h).slice(0, 12), (x) => x.toString(16).padStart(2, '0')).join('');
  }
  async function keyFor(code) {
    const base = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode('my-series-tv-v1'), iterations: 150000, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  const toB64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
  const fromB64 = (b) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0));

  async function pipe(u8, Stream) {
    const out = new Response(new Blob([u8]).stream().pipeThrough(new Stream('gzip')));
    return new Uint8Array(await out.arrayBuffer());
  }
  const canZip = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

  // The TV only needs what it shows and the link ▶ opens.
  async function send(code, payload) {
    let data = enc.encode(JSON.stringify(payload));
    let flag = 'p';
    if (canZip) { data = await pipe(data, CompressionStream); flag = 'z'; }
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFor(code), data));
    const blob = flag + toB64(iv) + '.' + toB64(ct);
    const parts = [];
    for (let i = 0; i < blob.length; i += CHUNK) parts.push(blob.slice(i, i + CHUNK));
    if (parts.length > 40) throw new Error('too-big');
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const topic = await topicFor(code);
    for (let i = 0; i < parts.length; i++) {
      const res = await fetch(RELAY + topic, { method: 'POST', body: `${id}|${i}|${parts.length}|${parts[i]}` });
      if (!res.ok) throw new Error('relay-' + res.status);
    }
    return parts.length;
  }

  // Returns the newest complete list sent to this code in the last 12 hours, or null.
  async function receive(code) {
    const topic = await topicFor(code);
    const res = await fetch(`${RELAY}${topic}/json?poll=1&since=12h`, { cache: 'no-store' });
    if (!res.ok) throw new Error('relay-' + res.status);
    const lines = (await res.text()).split('\n').filter(Boolean);
    const sets = new Map();
    for (const line of lines) {
      let m; try { m = JSON.parse(line); } catch (e) { continue; }
      if (m.event !== 'message' || typeof m.message !== 'string') continue;
      const [id, i, n, ...rest] = m.message.split('|');
      const part = rest.join('|');
      if (!id || !part || !(+n > 0)) continue;
      if (!sets.has(id)) sets.set(id, { n: +n, time: m.time, parts: [] });
      const s = sets.get(id);
      s.parts[+i] = part;
      s.time = Math.max(s.time, m.time);
    }
    const done = [...sets.entries()]
      .filter(([, s]) => s.parts.filter(Boolean).length === s.n)
      .sort((a, b) => b[1].time - a[1].time);
    if (!done.length) return null;
    const [id, s] = done[0];
    const blob = s.parts.join('');
    const flag = blob[0];
    const [ivB, ctB] = blob.slice(1).split('.');
    let data = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(ivB) }, await keyFor(code), fromB64(ctB)));
    if (flag === 'z') data = await pipe(data, DecompressionStream);
    return { id, time: s.time * 1000, payload: JSON.parse(dec.decode(data)) };
  }

  return { newCode, cleanCode, send, receive };
})();
