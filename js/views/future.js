/* =========================================================================
   future.js — the 🚀 Future page, the "🔓 Unlocks" lines on every session,
   and the £120-per-grade-7+ tracker.

   Edit any of the lines below to make them hit harder for you.
   Money figures are rough UK examples to show what's possible. They aren't
   promises, and none of this is financial advice.
   ========================================================================= */

const REWARD_PER_7 = 120;           // £ for each GCSE at grade 7 or above
const REWARD_SUBJECTS = SUBJECTS.filter(s => s.id !== 'dit'); // GCSEs (Digital IT is a BTEC, graded differently)

// What each subject unlocks: a few lines per subject, one is picked per topic
const UNLOCKS = {
  maths: [
    'This is the language of code, AI and money. Algorithms, trading bots and game engines all run on it.',
    'Quant traders get paid serious money for exactly this kind of thinking. Start building it today.',
    'A 9 in Maths is your ticket to A-level Maths + Further Maths, the fast lane into top CS degrees.',
    'Machine learning is mostly algebra, graphs and probability. You\'re learning the engine room of AI.',
  ],
  englang: [
    'Pitch decks, investor emails, job interviews: people who write well get funded, hired and promoted.',
    'Persuasive writing = sales, and sales = money. This is a business skill in an English costume.',
    'Every founder has to sell the vision. Today you practise making people believe.',
  ],
  englit: [
    'Reading people, motives and power is how you win negotiations and lead teams.',
    'Working out what someone REALLY means is a superpower in business, law and leadership.',
    'Top unis look at your whole GCSE profile. A 9 here proves you can crush anything.',
  ],
  physics: [
    'Chips, batteries, rockets: the hardware the entire tech world runs on.',
    'Electricity and circuits are literally what a computer is made of.',
    'Physics = first-principles thinking, the way the best founders solve impossible problems.',
  ],
  chemistry: [
    'Batteries, EVs, new materials, medicine: billion-pound industries built on this.',
    'Precision under pressure is exactly what top degrees and top jobs test for.',
    'Every 9 here stacks your profile for the best sixth forms and unis.',
  ],
  biology: [
    'Biotech + AI is one of the fastest-growing fields on the planet.',
    'Understand the body and you can upgrade your own hardware: focus, sleep, performance.',
    'Health-tech startups raise huge funding rounds. This is their foundation.',
  ],
  geography: [
    'Where money flows, cities grow and resources run out: that\'s how investors think.',
    'Data, maps and trends are real data-analyst skills, the stuff companies pay for.',
    'Climate tech is a massive industry. You\'re learning the problem it\'s solving.',
  ],
  business: [
    'This is literally the instruction manual for your future company.',
    'Profit, cash flow, break-even: the numbers every founder and investor lives by.',
    'Learn how businesses grow now and you\'ll spot opportunities everyone else misses.',
  ],
  dit: [
    'Cyber security, cloud and data are some of the best-paid areas in tech.',
    'This is your first step into the tech industry. Stack it.',
    'Every business you ever start will run on digital systems. Learn to build and protect them.',
  ],
  dt: [
    'Design, test, improve, ship: the exact loop every startup runs.',
    'From idea to real product. That\'s what founders do.',
    'Great products make great money. Learn how they\'re made.',
  ],
};
const KIND_UNLOCKS = {
  paper: 'Exam conditions now = ice-cold calm on the day. This is where grades get locked in.',
  review: 'Ten minutes now keeps it locked in your brain for the exam hall.',
  mockreview: 'Your mock just showed you exactly where the marks are hiding. Go get them.',
  nea: 'Coursework marks are banked before you even walk into an exam. Free grades.',
};

// Pick an "unlocks" line for a session (the same one every time for the same topic)
function unlockLine(s) {
  if (KIND_UNLOCKS[s.kind] && s.kind !== 'review') return KIND_UNLOCKS[s.kind];
  const pool = UNLOCKS[s.subject] || ['Every topic you lock in makes the future bigger.'];
  const key = s.topicId || s.subject;
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}

// £120 tracker: which subjects are currently on course for a 7+
function moneyStatus() {
  const rows = REWARD_SUBJECTS.map(s => {
    const e = subjectEstimate(s.id);
    return { s, e, locked: e.enoughData && e.grade >= 7 };
  });
  const locked = rows.filter(r => r.locked).length;
  return { rows, locked, earned: locked * REWARD_PER_7, max: rows.length * REWARD_PER_7 };
}

// The road ahead (years are based on finishing GCSEs in summer 2027)
const FUTURE_STEPS = [
  { when: 'August 2027', emoji: '📬', title: 'Results day',
    text: 'You open the envelope and it\'s 7s, 8s and 9s. Plus cash for every 7+. The whole summer feels different when you KNOW you smashed it.' },
  { when: 'September 2027', emoji: '🏫', title: 'Sixth form or college',
    text: 'Pick the subjects that build your empire: A-level Maths, Further Maths, Computer Science. Strong GCSEs get you into the best sixth forms and onto the hardest (best) courses.' },
  { when: '2029', emoji: '🎓', title: 'A top university',
    text: 'Imperial, Cambridge, Oxford, UCL, Warwick, Edinburgh: elite Computer Science courses. They look hard at your GCSEs, especially Maths. Every 9 you get now is a line on that application.' },
  { when: '2030–2033', emoji: '💻', title: 'Build stuff for real',
    text: 'Hackathons, internships, side projects, apps with real users. Summer internships at top tech firms can pay more than lots of full-time jobs.' },
  { when: 'Your first job', emoji: '💸', title: 'Get paid properly',
    text: 'UK graduate software engineers often start around £30k–£45k. At big tech, top startups and trading firms, grad packages can reach £60k–£100k+, and they climb fast after that.' },
  { when: 'Whenever you\'re ready', emoji: '🚀', title: 'Start your own business',
    text: 'Software lets one person reach millions. You\'re already studying Business and Digital IT, so you\'re learning the playbook early. Build it, sell it, scale it.' },
  { when: 'From your first payslip', emoji: '📈', title: 'Make your money work for you',
    text: 'Invest £200 a month from age 22, and if it grows about 7% a year (not guaranteed!), that\'s roughly £525,000 by 62. Compound growth rewards people who start early. Same as revision.' },
  { when: 'After that', emoji: '♾️', title: 'Limitless',
    text: 'Freedom to choose your work, your city, your hours, your projects. It all starts with the boring bit: today\'s sessions.' },
];

const FutureView = {
  html() {
    const st = S.settings, today = todayKey();
    const toFinals = daysBetween(today, st.examStart);
    const m = moneyStatus();
    const sessionsLeft = Object.entries(S.plan.days).filter(([k]) => k >= today).reduce((a, [, l]) => a + l.filter(s => !s.done).length, 0);
    return `
      <section class="hype-hero">
        <div class="small upper">What you're building</div>
        <h1>Your future is <span class="glow">LIMITLESS.</span></h1>
        <p>${toFinals > 0 ? `<b>${toFinals} days.</b> About <b>${sessionsLeft} sessions</b>. That's all that stands between you and everything below.` : 'This is it. Everything below starts now.'}</p>
        <a class="btn btn-green btn-big" href="#today">🔒 Lock in now</a>
      </section>

      <section class="card money-card">
        <div class="row between wrap">
          <div><div class="small upper">£${REWARD_PER_7} for every GCSE at grade 7+</div>
            <h2>💰 £${m.max.toLocaleString()} on the table</h2></div>
          <div class="money-now"><b>£${m.earned.toLocaleString()}</b><span>on course right now</span></div>
        </div>
        <div class="bar big"><div class="bar-fill gold" style="width:${m.earned / m.max * 100}%"></div></div>
        <div class="money-grid">
          ${m.rows.map(r => `
            <div class="money-sub ${r.locked ? 'locked' : ''}">
              <span>${r.s.emoji}</span>
              <b>${esc(r.s.name)}</b>
              <small>${r.e.enoughData ? 'grade ' + r.e.grade : 'test more topics'}</small>
              <em>${r.locked ? '✅ £120' : '🎯 £120'}</em>
            </div>`).join('')}
        </div>
        <p class="muted small">"On course" means a subject's estimated grade is 7+ <i>and</i> enough of its topics have been tested to trust it. Digital IT is a BTEC (graded Pass to Distinction*), so check whether it counts.</p>
      </section>

      <h2 class="mt">The road ahead</h2>
      <div class="future-road">
        ${FUTURE_STEPS.map((f, i) => `
          <div class="fstep">
            <div class="fstep-dot">${f.emoji}</div>
            <div class="fstep-card card">
              <div class="small upper">${esc(f.when)}</div>
              <h3>${esc(f.title)}</h3>
              <p>${esc(f.text)}</p>
            </div>
          </div>`).join('')}
      </div>

      <h2 class="mt">What each subject unlocks</h2>
      <div class="unlock-grid">
        ${SUBJECTS.map(s => `<div class="card unlock-card" style="--sc:${s.color}"><b>${s.emoji} ${esc(s.name)}</b><p>${esc(UNLOCKS[s.id][0])}</p></div>`).join('')}
      </div>

      <section class="hype-hero end">
        <h2>Future you is watching. Make them proud.</h2>
        <a class="btn btn-green btn-big" href="#today">Start today's session ▶</a>
      </section>
      <p class="muted small center-text">Salary and investment figures are rough UK examples to show what's possible, not promises or financial advice.</p>`;
  },
  bind() {},
};
