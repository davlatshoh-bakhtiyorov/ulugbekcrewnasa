# Demo deck generator (7 slides, EN + UZ)

The decks in `docs/demo/Neyra-en.pdf` (submission, English, logo watermark) and `docs/demo/Neyra-uz.pdf`
(stage, Uzbek) are generated here from the live site and app — no slide editor involved.

```
cd scripts/deck
npm install qrcode@1.5.4          # once (QR codes for bot / site / repo)
npm run dev                       # in another terminal, from the repo root (site + app on :8080)
node shots.js                     # screenshots of app flow and site visuals, EN and UZ, 2x  -> shots/
python3 optimize-shots.py         # PNG -> JPEG (keeps the PDFs at ~3 MB instead of 24 MB)
TEAM_NAMES="Name Surname · Name Surname" node gen.js   # -> deck-en.html, deck-uz.html
node print.js                     # headless Google Chrome -> Neyra-en.pdf, Neyra-uz.pdf (1920x1080)
cp Neyra-*.pdf ../../docs/demo/
```

`headless.js` drives Google Chrome over CDP (macOS path `/Applications/Google Chrome.app/...`); no npm
dependencies besides `qrcode`. Review the pages with `pdftoppm -png -r 50 Neyra-en.pdf p`.
