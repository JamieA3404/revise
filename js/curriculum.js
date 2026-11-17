/* =========================================================================
   curriculum.js — every subject and every topic you need to cover.

   • Each topic has an id (never change ids once you've started, as your scores
     are saved against them) and a name (change freely).
   • Maths topics have "freq": Revise's ESTIMATE of how likely that topic
     is to come up across the three Edexcel Higher papers, based on past-paper
     patterns. It is not official data. High-frequency topics are scheduled first.
   • English Literature topic names use your set texts from Settings.
   ========================================================================= */

const SUBJECTS = [
  { id: 'maths',     name: 'Maths',              board: 'Edexcel GCSE Maths Higher (1MA1)',         emoji: '📐', color: '#2F9BFF' },
  { id: 'englang',   name: 'English Language',   board: 'AQA GCSE English Language (8700)',          emoji: '✍️', color: '#FF5C8A' },
  { id: 'englit',    name: 'English Literature', board: 'AQA GCSE English Literature (8702)',        emoji: '📚', color: '#B65CFF' },
  { id: 'physics',   name: 'Physics',            board: 'AQA GCSE Physics Higher (8463)',            emoji: '⚡', color: '#FFB300' },
  { id: 'chemistry', name: 'Chemistry',          board: 'AQA GCSE Chemistry Higher (8462)',          emoji: '🧪', color: '#00C2A8' },
  { id: 'biology',   name: 'Biology',            board: 'AQA GCSE Biology Higher (8461)',            emoji: '🧬', color: '#3CC84B' },
  { id: 'geography', name: 'Geography',          board: 'Eduqas GCSE Geography',                     emoji: '🌍', color: '#1FB5D6' },
  { id: 'business',  name: 'Business',           board: 'Edexcel GCSE Business (1BS0)',              emoji: '💼', color: '#FF8A1F' },
  { id: 'dit',       name: 'Digital IT',         board: 'Pearson BTEC Tech Award Digital Information Technology, Component 3 (exam)', emoji: '💻', color: '#6C6CFF' },
  { id: 'dt',        name: 'Product Design',     board: 'GCSE Design & Technology (Product Design)', emoji: '🛠️', color: '#FF5A4E' },
];

// How much time each subject gets relative to the others
const SUBJECT_WEIGHT = {
  maths: 3, englang: 2, englit: 2.5, physics: 2, chemistry: 2, biology: 2,
  geography: 2, business: 1.5, dit: 1.2, dt: 1,
};

// Maths: [id, name, estimated % chance of appearing]
const MATHS_TOPICS = [
  ['m-fdp', 'Fractions, decimals & percentages', 95], ['m-ratio', 'Ratio & proportion', 95],
  ['m-expand', 'Expanding & factorising', 95], ['m-solve', 'Solving equations & inequalities', 95],
  ['m-pyth', 'Pythagoras & right-angled trigonometry', 95], ['m-area', 'Area, volume & surface area', 90],
  ['m-indices', 'Indices & surds', 90], ['m-prob', 'Probability & tree diagrams', 90],
  ['m-quad', 'Quadratics: factorising, formula & completing the square', 85], ['m-simul', 'Simultaneous equations (incl. non-linear)', 85],
  ['m-lines', 'Straight-line graphs (y = mx + c, parallel & perpendicular)', 85], ['m-compound', 'Compound measures, growth & decay', 85],
  ['m-stdform', 'Standard form & bounds', 80], ['m-sine', 'Sine rule, cosine rule & ½ab sin C', 80],
  ['m-transform', 'Transformations, similarity & congruence', 80], ['m-stats', 'Histograms, cumulative frequency & box plots', 80],
  ['m-angles', 'Angles, polygons & bearings', 75], ['m-vectors', 'Vectors & vector proof', 75],
  ['m-seq', 'Sequences (incl. quadratic nth term)', 70], ['m-algfrac', 'Algebraic fractions & algebraic proof', 70],
  ['m-circles', 'Circle theorems', 70], ['m-graphs', 'Quadratic, cubic, reciprocal & exponential graphs', 65],
  ['m-propn', 'Direct & inverse proportion', 60], ['m-functions', 'Functions (composite & inverse) & iteration', 55],
  ['m-gradient', 'Gradients & areas under graphs (rates of change)', 55], ['m-sets', 'Venn diagrams, sets & conditional probability', 55],
  ['m-graphtr', 'Graph transformations', 45], ['m-circleeq', 'Equation of a circle & tangents', 45],
  ['m-loci', 'Constructions & loci', 40], ['m-recurring', 'Recurring decimals to fractions', 40],
];

function topicList(subjectId) {
  const tx = S.settings.texts;
  const sh = tx.shakespeare || 'Shakespeare play', nov = tx.novel || '19th-century novel';
  const mod = tx.modern || 'Modern text', po = tx.poetry || 'Poetry anthology';
  const L = {
    maths: MATHS_TOPICS.map(([id, name, freq]) => ({ id, name, freq })),
    englang: [
      ['el-p1q1', 'Paper 1 Q1–Q2: retrieval & language analysis'], ['el-p1q3', 'Paper 1 Q3: structure analysis'],
      ['el-p1q4', 'Paper 1 Q4: critical evaluation'], ['el-p1q5d', 'Paper 1 Q5: descriptive writing'],
      ['el-p1q5n', 'Paper 1 Q5: narrative writing'], ['el-p2q2', 'Paper 2 Q2: summary of differences'],
      ['el-p2q3', 'Paper 2 Q3: language analysis (non-fiction)'], ['el-p2q4', 'Paper 2 Q4: comparing viewpoints'],
      ['el-p2q5', 'Paper 2 Q5: writing to argue & persuade'], ['el-spag', 'SPaG & ambitious vocabulary'],
    ],
    englit: [
      ['lit-sh-plot', `${sh}: plot & key scenes`], ['lit-sh-chars', `${sh}: main characters`],
      ['lit-sh-themes', `${sh}: themes`], ['lit-sh-context', `${sh}: context & intentions`], ['lit-sh-quotes', `${sh}: key quotes`],
      ['lit-nov-plot', `${nov}: plot & structure`], ['lit-nov-chars', `${nov}: main characters`],
      ['lit-nov-themes', `${nov}: themes`], ['lit-nov-context', `${nov}: context & intentions`], ['lit-nov-quotes', `${nov}: key quotes`],
      ['lit-mod-plot', `${mod}: plot & structure`], ['lit-mod-chars1', `${mod}: characters (part 1)`],
      ['lit-mod-chars2', `${mod}: characters (part 2)`], ['lit-mod-themes', `${mod}: themes`],
      ['lit-mod-context', `${mod}: context & the writer's message`], ['lit-mod-quotes', `${mod}: key quotes`],
      ['lit-po-1', `${po}: poems 1–5`], ['lit-po-2', `${po}: poems 6–10`], ['lit-po-3', `${po}: poems 11–15`],
      ['lit-po-compare', 'Poetry comparison essay technique'], ['lit-unseen', 'Unseen poetry (analysis & comparison)'],
      ['lit-essay', 'Essay technique: AO1–AO4 & grade 9 paragraphs'],
    ],
    physics: [
      ['p-energy', 'Energy stores, transfers & efficiency'], ['p-resources', 'Energy resources'],
      ['p-circuits', 'Circuits: current, p.d. & resistance'], ['p-mains', 'Domestic electricity & power'],
      ['p-static', 'Static electricity & electric fields'], ['p-particle', 'Particle model: density, state & internal energy'],
      ['p-gas', 'Gas pressure & work done on gases'], ['p-atom', 'Atomic structure & radioactive decay'],
      ['p-halflife', 'Half-life, hazards, fission & fusion'], ['p-forces', 'Forces, vectors & resultant forces'],
      ['p-motion', 'Motion: speed, acceleration & graphs'], ['p-newton', 'Newton\'s laws & stopping distances'],
      ['p-momentum', 'Momentum'], ['p-moments', 'Moments, levers, gears & fluid pressure'],
      ['p-waves', 'Wave properties & the EM spectrum'], ['p-light', 'Sound, ultrasound, lenses & visible light'],
      ['p-bodies', 'Black body radiation'], ['p-magnet', 'Magnetism & the motor effect'],
      ['p-induction', 'Induction, generators & transformers'], ['p-space', 'Space physics'],
      ['p-practicals', 'Required practicals (Physics)'], ['p-equations', 'Equations & units drill'],
    ],
    chemistry: [
      ['c-atom', 'Atomic structure & history of the atom'], ['c-ptable', 'Periodic table & groups 0, 1, 7'],
      ['c-ionic', 'Ionic bonding & ionic compounds'], ['c-covalent', 'Covalent & metallic bonding, giant structures'],
      ['c-moles', 'Moles & conservation of mass'], ['c-yield', 'Concentration, yield & atom economy'],
      ['c-reactivity', 'Reactivity series & extraction of metals'], ['c-acids', 'Acids, bases, salts & titrations'],
      ['c-electrolysis', 'Electrolysis'], ['c-energy', 'Energy changes & bond energies'],
      ['c-cells', 'Chemical cells & fuel cells'], ['c-rates', 'Rates of reaction'],
      ['c-equilibrium', 'Reversible reactions & equilibrium'], ['c-crude', 'Crude oil, hydrocarbons & cracking'],
      ['c-organic', 'Alcohols, carboxylic acids & polymers'], ['c-analysis', 'Chemical analysis & ion tests'],
      ['c-atmosphere', 'Chemistry of the atmosphere'], ['c-resources', 'Using resources: water, LCA, corrosion & Haber process'],
      ['c-practicals', 'Required practicals (Chemistry)'],
    ],
    biology: [
      ['b-cells', 'Cell structure & microscopy'], ['b-division', 'Cell division & stem cells'],
      ['b-transport', 'Diffusion, osmosis & active transport'], ['b-digest', 'Digestive system & enzymes'],
      ['b-heart', 'Heart, blood, circulation & non-communicable disease'], ['b-plants', 'Plant tissues & transpiration'],
      ['b-disease', 'Communicable diseases'], ['b-immune', 'Immunity, vaccines, drugs & monoclonal antibodies'],
      ['b-photo', 'Photosynthesis'], ['b-resp', 'Respiration & metabolism'],
      ['b-nervous', 'Nervous system, brain & eye'], ['b-hormones', 'Hormones, blood glucose & reproduction'],
      ['b-homeo', 'Homeostasis: temperature, kidneys & water'], ['b-planthorm', 'Plant hormones'],
      ['b-dna', 'DNA, genetics & inheritance'], ['b-reprod', 'Reproduction & meiosis'],
      ['b-evolution', 'Variation, evolution & selective breeding'], ['b-geneng', 'Genetic engineering, cloning & classification'],
      ['b-ecosystems', 'Ecosystems & adaptations'], ['b-cycles', 'Biodiversity, cycles & human impact'],
      ['b-practicals', 'Required practicals (Biology)'],
    ],
    geography: [
      ['g-rivers', 'Rivers: processes & landforms'], ['g-coasts', 'Coasts: processes, landforms & management'],
      ['g-hazards', 'Natural hazards & case studies'], ['g-climate', 'Climate change: causes, effects & responses'],
      ['g-ecosystems', 'Ecosystems & biomes'], ['g-urbanuk', 'Urban change in the UK (case study)'],
      ['g-urbanglobal', 'Urban challenges in a lower-income country'], ['g-development', 'Development: measuring & closing the gap'],
      ['g-economy', 'UK economic change'], ['g-resources', 'Resource management (water, food, energy)'],
      ['g-fieldwork', 'Fieldwork: methods, data & evaluation'], ['g-skills', 'Map, graph & statistics skills'],
      ['g-decision', 'Decision-making / problem-solving practice'], ['g-casestudies', 'Case study facts & figures'],
    ],
    business: [
      ['bs-1-1', '1.1 Enterprise & entrepreneurship'], ['bs-1-2', '1.2 Spotting a business opportunity'],
      ['bs-1-3', '1.3 Putting a business idea into practice'], ['bs-1-4', '1.4 Making the business effective'],
      ['bs-1-5', '1.5 Understanding external influences'], ['bs-2-1', '2.1 Growing the business'],
      ['bs-2-2', '2.2 Making marketing decisions'], ['bs-2-3', '2.3 Making operational decisions'],
      ['bs-2-4', '2.4 Making financial decisions'], ['bs-2-5', '2.5 Making human resource decisions'],
      ['bs-calc', 'Business calculations (margins, break-even, cash flow, ARR)'], ['bs-extended', '9- and 12-mark answer technique'],
    ],
    dit: [
      ['d-a1', 'A: Modern technologies (cloud, communication, networks)'], ['d-a2', 'A: Impact of modern technologies'],
      ['d-b1', 'B: Cyber security threats'], ['d-b2', 'B: Preventing & managing threats'], ['d-b3', 'B: Responding to incidents'],
      ['d-c1', 'C: Wider implications (shared data, environment, accessibility)'], ['d-c2', 'C: Legal & ethical issues (UK legislation)'],
      ['d-d1', 'D: Forms of notation (flowcharts, DFDs, system diagrams)'], ['d-d2', 'D: Planning & communication in digital systems'],
      ['d-exam', 'Extended-answer exam technique'],
    ],
    dt: [
      ['dt-emerging', 'New & emerging technologies'], ['dt-energy', 'Energy generation & storage'],
      ['dt-smart', 'Smart, modern & composite materials'], ['dt-systems', 'Systems, electronics & mechanical devices'],
      ['dt-materials', 'Material categories & properties'], ['dt-specialist', 'Specialist materials, stock forms & processes'],
      ['dt-production', 'Forces, stresses & scales of production'], ['dt-designers', 'Designers, design movements & iterative design'],
      ['dt-issues', 'Environmental, social & economic challenges'], ['dt-maths', 'Maths & science in D&T'],
      ['dt-communicate', 'Communicating design ideas'],
    ],
  }[subjectId] || [];
  return L.map(t => Array.isArray(t) ? { id: t[0], name: t[1], freq: 70 } : t).map(t => ({ ...t, subject: subjectId }));
}

function allTopics() { return SUBJECTS.flatMap(s => topicList(s.id)); }
function topicById(id) { return allTopics().find(t => t.id === id) || { id, name: id, subject: 'maths', freq: 50 }; }

/* ---------- Past papers ---------- */
const PAPERS = {
  maths: ['Paper 1H (non-calculator)', 'Paper 2H (calculator)', 'Paper 3H (calculator)'],
  englang: ['Paper 1: Explorations in creative reading & writing', 'Paper 2: Writers\' viewpoints & perspectives'],
  englit: ['Paper 1: Shakespeare & the 19th-century novel', 'Paper 2: Modern texts & poetry'],
  physics: ['Paper 1 Higher', 'Paper 2 Higher'], chemistry: ['Paper 1 Higher', 'Paper 2 Higher'], biology: ['Paper 1 Higher', 'Paper 2 Higher'],
  geography: ['Component 1', 'Component 2', 'Component 3'],
  business: ['Paper 1: Investigating small business', 'Paper 2: Building a business'],
  dit: ['Component 3 exam'],
  dt: ['Written paper'],
};
// Exam series to work through, newest first (your school may use the newest for mocks)
const SERIES = {
  maths: ['June 2024', 'November 2023', 'June 2023', 'November 2022', 'June 2022', 'November 2021', 'November 2020', 'June 2019', 'November 2019', 'June 2018', 'November 2018', 'June 2017'],
  default: ['June 2024', 'June 2023', 'June 2022', 'November 2021', 'June 2019', 'June 2018', 'Specimen papers'],
};

// Where to get a paper. Maths links straight to a free past-paper site;
// other subjects open a search for that exact paper (official papers move around a lot).
function paperLinks(subjectId, paperName, series) {
  const s = SUBJECTS.find(x => x.id === subjectId);
  const q = encodeURIComponent(`${s.board} ${paperName} ${series} question paper mark scheme pdf`);
  const links = [];
  if (subjectId === 'maths') {
    links.push({ label: 'Maths Genie past papers (Higher)', url: 'https://www.mathsgenie.co.uk/papers.php' });
    links.push({ label: 'Physics & Maths Tutor (papers + mark schemes)', url: 'https://www.physicsandmathstutor.com/past-papers/gcse-maths/edexcel-paper-1/' });
  }
  if (['englang', 'englit', 'physics', 'chemistry', 'biology'].includes(subjectId)) {
    links.push({ label: 'AQA past papers & mark schemes', url: 'https://www.aqa.org.uk/find-past-papers-and-mark-schemes' });
  }
  links.push({ label: 'Search for this exact paper', url: 'https://www.google.com/search?q=' + q });
  return links;
}
