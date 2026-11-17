/* =========================================================================
   settings.js — timer lengths, exam dates, sounds, backup (export/import).
   ========================================================================= */

const SettingsView = {
  html() {
    const st = S.settings;
    const field = (label, name, type, extra = '') =>
      `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(st[name])}" ${extra}></label>`;

    return `
      <h1>Settings</h1>

      <section class="card">
        <h2>You</h2>
        ${field('Your first name (for greetings)', 'name', 'text', 'autocomplete="off" placeholder="optional"')}
        ${field('Weekly goal (tasks for ⭐⭐⭐)', 'weeklyGoal', 'number', 'min="1" max="200"')}
      </section>

      <section class="card">
        <h2>Focus timer</h2>
        <div class="field-row">
          ${field('Focus length (minutes)', 'workMin', 'number', 'min="1" max="180"')}
          ${field('Break length (minutes)', 'breakMin', 'number', 'min="1" max="60"')}
        </div>
        <label class="field check-field"><input name="sfx" type="checkbox" ${st.sfx ? 'checked' : ''}> <span>Reward sound effects (dings, fanfares)</span></label>
        <button class="btn btn-white btn-sm" data-act="notify">🔔 Allow timer notifications</button>
      </section>

      <section class="card">
        <h2>Exam dates</h2>
        <p class="muted small">Check these against your school's mock timetable and the official exam timetable, and change them if needed.</p>
        <div class="field-row">
          ${field('Mocks start', 'mockStart', 'date')}
          ${field('Mocks end', 'mockEnd', 'date')}
        </div>
        <div class="field-row">
          ${field('First final exam', 'examStart', 'date')}
          ${field('Last final exam', 'examEnd', 'date')}
        </div>
      </section>

      <section class="card">
        <h2>My audio</h2>
        <p class="muted small">Your own audio files are stored on this device and work offline. (They are not included in backups. Add them again on each device.)</p>
        <ul class="topics">
          ${S.tracks.map(t => `<li class="topic"><span class="topic-name">🎵 ${esc(t.name)}</span>
            <button class="icon-btn sm" data-act="del-track" data-id="${t.id}" aria-label="Delete">✕</button></li>`).join('') || '<li class="muted small">None yet.</li>'}
        </ul>
        <label class="btn btn-white btn-sm">＋ Add audio file<input type="file" accept="audio/*" data-act="upload" hidden></label>
      </section>

      <section class="card">
        <h2>Backup & move devices</h2>
        <p class="muted small">Export saves everything (tasks, plan, XP, badges, topics) into a file. On your other device, use Import to load that file. Import <b>replaces</b> what's on that device.</p>
        <div class="row wrap">
          <button class="btn btn-blue" data-act="export">⬇ Export data</button>
          <label class="btn btn-white">⬆ Import data<input type="file" accept="application/json,.json" data-act="import" hidden></label>
        </div>
      </section>

      <section class="card">
        <h2>Danger zone</h2>
        <button class="btn btn-red btn-sm" data-act="reset">Delete all data</button>
      </section>

      <p class="muted small center-text">Revise · works offline · your data stays on this device</p>`;
  },

  bind(root) {
    // Save any setting as soon as it changes
    root.onchange = async e => {
      const el = e.target;
      if (el.dataset.act === 'import') return this.importFile(el.files[0]);
      if (el.dataset.act === 'upload' && el.files[0]) {
        await Tracks.add(el.files[0]); toast('Audio saved', '🎵', 'blue'); render(); return;
      }
      if (!el.name) return;
      const st = S.settings;
      if (el.type === 'checkbox') st[el.name] = el.checked;
      else if (el.type === 'number') st[el.name] = Math.max(1, Number(el.value) || 1);
      else if (el.type === 'date') { if (el.value) st[el.name] = el.value; }
      else st[el.name] = el.value.trim();
      save();
      toast('Saved', '✓', 'blue');
    };
    root.onclick = async e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      switch (b.dataset.act) {
        case 'export': this.exportFile(); break;
        case 'del-track': await Tracks.remove(b.dataset.id); render(); break;
        case 'notify':
          if (!('Notification' in window)) return alert('Notifications aren\'t supported here. On iPad, they work once the app is installed to your Home Screen.');
          Notification.requestPermission().then(p => toast(p === 'granted' ? 'Notifications on' : 'Notifications not allowed', '🔔', 'blue'));
          break;
        case 'reset':
          if (confirm('Delete ALL your data on this device? Export a backup first if you might want it.') && confirm('Really sure? This can\'t be undone.')) {
            localStorage.removeItem(STORAGE_KEY);
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
      if (!data || typeof data !== 'object' || !data.days || !data.settings) throw new Error('This doesn\'t look like a Revise backup.');
      if (!confirm('Replace everything on this device with this backup?')) return;
      // Keep this device's audio track list (audio files aren't in backups)
      data.tracks = S.tracks;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      S = load();
      render();
      toast('Backup imported!', '✅');
    } catch (err) { alert('Import failed: ' + err.message); }
  },
};
