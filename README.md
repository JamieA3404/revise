# Revise 📚✅

A GCSE revision app that runs offline as an installable web app (PWA). It's plain HTML, CSS and JavaScript with no build step.

## Files

| File | What it does |
|---|---|
| `index.html` | The page skeleton and navigation |
| `css/styles.css` | All the styling. Colours are at the top in `:root` |
| `js/data.js` | Subjects, task types, saving/loading, date helpers |
| `js/audio.js` | Brown/white/rain noise, reward sound effects, your own audio files |
| `js/fx.js` | Confetti, toasts, celebration pop-ups |
| `js/rewards.js` | XP, levels, gems, streaks, badges |
| `js/views/*.js` | One file per page: today, focus, plan, journey, progress, settings |
| `js/app.js` | Starts the app and switches pages |
| `sw.js` | Service worker, which makes the app work offline |
| `manifest.webmanifest` | App name and icon for installing |

## Run it locally

```bash
cd ~/Documents/revision-site
python3 -m http.server 8000
```
Then open http://localhost:8000 in Safari. Press Ctrl+C in Terminal to stop the server.

## After you edit anything

Open `sw.js` and bump `CACHE_VERSION` (for example `'v1'` → `'v2'`). Otherwise installed copies keep the old files. After you publish, open the app twice and the update appears.

## Your data

Your data is saved in the browser on each device, so the Mac and the iPad have separate copies. Use **Settings → Export / Import** to move it between them. Your own audio files aren't included in the backup.
