'use strict';

/* =========================================================================
   TV screen for "הסדרות שלי". Shows the list the phone sent (via tvlink.js)
   as Netflix-style rows: one row per category, scroll down to see them all.
   - Arrows move, OK opens the series link in this same tab (Back returns).
   - Holding OK on a series opens "move to category". The change shows here
     right away and goes back to the phone through the relay; the phone
     applies it the next time it's open and sends the list to all TVs.
   - The floating "קטגוריות" button jumps straight to a row.
   ========================================================================= */

const TV_KEY = 'seriesTracker.tv.v1';
const LONG_PRESS_MS = 600;
const RESEND_MS = 6 * 60 * 60 * 1000; // the relay forgets after 12 hours
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isLink = (u) => typeof u === 'string' && /^https?:\/\/[^\s<>"']+$/i.test(u);
// A series marked as yes with no pasted link: the TV app opens the yes app for it.
const isYes = (s) => /^\s*(yes|יס)/i.test(String(s.platform || ''));
const linkFor = (s) => (isLink(s.url) ? s.url : (isYes(s) ? 'https://www.yes.co.il/' : ''));

let tv = load();
let screen = tv.data ? 'grid' : 'pair';
let pollTimer = null;
let overlay = null; // { kind: 'status' | 'jump', returnTo: element }

function load() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(TV_KEY)); } catch (e) { raw = null; }
  const t = raw && typeof raw === 'object' ? raw : {};
  return {
    code: TvLink.cleanCode(t.code) || TvLink.newCode(),
    data: t.data && Array.isArray(t.data.shows) ? t.data : null,
    // Category changes made here that the phone hasn't confirmed yet: { showId: { status, at } }
    pending: t.pending && typeof t.pending === 'object' ? t.pending : {},
    pendingSentAt: Number.isFinite(t.pendingSentAt) ? t.pendingSentAt : 0,
  };
}
function save() {
  try { localStorage.setItem(TV_KEY, JSON.stringify(tv)); } catch (e) { /* storage full: keep going in memory */ }
}

let toastTimer;
function toast(msg, ms = 4000) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

/* ---------- Data ---------- */
const statusName = (st) => (tv.data.lang === 'en' ? (st.en || st.he) : (st.he || st.en)) || '';
const titleOf = (s) => (tv.data.lang === 'he' && s.alt && /[֐-׿]/.test(s.alt) ? s.alt : s.title);
// The list as the phone sent it, with this TV's unconfirmed changes on top.
function shows() {
  return tv.data.shows.map((s) => {
    const p = s.id && tv.pending[s.id];
    return p ? { ...s, status: p.status, updated: p.at } : s;
  });
}
function rows() {
  const all = shows();
  const byNew = (a, b) => (b.updated || 0) - (a.updated || 0);
  const list = tv.data.statuses
    .map((st) => ({ id: 's:' + st.id, label: statusName(st), color: st.color, shows: all.filter((s) => s.status === st.id).sort(byNew) }))
    .filter((r) => r.shows.length);
  const fav = all.filter((s) => s.fav).sort(byNew);
  if (fav.length) list.splice(1, 0, { id: 'fav', label: 'מועדפים ★', color: '#ffc53d', shows: fav });
  return list;
}
// When a new list arrives, drop the changes the phone already has.
function prunePending() {
  for (const [id, p] of Object.entries(tv.pending)) {
    const s = tv.data.shows.find((x) => x.id === id);
    if (!s || (s.updated || 0) >= p.at || !tv.data.statuses.some((st) => st.id === p.status)) delete tv.pending[id];
  }
}

/* ---------- Render ---------- */
let currentRows = [];
function render() {
  $('#updateBtn').hidden = !tv.data;
  $('#jumpBtn').hidden = screen !== 'grid' || !tv.data;
  $('#hint').hidden = screen !== 'grid' || !tv.data;
  if (screen === 'pair' || !tv.data) return renderPair();
  currentRows = rows();
  $('#main').innerHTML = currentRows.length
    ? currentRows.map((r, ri) => `
      <section class="tv-row" id="row-${ri}" data-row="${ri}">
        <h2 class="tv-row-title" style="--c:${esc(r.color)}">${esc(r.label)}<span class="n">${r.shows.length}</span></h2>
        <div class="tv-track">${r.shows.map((s, i) => cardHTML(s, ri, i)).join('')}</div>
      </section>`).join('')
    : '<div class="tv-empty"><p>אין עדיין סדרות ברשימה.</p></div>';
}
function cardHTML(s, ri, i) {
  const title = titleOf(s);
  const meta = [s.season ? `עונה ${s.season}` : '', s.platform].filter(Boolean).join(' · ');
  return `
    <button type="button" class="tv-card" data-nav data-r="${ri}" data-i="${i}" data-id="${esc(s.id || '')}">
      <div class="tv-poster">
        ${s.img ? `<img src="${esc(s.img)}" alt="" loading="lazy">` : esc(title)}
        ${s.season ? `<span class="tv-badge">S${s.season}</span>` : ''}
        ${linkFor(s) ? '' : '<span class="tv-nolink">אין קישור</span>'}
        ${s.id && tv.pending[s.id] ? '<span class="tv-pending" title="ממתין לטלפון">⟳</span>' : ''}
      </div>
      <div class="tv-title">${esc(title)}</div>
      ${meta ? `<div class="tv-meta">${esc(meta)}</div>` : ''}
    </button>`;
}
function renderPair() {
  const back = tv.data ? '<button type="button" class="tv-btn" data-nav data-back>חזרה לרשימה</button>' : '';
  $('#main').innerHTML = `
    <div class="tv-empty">
      <h2>${tv.data ? 'הקוד של הטלוויזיה' : 'בוא נעביר את הרשימה מהטלפון'}</h2>
      <p>בטלפון: באפליקציה פותחים <b>הגדרות ← טלוויזיה</b>, מקלידים את הקוד ולוחצים <b>שליחה לטלוויזיה</b>.</p>
      <div class="tv-code">${esc(tv.code)}</div>
      <p>הקוד קבוע. מעכשיו הטלפון שולח לבד בכל פתיחה של האפליקציה.</p>
      <div><button type="button" class="tv-btn primary" data-nav data-check>בדיקה עכשיו</button>${back}</div>
    </div>`;
  focusFirst();
}
const showOf = (card) => currentRows[+card.dataset.r] && currentRows[+card.dataset.r].shows[+card.dataset.i];

/* ---------- Overlays: move to category / jump to row ---------- */
function openStatusMenu(card) {
  const s = showOf(card);
  if (!s) return;
  if (!s.id) { toast('כדי לשנות קטגוריה מהטלוויזיה, פתח פעם אחת את האפליקציה בטלפון.', 6000); return; }
  const items = tv.data.statuses.map((st) => `
    <button type="button" class="tv-opt" data-nav data-set="${esc(st.id)}" aria-current="${st.id === s.status}" style="--c:${esc(st.color)}">
      <span class="dot"></span>${esc(statusName(st))}${st.id === s.status ? '<span class="cur">עכשיו</span>' : ''}</button>`).join('');
  openOverlay('status', card, `
    <h2>להעביר את <b>${esc(titleOf(s))}</b> ל…</h2>
    ${linkFor(s) ? '<button type="button" class="tv-opt watch" data-nav data-watch>▶ צפייה</button>' : ''}
    <div class="tv-opts">${items}</div>`, s.id);
}
function openJumpMenu() {
  const returnTo = document.activeElement;
  const items = currentRows.map((r, ri) => `
    <button type="button" class="tv-opt" data-nav data-jump="${ri}" style="--c:${esc(r.color)}">
      <span class="dot"></span>${esc(r.label)}<span class="cur">${r.shows.length}</span></button>`).join('');
  openOverlay('jump', returnTo, `<h2>קפיצה לקטגוריה</h2><div class="tv-opts">${items}</div>`);
}
function openOverlay(kind, returnTo, html, showId = '') {
  const box = $('#overlay');
  box.innerHTML = `<div class="tv-sheet" role="dialog" aria-modal="true">${html}</div>`;
  box.hidden = false;
  overlay = { kind, returnTo, showId };
  const first = (kind === 'status' && (box.querySelector('[aria-current="true"]') || box.querySelector('[data-nav]'))) || box.querySelector('[data-nav]');
  if (first) first.focus();
  // Jump menu: start on the row you're in.
  if (kind === 'jump' && returnTo && returnTo.dataset && returnTo.dataset.r) {
    const here = box.querySelector(`[data-jump="${returnTo.dataset.r}"]`);
    if (here) here.focus();
  }
}
function closeOverlay(refocus = true) {
  const o = overlay;
  $('#overlay').hidden = true; $('#overlay').innerHTML = '';
  overlay = null;
  if (refocus && o && o.returnTo && document.contains(o.returnTo)) o.returnTo.focus({ preventScroll: true });
}

function setStatus(showId, status) {
  const orig = tv.data.shows.find((s) => s.id === showId);
  if (!orig) return;
  const st = tv.data.statuses.find((x) => x.id === status);
  if (orig.status === status && !tv.pending[showId]) { closeOverlay(); return; }
  if (orig.status === status) delete tv.pending[showId]; // back to what the phone has
  else tv.pending[showId] = { status, at: Date.now() };
  save();
  closeOverlay(false);
  render();
  focusShow(showId, 's:' + status);
  toast(`"${titleOf(orig)}" עברה ל${st ? statusName(st) : ''}. נשלח לטלפון…`);
  sendPending();
}
let sendingBack = false;
async function sendPending({ quiet = false } = {}) {
  if (sendingBack) return;
  const changes = Object.entries(tv.pending).map(([id, p]) => ({ id, status: p.status, at: p.at }));
  if (!changes.length) return;
  sendingBack = true;
  try {
    await TvLink.sendBack(tv.code, { v: 1, changes });
    tv.pendingSentAt = Date.now(); save();
    if (!quiet) toast('נשלח. הטלפון יעדכן את זה כשהאפליקציה בו תיפתח.');
  } catch (err) {
    if (!quiet) toast('לא הצלחתי לשלוח לטלפון. אנסה שוב אוטומטית.', 5000);
  } finally {
    sendingBack = false;
  }
}

/* ---------- Receiving ---------- */
let checking = false;
async function check({ quiet = false } = {}) {
  if (checking) return 'busy';
  checking = true;
  try {
    const got = await TvLink.receive(tv.code);
    const p = got && got.payload;
    if (!p || !Array.isArray(p.shows) || !Array.isArray(p.statuses)) {
      if (!quiet) toast('עדיין לא הגיעה רשימה. פתח את האפליקציה בטלפון ונסה שוב.');
      return 'none';
    }
    if (tv.data && p.sentAt <= (tv.data.sentAt || 0)) {
      if (!quiet) toast('הרשימה כבר מעודכנת.');
      return 'same';
    }
    // The phone re-sends now and then even with no change: don't redraw for that.
    const body = (d) => JSON.stringify({ ...d, sentAt: 0 });
    const before = JSON.stringify(tv.pending);
    if (tv.data && screen === 'grid' && body(p) === body(tv.data)) {
      tv.data = p; prunePending(); save();
      if (JSON.stringify(tv.pending) !== before && !overlay) redrawKeepingFocus();
      if (!quiet) toast('הרשימה כבר מעודכנת.');
      return 'same';
    }
    tv.data = p; prunePending(); save();
    const wasPair = screen === 'pair';
    screen = 'grid';
    if (overlay) closeOverlay(false);
    if (wasPair) { render(); focusFirst(); } else redrawKeepingFocus();
    toast(`הרשימה עודכנה: ${p.shows.length} סדרות`);
    return 'new';
  } catch (err) {
    if (!quiet) toast('לא הצלחתי להתחבר. בדוק שיש אינטרנט בטלוויזיה.');
    return 'error';
  } finally {
    checking = false;
  }
}
function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(() => { if (screen === 'pair') check({ quiet: true }); else clearInterval(pollTimer); }, 5000);
}

/* ---------- Focus ---------- */
const FOCUS_KEY = 'tvFocus.v2';
function rememberFocus(card) {
  try { sessionStorage.setItem(FOCUS_KEY, JSON.stringify({ id: card.dataset.id, row: currentRows[+card.dataset.r] && currentRows[+card.dataset.r].id, i: +card.dataset.i, r: +card.dataset.r })); } catch (e) { /* ignore */ }
}
function focusCard(card, smooth = false) {
  card.focus({ preventScroll: true });
  revealCard(card, smooth);
}
function revealCard(card, smooth) {
  const behavior = smooth ? 'smooth' : 'auto';
  const track = card.parentElement;
  // Horizontal: keep the card inside its row.
  const t = track.getBoundingClientRect(), c = card.getBoundingClientRect();
  const pad = t.width * 0.06;
  if (c.left < t.left + pad) track.scrollBy({ left: c.left - t.left - pad, behavior });
  else if (c.right > t.right - pad) track.scrollBy({ left: c.right - t.right + pad, behavior });
  // Vertical: put the row near the top, under the header.
  const row = card.closest('.tv-row');
  const top = row.getBoundingClientRect().top + window.scrollY - $('.tv-top').offsetHeight - 8;
  window.scrollTo({ top: Math.max(0, top), behavior });
}
function focusShow(id, rowId) {
  const cards = [...document.querySelectorAll('.tv-card')];
  const card = cards.find((c) => c.dataset.id === id && currentRows[+c.dataset.r].id === rowId) || cards.find((c) => c.dataset.id === id);
  if (card) focusCard(card); else focusFirst();
}
function focusFirst() {
  if (screen === 'grid') {
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(FOCUS_KEY)); } catch (e) { saved = null; }
    const cards = [...document.querySelectorAll('.tv-card')];
    let target = null;
    if (saved) {
      target = cards.find((c) => saved.id && c.dataset.id === saved.id && currentRows[+c.dataset.r].id === saved.row)
        || cards.find((c) => saved.id && c.dataset.id === saved.id)
        || cards.find((c) => +c.dataset.r === saved.r && +c.dataset.i === saved.i);
    }
    target = target || cards[0];
    if (target) { focusCard(target); return; }
  }
  const t = $('[data-check]') || navItems()[0];
  if (t) t.focus();
}
function redrawKeepingFocus() {
  const cur = document.activeElement;
  const id = cur && cur.classList.contains('tv-card') ? cur.dataset.id : null;
  const rowId = id ? currentRows[+cur.dataset.r].id : null;
  const scroll = window.scrollY;
  render();
  if (id) focusShow(id, rowId);
  else { window.scrollTo(0, scroll); if (!document.activeElement || document.activeElement === document.body) focusFirst(); }
}

/* ---------- Remote control (arrows + OK) ---------- */
const navItems = () => {
  const scope = overlay ? $('#overlay') : document;
  return [...scope.querySelectorAll('[data-nav]')].filter((e) => !e.hidden && e.offsetParent !== null && (overlay || !e.closest('#overlay')));
};
function move(dir) {
  const cur = document.activeElement;
  // Inside a menu: a simple list, up/down.
  if (overlay) {
    const items = navItems();
    const i = items.indexOf(cur);
    if (i < 0) { if (items[0]) items[0].focus(); return; }
    const step = dir === 'down' || dir === 'left' ? 1 : -1;
    const next = items[i + step];
    if (next) { next.focus(); next.scrollIntoView({ block: 'nearest' }); }
    return;
  }
  if (screen === 'grid' && cur && cur.classList.contains('tv-card')) {
    const r = +cur.dataset.r, i = +cur.dataset.i;
    const rowCards = (ri) => [...document.querySelectorAll(`.tv-card[data-r="${ri}"]`)];
    // Right-to-left rows: "left" goes further along the row.
    if (dir === 'left' || dir === 'right') {
      const next = rowCards(r)[i + (dir === 'left' ? 1 : -1)];
      if (next) focusCard(next, true);
      else $('#jumpBtn').focus(); // edge of the row → the categories button
      return;
    }
    const ri = r + (dir === 'down' ? 1 : -1);
    const cards = rowCards(ri);
    if (!cards.length) {
      if (dir === 'up') { $('#jumpBtn').focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      return;
    }
    // Same spot on screen in the next row.
    const x = cur.getBoundingClientRect().left;
    let best = cards[0], bestD = Infinity;
    for (const c of cards) {
      const d = Math.abs(c.getBoundingClientRect().left - x);
      if (d < bestD) { bestD = d; best = c; }
    }
    focusCard(best, true);
    return;
  }
  // Header / buttons: nearest thing in that direction.
  const items = navItems();
  if (!items.includes(cur)) { focusFirst(); return; }
  if (cur.id === 'jumpBtn' || cur.id === 'updateBtn') {
    if (dir === 'down' || (cur.id === 'jumpBtn' && dir === 'right')) { focusFirst(); return; }
    if (dir === 'left' && cur.id === 'jumpBtn') { $('#updateBtn').focus(); return; }
    if (dir === 'right' && cur.id === 'updateBtn') { $('#jumpBtn').focus(); return; }
    return;
  }
  const a = cur.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bestScore = Infinity;
  for (const el of items) {
    if (el === cur) continue;
    const b = el.getBoundingClientRect();
    const dx = b.left + b.width / 2 - ax, dy = b.top + b.height / 2 - ay;
    let main, side;
    if (dir === 'left') { main = -dx; side = Math.abs(dy); }
    else if (dir === 'right') { main = dx; side = Math.abs(dy); }
    else if (dir === 'up') { main = -dy; side = Math.abs(dx); }
    else { main = dy; side = Math.abs(dx); }
    if (main <= 4) continue;
    const score = main + side * 2.5;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) best.focus();
}

function watch(card) {
  const s = showOf(card);
  if (!s) return;
  rememberFocus(card);
  if (linkFor(s)) location.href = linkFor(s);
  else toast('אין קישור לסדרה הזו. החזק OK כדי להעביר קטגוריה, או הוסף קישור בטלפון.', 5000);
}

const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Left: 'left', Right: 'right', Up: 'up', Down: 'down' };
const isOk = (e) => e.key === 'Enter' || e.keyCode === 23 || e.keyCode === 13;
const isBack = (e) => e.key === 'Backspace' || e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack';
let press = null; // OK held on a card: { card, timer, long }

document.addEventListener('keydown', (e) => {
  // OK still held after the menu opened: those repeats must not pick an option.
  if (press && isOk(e)) { e.preventDefault(); return; }
  const dir = KEYS[e.key];
  if (dir) { e.preventDefault(); if (!press) move(dir); return; }
  if (overlay && isBack(e)) { e.preventDefault(); closeOverlay(); return; }
  if (!overlay && (e.key === 'ContextMenu' || e.keyCode === 82)) { // the remote's menu key, if it has one
    const c = document.activeElement;
    if (c && c.classList.contains('tv-card')) { e.preventDefault(); openStatusMenu(c); }
    return;
  }
  if (isOk(e) && !overlay) {
    const card = document.activeElement && document.activeElement.closest('.tv-card');
    if (card) {
      // Short press = watch, long press = move to category. Handled on key up, not as a click.
      e.preventDefault();
      if (e.repeat || press) return;
      press = { card, long: false, timer: setTimeout(() => { press.long = true; openStatusMenu(card); }, LONG_PRESS_MS) };
      return;
    }
  }
  if (isBack(e) && screen === 'pair' && tv.data) {
    e.preventDefault(); screen = 'grid'; render(); focusFirst();
  }
});
document.addEventListener('keyup', (e) => {
  if (!press || !isOk(e)) return;
  e.preventDefault();
  clearTimeout(press.timer);
  const { card, long } = press;
  press = null;
  if (!long) watch(card);
});

/* ---------- Clicks (mouse/touch, and OK inside menus) ---------- */
document.addEventListener('click', (e) => {
  if (overlay) {
    const set = e.target.closest('[data-set]');
    if (set) { setStatus(overlay.showId, set.dataset.set); return; }
    if (e.target.closest('[data-watch]')) { const c = overlay.returnTo; closeOverlay(false); if (c) watch(c); return; }
    const jump = e.target.closest('[data-jump]');
    if (jump) {
      closeOverlay(false);
      const card = document.querySelector(`.tv-card[data-r="${jump.dataset.jump}"][data-i="0"]`);
      if (card) { card.parentElement.scrollLeft = 0; focusCard(card, true); }
      return;
    }
    if (e.target === $('#overlay')) closeOverlay();
    return;
  }
  const card = e.target.closest('.tv-card');
  if (card) { watch(card); return; }
  if (e.target.closest('#jumpBtn')) { openJumpMenu(); return; }
  if (e.target.closest('[data-check]')) { check(); return; }
  if (e.target.closest('[data-back]')) { screen = 'grid'; render(); focusFirst(); return; }
  if (e.target.closest('#updateBtn')) {
    check().then((r) => { if (r === 'none') { screen = 'pair'; render(); startPolling(); } });
  }
});
// Touch/mouse: long press on a card also opens the menu.
document.addEventListener('contextmenu', (e) => {
  const card = e.target.closest('.tv-card');
  if (card && !overlay) { e.preventDefault(); openStatusMenu(card); }
});

// Coming back with the remote's Back button may restore this page from cache.
window.addEventListener('pageshow', () => { if (screen === 'grid' && !overlay) { focusFirst(); check({ quiet: true }); } });
// Back on screen (e.g. returning from a show): look for a newer list.
document.addEventListener('visibilitychange', () => { if (!document.hidden && screen === 'grid') check({ quiet: true }); });
// While the list is showing, quietly check for updates from the phone every 20 seconds,
// and keep unconfirmed changes alive on the relay until the phone takes them.
setInterval(() => {
  if (document.hidden) return;
  if (screen === 'grid') check({ quiet: true });
  if (Object.keys(tv.pending).length && Date.now() - tv.pendingSentAt > RESEND_MS) sendPending({ quiet: true });
}, 20000);

save();
render();
if (screen === 'pair') startPolling();
else {
  focusFirst();
  check({ quiet: true });
  if (Object.keys(tv.pending).length && Date.now() - tv.pendingSentAt > RESEND_MS) sendPending({ quiet: true });
}
