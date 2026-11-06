'use strict';

/* =========================================================================
   TV screen for "הסדרות שלי". Read-only: shows the list the phone sent
   (via tvlink.js) as big posters. Arrows move, OK opens the series link in
   this same tab, so the remote's Back button returns here.
   ========================================================================= */

const TV_KEY = 'seriesTracker.tv.v1';
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isLink = (u) => typeof u === 'string' && /^https?:\/\/[^\s<>"']+$/i.test(u);

let tv = load();
let screen = tv.data ? 'grid' : 'pair';
let pollTimer = null;

function load() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(TV_KEY)); } catch (e) { raw = null; }
  const t = raw && typeof raw === 'object' ? raw : {};
  return {
    code: TvLink.cleanCode(t.code) || TvLink.newCode(),
    data: t.data && Array.isArray(t.data.shows) ? t.data : null,
    tab: typeof t.tab === 'string' ? t.tab : '',
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
function tabs() {
  const shows = tv.data.shows;
  const list = tv.data.statuses
    .map((st) => ({ id: 's:' + st.id, label: statusName(st), color: st.color, n: shows.filter((s) => s.status === st.id).length }))
    .filter((t) => t.n > 0);
  const fav = shows.filter((s) => s.fav).length;
  if (fav) list.splice(1, 0, { id: 'fav', label: 'מועדפים ★', color: '#ffc53d', n: fav });
  return list;
}
function showsFor(tab) {
  const shows = tv.data.shows.filter((s) => (tab === 'fav' ? s.fav : 's:' + s.status === tab));
  return shows.sort((a, b) => (b.updated || 0) - (a.updated || 0));
}

/* ---------- Render ---------- */
function render() {
  $('#updateBtn').hidden = !tv.data;
  if (screen === 'pair' || !tv.data) return renderPair();
  const list = tabs();
  if (!list.some((t) => t.id === tv.tab)) tv.tab = (list.find((t) => t.id === 's:watching') || list[0] || {}).id || '';
  $('#tabs').innerHTML = list.map((t) => `
    <button type="button" class="tv-tab" data-nav data-tab="${esc(t.id)}" aria-pressed="${t.id === tv.tab}" style="--c:${esc(t.color)}">${esc(t.label)}<span class="n">${t.n}</span></button>`).join('');
  const shows = showsFor(tv.tab);
  $('#main').innerHTML = shows.length
    ? `<div class="tv-grid">${shows.map((s, i) => cardHTML(s, i)).join('')}</div>`
    : '<div class="tv-empty"><p>אין סדרות בקטגוריה הזו.</p></div>';
}
function cardHTML(s, i) {
  const title = tv.data.lang === 'he' && s.alt && /[֐-׿]/.test(s.alt) ? s.alt : s.title;
  const meta = [s.season ? `עונה ${s.season}` : '', s.platform].filter(Boolean).join(' · ');
  return `
    <button type="button" class="tv-card" data-nav data-i="${i}">
      <div class="tv-poster">
        ${s.img ? `<img src="${esc(s.img)}" alt="" loading="lazy">` : esc(title)}
        ${s.season ? `<span class="tv-badge">S${s.season}</span>` : ''}
        ${isLink(s.url) ? '' : '<span class="tv-nolink">אין קישור</span>'}
      </div>
      <div class="tv-title">${esc(title)}</div>
      ${meta ? `<div class="tv-meta">${esc(meta)}</div>` : ''}
    </button>`;
}
function renderPair() {
  $('#tabs').innerHTML = '';
  const back = tv.data ? '<button type="button" class="tv-btn" data-nav data-back>חזרה לרשימה</button>' : '';
  $('#main').innerHTML = `
    <div class="tv-empty">
      <h2>${tv.data ? 'הקוד של הטלוויזיה' : 'בוא נעביר את הרשימה מהטלפון'}</h2>
      <p>בטלפון: באפליקציה פותחים <b>הגדרות ← טלוויזיה</b>, מקלידים את הקוד ולוחצים <b>שליחה לטלוויזיה</b>.</p>
      <div class="tv-code">${esc(tv.code)}</div>
      <p>הקוד קבוע. בפעם הבאה רק שולחים מהטלפון ולוחצים כאן "עדכון מהטלפון".</p>
      <div><button type="button" class="tv-btn primary" data-nav data-check>בדיקה עכשיו</button>${back}</div>
    </div>`;
  focusFirst();
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
      if (!quiet) toast('עדיין לא הגיעה רשימה. שלח מהטלפון ונסה שוב.');
      return 'none';
    }
    if (tv.data && p.sentAt <= (tv.data.sentAt || 0)) {
      if (!quiet) toast('הרשימה כבר מעודכנת.');
      return 'same';
    }
    tv.data = p; save();
    screen = 'grid';
    render(); focusFirst();
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

/* ---------- Remote control (arrows + OK) ---------- */
const navItems = () => [...document.querySelectorAll('[data-nav]')].filter((e) => !e.hidden && e.offsetParent !== null);
function focusFirst() {
  const saved = +sessionStorage.getItem('tvFocus:' + tv.tab);
  const cards = [...document.querySelectorAll('.tv-card')];
  const target = (screen === 'grid' && cards[saved]) || cards[0] || $('[data-check]') || navItems()[0];
  if (target) target.focus({ preventScroll: false });
}
function move(dir) {
  const items = navItems();
  const cur = document.activeElement;
  if (!items.includes(cur)) { focusFirst(); return; }
  const a = cur.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bestScore = Infinity;
  for (const el of items) {
    if (el === cur) continue;
    const b = el.getBoundingClientRect();
    const bx = b.left + b.width / 2, by = b.top + b.height / 2;
    const dx = bx - ax, dy = by - ay;
    let main, side;
    if (dir === 'left') { main = -dx; side = Math.abs(dy); }
    else if (dir === 'right') { main = dx; side = Math.abs(dy); }
    else if (dir === 'up') { main = -dy; side = Math.abs(dx); }
    else { main = dy; side = Math.abs(dx); }
    if (main <= 4) continue;
    const score = main + side * 2.5;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) {
    best.focus({ preventScroll: true });
    best.scrollIntoView({ block: best.classList.contains('tv-card') ? 'center' : 'nearest', inline: 'nearest', behavior: 'smooth' });
    if (best.closest('.tv-top') && dir === 'up') window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Left: 'left', Right: 'right', Up: 'up', Down: 'down' };
document.addEventListener('keydown', (e) => {
  const dir = KEYS[e.key];
  if (dir) { e.preventDefault(); move(dir); return; }
  if ((e.key === 'Backspace' || e.key === 'Escape' || e.key === 'GoBack') && screen === 'pair' && tv.data) {
    e.preventDefault(); screen = 'grid'; render(); focusFirst();
  }
});

/* ---------- Clicks (OK on the remote = click) ---------- */
document.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-tab]');
  if (tab) {
    tv.tab = tab.dataset.tab; save(); render();
    const again = $(`[data-tab="${CSS.escape(tv.tab)}"]`);
    if (again) again.focus();
    return;
  }
  const card = e.target.closest('.tv-card');
  if (card) {
    const s = showsFor(tv.tab)[+card.dataset.i];
    if (!s) return;
    sessionStorage.setItem('tvFocus:' + tv.tab, card.dataset.i);
    if (isLink(s.url)) location.href = s.url;
    else toast('אין קישור לסדרה הזו. מוסיפים קישור באפליקציה בטלפון ושולחים שוב.', 5000);
    return;
  }
  if (e.target.closest('[data-check]')) { check(); return; }
  if (e.target.closest('[data-back]')) { screen = 'grid'; render(); focusFirst(); return; }
  if (e.target.closest('#updateBtn')) {
    check().then((r) => { if (r === 'none') { screen = 'pair'; render(); startPolling(); } });
  }
});

// Coming back with the remote's Back button may restore this page from cache.
window.addEventListener('pageshow', () => { if (screen === 'grid') focusFirst(); });

save();
render();
if (screen === 'pair') startPolling();
else { focusFirst(); check({ quiet: true }); }
