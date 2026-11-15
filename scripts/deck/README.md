# Demo deck generator (7 slides)

Text for both decks and the in-browser pitch lives in `pitch/strings.js` (EN + UZ). `strings.mjs` re-exports it;
regenerate `strings.cjs` after editing: `sed -e 's/^export const /const /' -e '$a\\\nmodule.exports = { TEAM, LINKS, L, shot, PRESS_DECK };' ../../pitch/strings.js > strings.cjs`.

`docs/demo/Neyra-pitch-en.pdf` — the dark pitch deck (problem → numbers → causes → product → proof → impact/team), used for
the submission and the stage. `Neyra-en.pdf` / `Neyra-uz.pdf` are the earlier light decks (English / Uzbek stage version).
All are generated from the live site and app — no slide editor involved.

```
cd scripts/deck
npm install qrcode@1.5.4          # once (QR codes for bot / site / repo)
npm run dev                       # in another terminal, from the repo root (site + app on :8080)
node shots.js                     # screenshots of app flow and site visuals, EN and UZ, 2x  -> shots/
python3 optimize-shots.py         # PNG -> JPEG (keeps the PDFs at ~3 MB instead of 24 MB)
TEAM_NAMES="Name Surname · Name Surname" node gen.js   # -> deck-en.html, deck-uz.html
sh fetch-press.sh                 # cover images for the problem slide (YouTube/EastFruit thumbnails) -> press/
node shots-dark.js                # dark-mode screenshots for the pitch deck (optional: node shots.js for the light decks)
node shots-dark.js uz             # Uzbek dark screenshots -> shots/dark-uz-*
node gen-pitch.js && node print.js pitch   # -> Neyra-pitch-en.pdf + Neyra-pitch-uz.pdf (strings in strings.mjs)
npm install pptxgenjs@3.12.0 && node build-pptx.cjs && for f in Neyra-pitch.pptx Neyra-pitch-uz.pptx; do zip -dq $f '*/'; done   # editable decks (strings.cjs = copy of strings.mjs)
node print.js                     # headless Google Chrome -> Neyra-en.pdf, Neyra-uz.pdf (light, 1920x1080)
cp Neyra-*.pdf ../../docs/demo/
```

`headless.js` drives Google Chrome over CDP (macOS path `/Applications/Google Chrome.app/...`); no npm
dependencies besides `qrcode`. Review the pages with `pdftoppm -png -r 50 Neyra-en.pdf p`.
