/* =========================================================================
   ai.js — talks to OpenAI to make lessons, flashcards and tests, and to mark
   your answers and past papers.

   🔐 Your API key is stored only in this browser (localStorage key
   "revise-openai-key"). It is NOT in the code, NOT in exports, and never
   goes anywhere except api.openai.com. Set a monthly spending limit at
   platform.openai.com → Settings → Limits.

   Lessons and flashcards are cached per topic, so each one only costs once.
   ========================================================================= */

const AI_KEY_STORE = 'revise-openai-key';
const AI_CACHE_STORE = 'revise-ai-cache';

const AI = {
  key() { try { return localStorage.getItem(AI_KEY_STORE) || ''; } catch (e) { return ''; } },
  setKey(k) { try { k ? localStorage.setItem(AI_KEY_STORE, k.trim()) : localStorage.removeItem(AI_KEY_STORE); } catch (e) {} },
  ready() { return !!this.key() && navigator.onLine !== false; },

  /* ---------- Cache (lessons per topic) ---------- */
  cache() { try { return JSON.parse(localStorage.getItem(AI_CACHE_STORE)) || {}; } catch (e) { return {}; } },
  cacheGet(k) { return this.cache()[k]; },
  cacheSet(k, v) {
    const c = this.cache(); c[k] = v;
    try { localStorage.setItem(AI_CACHE_STORE, JSON.stringify(c)); } catch (e) { console.warn('AI cache full'); }
  },

  /* ---------- One request to OpenAI that must return JSON ----------
     content = a string, or an array of parts (text / images / PDFs) */
  async json(system, content, { model = S.settings.model, maxTokens = 4000 } = {}) {
    if (!this.key()) throw new Error('Add your OpenAI API key in Settings first.');
    const body = {
      model,
      messages: [{ role: 'system', content: system + '\nReply with a single JSON object only.' }, { role: 'user', content }],
      response_format: { type: 'json_object' },
      max_completion_tokens: maxTokens,
    };
    // Newer reasoning models: keep thinking short so answers come back quickly
    if (/^(gpt-5|o\d)/.test(model)) body.reasoning_effort = 'low';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + this.key() },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data.error && data.error.message) || 'OpenAI request failed (' + res.status + ')');
    const text = data.choices && data.choices[0].message.content;
    try { return JSON.parse(text); } catch (e) { throw new Error('The AI reply was cut off. Please try again.'); }
  },

  // Background info about the student + subject, given to every request
  context(subjectId) {
    const s = subj(subjectId), st = S.settings, tx = st.texts;
    let extra = '';
    if (subjectId === 'englit') extra = `Set texts: Shakespeare: ${tx.shakespeare || 'unknown'}; 19th-century novel: ${tx.novel || 'unknown'}; modern text: ${tx.modern || 'unknown'}; poetry anthology cluster: ${tx.poetry || 'unknown'}.`;
    if (subjectId === 'geography' && st.geoSpec) extra = `Specification: ${st.geoSpec}.`;
    if (subjectId === 'dt' && st.dtBoard) extra = `Specification: ${st.dtBoard}.`;
    return `You are an expert GCSE tutor and senior examiner in England. The student is in Year 11, aiming for grade 9.
Subject: ${s.name} — ${s.board}. ${extra}
Be accurate to this specification and its exam style. If something depends on information you don't have, say so rather than guessing.
Use UK English. For maths, write expressions in plain text (x^2, sqrt(5), 3/4, ×, ÷), never LaTeX.`;
  },

  /* ---------- Lesson + flashcards for a topic (cached) ---------- */
  async lesson(topic) {
    const key = 'lesson:' + topic.id + ':' + topic.name;
    const hit = this.cacheGet(key);
    if (hit) return hit;
    const out = await this.json(this.context(topic.subject), `Topic: "${topic.name}".
Create today's revision lesson for this topic. JSON keys:
"goal": one sentence — what the student can do after this session.
"unlocks": one punchy, hyped-up sentence (max 25 words) for a 15-year-old who wants a career in computer science, to start a business and to invest, connecting THIS topic to something real and exciting (tech, AI, money, business, engineering). Must be true, not exaggerated.
"keyPoints": 6–10 precise points an examiner expects (definitions, equations with units, processes, key quotes with analysis — whatever this topic needs).
"noteDown": 4–6 short things to copy into their notes.
"workedExample": {"question": exam-style question, "steps": [step-by-step working or a model answer broken into steps], "answer": final answer or summary}.
"commonMistakes": 3–5 mistakes that lose marks.
"grade9Tips": 2–4 things that separate a grade 9 answer from a grade 7.
"brainDumpPrompt": one specific recall task they answer in writing from memory, e.g. "Write down 4 things that are true about Sheila and a quote for each" or (maths) a question to solve showing working.
"flashcards": 10 objects {"q","a"} — short, exam-focused, one fact each.`, { maxTokens: 5000 });
    this.cacheSet(key, out);
    return out;
  },

  /* ---------- Feedback on a brain dump ---------- */
  brainDumpFeedback(topic, prompt, answer) {
    return this.json(this.context(topic.subject), `Topic: "${topic.name}".
The student was asked: "${prompt}"
They wrote (from memory):
"""${answer}"""
Give honest, encouraging examiner feedback. JSON keys:
"score": 0–100 (how complete and accurate it is),
"good": [what they got right],
"missing": [important things they left out],
"wrong": [anything incorrect, with the correction],
"modelAnswer": a short grade 9 version,
"tip": one sentence on what to do next.`);
  },

  /* ---------- End-of-topic test ---------- */
  test(topic, { mcq = 6, written = 2, attempt = 1 } = {}) {
    return this.json(this.context(topic.subject), `Topic: "${topic.name}". Attempt number ${attempt} — use different questions from earlier attempts.
Write an end-of-topic test. JSON keys:
"mcq": ${mcq} objects {"q", "options": [4 options], "answer": index 0–3 of the correct option, "explain": why}. Mix of difficulty, including grade 8–9 level, with believable wrong options.
"written": ${written} exam-style questions in this board's style, objects {"q", "marks": 2–6, "markScheme": [marking points]}.
Every question must be fully self-contained: if it refers to an extract, source, diagram data or table, include that full text/data inside "q".
${written === 0 ? 'Use an empty array for "written".' : ''}`, { maxTokens: 5000 });
  },

  /* ---------- Mark written answers ---------- */
  markWritten(topic, items) {
    return this.json(this.context(topic.subject), `Topic: "${topic.name}". Mark these answers strictly, like a real examiner using the mark scheme.
${items.map((it, i) => `Q${i + 1} (${it.marks} marks): ${it.q}\nMark scheme: ${it.markScheme.join(' | ')}\nStudent answer: """${it.answer || '(blank)'}"""`).join('\n\n')}
Return exactly this shape (one "results" item per question, in order):
{"results": [{"marks": 3, "feedback": "what earned or lost marks", "improve": "exactly how to get full marks"}], "summary": "two sentences overall", "nextFocus": "the single most useful thing to practise next"}`, { model: S.settings.markModel });
  },

  /* ---------- Mark a whole past paper / mock from photos or a PDF ---------- */
  async markPaper(subjectId, paperName, files) {
    const topics = topicList(subjectId).map(t => `${t.id}: ${t.name}`).join('\n');
    const parts = [{ type: 'text', text: `This is the student's completed "${paperName}" (${subj(subjectId).board}).
The pages show the questions with the student's answers (and may include a mark scheme or their teacher's marks).
Mark every question you can see as a real examiner would. If a page is unreadable, say so in "notes".
Map each question to the closest topic id from this list:
${topics}
JSON keys:
"marks": total awarded, "maxMarks": total available, "percent": 0–100, "grade": estimated grade 1–9,
"questions": [{"number", "topicId", "marks", "max", "comment"}],
"topicScores": [{"topicId", "percent"}] for every topic that appeared,
"strengths": [..], "improvements": [specific, actionable steps], "summary": 2–3 sentences, "notes": anything you couldn't read.` }];
    for (const f of files) parts.push(f.kind === 'pdf'
      ? { type: 'file', file: { filename: f.name, file_data: f.data } }
      : { type: 'image_url', image_url: { url: f.data, detail: 'high' } });
    return this.json(this.context(subjectId), parts, { model: S.settings.markModel, maxTokens: 8000 });
  },

  /* ---------- NEA guidance ---------- */
  neaCoach(note) {
    return this.json(this.context('dt'), `The student is working on their Product Design NEA (coursework). They say: """${note || 'No details given.'}"""
Give practical guidance for a 30-minute work session. JSON keys: "focus": what to do this session, "steps": 3–6 concrete steps,
"checklist": 3–5 things a top-band portfolio shows for this stage, "tip": one sentence.`);
  },
};

/* Turn chosen files into data the AI can read. Photos are shrunk to save cost. */
async function prepareFiles(fileList) {
  const out = [];
  for (const file of fileList) {
    if (file.type === 'application/pdf') {
      out.push({ kind: 'pdf', name: file.name, data: await readAsDataURL(file) });
    } else if (file.type.startsWith('image/')) {
      out.push({ kind: 'image', name: file.name, data: await shrinkImage(file, 1800) });
    }
  }
  return out;
}
function readAsDataURL(file) {
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
}
async function shrinkImage(file, max) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = url; });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82);
  } finally { URL.revokeObjectURL(url); }
}
