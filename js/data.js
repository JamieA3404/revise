/* =========================================================================
   data.js — the app's "database" and small shared helpers.

   Everything you save lives in ONE object called S ("state").
   It is stored in the browser's localStorage as JSON under STORAGE_KEY.
   Call save() after changing S, and it's written to disk straight away.

   Want to change a subject's colour, emoji or name? Edit SUBJECTS below.
   Want a task type to give more XP? Edit TASK_TYPES below.
   ========================================================================= */

const STORAGE_KEY = 'revise-data-v1';

// Your subjects. "id" is used internally — don't change ids once you have data.
const SUBJECTS = [
  { id: 'maths',     name: 'Maths',              board: 'Edexcel Higher',   emoji: '📐', color: '#2F9BFF' },
  { id: 'englang',   name: 'English Language',   board: 'AQA',              emoji: '✍️', color: '#FF5C8A' },
  { id: 'englit',    name: 'English Literature', board: 'AQA',              emoji: '📚', color: '#B65CFF' },
  { id: 'physics',   name: 'Physics',            board: 'AQA Higher',       emoji: '⚡', color: '#FFB300' },
  { id: 'chemistry', name: 'Chemistry',          board: 'AQA Higher',       emoji: '🧪', color: '#00C2A8' },
  { id: 'biology',   name: 'Biology',            board: 'AQA Higher',       emoji: '🧬', color: '#3CC84B' },
  { id: 'geography', name: 'Geography',          board: 'Eduqas',           emoji: '🌍', color: '#1FB5D6' },
  { id: 'business',  name: 'Business',           board: 'Edexcel',          emoji: '💼', color: '#FF8A1F' },
  { id: 'dit',       name: 'Digital IT',         board: 'BTEC Component 3', emoji: '💻', color: '#6C6CFF' },
  { id: 'dt',        name: 'Product Design',     board: 'NEA + exam',       emoji: '🛠️', color: '#FF5A4E' },
];

// Kinds of revision. "xp" is how much XP ticking one off is worth.
const TASK_TYPES = [
  { id: 'flashcards', name: 'Flashcards',      emoji: '🃏', xp: 20 },
  { id: 'braindump',  name: 'Brain dump',      emoji: '🧠', xp: 20 },
  { id: 'questions',  name: 'Topic questions', emoji: '❓', xp: 25 },
  { id: 'pastpaper',  name: 'Past paper',      emoji: '📝', xp: 50 },
  { id: 'nea',        name: 'NEA work',        emoji: '🛠️', xp: 30 },
];

/* ---------- Date helpers ----------
   Dates are stored as "YYYY-MM-DD" strings ("keys") in your local time. */
function keyOf(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function todayKey() { return keyOf(new Date()); }
function fromKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(k, n) { const d = fromKey(k); d.setDate(d.getDate() + n); return keyOf(d); }
function daysBetween(a, b) { return Math.round((fromKey(b) - fromKey(a)) / 86400000); }
// Monday of the week containing date k
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
// Escape text before putting it into HTML (stops typed "<" breaking the page)
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function subj(id) { return SUBJECTS.find(s => s.id === id) || { id: 'other', name: 'Other', board: '', emoji: '⭐', color: '#8A94A6' }; }
function ttype(id) { return TASK_TYPES.find(t => t.id === id) || TASK_TYPES[0]; }
function subjectOptions(selected) {
  return SUBJECTS.map(s => `<option value="${s.id}" ${s.id === selected ? 'selected' : ''}>${s.emoji} ${esc(s.name)}</option>`).join('');
}
function typeOptions(selected) {
  return TASK_TYPES.map(t => `<option value="${t.id}" ${t.id === selected ? 'selected' : ''}>${t.emoji} ${t.name}</option>`).join('');
}

/* ---------- The saved state ---------- */
function defaultState() {
  return {
    version: 1,
    createdAt: todayKey(),          // the day you started using the app
    settings: {
      name: '',
      workMin: 25,
      breakMin: 5,
      mockStart: '2026-12-01',
      mockEnd: '2026-12-12',
      examStart: '2027-05-10',
      examEnd: '2027-06-23',
      weeklyGoal: 20,               // tasks per week for 3 stars on the Journey
      sound: 'brown',               // 'off' | 'brown' | 'white' | 'rain' | 'track:<id>'
      volume: 0.5,
      sfx: true,                    // reward sound effects (dings etc.)
      // Grade 9 auto-plan options (see planner.js)
      planner: { weekday: 3, weekend: 5, holiday: 5, lightDay: 5, neaUntil: '2027-03-31' },
    },
    autoPlan: null,  // the generated day-by-day plan (see planner.js), or null to use the weekly timetable
    // Weekly plan. Keys are JS weekday numbers: 0 = Sunday, 1 = Monday ... 6 = Saturday
    timetable: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
    days: {},        // "YYYY-MM-DD" -> { tasks: [...], cleared: bool }
    focusLog: [],    // { date, subject, minutes, taskId }
    topics: {},      // subjectId -> [{ id, name, rag: 'red'|'amber'|'green' }]
    topicsFixed: 0,
    xp: 0,
    gems: 0,
    bestStreak: 0,
    badges: {},      // badgeId -> date unlocked
    rewards: [
      { id: uid(), name: '30 mins gaming', cost: 60 },
      { id: uid(), name: 'Favourite snack', cost: 40 },
      { id: uid(), name: 'Episode of a show', cost: 80 },
      { id: uid(), name: 'Whole evening off', cost: 300 },
    ],
    redeemed: [],    // { name, cost, date }
    tracks: [],      // your own audio: { id, name } (the audio itself is in IndexedDB)
  };
}

function load() {
  const base = defaultState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === 'object') {
      // Merge so new settings added in future versions get their defaults
      const settings = { ...base.settings, ...(saved.settings || {}) };
      settings.planner = { ...base.settings.planner, ...((saved.settings || {}).planner || {}) };
      return { ...base, ...saved, settings };
    }
  } catch (e) { console.warn('Could not load saved data', e); }
  return base;
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); }
  catch (e) { console.error('Save failed', e); alert('Could not save — storage may be full.'); }
}

let S = load();

/* ---------- Tasks & days ---------- */
function makeTask({ subject, type, title = '', source = 'oneoff' }) {
  return { id: uid(), subject, type, title, source, done: false, doneAt: null, xp: 0 };
}

// What's planned for a day: from the auto-plan if it covers that day,
// otherwise from your weekly timetable.
function planSlotsFor(k) {
  if (S.autoPlan && S.autoPlan.days[k]) return S.autoPlan.days[k];
  return S.timetable[fromKey(k).getDay()] || [];
}

// Get the record for a day, creating it from the plan if it's new.
function ensureDay(k) {
  if (!S.days[k]) {
    S.days[k] = {
      tasks: planSlotsFor(k).map(slot => makeTask({ ...slot, source: 'plan' })),
      cleared: false,
    };
    save();
  }
  return S.days[k];
}

// Tasks that still belong to the day (not pushed to another day)
function liveTasks(day) { return day ? day.tasks.filter(t => !t.moved) : []; }

function findTask(dayKey, id) { return (S.days[dayKey]?.tasks || []).find(t => t.id === id); }

function taskLabel(t) { return t.title || ttype(t.type).name; }

/* ---------- Stats helpers ---------- */
function focusMinutesOn(k) { return S.focusLog.filter(f => f.date === k).reduce((a, f) => a + f.minutes, 0); }
function tasksDoneOn(k) { return liveTasks(S.days[k]).filter(t => t.done).length; }
function isActiveDay(k) { return tasksDoneOn(k) > 0 || focusMinutesOn(k) > 0; }
