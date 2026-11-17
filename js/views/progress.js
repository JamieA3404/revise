/* =========================================================================
   progress.js — level, streak, weekly charts, badges and the reward shop.
   ========================================================================= */

const ProgressView = {
  weekOffset: 0, // 0 = this week, -1 = last week, ...

  html() {
    const lv = levelInfo(S.xp);
    const streak = streakInfo();
    const today = todayKey();
    const monday = addDays(mondayOf(today), this.weekOffset * 7);
    const days = [...Array(7)].map((_, i) => addDays(monday, i));

    // Per-subject totals for the chosen week
    const per = {};
    for (const s of SUBJECTS) per[s.id] = { mins: 0, tasks: 0 };
    for (const d of days) {
      for (const t of liveTasks(S.days[d])) if (t.done && per[t.subject]) per[t.subject].tasks++;
      for (const f of S.focusLog) if (f.date === d && per[f.subject]) per[f.subject].mins += f.minutes;
    }
    const daily = days.map(d => ({ d, mins: focusMinutesOn(d), tasks: tasksDoneOn(d) }));
    const weekMins = daily.reduce((a, x) => a + x.mins, 0);
    const weekTasks = daily.reduce((a, x) => a + x.tasks, 0);
    const maxSubj = Math.max(1, ...Object.values(per).map(p => p.mins));
    const maxDay = Math.max(1, ...daily.map(x => x.mins));

    // This week vs last week, for a little motivational comparison
    const prev = weekStats(addDays(monday, -7));
    let compare = '';
    if (this.weekOffset === 0 && prev.mins > 0) {
      compare = weekMins >= prev.mins
        ? `🚀 You've already beaten last week's ${fmtMins(prev.mins)}!`
        : `${fmtMins(prev.mins - weekMins)} more focus to beat last week.`;
    }

    // Last 7 days streak dots
    const last7 = [...Array(7)].map((_, i) => addDays(today, i - 6));

    return `
      <div class="stat-cards">
        <section class="card card-purple level-card">
          <div class="small upper">Level ${lv.level}</div>
          <h2>⚡ ${esc(lv.title)}</h2>
          <div class="bar"><div class="bar-fill white" style="width:${lv.into / lv.need * 100}%"></div></div>
          <div class="small">${lv.into} / ${lv.need} XP to level ${lv.level + 1} · ${S.xp} XP total</div>
        </section>
        <section class="card card-orange">
          <div class="small upper">Streak</div>
          <h2>🔥 ${streak.current} day${streak.current === 1 ? '' : 's'}</h2>
          <div class="streak-dots">${last7.map(d =>
            `<span class="sdot ${isActiveDay(d) ? 'on' : ''}" title="${fmtDate(d)}">${fromKey(d).toLocaleDateString('en-GB', { weekday: 'narrow' })}</span>`).join('')}</div>
          <div class="small">Best: ${streak.best} days${streak.todayDone ? ' · today ✓' : ' · do one task to keep it going!'}</div>
        </section>
      </div>

      <section class="card">
        <div class="row between">
          <button class="icon-btn" data-act="prev" aria-label="Previous week">‹</button>
          <div class="center-text"><b>${this.weekOffset === 0 ? 'This week' : this.weekOffset === -1 ? 'Last week' : 'Week of ' + fmtDate(monday)}</b>
            <div class="muted small">${fmtDate(monday)} – ${fmtDate(days[6])}</div></div>
          <button class="icon-btn" data-act="next" aria-label="Next week" ${this.weekOffset >= 0 ? 'disabled' : ''}>›</button>
        </div>
        <div class="big-stats">
          <div><b>${fmtMins(weekMins)}</b><span>focused</span></div>
          <div><b>${weekTasks}</b><span>tasks done</span></div>
          <div><b>${'⭐'.repeat(starsFor(weekTasks)) || '—'}</b><span>of ${S.settings.weeklyGoal} goal</span></div>
        </div>
        ${compare ? `<p class="center-text small">${compare}</p>` : ''}

        <div class="day-bars">
          ${daily.map(x => `
            <div class="day-bar ${x.d === today ? 'is-today' : ''}">
              <div class="day-bar-track"><div class="day-bar-fill" style="height:${x.mins / maxDay * 100}%"></div></div>
              <div class="small">${fromKey(x.d).toLocaleDateString('en-GB', { weekday: 'short' })}</div>
              <div class="tiny muted">${x.mins ? fmtMins(x.mins) : ''}${x.tasks ? ' · ' + x.tasks + '✓' : ''}</div>
            </div>`).join('')}
        </div>

        <h3>By subject</h3>
        <ul class="subj-bars">
          ${SUBJECTS.map(s => `
            <li>
              <span class="sb-label">${s.emoji} ${esc(s.name)}</span>
              <span class="sb-track"><span class="sb-fill" style="width:${per[s.id].mins / maxSubj * 100}%;background:${s.color}"></span></span>
              <span class="sb-val">${per[s.id].mins ? fmtMins(per[s.id].mins) : '–'} · ${per[s.id].tasks}✓</span>
            </li>`).join('')}
        </ul>
      </section>

      <div class="section-head"><h2>Reward shop 🎁</h2><span class="gem-count">💎 ${S.gems}</span></div>
      <p class="muted">Earn gems by doing revision, then spend them on real treats you choose. Make the good ones expensive!</p>
      <div class="rewards">
        ${S.rewards.map(r => `
          <div class="reward card">
            <div class="reward-name">${esc(r.name)}</div>
            <button class="btn ${S.gems >= r.cost ? 'btn-yellow' : 'btn-white'} btn-sm" data-act="redeem" data-id="${r.id}" ${S.gems >= r.cost ? '' : 'disabled'}>💎 ${r.cost}</button>
            <button class="icon-btn sm" data-act="del-reward" data-id="${r.id}" aria-label="Delete reward">✕</button>
          </div>`).join('')}
      </div>
      <form class="card row wrap" data-form="reward">
        <input name="name" placeholder="New reward, e.g. Cinema trip" required autocomplete="off">
        <input name="cost" type="number" min="1" value="100" aria-label="Cost in gems" class="num">
        <button class="btn btn-green" type="submit">Add reward</button>
      </form>
      ${S.redeemed.length ? `<p class="muted small">Recently claimed: ${S.redeemed.slice(-5).reverse().map(r => esc(r.name)).join(', ')}</p>` : ''}

      <div class="section-head"><h2>Badges 🏅</h2><span class="muted">${Object.keys(S.badges).length} / ${BADGES.length}</span></div>
      <div class="badges">
        ${BADGES.map(b => `
          <div class="badge ${S.badges[b.id] ? 'got' : ''}">
            <div class="badge-emoji">${S.badges[b.id] ? b.emoji : '🔒'}</div>
            <b>${esc(b.name)}</b>
            <span>${esc(b.desc)}</span>
          </div>`).join('')}
      </div>`;
  },

  bind(root) {
    root.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      switch (b.dataset.act) {
        case 'prev': this.weekOffset--; render(); break;
        case 'next': if (this.weekOffset < 0) { this.weekOffset++; render(); } break;
        case 'redeem': {
          const r = S.rewards.find(x => x.id === b.dataset.id);
          if (!r || S.gems < r.cost) return;
          if (!confirm(`Spend ${r.cost} gems on "${r.name}"?`)) return;
          S.gems -= r.cost;
          S.redeemed.push({ name: r.name, cost: r.cost, date: todayKey() });
          save();
          Sfx.coin();
          Celebrate.show({ emoji: '🎁', title: 'Enjoy it!', text: `<b>${esc(r.name)}</b> — earned, not given. Go enjoy it guilt-free.`, button: 'Thanks!', colour: 'yellow' });
          checkBadges(); render();
          break;
        }
        case 'del-reward':
          S.rewards = S.rewards.filter(x => x.id !== b.dataset.id); save(); render(); break;
      }
    };
    root.onsubmit = e => {
      e.preventDefault();
      const f = new FormData(e.target);
      S.rewards.push({ id: uid(), name: f.get('name').trim(), cost: Math.max(1, Number(f.get('cost')) || 50) });
      save(); render();
    };
  },
};
