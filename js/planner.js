/* =========================================================================
   planner.js — the "Grade 9 auto-plan".

   Writes a task list for every day from today until the day before your
   first final exam. It's built on the revision methods with the strongest
   evidence behind them:
     • Retrieval practice — brain dumps, flashcards and questions, not re-reading
     • Spaced repetition  — each topic comes back as a review after 3, 10 and 30 days
     • Interleaving       — a mix of subjects every day, never the same one twice
     • Past papers        — more of them as exams get closer, each followed by
                            a "fix every lost mark" task the next day
     • Weak topics first  — topics you mark red/amber get extra sessions,
                            and those subjects get more time overall

   Everything you might want to tweak is in the CONFIG section below.
   ========================================================================= */

/* ----------------------------- CONFIG ----------------------------------- */

// How much of the time each subject gets (bigger = more sessions).
// Weak topics add a bonus on top automatically.
const BASE_WEIGHT = {
  maths: 3, englang: 2, englit: 2.5, physics: 2, chemistry: 2, biology: 2,
  geography: 2, business: 1.5, dit: 1.2, dt: 1,
};

// Typical English school holidays for 2026–27. Check yours! Holiday days get more sessions.
const HOLIDAYS = [
  ['2026-12-19', '2027-01-03'], // Christmas
  ['2027-02-13', '2027-02-21'], // February half term
  ['2027-03-27', '2027-04-11'], // Easter
];
// Full days off. Rest matters.
const OFF_DAYS = ['2026-12-24', '2026-12-25', '2026-12-26', '2027-01-01'];

// Days after first learning a topic when it comes back as a flashcard review
const REVIEW_GAPS = [3, 10, 30];

// Spec topics for each subject. The planner works through these in order,
// then starts again (the second time round as exam questions).
// Rename, add or remove topics freely, e.g. put your actual set texts into English Literature.
const SPEC = {
  maths: [
    'Fractions, decimals & percentages', 'Indices & surds', 'Standard form & bounds', 'Expanding & factorising',
    'Solving equations & inequalities', 'Quadratics & completing the square', 'Simultaneous equations',
    'Sequences (incl. quadratic nth term)', 'Straight-line graphs', 'Quadratic, cubic & reciprocal graphs',
    'Functions & iteration', 'Algebraic fractions & proof', 'Ratio & proportion', 'Direct & inverse proportion',
    'Compound measures, growth & decay', 'Angles, polygons & bearings', 'Pythagoras & trigonometry',
    'Sine rule, cosine rule & ½ab sin C', 'Circle theorems', 'Area, volume & surface area',
    'Transformations, similarity & congruence', 'Vectors', 'Probability & tree diagrams',
    'Histograms, cumulative frequency & box plots', 'Gradients & areas under graphs', 'Graph transformations',
    'Equation of a circle & tangents', 'Constructions & loci',
  ],
  englang: [
    'P1 Q2: language analysis', 'P1 Q3: structure analysis', 'P1 Q4: evaluation', 'P1 Q5: descriptive writing',
    'P1 Q5: narrative writing', 'P2 Q2: summary of differences', 'P2 Q3: language analysis',
    'P2 Q4: comparing writers\' viewpoints', 'P2 Q5: persuasive / argument writing', 'SPaG & ambitious vocabulary',
  ],
  englit: [
    'Shakespeare play: key scenes & quotes', 'Shakespeare play: themes, characters & context',
    '19th-century novel: key quotes', '19th-century novel: themes, characters & context',
    'Modern text: key quotes', 'Modern text: themes, characters & context',
    'Poetry anthology: poems 1–5 quotes', 'Poetry anthology: poems 6–10 quotes', 'Poetry anthology: poems 11–15 quotes',
    'Poetry comparison: essay plans', 'Unseen poetry practice',
  ],
  physics: [
    'Energy stores, transfers & efficiency', 'Energy resources', 'Circuits: current, p.d. & resistance',
    'Domestic electricity & power', 'Static electricity', 'Particle model: density & internal energy', 'Gas pressure',
    'Atomic structure & radioactive decay', 'Half-life, fission & fusion', 'Forces, vectors & resultant forces',
    'Motion: speed, acceleration & graphs', 'Newton\'s laws & stopping distances', 'Momentum',
    'Moments, levers, gears & fluid pressure', 'Waves & the EM spectrum', 'Sound, lenses & visible light',
    'Magnetism & the motor effect', 'Induction, generators & transformers', 'Space physics',
    'Required practicals (Physics)', 'Equations & units drill',
  ],
  chemistry: [
    'Atomic structure & history of the atom', 'Periodic table & groups', 'Ionic bonding',
    'Covalent & metallic bonding, structures', 'Moles & conservation of mass', 'Concentration, yield & atom economy',
    'Reactivity series & extraction', 'Acids, bases & salts', 'Electrolysis', 'Energy changes & bond energies',
    'Chemical cells & fuel cells', 'Rates of reaction', 'Reversible reactions & equilibrium',
    'Crude oil, hydrocarbons & cracking', 'Alcohols, carboxylic acids & polymers', 'Chemical analysis & ion tests',
    'Chemistry of the atmosphere', 'Using resources: water, LCA & Haber process', 'Required practicals (Chemistry)',
  ],
  biology: [
    'Cell structure & microscopy', 'Cell division & stem cells', 'Diffusion, osmosis & active transport',
    'Digestive system & enzymes', 'Heart, blood & circulation', 'Plant tissues & transpiration',
    'Communicable diseases', 'Immunity, vaccines, drugs & monoclonal antibodies', 'Photosynthesis',
    'Respiration & metabolism', 'Nervous system, brain & eye', 'Hormones, blood glucose & reproduction',
    'Homeostasis: temperature, kidneys & water', 'Plant hormones', 'DNA, genetics & inheritance',
    'Reproduction & meiosis', 'Variation, evolution & selective breeding', 'Genetic engineering & classification',
    'Ecosystems & adaptations', 'Biodiversity, cycles & human impact', 'Required practicals (Biology)',
  ],
  geography: [
    'Rivers: processes & landforms', 'Coasts: processes, landforms & management', 'Natural hazards & case studies',
    'Climate change: causes, effects & responses', 'Ecosystems & biomes', 'Urban change: UK city case study',
    'Urban challenges in a lower-income country', 'Development: measuring & closing the gap', 'UK economic change',
    'Resource management (water / food / energy)', 'Fieldwork: methods, data & evaluation',
    'Map, graph & statistics skills', 'Decision-making / problem-solving practice', 'Case study facts & figures',
  ],
  business: [
    '1.1 Enterprise & entrepreneurship', '1.2 Spotting a business opportunity', '1.3 Putting an idea into practice',
    '1.4 Making the business effective', '1.5 External influences', '2.1 Growing the business',
    '2.2 Marketing decisions', '2.3 Operational decisions', '2.4 Financial decisions', '2.5 Human resource decisions',
    'Calculations: margins, break-even, cash flow, ARR', '9 & 12-mark answer technique',
  ],
  dit: [
    'A: Modern technologies (cloud, networks, devices)', 'A: Impact of modern tech on organisations & people',
    'B: Cyber security threats', 'B: Preventing & managing threats', 'B: Responding to incidents',
    'C: Shared data, environment & accessibility', 'C: Legal & ethical issues (UK law)',
    'D: Forms of notation (flowcharts, DFDs, system diagrams)', 'D: Communicating information', 'Extended-answer technique',
  ],
  dt: [
    'New & emerging technologies', 'Energy generation & storage', 'Smart, modern & composite materials',
    'Systems & mechanical devices', 'Material categories & properties', 'Specialist materials & processes',
    'Forces, stresses & scales of production', 'Designers, design movements & iterative design',
    'Environmental, social & economic challenges', 'Maths in D&T', 'Communicating design ideas',
  ],
};

const PAPERS = {
  maths: ['Paper 1 (non-calculator)', 'Paper 2 (calculator)', 'Paper 3 (calculator)'],
  englang: ['Paper 1: Creative reading & writing', 'Paper 2: Viewpoints & perspectives'],
  englit: ['Paper 1: Shakespeare & 19th-century novel', 'Paper 2: Modern text & poetry'],
  physics: ['Paper 1', 'Paper 2'], chemistry: ['Paper 1', 'Paper 2'], biology: ['Paper 1', 'Paper 2'],
  geography: ['Component 1', 'Component 2', 'Component 3'],
  business: ['Paper 1: Investigating small business', 'Paper 2: Building a business'],
  dit: ['Component 3 exam'],
  dt: ['Written exam'],
};

// Days between past papers for each subject, per phase (none in other phases)
const PAPER_GAP = { warmup: 60, papers: 14, sprint: 7 };

/* ------------------------- The planner itself -------------------------- */

// How many ~25-minute sessions a day gets (a past paper uses 3)
function dayCapacity(k, phase) {
  const o = S.settings.planner;
  if (OFF_DAYS.includes(k)) return 0;
  const wd = fromKey(k).getDay();
  const holiday = HOLIDAYS.some(([a, b]) => k >= a && k <= b);
  let cap = holiday ? o.holiday : (wd === 0 || wd === 6) ? o.weekend : o.weekday;
  if (!holiday && wd === Number(o.lightDay)) cap = Math.max(1, cap - 1); // one lighter day a week
  if (phase === 'mocks') cap = Math.min(cap, 2);  // during mocks: quick reviews only
  if (phase === 'sprint') cap += 1;               // final push
  return cap;
}

// Which task type a new-topic session should be
function sessionType(phase, subjectId, n) {
  if (phase === 'mocks') return 'flashcards';
  if (subjectId === 'englang') return phase === 'warmup' && n % 2 ? 'braindump' : 'questions';
  if (phase === 'warmup') return n % 2 ? 'flashcards' : 'braindump';
  if (phase === 'sprint') return n % 2 ? 'flashcards' : 'questions';
  return n % 3 === 2 ? 'flashcards' : 'questions';
}

function generateAutoPlan() {
  const st = S.settings, o = st.planner;
  const phases = getPhases();
  const phaseOf = k => (phases.filter(p => k >= p.start).pop() || phases[0]).id;
  const start = todayKey(), end = addDays(st.examStart, -1);

  // Per-subject bookkeeping
  const subs = SUBJECTS.map(s => {
    const weak = (S.topics[s.id] || []).filter(t => t.rag !== 'green');
    const red = weak.filter(t => t.rag === 'red').map(t => t.name);
    const amber = weak.filter(t => t.rag === 'amber').map(t => t.name);
    return {
      id: s.id,
      weight: (BASE_WEIGHT[s.id] || 1) + Math.min(2, red.length * 0.3 + amber.length * 0.15),
      credit: 0, ptr: 0, n: 0,
      weak: [...red, ...red, ...amber],   // red topics appear twice = twice as often
      weakPtr: 0,
      lastPaper: '2000-01-01', paperNo: 0,
      covered: new Set(),
    };
  });
  const totalW = subs.reduce((a, s) => a + s.weight, 0);

  const days = {}, reviews = {}, fixes = {};
  const mockReview = SUBJECTS.map(s => s.id);
  const stats = { sessions: 0, papers: 0, reviews: 0, nea: 0, hours: 0, per: {} };
  const add = (k, subject, type, title) => {
    days[k].push({ subject, type, title });
    stats.sessions++; stats.per[subject] = (stats.per[subject] || 0) + 1;
    stats.hours += type === 'pastpaper' ? 1.5 : 0.5;
    if (type === 'pastpaper') stats.papers++;
    if (type === 'nea') stats.nea++;
  };
  const later = (map, k, item) => (map[k] ||= []).push(item);

  for (let k = start; k <= end; k = addDays(k, 1)) {
    const phase = phaseOf(k);
    let cap = dayCapacity(k, phase);
    days[k] = [];
    if (cap <= 0) { // rest day: move anything due to tomorrow
      for (const r of reviews[k] || []) later(reviews, addDays(k, 1), r);
      for (const f of fixes[k] || []) later(fixes, addDays(k, 1), f);
      continue;
    }
    const used = new Set();

    // 1. Fix-it session for yesterday's past paper
    for (const f of fixes[k] || []) {
      if (cap > 0) { add(k, f.subject, 'questions', `Fix every lost mark: ${f.paper}`); cap--; used.add(f.subject); }
      else later(fixes, addDays(k, 1), f);
    }

    // 2. After mocks: go through each mock paper (2 subjects a day)
    if (phase === 'debrief') {
      for (let i = 0; i < 2 && mockReview.length && cap > 0; i++) {
        const id = mockReview.shift();
        add(k, id, 'questions', 'Mock review: correct your paper & add weak topics to Revise');
        cap--; used.add(id);
      }
    }

    // 3. NEA (Wednesdays & Saturdays) until the NEA deadline
    const wd = fromKey(k).getDay();
    if (k <= o.neaUntil && phase !== 'mocks' && (wd === 3 || wd === 6) && cap >= 2) {
      add(k, 'dt', 'nea', 'NEA: push the next section forward'); cap--; used.add('dt');
    }

    // 4. Past paper (needs 3 sessions of time) for the subject that's waited longest
    const gap = PAPER_GAP[phase];
    if (gap && cap >= 3 && (phase !== 'warmup' || wd === 0 || wd === 6)) {
      const due = subs
        .filter(s => !used.has(s.id) && daysBetween(s.lastPaper, k) >= gap * (s.id === 'maths' ? 0.7 : 1))
        .sort((a, b) => (a.lastPaper < b.lastPaper ? -1 : a.lastPaper > b.lastPaper ? 1 : b.weight - a.weight))[0];
      if (due) {
        const paper = PAPERS[due.id][due.paperNo++ % PAPERS[due.id].length];
        add(k, due.id, 'pastpaper', `${paper}: timed, then mark it`);
        due.lastPaper = k; cap -= 3; used.add(due.id);
        later(fixes, addDays(k, 1), { subject: due.id, paper });
      }
    }

    // 5. Spaced-repetition reviews that are due (up to about half the day)
    let maxRev = Math.max(1, Math.floor(cap / 2));
    for (const r of reviews[k] || []) {
      if (cap > 0 && maxRev > 0) {
        // The middle review is exam questions (applying it), the others are quick-fire recall
        const asQuestions = r.step === 1 || r.subject === 'englang';
        add(k, r.subject, asQuestions ? 'questions' : 'flashcards', (asQuestions ? 'Exam questions: ' : 'Review: ') + r.topic);
        stats.reviews++; cap--; maxRev--;
      }
      else later(reviews, addDays(k, 1), r);
    }

    // 6. Fill the rest with new topic sessions, mixing subjects
    while (cap > 0) {
      // "Smooth weighted round-robin": every subject earns credit by its weight,
      // the richest one (not already done today) gets the slot and pays the total.
      subs.forEach(s => { s.credit += s.weight; });
      const pool = subs.filter(s => !used.has(s.id));
      const s = (pool.length ? pool : subs).reduce((a, b) => (b.credit > a.credit ? b : a));
      s.credit -= totalW;

      // Weak topics first (every other session for that subject), then the spec in order
      let topic;
      if (s.weak.length && (phase === 'gaps' || s.n % 2 === 0)) topic = s.weak[s.weakPtr++ % s.weak.length];
      else { topic = SPEC[s.id][s.ptr % SPEC[s.id].length]; s.ptr++; }
      s.covered.add(topic);

      add(k, s.id, sessionType(phase, s.id, s.n++), topic);
      cap--; used.add(s.id);

      // Book its reviews
      if (phase !== 'mocks') REVIEW_GAPS.forEach((g, step) => {
        const rk = addDays(k, g);
        if (rk <= end) later(reviews, rk, { subject: s.id, topic, step });
      });
    }
  }

  const uncovered = subs.reduce((a, s) => a + SPEC[s.id].filter(t => !s.covered.has(t)).length, 0);
  S.autoPlan = {
    createdOn: todayKey(), from: start, to: end, days,
    stats: { ...stats, hours: Math.round(stats.hours), uncovered },
  };
  save();
  return S.autoPlan;
}

// Number of planned sessions in the week starting Monday k
function plannedInWeek(monday) {
  if (!S.autoPlan) return 0;
  let n = 0;
  for (let i = 0; i < 7; i++) n += (S.autoPlan.days[addDays(monday, i)] || []).length;
  return n;
}
