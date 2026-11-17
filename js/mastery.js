/* =========================================================================
   mastery.js — how strong you are at each topic, and grade estimates.

   Every test, quiz, flashcard round and marked paper records a score (0–100)
   for a topic. Strength is a running average (newer scores count more), and
   fades slowly if you leave a topic alone for weeks, because that's how forgetting works.

   Grade estimates are ESTIMATES. They're based only on the work you've
   done in this app, and they get more accurate the more topics you've tested.
   ========================================================================= */

// Rough grade boundaries as a % of marks (they vary by subject and year)
const GRADE_BOUNDS = [[9, 80], [8, 70], [7, 60], [6, 50], [5, 41], [4, 32], [3, 22]];
// What we assume for a topic you haven't been tested on yet
const UNKNOWN_PRIOR = 45;

/* Record a score for a topic. weight = how much this score counts vs the old strength. */
function recordScore(topicId, score, kind, weight = 0.5) {
  score = Math.max(0, Math.min(100, Math.round(score)));
  const m = S.mastery[topicId] || { score: null, learned: false, n: 0, history: [] };
  m.score = m.score == null ? score : Math.round(m.score * (1 - weight) + score * weight);
  if (kind === 'learn' || kind === 'review' || kind === 'paper') m.learned = m.learned || kind !== 'paper' || score >= 50;
  m.n++;
  m.last = todayKey();
  m.due = addDays(todayKey(), reviewGap(m.score, m.n));
  m.history.push({ d: todayKey(), s: score, kind });
  if (m.history.length > 30) m.history.shift();
  S.mastery[topicId] = m;
  save();
  return m;
}

// Days until a topic should come back: weak topics return quickly, strong ones later
function reviewGap(score, n) {
  if (score < 50) return 2;
  if (score < 65) return 4;
  if (score < 80) return n < 3 ? 7 : 10;
  return n < 3 ? 14 : 28;
}

// Current strength 0–100 (null if never tested), with gentle forgetting after 3 weeks
function strength(topicId) {
  const m = S.mastery[topicId];
  if (!m || m.score == null) return null;
  const idle = daysBetween(m.last, todayKey());
  const fade = idle > 21 ? Math.min(15, (idle - 21) * 0.3) : 0;
  return Math.max(0, Math.round(m.score - fade));
}

// Chance a topic is at "grade 9 standard" (a smooth curve centred on 80%)
function nineChance(pct) { return Math.round(100 / (1 + Math.exp(-(pct - 80) / 5))); }

function gradeFor(pct) {
  for (const [g, b] of GRADE_BOUNDS) if (pct >= b) return g;
  return pct >= 12 ? 2 : 1;
}

/* Subject summary: coverage, weighted strength, estimated grade, chance of a 9 */
function subjectEstimate(subjectId) {
  const topics = topicList(subjectId);
  let wSum = 0, total = 0, tested = 0, learned = 0;
  for (const t of topics) {
    const s = strength(t.id);
    const w = t.freq || 70;
    wSum += w; total += w * (s == null ? UNKNOWN_PRIOR : s);
    if (s != null) tested++;
    if (S.mastery[t.id]?.learned) learned++;
  }
  const pct = Math.round(total / wSum);
  return {
    pct, grade: gradeFor(pct), p9: nineChance(pct),
    tested, learned, count: topics.length,
    coverage: Math.round(learned / topics.length * 100),
    enoughData: tested >= Math.ceil(topics.length * 0.25),
  };
}
