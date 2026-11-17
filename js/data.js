/* =========================================================================
   data.js — the app's saved state and small shared helpers.

   Everything you save lives in ONE object called S ("state"), stored in the
   browser's localStorage under STORAGE_KEY. Call save() after changing S.
   Your OpenAI key is stored SEPARATELY (see ai.js) so it's never exported.
   ========================================================================= */

const STORAGE_KEY = 'revise-data-v1';

// The kinds of revision session the planner creates
const KINDS = {
  learn:      { name: 'Learn & test',  emoji: '📘', mins: 30 },
  review:     { name: 'Keep it fresh', emoji: '🔁', mins: 10 },
  paper:      { name: 'Past paper',    emoji: '📝', mins: 90 },
  mockreview: { name: 'Mock debrief',  emoji: '🔍', mins: 30 },
  nea:        { name: 'NEA work',      emoji: '🛠️', mins: 30 },
};

/* ---------- Date helpers (dates are "YYYY-MM-DD" strings in local time) ---------- */
function keyOf(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function todayKey() { return keyOf(new Date()); }
function fromKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(k, n) { const d = fromKey(k); d.setDate(d.getDate() + n); return keyOf(d); }
function daysBetween(a, b) { return Math.round((fromKey(b) - fromKey(a)) / 86400000); }
function mondayOf(k) { const d = fromKey(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return keyOf(d); }
function fmtDate(k, opts = { day: 'numeric', month: 'short' }) { return fromKey(k).toLocaleDateString('en-GB', opts); }
function fmtMins(m) {
  m = Math.round(m);
  if (m < 60) return m + 'm';
  return Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '');
}

/* ---------- Small utilities ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
// Escape text before putting it into HTML
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function subj(id) { return SUBJECTS.find(s => s.id === id) || { id: 'other', name: 'Other', board: '', emoji: '⭐', color: '#8A94A6' }; }

/* ---------- The saved state ---------- */
function defaultState() {
  return {
    version: 2,
    createdAt: todayKey(),
    settings: {
      name: '',
      workMin: 25, breakMin: 5,
      mockStart: '2026-12-01', mockEnd: '2026-12-12',
      examStart: '2027-05-10', examEnd: '2027-06-23',
      sound: 'brown', volume: 0.5, sfx: true,
      lofiVol: 0.6,         // study lofi volume (lofi.js)
      lofiBpm: null,        // your lofi tempo, or null to use each vibe's own
      cutsceneDaily: true,  // play the hype cutscene before your first session each day
      // Minutes of revision per day (never less than 60)
      mins: { weekday: 60, weekend: 90, holiday: 120 },
      neaUntil: '2027-03-31',
      startDate: '2026-11-18', // first day of revision (Settings → "Start revision on")
      // AI models (see ai.js). "model" makes lessons & tests, "markModel" marks your work.
      model: 'gpt-5.4-mini', markModel: 'gpt-5.4',
      // Your set texts — used for English Literature topics and AI lessons
      texts: { shakespeare: '', novel: '', modern: 'An Inspector Calls', poetry: '' },
      geoSpec: '',   // e.g. "Eduqas Geography A" or "B"
      dtBoard: '',   // e.g. "AQA D&T 8552"
    },
    plan: null,      // the roadmap (see planner.js)
    mastery: {},     // topicId -> { score, learned, n, last, due, history: [{d, s, kind}] }
    lastPaper: {},   // subjectId -> date of last past paper
    paperNo: {},     // subjectId -> how many papers done (to pick the next one)
    papers: [],      // marked papers: { id, date, subject, name, percent, grade, summary }
    activity: {},    // date -> minutes of revision completed
    focusLog: [],
    lastCutscene: '',
    bestStreak: 0,
    tracks: [],
  };
}

function load() {
  const base = defaultState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === 'object') {
      const settings = { ...base.settings, ...(saved.settings || {}) };
      for (const k of ['mins', 'texts']) settings[k] = { ...base.settings[k], ...((saved.settings || {})[k] || {}) };
      if (saved.version !== 2) {
        // Upgrading from version 1: keep settings, XP, streak, audio; start the new roadmap fresh
        return { ...base, settings, createdAt: saved.createdAt || base.createdAt,
                 bestStreak: saved.bestStreak || 0, tracks: saved.tracks || [], focusLog: saved.focusLog || [] };
      }
      return { ...base, ...saved, settings };
    }
  } catch (e) { console.warn('Could not load saved data', e); }
  return base;
}

function save() {
  // Stamp when this device last changed something (used when merging with your other device)
  if (!((typeof Sync !== 'undefined') && Sync.applying)) S.updatedAt = Date.now();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); }
  catch (e) { console.error('Save failed', e); alert('Could not save — storage may be full.'); }
  if ((typeof Sync !== 'undefined')) Sync.changed(); // sync to your other device (sync.js)
}

let S = load();

/* ---------- Activity (for the streak) ---------- */
function addActivity(mins) { S.activity[todayKey()] = (S.activity[todayKey()] || 0) + mins; save(); }
function isActiveDay(k) { return (S.activity[k] || 0) > 0 || S.focusLog.some(f => f.date === k); }
