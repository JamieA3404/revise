# Revise 📚✅

A GCSE revision app that works offline and can be installed like an app (a PWA). It builds a day-by-day roadmap to your mocks and finals, with an AI tutor for lessons, flashcards, tests and marking. It's plain HTML, CSS and JavaScript, with no build step and no server.

## How it works
- **Roadmap** ([js/planner.js](js/planner.js)): rebuilt every day from your real scores. Every topic gets planned in, weak topics come back sooner, and missed sessions merge into the next few days. At least 60 minutes a day.
- **Sessions** ([js/views/session.js](js/views/session.js)): each one is step by step. A learn session goes Learn → Brain dump → Flashcards → Test → Results. A past paper goes Get the paper → Upload photos or a PDF → AI marking.
- **Mastery** ([js/mastery.js](js/mastery.js)): your strength in every topic, plus an estimated grade and chance of a 9 for each subject.
- **Curriculum** ([js/curriculum.js](js/curriculum.js)): every topic for every subject. The Maths topic frequencies are Revise's own estimates.
- **AI** ([js/ai.js](js/ai.js)): calls OpenAI with *your* key. The key is stored only in your browser, never in this code.

## Run it locally
```bash
cd ~/Documents/revision-site
python3 -m http.server 8000
```
Then open http://localhost:8000. To start using the AI, go to Settings → paste your OpenAI key → Save.

## After you edit anything
In `sw.js`, bump `CACHE_VERSION`, then open the app twice so it picks up the new files.

## Never commit your API key
The key lives in the browser's storage on each device, not in any file. Keep it that way, because this repo is public on GitHub Pages.
