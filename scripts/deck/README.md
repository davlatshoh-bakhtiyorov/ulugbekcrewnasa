# Demo deck generator (7 slides)

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
TEAM_NAMES="A · B · C" node gen-pitch.js && node print.js pitch   # -> Neyra-pitch-en.pdf (dark)
node print.js                     # headless Google Chrome -> Neyra-en.pdf, Neyra-uz.pdf (light, 1920x1080)
cp Neyra-*.pdf ../../docs/demo/
```

`headless.js` drives Google Chrome over CDP (macOS path `/Applications/Google Chrome.app/...`); no npm
dependencies besides `qrcode`. Review the pages with `pdftoppm -png -r 50 Neyra-en.pdf p`.
