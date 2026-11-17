/* =========================================================================
   sync.js — keeps your Mac and iPad in sync using a secret GitHub Gist.

   • You paste a GitHub token (gist permission only) into Settings on each
     device. The app finds (or creates) one secret gist called
     "Revise sync data" and stores your progress there.
   • It syncs when the app opens, when you switch back to it, every 30 s
     while open, and a few seconds after any change.
   • Both devices' changes are MERGED, not overwritten: finished sessions,
     scores, papers and focus time from both are kept.
   • Never synced: your OpenAI key, this token, and your audio files.
   ========================================================================= */

const SYNC_TOKEN = 'revise-sync-token';
const SYNC_GIST = 'revise-sync-gist';
const GIST_DESC = 'Revise sync data (used by your Revise app, please don\'t edit)';
const GIST_FILE = 'revise-data.json';

const Sync = {
  status: 'off',     // 'off' | 'syncing' | 'ok' | 'offline' | 'error'
  error: '',
  lastSync: 0,
  busy: false,
  dirty: false,
  applying: false,   // true while we load merged data (so it doesn't count as a new change)

  token() { try { return localStorage.getItem(SYNC_TOKEN) || ''; } catch (e) { return ''; } },
  gistId() { try { return localStorage.getItem(SYNC_GIST) || ''; } catch (e) { return ''; } },
  enabled() { return !!(this.token() && this.gistId()); },

  async api(path, opts = {}) {
    const res = await fetch('https://api.github.com' + path, {
      ...opts,
      headers: { Authorization: 'Bearer ' + this.token(), Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    });
    if (res.status === 401) throw new Error('GitHub rejected the token. Make a new one with the "gist" box ticked.');
    if (!res.ok) throw new Error('GitHub error ' + res.status);
    return res.status === 204 ? null : res.json();
  },

  /* First-time setup on a device: find your sync gist, or create it */
  async connect(token) {
    localStorage.setItem(SYNC_TOKEN, token.trim());
    try {
      let found = null;
      for (let page = 1; page <= 10 && !found; page++) {
        const list = await this.api(`/gists?per_page=100&page=${page}`);
        found = list.find(g => g.description === GIST_DESC && g.files[GIST_FILE]);
        if (list.length < 100) break;
      }
      if (found) {
        localStorage.setItem(SYNC_GIST, found.id);
        this.firstLink = true; // this device is joining: your synced data's settings win
        await this.syncNow();
        this.start();
        return 'linked';
      }
      const g = await this.api('/gists', { method: 'POST', body: JSON.stringify({
        description: GIST_DESC, public: false, files: { [GIST_FILE]: { content: this.pack(S) } } }) });
      localStorage.setItem(SYNC_GIST, g.id);
      this.status = 'ok'; this.lastSync = Date.now();
      this.start();
      return 'created';
    } catch (e) {
      localStorage.removeItem(SYNC_TOKEN);
      throw e;
    }
  },

  disconnect() {
    localStorage.removeItem(SYNC_TOKEN);
    localStorage.removeItem(SYNC_GIST);
    clearInterval(this.poll); this.poll = null;
    this.status = 'off';
    renderStatbar();
  },

  // What gets uploaded (audio track list stays on each device)
  pack(state) { return JSON.stringify({ syncedAt: Date.now(), state: { ...state, tracks: [] } }); },

  async pull() {
    const g = await this.api('/gists/' + this.gistId());
    const f = g.files[GIST_FILE];
    if (!f) return null;
    let text = f.content;
    if (f.truncated) text = await (await fetch(f.raw_url)).text(); // big files come separately
    return JSON.parse(text).state;
  },

  /* Pull, merge, apply, and push back if anything is new */
  async syncNow() {
    if (!this.enabled() || this.busy) return;
    if (navigator.onLine === false) { this.status = 'offline'; renderStatbar(); return; }
    this.busy = true; this.dirty = false;
    this.status = 'syncing'; renderStatbar();
    try {
      const remote = await this.pull();
      // On first connect, treat this device's data as older so it can't overwrite your settings
      const local = this.firstLink ? { ...S, updatedAt: 0 } : S;
      this.firstLink = false;
      const merged = remote ? mergeStates(local, remote) : S;
      merged.tracks = S.tracks;
      if (stableJSON(merged) !== stableJSON(S)) {
        this.applying = true;
        S = merged;
        save();
        this.applying = false;
        this.refreshScreen();
      }
      if (!remote || stableJSON({ ...merged, tracks: [] }) !== stableJSON({ ...remote, tracks: [] })) {
        await this.api('/gists/' + this.gistId(), { method: 'PATCH', body: JSON.stringify({ files: { [GIST_FILE]: { content: this.pack(S) } } }) });
      }
      this.status = 'ok'; this.error = ''; this.lastSync = Date.now();
    } catch (e) {
      this.applying = false;
      this.status = navigator.onLine === false ? 'offline' : 'error';
      this.error = e.message;
      console.warn('Sync failed', e);
    }
    this.busy = false;
    renderStatbar();
    if (this.dirty) this.changed();
  },

  // Called after every save(): push a few seconds later (batches quick changes)
  changed() {
    if (this.applying || !this.enabled()) return;
    this.dirty = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.syncNow(), 2500);
  },

  // Redraw with new data, but never while you're typing
  refreshScreen() {
    const a = document.activeElement;
    if (a && a.matches('input, textarea, select') && $('#view').contains(a)) return;
    if (!$('#cutscene')) render();
  },

  start() {
    if (!this.enabled() || this.poll) return;
    this.syncNow();
    this.poll = setInterval(() => { if (!document.hidden) this.syncNow(); }, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.syncNow(); });
    window.addEventListener('online', () => this.syncNow());
  },

  label() {
    if (!this.enabled()) return '';
    const ago = this.lastSync ? Math.round((Date.now() - this.lastSync) / 1000) : null;
    return { syncing: '☁️ Syncing…', ok: '☁️ Synced', offline: '📴 Offline', error: '⚠️ Sync issue', off: '' }[this.status]
      + (this.status === 'ok' && ago != null && ago > 90 ? ` ${Math.round(ago / 60)}m ago` : '');
  },
};

/* ---------- Merging two copies of your data ---------- */

// JSON with sorted keys, so two copies with the same data compare equal
function stableJSON(v) {
  if (Array.isArray(v)) return '[' + v.map(stableJSON).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + stableJSON(v[k])).join(',') + '}';
  return JSON.stringify(v);
}

// How far through a session is (finished beats in-progress beats not started)
function sessionProgress(s) { return s.done ? 1e6 : (s.step || 0) * 100 + Object.keys(s.work || {}).length; }

function mergeSessions(newerList, olderList) {
  const map = new Map();
  for (const s of [...newerList, ...olderList]) {
    const k = sessionKey(s);
    const cur = map.get(k);
    if (!cur) map.set(k, s);
    else if (sessionProgress(s) > sessionProgress(cur)) map.set(k, { ...s, id: cur.id, alias: [...new Set([...(cur.alias || []), s.id])] });
    else if (s.id !== cur.id) map.set(k, { ...cur, alias: [...new Set([...(cur.alias || []), s.id])] });
  }
  return [...map.values()];
}

function mergeStates(L, R) {
  const newer = (L.updatedAt || 0) >= (R.updatedAt || 0) ? L : R, older = newer === L ? R : L;
  const out = JSON.parse(JSON.stringify(newer)); // settings etc. come from whichever changed last
  const keys = (a, b) => [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])];

  // Topic scores: keep every test result from both devices
  out.mastery = {};
  for (const id of keys(newer.mastery, older.mastery)) {
    const a = newer.mastery?.[id], b = older.mastery?.[id];
    if (!a || !b) { out.mastery[id] = JSON.parse(JSON.stringify(a || b)); continue; }
    const seen = new Set(), hist = [];
    for (const h of [...a.history, ...b.history]) { const k = h.d + '|' + h.s + '|' + h.kind; if (!seen.has(k)) { seen.add(k); hist.push(h); } }
    hist.sort((x, y) => x.d.localeCompare(y.d));
    const base = (b.last || '') > (a.last || '') || (b.last === a.last && b.n > a.n) ? b : a;
    out.mastery[id] = { ...base, history: hist.slice(-30), n: Math.max(a.n, b.n), learned: !!(a.learned || b.learned) };
  }

  // Roadmap: past days and today are merged session by session; future days get rebuilt anyway
  const today = todayKey(), ND = newer.plan?.days || {}, OD = older.plan?.days || {};
  if (newer.plan || older.plan) {
    const days = {};
    for (const k of keys(ND, OD).sort()) days[k] = k > today ? (ND[k] || OD[k]) : mergeSessions(ND[k] || [], OD[k] || []);
    out.plan = { ...(newer.plan || older.plan), days, baseline: { ...(older.plan?.baseline || {}), ...(newer.plan?.baseline || {}) } };
  }

  for (const k of keys(newer.activity, older.activity)) out.activity[k] = Math.max(newer.activity?.[k] || 0, older.activity?.[k] || 0);
  for (const k of keys(newer.lastPaper, older.lastPaper)) out.lastPaper[k] = [newer.lastPaper?.[k] || '', older.lastPaper?.[k] || ''].sort().pop();
  for (const k of keys(newer.paperNo, older.paperNo)) out.paperNo[k] = Math.max(newer.paperNo?.[k] || 0, older.paperNo?.[k] || 0);
  const byId = new Map([...(older.papers || []), ...(newer.papers || [])].map(p => [p.id, p]));
  out.papers = [...byId.values()].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const fl = new Map([...(older.focusLog || []), ...(newer.focusLog || [])].map(f => [stableJSON(f), f]));
  out.focusLog = [...fl.values()].sort((a, b) => a.date.localeCompare(b.date));
  out.bestStreak = Math.max(newer.bestStreak || 0, older.bestStreak || 0);
  out.lastCutscene = [newer.lastCutscene || '', older.lastCutscene || ''].sort().pop();
  out.createdAt = [newer.createdAt, older.createdAt].filter(Boolean).sort()[0];
  out.updatedAt = Math.max(newer.updatedAt || 0, older.updatedAt || 0);
  return out;
}
