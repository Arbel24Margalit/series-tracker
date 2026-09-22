'use strict';

/* =========================================================================
   Series tracker: a personal watch-status list for TV series.
   All data lives in this browser (localStorage). Posters come from TVmaze
   (free, no key) or from a pasted link / uploaded photo.
   ========================================================================= */

const STORE_KEY = 'seriesTracker.v1';
const TVMAZE_SEARCH = 'https://api.tvmaze.com/search/shows?q=';

const DEFAULT_STATUSES = [
  { id: 'watching', he: 'צופה עכשיו', en: 'Watching', color: '#2f9e6e' },
  { id: 'upnext', he: 'לצפייה בקרוב', en: 'Up next', color: '#3b7dd8' },
  { id: 'maybe', he: 'אולי (סימני שאלה)', en: 'Maybe', color: '#8a63d2' },
  { id: 'waiting', he: 'מחכה לעונה חדשה', en: 'Waiting for new season', color: '#d9892b' },
  { id: 'paused', he: 'בהפסקה', en: 'On hold', color: '#7d8196' },
  { id: 'watched', he: 'ראיתי', en: 'Watched', color: '#1f8a9e' },
  { id: 'rewatch', he: 'רוצה לראות שוב', en: 'Want to rewatch', color: '#d6336c' },
  { id: 'retry', he: 'ניסיתי – אנסה שוב', en: 'Tried – will try again', color: '#b8860b' },
  { id: 'dropped', he: 'ניסיתי – לא מעוניין', en: 'Tried – not interested', color: '#a24a3f' },
];

const NEW_CATEGORY_COLORS = ['#e36414', '#0f9d9a', '#6a4c93', '#c9184a', '#2b9348', '#1d4e89', '#9c6644'];

const PLATFORMS = ['Netflix', 'Apple TV+', 'Disney+', 'HBO Max', 'Prime Video', 'Peacock', 'Hulu', 'Paramount+', 'yes', 'HOT', 'סלקום TV', 'פרטנר TV', 'כאן 11', 'קשת 12', 'רשת 13'];

/* ---------- Strings ---------- */
const STRINGS = {
  he: {
    appName: 'הסדרות שלי', search: 'חיפוש סדרה, פלטפורמה או הערה…', sort: 'מיון',
    sortUpdated: 'עודכן לאחרונה', sortAdded: 'נוסף לאחרונה', sortTitle: 'לפי שם', sortRating: 'לפי דירוג',
    all: 'הכול', favorites: 'מועדפים', toCheck: 'לבדיקה',
    addSeries: 'הוספת סדרה', add: 'הוספה', close: 'סגירה', cancel: 'ביטול', save: 'שמירה', settings: 'הגדרות',
    viewGrid: 'תצוגת כרטיסים', viewList: 'תצוגת רשימה',
    title: 'שם הסדרה', altTitle: 'שם נוסף (בשפה השנייה)', altHint: 'למשל השם באנגלית – עוזר לחיפוש תמונה',
    status: 'סטטוס צפייה', favorite: 'במועדפים', platform: 'איפה רואים', season: 'עונה נוכחית',
    rating: 'הדירוג שלי', note: 'הערה', needsCheck: 'לסמן לבדיקה', needsCheckHint: 'למשל כשלא בטוחים בשם או בקטגוריה',
    image: 'תמונה', findImage: 'חיפוש תמונה ב-TVmaze', pasteLink: 'הדבקת קישור לתמונה', uploadImage: 'העלאה מהטלפון',
    removeImage: 'הסרת התמונה', useLink: 'שימוש בקישור', badLink: 'הקישור צריך להתחיל ב-https://',
    deleteSeries: 'מחיקת הסדרה', deleteConfirm: 'למחוק את "{0}"? אי אפשר לבטל.', delete: 'מחיקה', deleted: 'הסדרה נמחקה',
    added: 'נוספה לרשימה', titleRequired: 'צריך לכתוב שם לסדרה',
    duplicate: 'הסדרה כבר ברשימה, בקטגוריה "{0}".', openExisting: 'לפתוח את הקיימת',
    updated: 'עודכן', addedOn: 'נוסף',
    tvmazeTitle: 'חיפוש ב-TVmaze', searchBtn: 'חיפוש', searching: 'מחפש…', noResults: 'לא נמצאו תוצאות. נסו את השם באנגלית.',
    netError: 'אין חיבור ל-TVmaze. בדקו את החיבור לאינטרנט ונסו שוב.', rateError: 'יותר מדי חיפושים ברצף. חכו כמה שניות ונסו שוב.',
    suggestions: 'התאמות מ-TVmaze – בחרו כדי להוסיף תמונה', matched: 'מקושר ל-TVmaze', unlink: 'ביטול הקישור',
    credit: 'מידע ותמונות: TVmaze.com (רישיון CC BY-SA)',
    skip: 'דלג', finish: 'סיום', progress: '{0} מתוך {1}', fillDone: 'סיימנו לעבור על הסדרות',
    emptyAllTitle: 'עוד אין כאן סדרות', emptyAll: 'לחצו על "הוספת סדרה" כדי להתחיל.',
    emptyFilterTitle: 'אין סדרות כאן', emptyFilter: 'שום סדרה לא מתאימה לסינון הזה.',
    emptySearch: 'לא נמצאה סדרה בשם "{0}".',
    seasonShort: 'עונה {0}', flag: 'לבדיקה',
    language: 'שפה', theme: 'ערכת צבעים', themeSystem: 'לפי המכשיר', themeLight: 'בהיר', themeDark: 'כהה',
    categories: 'קטגוריות', categoriesHint: 'שם בעברית ובאנגלית, צבע וסדר. שינויים נשמרים מיד.',
    nameHe: 'שם בעברית', nameEn: 'שם באנגלית', addCategory: 'הוספת קטגוריה', unnamed: 'ללא שם',
    seriesCount: '{0} סדרות', oneSeries: 'סדרה אחת', noSeries: 'אין סדרות',
    deleteCategory: 'מחיקה', deleteCategoryConfirm: 'למחוק את הקטגוריה "{0}"?',
    moveTo: 'מה לעשות עם {0} הסדרות שבה? להעביר אל:', moveAndDelete: 'להעביר ולמחוק',
    lastCategory: 'חייבת להישאר לפחות קטגוריה אחת', moveUp: 'למעלה', moveDown: 'למטה',
    posters: 'תמונות', fillMissing: 'השלמת תמונות חסרות ({0})', noMissing: 'לכל הסדרות יש תמונה',
    backup: 'גיבוי', backupHint: 'הנתונים שמורים רק בדפדפן הזה בטלפון. כדאי לשמור קובץ גיבוי מדי פעם (למשל ל-Google Drive).',
    exportFile: 'שמירת קובץ גיבוי', shareFile: 'שיתוף קובץ גיבוי', importFile: 'שחזור מקובץ גיבוי',
    lastBackup: 'גיבוי אחרון: {0}', neverBackedUp: 'עוד לא נשמר גיבוי',
    importConfirm: 'השחזור יחליף את כל הרשימה הנוכחית ({0} סדרות) בתוכן הקובץ ({1} סדרות). להמשיך?',
    replace: 'להחליף', imported: 'הרשימה שוחזרה מהקובץ', badFile: 'הקובץ הזה אינו קובץ גיבוי של האתר.',
    exported: 'קובץ הגיבוי נשמר', storageError: 'השמירה נכשלה – הזיכרון של הדפדפן מלא. נסו להסיר תמונות שהועלו מהטלפון.',
    imageTooBig: 'לא הצלחתי לקרוא את התמונה. נסו תמונה אחרת.',
    about: 'על האתר', aboutText: 'מעקב צפייה אישי. אין חשבון ואין שרת – הכול נשמר אצלכם במכשיר.',
    favOn: 'נוספה למועדפים', favOff: 'הוסרה מהמועדפים', movedTo: 'הועברה ל"{0}"',
  },
  en: {
    appName: 'My Series', search: 'Search a series, platform or note…', sort: 'Sort',
    sortUpdated: 'Recently updated', sortAdded: 'Recently added', sortTitle: 'By name', sortRating: 'By rating',
    all: 'All', favorites: 'Favorites', toCheck: 'To check',
    addSeries: 'Add series', add: 'Add', close: 'Close', cancel: 'Cancel', save: 'Save', settings: 'Settings',
    viewGrid: 'Card view', viewList: 'List view',
    title: 'Series name', altTitle: 'Other name (second language)', altHint: 'E.g. the English name – helps the image search',
    status: 'Watch status', favorite: 'In favorites', platform: 'Where I watch', season: 'Current season',
    rating: 'My rating', note: 'Note', needsCheck: 'Mark to check', needsCheckHint: 'E.g. when unsure about the name or category',
    image: 'Image', findImage: 'Find image on TVmaze', pasteLink: 'Paste an image link', uploadImage: 'Upload from phone',
    removeImage: 'Remove image', useLink: 'Use link', badLink: 'The link must start with https://',
    deleteSeries: 'Delete series', deleteConfirm: 'Delete "{0}"? This can’t be undone.', delete: 'Delete', deleted: 'Series deleted',
    added: 'Added to your list', titleRequired: 'Enter a name for the series',
    duplicate: 'This series is already on your list, in "{0}".', openExisting: 'Open it',
    updated: 'Updated', addedOn: 'Added',
    tvmazeTitle: 'Search TVmaze', searchBtn: 'Search', searching: 'Searching…', noResults: 'No results. Try the English name.',
    netError: 'Can’t reach TVmaze. Check your internet connection and try again.', rateError: 'Too many searches in a row. Wait a few seconds and try again.',
    suggestions: 'Matches from TVmaze – pick one to add its image', matched: 'Linked to TVmaze', unlink: 'Unlink',
    credit: 'Data and images: TVmaze.com (CC BY-SA)',
    skip: 'Skip', finish: 'Done', progress: '{0} of {1}', fillDone: 'Went through all the series',
    emptyAllTitle: 'No series yet', emptyAll: 'Tap “Add series” to start.',
    emptyFilterTitle: 'Nothing here', emptyFilter: 'No series match this filter.',
    emptySearch: 'No series named “{0}”.',
    seasonShort: 'Season {0}', flag: 'Check',
    language: 'Language', theme: 'Theme', themeSystem: 'Device', themeLight: 'Light', themeDark: 'Dark',
    categories: 'Categories', categoriesHint: 'Hebrew and English name, color and order. Changes save right away.',
    nameHe: 'Hebrew name', nameEn: 'English name', addCategory: 'Add category', unnamed: 'Untitled',
    seriesCount: '{0} series', oneSeries: '1 series', noSeries: 'No series',
    deleteCategory: 'Delete', deleteCategoryConfirm: 'Delete the category "{0}"?',
    moveTo: 'It has {0} series. Move them to:', moveAndDelete: 'Move and delete',
    lastCategory: 'At least one category must remain', moveUp: 'Move up', moveDown: 'Move down',
    posters: 'Images', fillMissing: 'Fill in missing images ({0})', noMissing: 'Every series has an image',
    backup: 'Backup', backupHint: 'Your data is stored only in this browser on this phone. Save a backup file now and then (e.g. to Google Drive).',
    exportFile: 'Save backup file', shareFile: 'Share backup file', importFile: 'Restore from backup file',
    lastBackup: 'Last backup: {0}', neverBackedUp: 'No backup saved yet',
    importConfirm: 'Restoring replaces your whole current list ({0} series) with the file’s content ({1} series). Continue?',
    replace: 'Replace', imported: 'List restored from file', badFile: 'This file isn’t a backup from this site.',
    exported: 'Backup file saved', storageError: 'Saving failed – browser storage is full. Try removing images uploaded from the phone.',
    imageTooBig: 'Couldn’t read that image. Try another one.',
    about: 'About', aboutText: 'A personal watch tracker. No account and no server – everything stays on your device.',
    favOn: 'Added to favorites', favOff: 'Removed from favorites', movedTo: 'Moved to “{0}”',
  },
};

/* ---------- Icons ---------- */
const ICONS = {
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-9 8.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  share: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4M8.2 13.2l7.6 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  tv: '<rect x="3" y="7" width="18" height="12" rx="2.5"/><path d="M8.5 3.5L12 7l3.5-3.5"/>',
};
const icon = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

/* ---------- Seed: the handwritten list ---------- */
function seedShows() {
  const checkName = 'השם פוענח מכתב יד ולא בטוח – כדאי לבדוק ולתקן.';
  const checkCat = 'הופיעה בדף בטור בלי כותרת – כדאי לבדוק את הקטגוריה.';
  // [title, altTitle, status, extra]
  const rows = [
    ['רוקסי', '', 'watching', { needsCheck: true, note: checkName }],
    ['Adults', 'אדולטס', 'watching'],
    ["לנת'ירנס", '', 'watching', { needsCheck: true, note: checkName }],
    ['I Love LA', 'אי לאב LA', 'watching'],
    ['מחשבות פרטיות', '', 'watching', { needsCheck: true, note: checkName }],
    ['Andor', 'אנדור', 'watching', { needsCheck: true, note: 'בדף כתוב "אנדרויד" – ייתכן שהכוונה ל-Andor. כדאי לבדוק.' }],
    ['Wednesday', 'וונסדיי', 'watching', { season: 2 }],
    ['פיוריוס', '', 'watching', { needsCheck: true, note: checkName }],
    ['Maximum Pleasure Guaranteed', 'מקסימום פלז׳ר גרנטיד', 'watching'],

    ['Sterling Point', 'סטרלינג פוינט', 'maybe', { needsCheck: true, note: checkName }],
    ['Not Suitable for Work', 'נוט סוטבל פור וורק', 'maybe'],
    ['CIA', '', 'maybe'],
    ['Star Trek: Starfleet Academy', 'סטאר טרק – סטארפליט אקדמי', 'maybe'],
    ['The Witcher', 'דה וויצ׳ר', 'maybe'],
    ['Watson', 'ווטסון', 'maybe'],
    ['Brilliant Minds', 'בריליאנט מיינדס', 'maybe'],
    ['Matlock', 'מטלוק', 'maybe'],

    ['Pluribus', 'פלוריבוס', 'upnext'],
    ['The Shards', 'דה שארדס', 'upnext', { needsCheck: true, note: checkName }],
    ['The Morning Show', 'דה מורנינג שואו', 'upnext'],
    ['High Potential', 'היי פוטנשל', 'upnext', { season: 2 }],
    ['Task', 'טאסק', 'upnext'],
    ["ד. ג'יאל סינג לפוט", '', 'upnext', { needsCheck: true, note: checkName }],
    ['Ponies', 'פוניס', 'upnext'],
    ['The Copenhagen Test', 'דה קופנהגן טסט', 'upnext'],
    ['The Boroughs', 'דה בורוז', 'upnext'],
    ['Cross', 'קרוס', 'upnext'],
    ['Shrinking', 'שרינקינג', 'upnext'],
    ['The Half Man', 'האלף מן', 'upnext', { needsCheck: true, note: checkName }],

    ['Loki', 'לוקי', 'upnext', { needsCheck: true, note: checkCat }],
    ['Trigger Point', 'טריגר פוינט', 'upnext', { needsCheck: true, note: checkCat }],
  ];
  const base = Date.now();
  return rows.map(([title, altTitle, status, extra], i) => makeShow({
    title, altTitle, status, ...(extra || {}),
    // Keep the page order when sorting by "recently added/updated".
    createdAt: base - i * 1000, updatedAt: base - i * 1000,
  }));
}

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hasHebrew = (s) => /[֐-׿]/.test(s || '');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const isColor = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
const clampInt = (v, min, max) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};
function safeImg(url) {
  if (typeof url !== 'string') return '';
  if (/^https:\/\//i.test(url)) return url;
  if (/^http:\/\/static\.tvmaze\.com\//i.test(url)) return url.replace(/^http:/i, 'https:');
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(url)) return url;
  return '';
}
function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function makeShow(p = {}) {
  const now = Date.now();
  return {
    id: p.id || uid(),
    title: p.title || '',
    altTitle: p.altTitle || '',
    status: p.status || 'upnext',
    favorite: !!p.favorite,
    platform: p.platform || '',
    season: p.season ?? null,
    rating: p.rating || 0,
    note: p.note || '',
    needsCheck: !!p.needsCheck,
    image: p.image || '',
    tvmaze: p.tvmaze || null,
    createdAt: p.createdAt || now,
    updatedAt: p.updatedAt || now,
  };
}

/* ---------- State ---------- */
let state;

function defaultState() {
  return {
    version: 1,
    lang: 'he', theme: 'system', view: 'grid', sort: 'updated', tab: 'all',
    lastBackup: null,
    statuses: DEFAULT_STATUSES.map((s) => ({ ...s })),
    shows: seedShows(),
  };
}

// Validates anything loaded from storage or a backup file. Returns null if unusable.
function normalizeState(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.shows) || !Array.isArray(raw.statuses)) return null;
  const seen = new Set();
  const statuses = raw.statuses
    .filter((s) => s && typeof s.id === 'string' && s.id && !seen.has(s.id) && seen.add(s.id))
    .map((s) => ({
      id: s.id,
      he: typeof s.he === 'string' ? s.he : '',
      en: typeof s.en === 'string' ? s.en : '',
      color: isColor(s.color) ? s.color : '#7d8196',
    }));
  if (!statuses.length) return null;
  const showIds = new Set();
  const shows = raw.shows
    .filter((s) => s && typeof s.title === 'string' && s.title.trim())
    .map((s) => {
      const show = makeShow({
        id: typeof s.id === 'string' && s.id && !showIds.has(s.id) ? s.id : uid(),
        title: s.title.trim(),
        altTitle: typeof s.altTitle === 'string' ? s.altTitle : '',
        status: seen.has(s.status) ? s.status : statuses[0].id,
        favorite: s.favorite === true,
        platform: typeof s.platform === 'string' ? s.platform : '',
        season: clampInt(s.season, 1, 99),
        rating: clampInt(s.rating, 1, 5) || 0,
        note: typeof s.note === 'string' ? s.note : '',
        needsCheck: s.needsCheck === true,
        image: safeImg(s.image),
        tvmaze: s.tvmaze && Number.isFinite(s.tvmaze.id) ? {
          id: s.tvmaze.id,
          url: typeof s.tvmaze.url === 'string' ? s.tvmaze.url : '',
          year: typeof s.tvmaze.year === 'string' ? s.tvmaze.year : '',
          network: typeof s.tvmaze.network === 'string' ? s.tvmaze.network : '',
        } : null,
        createdAt: Number.isFinite(s.createdAt) ? s.createdAt : Date.now(),
        updatedAt: Number.isFinite(s.updatedAt) ? s.updatedAt : Date.now(),
      });
      showIds.add(show.id);
      return show;
    });
  return {
    version: 1,
    lang: raw.lang === 'en' ? 'en' : 'he',
    theme: ['light', 'dark'].includes(raw.theme) ? raw.theme : 'system',
    view: raw.view === 'list' ? 'list' : 'grid',
    sort: ['updated', 'added', 'title', 'rating'].includes(raw.sort) ? raw.sort : 'updated',
    tab: typeof raw.tab === 'string' ? raw.tab : 'all',
    lastBackup: Number.isFinite(raw.lastBackup) ? raw.lastBackup : null,
    statuses, shows,
  };
}

function load() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { raw = null; }
  state = normalizeState(raw) || defaultState();
  if (!raw) save();
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    toast(T('storageError'), 6000);
    return false;
  }
}

/* ---------- i18n ---------- */
function T(key, ...args) {
  const str = (STRINGS[state.lang] && STRINGS[state.lang][key]) || STRINGS.he[key] || key;
  return str.replace(/\{(\d)\}/g, (_, i) => args[+i] ?? '');
}
const statusById = (id) => state.statuses.find((s) => s.id === id);
function statusLabel(s) {
  if (!s) return '';
  return (state.lang === 'en' ? (s.en || s.he) : (s.he || s.en)) || T('unnamed');
}
function primaryTitle(show) {
  const wantHeb = state.lang === 'he';
  if (show.altTitle && hasHebrew(show.altTitle) === wantHeb && hasHebrew(show.title) !== wantHeb) return show.altTitle;
  return show.title;
}
function secondaryTitle(show) {
  const p = primaryTitle(show);
  return p === show.title ? show.altTitle : show.title;
}
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString(state.lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' });
}
function countLabel(n) {
  if (n === 0) return T('noSeries');
  if (n === 1) return T('oneSeries');
  return T('seriesCount', n);
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

/* ---------- Layers (sheets + dialogs) tied to the Android back button ---------- */
const layers = [];
function openLayer(node, onClose) {
  document.body.appendChild(node);
  layers.push({ node, onClose });
  document.body.classList.add('locked');
  history.pushState({ depth: layers.length }, '');
  node.addEventListener('click', (e) => { if (e.target === node) closeTop(); });
}
function closeTop(count = 1) {
  if (layers.length) history.go(-Math.min(count, layers.length));
}
window.addEventListener('popstate', (e) => {
  const depth = (e.state && e.state.depth) || 0;
  while (layers.length > depth) {
    const top = layers.pop();
    top.node.remove();
    if (top.onClose) top.onClose();
  }
  if (!layers.length) document.body.classList.remove('locked');
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && layers.length) closeTop(); });

function sheetShell(title, { center = false } = {}) {
  return el(`
    <div class="layer${center ? ' center' : ''}" role="dialog" aria-modal="true">
      <div class="sheet">
        <div class="sheet-head">
          <h2>${esc(title)}</h2>
          <button type="button" class="icon-btn" data-close aria-label="${esc(T('close'))}">${icon('close')}</button>
        </div>
        <div class="sheet-body"></div>
      </div>
    </div>`);
}
function wireClose(layer) {
  layer.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeTop()));
}

function confirmBox(message, okLabel, { danger = false } = {}) {
  return new Promise((resolve) => {
    let answered = false;
    const layer = el(`
      <div class="layer center" role="alertdialog" aria-modal="true">
        <div class="sheet">
          <div class="sheet-body"><p style="margin:0">${esc(message)}</p></div>
          <div class="sheet-foot">
            <button type="button" class="btn grow" data-no>${esc(T('cancel'))}</button>
            <button type="button" class="btn grow ${danger ? 'danger solid' : 'primary'}" data-yes>${esc(okLabel)}</button>
          </div>
        </div>
      </div>`);
    openLayer(layer, () => { if (!answered) resolve(false); });
    $('[data-no]', layer).addEventListener('click', () => closeTop());
    $('[data-yes]', layer).addEventListener('click', () => { answered = true; resolve(true); closeTop(); });
    $('[data-yes]', layer).focus();
  });
}

/* ---------- Theme / language ---------- */
function applyPrefs() {
  const root = document.documentElement;
  root.lang = state.lang;
  root.dir = state.lang === 'he' ? 'rtl' : 'ltr';
  if (state.theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', state.theme);
  document.title = T('appName');
  $('#brandText').textContent = T('appName');
  $('#addBtnText').textContent = T('addSeries');
  $('#searchInput').placeholder = T('search');
  $('#searchInput').setAttribute('aria-label', T('search'));
  $('#settingsBtn').innerHTML = icon('gear');
  $('#settingsBtn').setAttribute('aria-label', T('settings'));
  const vt = $('#viewToggle');
  vt.innerHTML = icon(state.view === 'grid' ? 'list' : 'grid');
  vt.setAttribute('aria-label', state.view === 'grid' ? T('viewList') : T('viewGrid'));
  const sortSel = $('#sortSelect');
  sortSel.setAttribute('aria-label', T('sort'));
  sortSel.innerHTML = ['updated', 'added', 'title', 'rating']
    .map((k) => `<option value="${k}">${esc(T('sort' + k[0].toUpperCase() + k.slice(1)))}</option>`).join('');
  sortSel.value = state.sort;
  $('.search-icon').innerHTML = icon('search');
}

/* ---------- Main list ---------- */
let query = '';

function tabMatches(show) {
  const tab = state.tab;
  if (tab === 'all') return true;
  if (tab === 'fav') return show.favorite;
  if (tab === 'check') return show.needsCheck;
  if (tab.startsWith('s:')) return show.status === tab.slice(2);
  return true;
}
function searchMatches(show) {
  if (!query) return true;
  const q = query.toLowerCase();
  return [show.title, show.altTitle, show.platform, show.note].some((v) => (v || '').toLowerCase().includes(q));
}
function sortShows(list) {
  const collator = new Intl.Collator(state.lang === 'he' ? 'he' : 'en', { sensitivity: 'base', numeric: true });
  const by = {
    updated: (a, b) => b.updatedAt - a.updatedAt,
    added: (a, b) => b.createdAt - a.createdAt,
    title: (a, b) => collator.compare(primaryTitle(a), primaryTitle(b)),
    rating: (a, b) => (b.rating - a.rating) || collator.compare(primaryTitle(a), primaryTitle(b)),
  }[state.sort];
  return list.slice().sort(by);
}

function renderChips() {
  // Drop a tab whose category was deleted.
  if (state.tab.startsWith('s:') && !statusById(state.tab.slice(2))) state.tab = 'all';
  if (state.tab === 'check' && !state.shows.some((s) => s.needsCheck)) state.tab = 'all';
  const count = (fn) => state.shows.filter(fn).length;
  const chips = [
    { tab: 'all', label: T('all'), n: state.shows.length },
    { tab: 'fav', label: T('favorites'), n: count((s) => s.favorite), star: true },
  ];
  const checkN = count((s) => s.needsCheck);
  if (checkN) chips.push({ tab: 'check', label: T('toCheck'), n: checkN, warn: true });
  state.statuses.forEach((st) => chips.push({ tab: 's:' + st.id, label: statusLabel(st), n: count((s) => s.status === st.id), color: st.color }));
  const nav = $('#chips');
  nav.innerHTML = chips.map((c) => `
    <button type="button" class="chip" data-tab="${esc(c.tab)}" aria-pressed="${c.tab === state.tab}">
      ${c.color ? `<span class="dot" style="--c:${c.color}"></span>` : ''}
      ${c.star ? `<span style="color:var(--star);display:inline-flex">${icon('star')}</span>` : ''}
      ${c.warn ? '<span class="dot" style="--c:var(--warn)"></span>' : ''}
      <span>${esc(c.label)}</span><span class="count">${c.n}</span>
    </button>`).join('');
  const active = $('[aria-pressed="true"]', nav);
  if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function posterHTML(show, { flag = false } = {}) {
  const st = statusById(show.status);
  const img = safeImg(show.image);
  return `
    <div class="poster" style="--c:${st ? st.color : '#7d8196'}">
      <div class="poster-fallback" aria-hidden="true">${icon('tv')}</div>
      ${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async">` : ''}
      ${flag && show.needsCheck ? `<span class="flag">${esc(T('flag'))}</span>` : ''}
    </div>`;
}
function metaParts(show) {
  const parts = [];
  if (show.platform) parts.push(esc(show.platform));
  if (show.season) parts.push(esc(T('seasonShort', show.season)));
  if (show.rating) parts.push(`<span style="color:var(--star)">★</span>${show.rating}`);
  return parts.join(' · ');
}
function favBtn(show) {
  return `<button type="button" class="fav-btn" data-fav="${esc(show.id)}" aria-pressed="${show.favorite}" aria-label="${esc(T('favorite'))}">${icon('star')}</button>`;
}
function cardHTML(show) {
  return `
    <div class="card">
      <button type="button" class="card-open" data-open="${esc(show.id)}">
        ${posterHTML(show, { flag: true })}
        <span class="card-title" dir="auto">${esc(primaryTitle(show))}</span>
        ${secondaryTitle(show) ? `<span class="card-sub" dir="auto">${esc(secondaryTitle(show))}</span>` : ''}
        <span class="card-meta">${metaParts(show)}</span>
      </button>
      ${favBtn(show)}
    </div>`;
}
function rowHTML(show) {
  const sec = secondaryTitle(show);
  return `
    <div class="row">
      <button type="button" class="row-open" data-open="${esc(show.id)}">
        ${posterHTML(show)}
        <span class="row-main">
          <span class="row-title" dir="auto">${esc(primaryTitle(show))}</span>
          ${sec ? `<span class="card-meta" dir="auto">${esc(sec)}</span>` : ''}
          <span class="card-meta">${show.needsCheck ? `<span class="pill-flag">${esc(T('flag'))}</span>` : ''}${metaParts(show)}</span>
        </span>
      </button>
      ${favBtn(show)}
    </div>`;
}

function renderList() {
  renderChips();
  const list = $('#list');
  const visible = sortShows(state.shows.filter((s) => tabMatches(s) && searchMatches(s)));
  if (!visible.length) {
    let title = T('emptyFilterTitle'), body = T('emptyFilter');
    if (query) body = T('emptySearch', query);
    else if (!state.shows.length) { title = T('emptyAllTitle'); body = T('emptyAll'); }
    list.innerHTML = `<div class="empty"><strong>${esc(title)}</strong>${esc(body)}</div>`;
    return;
  }
  const renderItems = (items) => state.view === 'grid'
    ? `<div class="grid">${items.map(cardHTML).join('')}</div>`
    : `<div class="rows">${items.map(rowHTML).join('')}</div>`;

  if (state.tab.startsWith('s:')) {
    list.innerHTML = renderItems(visible);
    return;
  }
  // Group by category, in category order.
  list.innerHTML = state.statuses.map((st) => {
    const items = visible.filter((s) => s.status === st.id);
    if (!items.length) return '';
    return `
      <section class="group">
        <h2 class="group-head"><span class="dot" style="--c:${st.color}"></span>${esc(statusLabel(st))}<span class="count">${items.length}</span></h2>
        ${renderItems(items)}
      </section>`;
  }).join('');
}

function toggleFavorite(id) {
  const show = state.shows.find((s) => s.id === id);
  if (!show) return;
  show.favorite = !show.favorite;
  show.updatedAt = Date.now();
  save();
  renderList();
  toast(show.favorite ? T('favOn') : T('favOff'));
}

/* ---------- TVmaze ---------- */
async function tvmazeSearch(q, signal) {
  let res;
  try {
    res = await fetch(TVMAZE_SEARCH + encodeURIComponent(q), { signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new Error(T('netError'));
  }
  if (res.status === 429) throw new Error(T('rateError'));
  if (!res.ok) throw new Error(T('netError'));
  const data = await res.json();
  return (Array.isArray(data) ? data : [])
    .map((r) => r && r.show)
    .filter((s) => s && Number.isFinite(s.id) && s.name)
    .map((s) => ({
      id: s.id,
      name: String(s.name),
      year: typeof s.premiered === 'string' ? s.premiered.slice(0, 4) : '',
      network: (s.network && s.network.name) || (s.webChannel && s.webChannel.name) || '',
      image: safeImg(s.image && (s.image.medium || s.image.original)),
      url: typeof s.url === 'string' ? s.url : '',
    }));
}

function resultHTML(r, i) {
  const meta = [r.year, r.network].filter(Boolean).join(' · ');
  return `
    <button type="button" class="result" data-pick="${i}">
      <div class="poster">${r.image ? `<img src="${esc(r.image)}" alt="" loading="lazy">` : ''}</div>
      <span class="result-main">
        <span class="result-name ltr" dir="auto">${esc(r.name)}</span>
        ${meta ? `<span class="result-meta ltr">${esc(meta)}</span>` : ''}
      </span>
    </button>`;
}

// Copies a TVmaze match onto a show (draft or saved).
function applyPick(show, r) {
  show.tvmaze = { id: r.id, url: r.url, year: r.year, network: r.network };
  if (r.image) show.image = r.image;
  const t = show.title.trim();
  if (!t) show.title = r.name;
  else if (hasHebrew(t)) {
    // Hebrew title stays; the English name from TVmaze becomes the other name.
    if (!show.altTitle || hasHebrew(show.altTitle)) show.altTitle = r.name;
  } else show.title = r.name;
  if (!show.platform && r.network) show.platform = r.network;
}

function searchQueryFor(show) {
  if (!hasHebrew(show.title)) return show.title;
  if (show.altTitle && !hasHebrew(show.altTitle)) return show.altTitle;
  return show.title;
}

/* Picker: search TVmaze and choose a match.
   Single mode: onPick(result).  Queue mode: walks a list of shows. */
function openPicker({ show, onPick, queue }) {
  const layer = sheetShell(T('tvmazeTitle'));
  const body = $('.sheet-body', layer);
  let idx = 0;
  let current = show || (queue && queue[0]);
  let results = [];
  let ctrl;

  body.innerHTML = `
    <div class="notice" data-progress hidden></div>
    <form class="search-row" data-form style="margin:0">
      <label class="search"><span class="search-icon">${icon('search')}</span>
        <input type="search" id="pickerQuery" class="ltr" dir="auto" autocomplete="off" enterkeyhint="search" aria-label="${esc(T('tvmazeTitle'))}">
      </label>
      <button type="submit" class="btn primary">${esc(T('searchBtn'))}</button>
    </form>
    <div data-msg class="hint"></div>
    <div class="results" data-results></div>
    <div class="btn-row" data-queue-btns hidden>
      <button type="button" class="btn grow" data-skip>${esc(T('skip'))}</button>
      <button type="button" class="btn grow" data-finish>${esc(T('finish'))}</button>
    </div>
    <p class="source-note">${esc(T('credit'))}</p>`;

  const input = $('#pickerQuery', body);
  const statusEl = $("[data-msg]", body);
  const resultsEl = $('[data-results]', body);

  async function run() {
    const q = input.value.trim();
    if (!q) return;
    if (ctrl) ctrl.abort();
    ctrl = new AbortController();
    statusEl.textContent = T('searching');
    statusEl.className = 'hint';
    resultsEl.innerHTML = '';
    try {
      results = await tvmazeSearch(q, ctrl.signal);
      statusEl.textContent = results.length ? '' : T('noResults');
      resultsEl.innerHTML = results.map(resultHTML).join('');
    } catch (e) {
      if (e.name === 'AbortError') return;
      statusEl.textContent = e.message;
      statusEl.className = 'error-text';
    }
  }

  function loadCurrent() {
    if (queue) {
      const p = $('[data-progress]', body);
      p.hidden = false;
      p.innerHTML = `<strong dir="auto">${esc(primaryTitle(current))}</strong><span>${esc(T('progress', idx + 1, queue.length))}</span>`;
      $('[data-queue-btns]', body).hidden = false;
    }
    input.value = searchQueryFor(current);
    run();
  }

  function next() {
    idx += 1;
    if (idx >= queue.length) { toast(T('fillDone')); closeTop(); return; }
    current = queue[idx];
    loadCurrent();
  }

  $('[data-form]', body).addEventListener('submit', (e) => { e.preventDefault(); run(); });
  resultsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    const r = results[+b.dataset.pick];
    if (!r) return;
    if (queue) {
      applyPick(current, r);
      current.updatedAt = Date.now();
      save();
      renderList();
      next();
    } else {
      onPick(r);
      closeTop();
    }
  });
  $('[data-skip]', body).addEventListener('click', next);
  $('[data-finish]', body).addEventListener('click', () => closeTop());

  openLayer(layer, () => { if (ctrl) ctrl.abort(); });
  wireClose(layer);
  loadCurrent();
}

/* ---------- Image upload (downscaled so it fits in storage) ---------- */
function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const maxW = 360;
      const scale = Math.min(1, maxW / img.naturalWidth);
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(T('imageTooBig'))); };
    img.src = url;
  });
}

/* ---------- Editor (add + edit) ---------- */
function findDuplicate(draft) {
  const t = draft.title.trim().toLowerCase();
  const a = draft.altTitle.trim().toLowerCase();
  return state.shows.find((s) => s.id !== draft.id && (
    (draft.tvmaze && s.tvmaze && s.tvmaze.id === draft.tvmaze.id) ||
    [s.title, s.altTitle].some((n) => n && (n.trim().toLowerCase() === t || (a && n.trim().toLowerCase() === a)))
  ));
}

function openEditor(id) {
  const existing = id ? state.shows.find((s) => s.id === id) : null;
  if (id && !existing) return;
  const isNew = !existing;
  const show = existing || makeShow({ status: state.tab.startsWith('s:') ? state.tab.slice(2) : 'upnext', favorite: state.tab === 'fav' });
  let dirty = false;

  const layer = sheetShell(isNew ? T('addSeries') : primaryTitle(show));
  const sheet = $('.sheet', layer);
  const body = $('.sheet-body', layer);
  if (isNew) {
    sheet.appendChild(el(`<div class="sheet-foot">
      <button type="button" class="btn grow" data-close>${esc(T('cancel'))}</button>
      <button type="button" class="btn primary grow" data-add>${esc(T('add'))}</button></div>`));
  }

  body.innerHTML = `
    <div class="field">
      <label for="fTitle">${esc(T('title'))}</label>
      <input id="fTitle" class="input" dir="auto" autocomplete="off" enterkeyhint="done" value="${esc(show.title)}">
      <div data-dup></div>
      <div data-suggest class="results"></div>
    </div>
    <div class="field">
      <span class="label" id="lblStatus">${esc(T('status'))}</span>
      <div class="status-grid" role="radiogroup" aria-labelledby="lblStatus" data-statuses></div>
    </div>
    <div class="toggle-row">
      <span>${icon('star')} ${esc(T('favorite'))}</span>
      <button type="button" class="switch" role="switch" id="fFav" aria-checked="${show.favorite}" aria-label="${esc(T('favorite'))}"></button>
    </div>
    <div class="field">
      <span class="label">${esc(T('image'))}</span>
      <div class="image-edit">
        <div data-poster></div>
        <div class="btn-row">
          <button type="button" class="btn small" data-find>${icon('search')}${esc(T('findImage'))}</button>
          <button type="button" class="btn small" data-link>${icon('link')}${esc(T('pasteLink'))}</button>
          <button type="button" class="btn small" data-upload>${icon('upload')}${esc(T('uploadImage'))}</button>
          <button type="button" class="btn small danger" data-remove-img>${icon('trash')}${esc(T('removeImage'))}</button>
        </div>
      </div>
      <form class="search-row" data-link-form hidden style="margin:0">
        <input id="fImgUrl" class="input ltr" type="url" inputmode="url" placeholder="https://…" autocomplete="off" aria-label="${esc(T('pasteLink'))}">
        <button type="submit" class="btn primary">${esc(T('useLink'))}</button>
      </form>
      <div data-img-err class="error-text" hidden></div>
      <div data-linked class="hint"></div>
      <input type="file" id="fImgFile" accept="image/*" hidden>
    </div>
    <div class="field">
      <label for="fAlt">${esc(T('altTitle'))}</label>
      <input id="fAlt" class="input" dir="auto" autocomplete="off" value="${esc(show.altTitle)}">
      <span class="hint">${esc(T('altHint'))}</span>
    </div>
    <div class="two">
      <div class="field">
        <label for="fPlatform">${esc(T('platform'))}</label>
        <input id="fPlatform" class="input" dir="auto" list="platformList" autocomplete="off" value="${esc(show.platform)}">
        <datalist id="platformList"></datalist>
      </div>
      <div class="field">
        <label for="fSeason">${esc(T('season'))}</label>
        <input id="fSeason" class="input" type="number" inputmode="numeric" min="1" max="99" value="${show.season ?? ''}">
      </div>
    </div>
    <div class="field">
      <span class="label" id="lblRating">${esc(T('rating'))}</span>
      <div class="stars" role="radiogroup" aria-labelledby="lblRating" data-stars></div>
    </div>
    <div class="field">
      <label for="fNote">${esc(T('note'))}</label>
      <textarea id="fNote" class="textarea" dir="auto">${esc(show.note)}</textarea>
    </div>
    <div class="toggle-row">
      <span><span style="display:block">${esc(T('needsCheck'))}</span><span class="hint">${esc(T('needsCheckHint'))}</span></span>
      <button type="button" class="switch" role="switch" id="fCheck" aria-checked="${show.needsCheck}" aria-label="${esc(T('needsCheck'))}"></button>
    </div>
    ${isNew ? '' : `
    <p class="hint" style="margin:0">${esc(T('addedOn'))}: ${esc(fmtDate(show.createdAt))} · ${esc(T('updated'))}: <span data-updated>${esc(fmtDate(show.updatedAt))}</span></p>
    <button type="button" class="btn danger" data-delete>${icon('trash')}${esc(T('deleteSeries'))}</button>`}
  `;

  const platforms = [...new Set([...state.shows.map((s) => s.platform).filter(Boolean), ...PLATFORMS])];
  $('#platformList', body).innerHTML = platforms.map((p) => `<option value="${esc(p)}"></option>`).join('');

  // Saved shows update as you go; a new show is only a draft until "Add".
  function touch({ list = true } = {}) {
    if (isNew) return;
    show.updatedAt = Date.now();
    dirty = true;
    save();
    if (list) renderList();
  }

  function renderStatuses() {
    $('[data-statuses]', body).innerHTML = state.statuses.map((st) => `
      <button type="button" class="status-opt" role="radio" data-status="${esc(st.id)}" aria-checked="${st.id === show.status}" style="--c:${st.color}">
        <span class="dot"></span>${esc(statusLabel(st))}
      </button>`).join('');
  }
  function renderStars() {
    $('[data-stars]', body).innerHTML = [1, 2, 3, 4, 5].map((n) => `
      <button type="button" class="star-btn${n <= show.rating ? ' on' : ''}" role="radio" aria-checked="${n === show.rating}" aria-label="${n}" data-star="${n}">${icon('star')}</button>`).join('');
  }
  function renderImage() {
    $('[data-poster]', body).innerHTML = posterHTML(show);
    $('[data-remove-img]', body).hidden = !show.image;
    const linked = $('[data-linked]', body);
    if (show.tvmaze) {
      const meta = [show.tvmaze.year, show.tvmaze.network].filter(Boolean).join(' · ');
      linked.innerHTML = `${esc(T('matched'))}${meta ? ` <span class="ltr">(${esc(meta)})</span>` : ''} · <button type="button" class="btn small" data-unlink style="min-height:30px">${esc(T('unlink'))}</button>`;
    } else linked.innerHTML = '';
  }
  function syncFields() {
    $('#fTitle', body).value = show.title;
    $('#fAlt', body).value = show.altTitle;
    $('#fPlatform', body).value = show.platform;
  }
  function showDuplicate() {
    const box = $('[data-dup]', body);
    const dup = show.title.trim() ? findDuplicate(show) : null;
    if (!dup) { box.innerHTML = ''; return null; }
    box.innerHTML = `<div class="notice"><span>${esc(T('duplicate', statusLabel(statusById(dup.status))))}</span>
      <button type="button" class="btn small" data-open-dup>${esc(T('openExisting'))}</button></div>`;
    $('[data-open-dup]', box).addEventListener('click', () => {
      closeTop();
      setTimeout(() => openEditor(dup.id), 60);
    });
    return dup;
  }
  renderStatuses(); renderStars(); renderImage();

  // Title + live TVmaze suggestions while adding.
  let suggestCtrl, suggestions = [];
  const suggestBox = $('[data-suggest]', body);
  const suggest = debounce(async () => {
    const q = show.title.trim();
    if (!isNew || show.tvmaze || q.length < 2) { suggestBox.innerHTML = ''; return; }
    if (suggestCtrl) suggestCtrl.abort();
    suggestCtrl = new AbortController();
    try {
      suggestions = (await tvmazeSearch(q, suggestCtrl.signal)).slice(0, 5);
      suggestBox.innerHTML = suggestions.length
        ? `<span class="hint">${esc(T('suggestions'))}</span>${suggestions.map(resultHTML).join('')}`
        : '';
    } catch (e) {
      if (e.name !== 'AbortError') suggestBox.innerHTML = '';
    }
  }, 450);
  suggestBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]');
    if (!b || !suggestions[+b.dataset.pick]) return;
    applyPick(show, suggestions[+b.dataset.pick]);
    suggestBox.innerHTML = '';
    syncFields(); renderImage(); showDuplicate();
  });

  $('#fTitle', body).addEventListener('input', (e) => {
    show.title = e.target.value;
    if (!isNew) {
      $('.sheet-head h2', layer).textContent = primaryTitle(show) || '…';
      if (show.title.trim()) touch({ list: false });
    }
    showDuplicate();
    suggest();
  });
  $('#fTitle', body).addEventListener('blur', () => {
    // A saved show must keep a name.
    if (!isNew && !show.title.trim()) {
      show.title = show.altTitle.trim() || T('unnamed');
      syncFields();
      touch({ list: false });
    }
  });
  $('#fAlt', body).addEventListener('input', (e) => { show.altTitle = e.target.value; touch({ list: false }); });
  $('#fPlatform', body).addEventListener('input', (e) => { show.platform = e.target.value; touch({ list: false }); });
  $('#fSeason', body).addEventListener('input', (e) => { show.season = clampInt(e.target.value, 1, 99); touch({ list: false }); });
  $('#fNote', body).addEventListener('input', (e) => { show.note = e.target.value; touch({ list: false }); });

  $('[data-statuses]', body).addEventListener('click', (e) => {
    const b = e.target.closest('[data-status]');
    if (!b || b.dataset.status === show.status) return;
    show.status = b.dataset.status;
    renderStatuses();
    touch();
    if (!isNew) toast(T('movedTo', statusLabel(statusById(show.status))));
  });
  $('#fFav', body).addEventListener('click', (e) => {
    show.favorite = !show.favorite;
    e.currentTarget.setAttribute('aria-checked', show.favorite);
    touch();
  });
  $('#fCheck', body).addEventListener('click', (e) => {
    show.needsCheck = !show.needsCheck;
    e.currentTarget.setAttribute('aria-checked', show.needsCheck);
    touch();
  });
  $('[data-stars]', body).addEventListener('click', (e) => {
    const b = e.target.closest('[data-star]');
    if (!b) return;
    const n = +b.dataset.star;
    show.rating = show.rating === n ? 0 : n;
    renderStars();
    touch();
  });

  // Image actions
  const imgErr = $('[data-img-err]', body);
  const setImgError = (msg) => { imgErr.textContent = msg || ''; imgErr.hidden = !msg; };
  $('[data-find]', body).addEventListener('click', () => {
    setImgError('');
    if (!show.title.trim() && !show.altTitle.trim()) { setImgError(T('titleRequired')); return; }
    openPicker({
      show,
      onPick: (r) => { applyPick(show, r); syncFields(); renderImage(); showDuplicate(); touch(); },
    });
  });
  $('[data-link]', body).addEventListener('click', () => {
    const f = $('[data-link-form]', body);
    f.hidden = !f.hidden;
    if (!f.hidden) $('#fImgUrl', body).focus();
  });
  $('[data-link-form]', body).addEventListener('submit', (e) => {
    e.preventDefault();
    const url = $('#fImgUrl', body).value.trim();
    if (!/^https:\/\/\S+$/i.test(url)) { setImgError(T('badLink')); return; }
    setImgError('');
    show.image = url;
    $('[data-link-form]', body).hidden = true;
    $('#fImgUrl', body).value = '';
    renderImage(); touch();
  });
  $('[data-upload]', body).addEventListener('click', () => $('#fImgFile', body).click());
  $('#fImgFile', body).addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      show.image = await readImageFile(file);
      setImgError('');
      renderImage(); touch();
    } catch (err) { setImgError(err.message); }
  });
  $('[data-remove-img]', body).addEventListener('click', () => { show.image = ''; renderImage(); touch(); });
  $('[data-linked]', body).addEventListener('click', (e) => {
    if (!e.target.closest('[data-unlink]')) return;
    show.tvmaze = null;
    renderImage(); touch();
  });

  if (isNew) {
    $('[data-add]', sheet).addEventListener('click', () => {
      show.title = show.title.trim();
      show.altTitle = show.altTitle.trim();
      if (!show.title) {
        $('[data-dup]', body).innerHTML = `<span class="error-text">${esc(T('titleRequired'))}</span>`;
        $('#fTitle', body).focus();
        return;
      }
      if (showDuplicate()) return;
      show.createdAt = show.updatedAt = Date.now();
      state.shows.push(show);
      if (!save()) { state.shows.pop(); return; }
      renderList();
      closeTop();
      toast(T('added'));
    });
  } else {
    $('[data-delete]', body).addEventListener('click', async () => {
      const ok = await confirmBox(T('deleteConfirm', primaryTitle(show)), T('delete'), { danger: true });
      if (!ok) return;
      state.shows = state.shows.filter((s) => s.id !== show.id);
      save();
      renderList();
      // confirmBox already closed itself; now close the editor.
      setTimeout(() => closeTop(), 30);
      toast(T('deleted'));
    });
  }

  openLayer(layer, () => { if (suggestCtrl) suggestCtrl.abort(); if (dirty) renderList(); });
  wireClose(layer);
  if (isNew) setTimeout(() => $('#fTitle', body).focus(), 120);
}

/* ---------- Settings ---------- */
function openSettings() {
  const layer = sheetShell(T('settings'));
  const body = $('.sheet-body', layer);

  function render() {
    $('.sheet-head h2', layer).textContent = T('settings');
    $('[data-close]', layer).setAttribute('aria-label', T('close'));
    const missing = state.shows.filter((s) => !s.image).length;
    const canShare = !!(navigator.canShare && window.File);
    body.innerHTML = `
      <section class="section">
        <h3>${esc(T('language'))}</h3>
        <div class="seg" data-seg="lang">
          <button type="button" data-val="he" aria-pressed="${state.lang === 'he'}">עברית</button>
          <button type="button" data-val="en" aria-pressed="${state.lang === 'en'}">English</button>
        </div>
      </section>
      <section class="section">
        <h3>${esc(T('theme'))}</h3>
        <div class="seg" data-seg="theme">
          ${['system', 'light', 'dark'].map((v) => `<button type="button" data-val="${v}" aria-pressed="${state.theme === v}">${esc(T('theme' + v[0].toUpperCase() + v.slice(1)))}</button>`).join('')}
        </div>
      </section>
      <section class="section">
        <h3>${esc(T('categories'))}</h3>
        <span class="hint">${esc(T('categoriesHint'))}</span>
        <div class="section" data-cats></div>
        <button type="button" class="btn" data-add-cat>${icon('plus')}${esc(T('addCategory'))}</button>
      </section>
      <section class="section">
        <h3>${esc(T('posters'))}</h3>
        <button type="button" class="btn" data-fill ${missing ? '' : 'disabled'}>${icon('image')}${esc(missing ? T('fillMissing', missing) : T('noMissing'))}</button>
      </section>
      <section class="section">
        <h3>${esc(T('backup'))}</h3>
        <span class="hint">${esc(T('backupHint'))}</span>
        <span class="hint"><strong>${esc(state.lastBackup ? T('lastBackup', fmtDate(state.lastBackup)) : T('neverBackedUp'))}</strong></span>
        <div class="btn-row">
          <button type="button" class="btn grow" data-export>${icon('download')}${esc(T('exportFile'))}</button>
          ${canShare ? `<button type="button" class="btn grow" data-share>${icon('share')}${esc(T('shareFile'))}</button>` : ''}
        </div>
        <button type="button" class="btn" data-import>${icon('upload')}${esc(T('importFile'))}</button>
        <input type="file" id="importInput" accept="application/json,.json" hidden>
      </section>
      <section class="section">
        <h3>${esc(T('about'))}</h3>
        <span class="hint">${esc(T('aboutText'))}</span>
        <span class="hint">${esc(T('credit'))}</span>
      </section>`;
    renderCats();
  }

  function renderCats() {
    const box = $('[data-cats]', body);
    box.innerHTML = state.statuses.map((st, i) => {
      const n = state.shows.filter((s) => s.status === st.id).length;
      return `
        <div class="cat-row" data-cat="${esc(st.id)}">
          <input type="color" value="${st.color}" data-color aria-label="color">
          <div class="cat-names">
            <input class="input" dir="rtl" data-he value="${esc(st.he)}" placeholder="${esc(T('nameHe'))}" aria-label="${esc(T('nameHe'))}">
            <input class="input" dir="ltr" data-en value="${esc(st.en)}" placeholder="${esc(T('nameEn'))}" aria-label="${esc(T('nameEn'))}">
          </div>
          <div class="cat-tools">
            <button type="button" class="icon-btn" data-move="-1" aria-label="${esc(T('moveUp'))}" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button>
            <button type="button" class="icon-btn" data-move="1" aria-label="${esc(T('moveDown'))}" ${i === state.statuses.length - 1 ? 'disabled' : ''}>${icon('down')}</button>
          </div>
          <div class="cat-foot">
            <span>${esc(countLabel(n))}</span>
            <button type="button" class="btn small danger" data-del-cat>${icon('trash')}${esc(T('deleteCategory'))}</button>
          </div>
        </div>`;
    }).join('');
  }

  body.addEventListener('click', async (e) => {
    const seg = e.target.closest('[data-seg] button');
    if (seg) {
      const key = seg.parentElement.dataset.seg;
      state[key] = seg.dataset.val;
      save(); applyPrefs(); renderList(); render();
      return;
    }
    const row = e.target.closest('[data-cat]');
    if (row && e.target.closest('[data-move]')) {
      const i = state.statuses.findIndex((s) => s.id === row.dataset.cat);
      const j = i + +e.target.closest('[data-move]').dataset.move;
      if (j < 0 || j >= state.statuses.length) return;
      [state.statuses[i], state.statuses[j]] = [state.statuses[j], state.statuses[i]];
      save(); renderCats(); renderList();
      return;
    }
    if (row && e.target.closest('[data-del-cat]')) {
      deleteCategory(row.dataset.cat);
      return;
    }
    if (e.target.closest('[data-add-cat]')) {
      const color = NEW_CATEGORY_COLORS[state.statuses.length % NEW_CATEGORY_COLORS.length];
      state.statuses.push({ id: 'c' + uid(), he: '', en: '', color });
      save(); renderCats(); renderList();
      const inputs = body.querySelectorAll('[data-cat] [data-he]');
      const last = inputs[inputs.length - 1];
      last.scrollIntoView({ block: 'center' });
      last.focus();
      return;
    }
    if (e.target.closest('[data-fill]')) {
      const queue = state.shows.filter((s) => !s.image);
      if (queue.length) openPicker({ queue });
      return;
    }
    if (e.target.closest('[data-export]')) { exportBackup(); render(); return; }
    if (e.target.closest('[data-share]')) { await shareBackup(); render(); return; }
    if (e.target.closest('[data-import]')) { $('#importInput', body).click(); }
  });

  body.addEventListener('input', (e) => {
    const row = e.target.closest('[data-cat]');
    if (!row) return;
    const st = statusById(row.dataset.cat);
    if (!st) return;
    if (e.target.matches('[data-he]')) st.he = e.target.value;
    else if (e.target.matches('[data-en]')) st.en = e.target.value;
    else if (e.target.matches('[data-color]') && isColor(e.target.value)) st.color = e.target.value;
    save(); renderList();
  });

  body.addEventListener('change', async (e) => {
    if (e.target.id !== 'importInput') return;
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    let data = null;
    try { data = normalizeState(JSON.parse(await file.text())); } catch (err) { data = null; }
    if (!data) { toast(T('badFile'), 4000); return; }
    const ok = await confirmBox(T('importConfirm', state.shows.length, data.shows.length), T('replace'), { danger: true });
    if (!ok) return;
    // Keep this phone's display preferences.
    Object.assign(data, { lang: state.lang, theme: state.theme, view: state.view, sort: state.sort, tab: 'all', lastBackup: state.lastBackup });
    state = data;
    save(); applyPrefs(); renderList(); render();
    toast(T('imported'));
  });

  async function deleteCategory(catId) {
    const st = statusById(catId);
    if (!st) return;
    if (state.statuses.length === 1) { toast(T('lastCategory')); return; }
    const inCat = state.shows.filter((s) => s.status === catId);
    let target = null;
    if (inCat.length) {
      target = await pickMoveTarget(st, inCat.length);
      if (!target) return;
    } else if (!(await confirmBox(T('deleteCategoryConfirm', statusLabel(st)), T('delete'), { danger: true }))) {
      return;
    }
    inCat.forEach((s) => { s.status = target; s.updatedAt = Date.now(); });
    state.statuses = state.statuses.filter((s) => s.id !== catId);
    save(); renderCats(); renderList();
  }

  function pickMoveTarget(st, n) {
    return new Promise((resolve) => {
      let answer = null;
      const others = state.statuses.filter((s) => s.id !== st.id);
      const dlg = el(`
        <div class="layer center" role="dialog" aria-modal="true">
          <div class="sheet">
            <div class="sheet-body">
              <p style="margin:0"><strong>${esc(T('deleteCategoryConfirm', statusLabel(st)))}</strong></p>
              <label class="field"><span class="label">${esc(T('moveTo', n))}</span>
                <select class="select" id="moveTarget">${others.map((o) => `<option value="${esc(o.id)}">${esc(statusLabel(o))}</option>`).join('')}</select>
              </label>
            </div>
            <div class="sheet-foot">
              <button type="button" class="btn grow" data-no>${esc(T('cancel'))}</button>
              <button type="button" class="btn danger solid grow" data-yes>${esc(T('moveAndDelete'))}</button>
            </div>
          </div>
        </div>`);
      openLayer(dlg, () => resolve(answer));
      $('[data-no]', dlg).addEventListener('click', () => closeTop());
      $('[data-yes]', dlg).addEventListener('click', () => { answer = $('#moveTarget', dlg).value; closeTop(); });
    });
  }

  render();
  openLayer(layer);
  wireClose(layer);
}

/* ---------- Backup ---------- */
function backupFile() {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const payload = { ...state, exportedAt: Date.now(), app: 'series-tracker' };
  return new File([JSON.stringify(payload, null, 2)], `series-backup-${stamp}.json`, { type: 'application/json' });
}
function markBackedUp() {
  state.lastBackup = Date.now();
  save();
}
function exportBackup() {
  const file = backupFile();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  markBackedUp();
  toast(T('exported'));
}
async function shareBackup() {
  const file = backupFile();
  if (!navigator.canShare || !navigator.canShare({ files: [file] })) { exportBackup(); return; }
  try {
    await navigator.share({ files: [file], title: file.name });
    markBackedUp();
    toast(T('exported'));
  } catch (e) { /* user closed the share sheet */ }
}

/* ---------- Boot ---------- */
function init() {
  load();
  applyPrefs();
  renderList();

  $('#chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    state.tab = b.dataset.tab;
    save();
    renderList();
    window.scrollTo({ top: 0 });
  });
  $('#list').addEventListener('click', (e) => {
    const fav = e.target.closest('[data-fav]');
    if (fav) { toggleFavorite(fav.dataset.fav); return; }
    const open = e.target.closest('[data-open]');
    if (open) openEditor(open.dataset.open);
  });
  // A broken image link falls back to the title tile underneath.
  document.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG' && e.target.closest('.poster')) e.target.remove();
  }, true);
  $('#searchInput').addEventListener('input', debounce((e) => { query = e.target.value.trim(); renderList(); }, 120));
  $('#sortSelect').addEventListener('change', (e) => { state.sort = e.target.value; save(); renderList(); });
  $('#viewToggle').addEventListener('click', () => {
    state.view = state.view === 'grid' ? 'list' : 'grid';
    save(); applyPrefs(); renderList();
  });
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#addBtn').addEventListener('click', () => openEditor(null));

  // Ask the browser not to evict our data under storage pressure.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
