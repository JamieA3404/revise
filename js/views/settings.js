/* =========================================================================
   settings.js — AI key, set texts, daily time, exam dates, timer, backup.
   ========================================================================= */

const SettingsView = {
  html() {
    const st = S.settings;
    const field = (label, name, type, val, extra = '') =>
      `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(val)}" ${extra}></label>`;
    const models = ['gpt-5.4-mini', 'gpt-5.4', 'gpt-5.5', 'gpt-4.1-mini', 'gpt-4o-mini'];
    const modelSelect = (name, val) => `<select name="${name}">${[...new Set([val, ...models])].map(m => `<option ${m === val ? 'selected' : ''}>${m}</option>`).join('')}</select>`;
    const key = AI.key();

    return `
      <h1>Settings</h1>

      <section class="card">
        <h2>🤖 AI tutor (OpenAI)</h2>
        <p class="small">Your key is saved <b>only in this browser on this device</b>. It isn't in the app's code or your backups. Add it on each device you use.
        Set a monthly spend limit at <a href="https://platform.openai.com/settings/organization/limits" target="_blank" rel="noopener">platform.openai.com → Limits</a>.</p>
        <label class="field"><span>API key ${key ? '✅ saved' : ''}</span>
          <input id="ai-key" type="password" autocomplete="off" placeholder="${key ? '•••• saved — paste a new key to replace' : 'sk-...'}"></label>
        <div class="row wrap">
          <button class="btn btn-green btn-sm" data-act="save-key">Save key</button>
          ${key ? '<button class="btn btn-white btn-sm" data-act="test-key">Test it</button><button class="btn btn-white btn-sm" data-act="del-key">Remove key</button>' : ''}
        </div>
        <div class="field-row mt">
          <label class="field"><span>Model for lessons & tests</span>${modelSelect('model', st.model)}</label>
          <label class="field"><span>Model for marking</span>${modelSelect('markModel', st.markModel)}</label>
        </div>
        <button class="btn btn-white btn-sm" data-act="clear-cache">Clear saved lessons</button>
      </section>

      <section class="card">
        <h2>📚 Your set texts & specs</h2>
        <p class="muted small">These make English Literature topics and AI lessons match exactly what you study.</p>
        <div class="field-row">
          ${field('Shakespeare play', 'texts.shakespeare', 'text', st.texts.shakespeare, 'placeholder="e.g. Macbeth"')}
          ${field('19th-century novel', 'texts.novel', 'text', st.texts.novel, 'placeholder="e.g. A Christmas Carol"')}
          ${field('Modern text', 'texts.modern', 'text', st.texts.modern)}
          ${field('Poetry cluster', 'texts.poetry', 'text', st.texts.poetry, 'placeholder="e.g. Power and Conflict"')}
          ${field('Geography spec', 'geoSpec', 'text', st.geoSpec, 'placeholder="Eduqas Geography A or B?"')}
          ${field('Product Design board/spec', 'dtBoard', 'text', st.dtBoard, 'placeholder="e.g. AQA D&T 8552"')}
        </div>
      </section>

      <section class="card">
        <h2>⏱ Daily revision time</h2>
        <p class="muted small">Minutes per day (minimum 60). Changing these rebuilds your roadmap.</p>
        <div class="field-row three">
          ${field('School days', 'mins.weekday', 'number', st.mins.weekday, 'min="60" max="600" step="15"')}
          ${field('Weekends', 'mins.weekend', 'number', st.mins.weekend, 'min="60" max="600" step="15"')}
          ${field('Holidays', 'mins.holiday', 'number', st.mins.holiday, 'min="60" max="600" step="15"')}
        </div>
      </section>

      <section class="card">
        <h2>📅 Dates</h2>
        <p class="muted small">Check against your school's mock timetable and the official exam timetable.</p>
        <div class="field-row">
          ${field('Mocks start', 'mockStart', 'date', st.mockStart)}
          ${field('Mocks end', 'mockEnd', 'date', st.mockEnd)}
          ${field('First final exam', 'examStart', 'date', st.examStart)}
          ${field('Last final exam', 'examEnd', 'date', st.examEnd)}
          ${field('Product Design NEA deadline', 'neaUntil', 'date', st.neaUntil)}
        </div>
      </section>

      <section class="card">
        <h2>🎧 Focus timer</h2>
        <div class="field-row">
          ${field('Focus length (min)', 'workMin', 'number', st.workMin, 'min="1" max="180"')}
          ${field('Break length (min)', 'breakMin', 'number', st.breakMin, 'min="1" max="60"')}
          ${field('Your first name', 'name', 'text', st.name, 'placeholder="optional"')}
        </div>
        ${field('Spotify playlist link (for the 🎵 button)', 'spotify', 'url', st.spotify, 'placeholder="https://open.spotify.com/playlist/…"')}
        <label class="field check-field"><input name="sfx" type="checkbox" ${st.sfx ? 'checked' : ''}> <span>Sound effects</span></label>
        ${S.tracks.length ? `<p class="small"><b>Your audio:</b> ${S.tracks.map(t => `${esc(t.name)} <button class="icon-btn sm" data-act="del-track" data-id="${t.id}" aria-label="Delete">✕</button>`).join(' ')}</p>` : ''}
      </section>

      <section class="card">
        <h2>💾 Backup & move devices</h2>
        <p class="muted small">Export saves your roadmap, scores and settings to a file. Import it on your other device (this <b>replaces</b> its data). Your API key and audio aren't included.</p>
        <div class="row wrap">
          <button class="btn btn-blue" data-act="export">⬇ Export data</button>
          <label class="btn btn-white">⬆ Import data<input type="file" accept="application/json,.json" data-act="import" hidden></label>
        </div>
      </section>

      <section class="card">
        <h2>Danger zone</h2>
        <div class="row wrap">
          <button class="btn btn-white btn-sm" data-act="rebuild">↻ Rebuild roadmap from today</button>
          <button class="btn btn-red btn-sm" data-act="reset">Delete all data</button>
        </div>
      </section>`;
  },

  bind(root) {
    root.onchange = e => {
      const el = e.target;
      if (el.dataset.act === 'import') return this.importFile(el.files[0]);
      if (!el.name) return;
      const st = S.settings;
      let val = el.type === 'checkbox' ? el.checked : el.value.trim();
      if (el.type === 'number') val = Math.max(Number(el.min) || 1, Number(el.value) || 0);
      if (el.type === 'date' && !val) return;
      const [a, b] = el.name.split('.');
      if (b) st[a][b] = val; else st[a] = val;
      save();
      if (a === 'spotify') Music.render();
      // Anything that changes the plan rebuilds it
      if (['mins', 'mockStart', 'mockEnd', 'examStart', 'neaUntil'].includes(a)) { buildPlan(true); toast('Saved. Roadmap rebuilt', '🗺️', 'blue'); }
      else toast('Saved', '✓', 'blue');
    };
    root.onclick = async e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      switch (b.dataset.act) {
        case 'save-key': {
          const v = $('#ai-key').value.trim();
          if (!v.startsWith('sk-')) return alert('That doesn\'t look like an OpenAI key (they start with "sk-").');
          AI.setKey(v); render(); toast('Key saved on this device', '🔑');
          break;
        }
        case 'del-key': if (confirm('Remove the API key from this device?')) { AI.setKey(''); render(); } break;
        case 'test-key':
          b.disabled = true; b.textContent = 'Testing…';
          try {
            const r = await AI.json('You are a test.', 'Return {"ok": true, "msg": "a 6-word motivational line for a GCSE student"}', { maxTokens: 300 });
            toast('Works! ' + (r.msg || ''), '✅');
          } catch (err) { alert('Key test failed: ' + err.message); }
          render();
          break;
        case 'clear-cache': localStorage.removeItem(AI_CACHE_STORE); toast('Saved lessons cleared', '🧹', 'blue'); break;
        case 'del-track': await Tracks.remove(b.dataset.id); render(); break;
        case 'export': this.exportFile(); break;
        case 'rebuild': buildPlan(true); toast('Roadmap rebuilt', '🗺️', 'blue'); break;
        case 'reset':
          if (confirm('Delete ALL your data on this device? Export a backup first if you might want it.') && confirm('Really sure? This can\'t be undone.')) {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(AI_CACHE_STORE);
            location.reload();
          }
          break;
      }
    };
  },

  exportFile() {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `revise-backup-${todayKey()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Backup downloaded', '⬇', 'blue');
  },

  async importFile(file) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || !data.settings) throw new Error('This doesn\'t look like a Revise backup.');
      if (!confirm('Replace everything on this device with this backup?')) return;
      data.tracks = S.tracks; // audio files live on each device
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      S = load();
      ensurePlan();
      render();
      toast('Backup imported!', '✅');
    } catch (err) { alert('Import failed: ' + err.message); }
  },
};
