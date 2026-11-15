# Neyra (Field Shift UZ) — project brief (NASA Space Apps 2026)

Hackathon: 14–15 Nov 2026, local event Tashkent, team "ulugbek-crew" (2 people).
Challenge: **Field Shift: Adapting Farms with NASA Data** — a decision-support tool that uses
NASA Earth observations + local soil info + crop characteristics + farmer priorities to help
farmers explore crop-rotation strategies (soil health, water, adaptation). It must support the
farmer's judgment, not replace it.

## Submission and presentation (15 Nov — the local event day; submission closes 15 Nov 23:59 Tashkent)

Rules read from the official "Project Submission Guide" (13 Nov 2026 PDF, on the user's Desktop): demo = **7 slides
max (incl. title/intro), English** or a **≤ 30 s video** (any language, English subtitles), hosted publicly without
login; everything on the project page and in linked materials in English; AI-generated images need a visible
watermark; code/text AI help must be acknowledged in text; no NASA branding in generated content; no persons under 18.
The stage pitch is local-event business (5 minutes, per the user).

Decisions: the **user presents in Uzbek** with `docs/demo/Neyra-uz.pdf`; the **teammate shows the live site** from
the admin laptop at slide 4 (pre-open the site and tap the demo point once so tiles are cached); the **English
`docs/demo/Neyra-en.pdf`** is the submission demo (title slide carries "Logo: AI-generated image"); the user will
also record a ≤ 30 s video today — script and English SRT in `docs/demo/video-script.md`,
`docs/demo/video-subtitles-en.srt`. Stage script: `docs/demo/nutq-uz.md`. Project-page text (all fields, English):
`docs/SUBMISSION.md`. README is now English (old Uzbek README kept as `docs/README-uz.md`).

**Pitch deck (15 Nov, user brief: pitch style, professional, dark, creative, English):** `docs/demo/Neyra-pitch-en.pdf`
from `scripts/deck/gen-pitch.js` — 1 title · 2 press-cover wall (YouTube/EastFruit thumbnails, attributed; the Facebook
reel needs login — user may add a screenshot) · 3 yearly-loss numbers (5–7 Mt = our arithmetic from UzDaily's 20–30 % and
"1.14 Mt cold storage = 4.9 %" ⇒ ≈ 23 Mt; labelled as estimate) · 4 causes with ✓/○ what Neyra addresses · 5 product
(dark app screenshots; **user will replace with real Telegram screenshots**) · 6 proof (live map, FAO vs MODIS, 30·35·62 days)
· 7 team + QR. **15 Nov update (user: "juda ko'p ma'lumot", "Google Slides", team names + photos):** text cut to one
idea per slide; team = Davlatshoh Baxtiyorov (`~/Desktop/IMG_6501.JPG`, arrived later on 15 Nov),
Og'abek Raxmonjonov (`~/Downloads/photo_2026-11-15 10.48.22.jpeg`, cropped to the face), Abdulla Inogomov
(`~/Desktop/IMAGE 2026-11-15 10:49:04.jpg`); crops in `scripts/deck/team/`. Two outputs from the same content:
`docs/demo/Neyra-pitch-en.pdf` (HTML → Chrome) and `docs/demo/Neyra-pitch.pptx` (pptxgenjs, `build-pptx.cjs`,
validated; ZIP folder entries removed for cloud import). Google Drive upload via the connector failed:
"not enough Drive storage quota" on the connected Google account — the user imports the PPTX into Google Slides
themselves (File → Import) or frees space and we upload + share "anyone with link". This deck is the submission demo
link and the stage deck. Prices are shown in **UZS first** (user: "sent o'rniga UZS da yoz"): 1 500 UZS/kg with "≈ 12 US
cents" only as a small parenthetical — same on the site's facts tile and in SUBMISSION.md.

Deck pipeline (no slide editor; reproducible): `scripts/deck/` — `shots.js` (headless Chrome screenshots of the app
flow and site visuals, EN and UZ, 2x), `optimize-shots.py` (PNG → JPEG, else the PDFs are 24 MB), `gen.js`
(HTML slides 1920×1080 from an EN/UZ strings object; `TEAM_NAMES="…"` env fills the member names — **still a
placeholder "ulugbek-crew (2)"; the user will send names**), `print.js` (Chrome `Page.printToPDF`). The app ignores
`?lang`; shots.js clicks `#lang`. New logo (15 Nov): striped leaf, AI-generated per the user, cut from the PNG's own
alpha; brand green `#0f7f45`. The user does not want a visual watermark on the site; the credits fold says
"Logo: AI-generated image" instead.

Vercel: `ulugbekcrewnasa.vercel.app` returns DEPLOYMENT_NOT_FOUND; the Vercel account connected to Claude (team
"ivybek") has no such project and the GitHub repo has no Vercel integration records — the project was deleted or
lived in another account. Offered A (ignore, Pages is enough) / B (recreate under ivybek, Git-connected) / C (user
checks vercel.com); no answer yet. Nothing on our side touched Vercel.

Site v4 (15 Nov): the 3D layer stack was removed on the user's request ("3D in the wrong place"); the hero is text +
the leaf mark; the big NASA map section and the ⓘ Batafsil toggles stay. A 3D element may return only where it
carries meaning (idea on the table: globe → field zoom; not built).

## Brand (14 Nov, user decision)

Product name **Neyra** (was "Field Shift UZ"; the challenge name stays in the kicker). Logo (15 Nov): striped
green leaf (AI-generated) in `site/assets/neyra-{mark,512,192,64}.png`; brand green `#0f7f45`, light `#4cc27a`. Design brief from the user: "chiroyli, minimalistik va tiniq" — white background, one
accent colour, big numbers, **one visual per section that answers one plain question**; "wow" means clear maps and
charts, not complex diagrams. Mini App header shows the logo + "Neyra" (web/i18n.js `title`).

## What we are building

A farmer shows a field and answers three questions; the tool compares 3 rotation options on
water, climate fit, soil benefit, and market/waste risk. One calculation core, one front end:
a web app in `web/` that runs both in the browser and as a **Telegram Mini App** (team decision,
14 Nov). The bot in `bot/` is thin: /start, a menu button that opens the Mini App, optionally
receiving a location and opening the Mini App with it. The Mini App URL must be public HTTPS
(`WEBAPP_URL` in `.env`).

Repo: https://github.com/davlatshoh-bakhtiyorov/ulugbekcrewnasa (public since 14 Nov, branch `main`).
GitHub Pages from `main`, root, `.nojekyll` — every push to `main` redeploys:
- project site (uz/en, the basis of the step-7 submission): https://davlatshoh-bakhtiyorov.github.io/ulugbekcrewnasa/
  (root `index.html` + `site/`; a URL carrying `tgWebApp` in hash/search is redirected to `web/` so old
  Mini App links keep working);
- Mini App: https://davlatshoh-bakhtiyorov.github.io/ulugbekcrewnasa/web/
Bot: @ulugbekcrewbot. Default menu button set via Bot API `setChatMenuButton` (web_app, text
"Dalani tekshirish", URL …/ulugbekcrewnasa/web/) on 14 Nov; `getChatMenuButton` later confirmed
type web_app with that URL.
Secrets: `.env` (gitignored) holds `TELEGRAM_BOT_TOKEN`; `.env.example` lists the keys.

Team motivation: vegetables are dumped in Uzbekistan because everyone plants what was
expensive last year (onion 2024: wholesale price fell to ~12 US cents/kg, 150–200k t discarded),
and 20–30% is lost after harvest for lack of cold storage. So "market and waste risk" is one
of the four scores — but rotation stays the main screen (judging criterion: Relevance).

## Hard requirements from the team

- Impactful, simple, convenient, accurate.
- Use NASA data as much as possible — but every dataset must feed a number on screen.
  A dataset that is listed but not used hurts the Validity score.
- Work step by step; finish and verify one step before the next.

## Farmer flow (same in browser and Mini App)

1. Show the field: tap on the map, or share location (Telegram location / browser geolocation).
2. Answer with buttons: last crop · water situation · salinity (unknown/low/medium/high).
3. Get three options, each with four traffic lights (water · will it ripen in time ·
   soil benefit · market & waste risk) and a one-sentence explanation.
   "Details" opens the NASA evidence: chart, source, resolution, period.

## Accuracy rules

- Every number carries source, resolution and period.
- Probabilities come from history ("in 39 of 42 years"), never from a guess.
- Missing data returns null and the UI says "unknown" — never fill gaps silently.
- Crop parameters need a cited source with table and printed page. Main source is
  **FAO-56 Rev.1 (2025)** (doi 10.4060/cd6621en; printed page = PDF page - 32): Kc Tables
  6.1/6.2/6.4, GDD thresholds Table 6.10, GDD per stage Tables 6.11/6.12, salt tolerance
  Tables 8.8/8.9/8.11. Salt values are cross-checked against FAO-29 Rev.1 Table 4 (pp. 31-32)
  in a test. The 1998 FAO-56 (Tables 11/12, stage lengths in days) is superseded; cite it only
  where Rev.1 is silent (alfalfa -4 °C season rule). Do not invent values; mark anything
  unverified as `verified: false`.
- Calculations are tested against published worked examples (`npm test`).
- POWER soil wetness (GWETROOT/GWETTOP) is MERRA-2 model output, NOT SMAP. Never label it SMAP.

## Language

- UI: Uzbek (Latin script) for farmers, with an English toggle for judges.
- Submission page and all linked material (README, repo docs, slides) must be English.
  README.md and docs/ are currently in Uzbek — translate README before submission (step 7).

## Current state (step 4 — map, passport, GDD calibration — built and checked in a browser, 14 Nov)

```
core/agro.js       FAO-56 Penman-Monteith ET0, GDD, frost/heat stats, climate shift, trend
core/power.js      NASA POWER URL builder, fetch, parser (-999 -> null)
core/crops.js      6 crops with sources (table + page): Kc, Tbase/Tupper, GDD stages, salt
core/crop-calc.js  per-crop evaluation over all years: ripening, water, heat, spoilage, salinity
scripts/pilot-crops.js   npm run pilot -> prints pilot result, writes docs/pilot-ekinlar-jarqorgon.json
tests/             49 tests pass (FAO-56 Ex. 3, 8, 18; Rev.1 Ex. 6.6, 6.7; FAO-29 Table 4; GIBS decode; passport; calibration) -> npm test
docs/REJA.md             step plan (Uzbek)
docs/NASA-TEKSHIRUV.md   live API check results (Uzbek)
docs/pilot-iqlim-jarqorgon.json    step 1 climate result
docs/pilot-ekinlar-jarqorgon.json  step 2 crop result
core/advisor.js    four traffic lights + ranking of the 6 crops -> top 3 (language-free codes)
web/               Mini App: index.html, app.js (flow), i18n.js (uz/en), tg.js (Telegram glue),
                   chart.js (SVG bar chart, negatives ok), style.css (Telegram theme vars + own light/dark),
                   nasa-map.js (live NASA layers + tap readout), data/gibs-layers.json (generated)
core/gibs.js       GIBS layer list, tile math, colormap parser, pixel colour -> value class, frame/series picking
core/field.js      field passport: NDVI green periods (team rule, unverified), SMAP same-day comparison, DOY->date
scripts/gibs-layers.js   npm run gibs -> web/data/gibs-layers.json (frame dates verified via layer-time-actual)
scripts/serve.js   npm run dev -> http://localhost:8080/ (site) and /web/ (Mini App); whitelist: root index.html,
                   web/, core/, site/, docs/*.json — never .env, .git, cache/, scripts/, dotfiles
core/calibrate.js  GDD calibration (pure): MCD12Q2 grid -> pixel-years, crop rules, GDD sow->observed end, median, scaling
core/calibration.js  GENERATED by npm run calibrate (do not edit): calibrated wheat + cotton GDD with provenance and checks
scripts/fetch-mcd12q2.js  npm run mcd12q2 -> cache/mcd12q2/*.json (11 bands, ±8 km grid, 2016-2025, ~30 s per band)
scripts/calibrate-gdd.js  npm run calibrate -> core/calibration.js (prints sensitivity and the 2016-2025 check)
scripts/power-cache.js    pilot POWER series with cache (used by pilot and calibrate)
cache/             POWER responses (gitignored)
bot/               empty
web/cards.js       shared card + calibration-block renderers (used by the Mini App and the site)
index.html         project site (root of GitHub Pages), uz/en, text via data-t
site/site.js       site logic: hero NDVI crossfade, demo (advise on the pilot JSON), data table, climate map, FAO vs MODIS
site/text.js       site strings uz/en + SRC (EastFruit, UzDaily) + LINKS
site/site.css      site styles (tokens copied from web/style.css, light/dark)
site/data/climate.json   GENERATED by npm run site-data: 13 regional centres, 1985-2004 vs 2006-2025 (NASA POWER)
scripts/site-data.js     npm run site-data -> site/data/climate.json (uses scripts/power-cache.js, ~13 POWER calls)
scripts/market-window.js npm run market-window -> site/data/market-window.json (B: onion ripening window, 16 regions)
scripts/png.js           dependency-free PNG decoder (palette/gray/RGB/RGBA, no interlace) for GIBS tiles in Node
scripts/field-ndvi.js    npm run field-ndvi -> site/data/field-ndvi.json (demo field NDVI, 69 series + 12 hero frames)
scripts/fetch-mcd12q2-region.js  npm run mcd12q2:region -> cache/mcd12q2/surxondaryo/<band>-<year>.json (±65 km, 10 years)
scripts/harvest-timing.js        npm run harvest -> site/data/harvest.json (A: season-end date of every pixel per year)
site/assets/             Neyra logo PNGs (transparent), favicon/apple-touch icon
```

**Site v3 changes (14 Nov evening, user: "xaritani alohida va katta", "skrollda 3D", "hali ham juda ko'p ma'lumot").**
- Hero = text + a **3D stack of the five NASA layers** (satellite, NDVI, SMAP L4, LST, GRACE) drawn from tiles onto
  canvases for the demo-field extent (`boundsCanvas`, zoom ≤ 10) and laid out with CSS `perspective` + `translateZ`;
  the gap/rotation/labels follow scroll (`onScrollStack`: desktop opens over the first 300 px, phone as it scrolls
  into view; `prefers-reduced-motion` = fully open). Labels carry layer · resolution · frame date.
- New section **#map "Dalangizni NASA ko'rganidek ko'ring"**: the app's `web/nasa-map.js` is reused unchanged on
  the site (same element ids `layerBar`, `timeBar`, `play`, `frame`, `frameLabel`, `legend`, `readout`; map div
  `#nasaMap`, 64 vh): layer chips, date slider + play, legend, tap readout with 12-frame history; "Dala pasporti"
  button links to `web/`. The old hero crossfade map is gone.
- **Simplicity rule:** every section shows only eyebrow + question + one visual; everything else has class
  `detail` and is hidden until the section's "ⓘ Batafsil" button (added by `infoToggles()`, toggles `.open` on the
  section) is pressed. Price and NDVI charts re-render on open (they need a visible container width).
- CSS: removed the v2 hero `.frame-*`/`.play` absolute rules (they had hijacked the timebar's `.frame-label`).

**Project site v2 "Neyra" (14 Nov; checked headless in Chrome at 375 px and 1280 px, uz/en, light/dark, no console
errors, no horizontal scroll).** Files: `index.html`, `site/site.js`, `site/site.css`, `site/text.js` (uz/en strings,
`SRC` news sources, `PRICE_POINTS`). Sections, each = eyebrow + question + one visual:
hero (h1 "Ekishdan oldin ko'ring", NDVI month-by-month crossfade with a big month label and an auto caption from the
demo field's NDVI in `site/data/field-ndvi.json`: ≥0.5 green / <0.3 bare; 3 stats) · problem (SVG "onion cycle" loop
2022–2025 + sourced price points chart with numbered notes: EastFruit Nov 2023 1 800, Apr 2024 1 500, Kun.uz Jun 2024
500–1 000, Kun.uz Apr 2025 7 000–8 000 UZS/kg; 3 facts; one paragraph on causes satellites cannot fix) · how it works
(3 steps + live demo) · **A "Sun'iy yo'ldosh yig'imni ko'radi"** (harvest-timing map, see below) · **B "Bozor oynasi"**
(calendar strip of 16 regions, see below) · climate (bubbles sized/coloured by delta, 4 big then→now numbers) ·
one field (NDVI greenness curve of the demo field, 2023–2024 season, with FAO 16 Apr / Neyra 29 May / MODIS 3 Jun
markers + legend; the two season-bar cards; six-crop table in a fold) · method/data/limits folds · team.
Shared pieces: `stripHtml()` calendar strip (used by A and B), `chartWidth()` responsive SVGs re-rendered on resize,
`.reveal` fade-in, `data-t` text. Generated data: `npm run site-data` (climate), `npm run market-window`,
`npm run field-ndvi` (needs `scripts/png.js`, a dependency-free PNG decoder, to read GIBS tiles in Node),
`npm run mcd12q2:region` + `npm run harvest`.

**B — market window (done 14 Nov).** `scripts/market-window.js` → `site/data/market-window.json`: the FAO onion GDD
model (no calibration) run with NASA POWER 1985–2025 for 16 regional points (UZ 7, TJ 2, TM 1, KZ 2, KG 1, RU 3).
Sowing rule (team rule, `verified: false`): first day the trailing 30-day mean temperature reaches 10 °C, median per
period. Result (all years): Surxondaryo sows 14 Mar, ripens 8 Jul; Tashkent 7 Aug (+30 d), Turkistan 12 Aug (+35 d),
Volgograd 8 Sep (+62 d); 2006–2025 ripens 5–10 days earlier than 1985–2004 everywhere. Absolute dates carry the FAO
table bias (local spring onion is harvested in June); the site says differences between regions are the robust part.

**A — herd signal: tested and rejected; replaced by the harvest-timing map (14 Nov).** `scripts/fetch-mcd12q2-region.js`
downloads MCD12Q2 for Surxondaryo ±65 km (261×261 px, 2016–2025, 110 requests ≈ 45 s each, cache
`cache/mcd12q2/surxondaryo/`). The plan was to count "early crop (onion)" pixels (first cycle ending by 15 May). The
distribution refuted it: cycle-1 Dormancy is almost entirely late May–early June (wheat); pixels ending by 15 May were
4 649 (2016), 179 (2017), 1 (2018), 5 068 (2019), 1 853 (2020), 233 (2022) = the wheat tail in warm springs, not onion
area; 500 m pixels cannot separate 1–5 ha onion fields. Also MODIS found a season on only ~half the pixels in 2018 and
2022 (data quality). `scripts/harvest-timing.js` → `site/data/harvest.json` instead gives every pixel's season-end
date per year (map coloured 20 Apr → 9 Jul, year slider) and the per-year median/IQR strip (medians 29 May–10 Jun;
2016, 2019, 2023 early; the number of pixels with a spring-ending season swings 2 470–18 435 by year — MODIS data
quality, stated on the site as `hv_gap`). The rejection is stated on the site (`hv_note`) and in limitations; onion area needs HLS/
Sentinel-2 + a field map (Earthdata Login, step 6).

Browser verification: the browser MCP tools vanished mid-session; pages are checked with headless Google Chrome
over CDP from a Node script in the scratchpad (viewport 375/1280, dark emulation, console/network capture,
screenshots). Site uses smooth scrolling → scroll with `behavior: 'instant'` before screenshots.

Pure ES modules, no dependencies yet. Core functions must stay pure and isomorphic
(browser + Node 18+), with `fetch` injectable for tests.

## NASA endpoints verified live on 14 Nov 2026 (no login, CORS open)

**NASA POWER daily point** (MERRA-2 + CERES SRB/SYN1deg, ~0.5°)
`https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX,T2M_MIN,T2MDEW,WS2M,ALLSKY_SFC_SW_DWN,PRECTOTCORR&community=AG&longitude=LON&latitude=LAT&start=YYYYMMDD&end=YYYYMMDD&format=JSON`
- max 20 parameters per request; fill value -999; elevation is the 3rd coordinate in `geometry`.
- 1984-01-01..2025-12-31 (15,341 days, 6 parameters) returned in ~3 s with no missing values.

**ORNL DAAC TESViS** (MODIS subsets) — base `https://modis.ornl.gov/rst/api/v1`
- `/{product}/dates?latitude=LAT&longitude=LON`
- `/{product}/subset?latitude=LAT&longitude=LON&band=BAND&startDate=AYYYYDDD&endDate=AYYYYDDD&kmAboveBelow=0&kmLeftRight=0`
- send header `Accept: application/json`; response has `Access-Control-Allow-Origin: *`.
- max 10 dates per request; slow (5–40 s per request) -> cache results, show progress.
- Verified products at 37.51N 67.42E:
  - MOD13Q1 (250 m, 16-day, 2000-02..2026-10-16): bands `250m_16_days_NDVI`, `250m_16_days_EVI`,
    `250m_16_days_pixel_reliability`, `250m_16_days_VI_Quality`; scale 0.0001
  - MCD12Q2 (500 m, yearly, 2001..2025): `NumCycles`, `Greenup.Num_Modes_01/02`,
    `Maturity.*`, `Senescence.*`, `Dormancy.*`, `EVI_Amplitude.*`
  - MOD16A2GF (500 m ET, 2000..2025), MOD11A2 (1 km LST), MOD09A1 (500 m reflectance), MCD12Q1
- NOT available for this location: SPL3SMP_E (SMAP) and ECO4ESIPTJPL (ECOSTRESS) return
  "No data available". Do not build on them via ORNL.
- Design consequence: long field history from MCD12Q2 (one value per year), last 2–3 years
  from MOD13Q1.

**NASA GIBS WMTS** (map tiles)
`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{Layer}/default/{YYYY-MM-DD}/GoogleMapsCompatible_Level{N}/{z}/{y}/{x}.{jpg|png}`
- Verified: `MODIS_Terra_CorrectedReflectance_TrueColor`, Level9, jpg; and the four layers in use
  (see step 4a). Colormaps: `https://gibs.earthdata.nasa.gov/colormaps/v1.3/{name}.xml` (names differ
  from layer ids); layer metadata: `https://gibs.earthdata.nasa.gov/layer-metadata/v1.0/{Layer}.json`.
- A date with no data returns a ~196-byte empty tile and no `layer-time-actual` header; a date inside
  a composite period snaps to the period start (header shows it).

**Needs Earthdata Login** (step 6; team is registering): GRACE/GRACE-FO mascons after 2022-07 and
as numbers, GPM IMERG, HLS 30 m, SMAP original files, ECOSTRESS. (SMAP L4 and GRACE values to class
precision are already available without login via GIBS colormaps.)

First thing to do in a new session: confirm this machine reaches the endpoints, e.g.
`curl -s "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX&community=AG&longitude=67.42&latitude=37.51&start=20260701&end=20260702&format=JSON"`

## Pilot: Surxondaryo (earliest harvest in the country; onion dumping documented; on the Amu Darya)

Climate point 37.51N 67.42E (Jarqo'rg'on area), NASA POWER, 1985–2004 vs 2006–2025:
last spring frost day 74 -> 62; frost-free 254 -> 262 days; days >= 38 °C 74 -> 80 per year
(94 in 2025); Apr–Sep mean T 27.1 -> 27.9 °C; Apr–Sep ET0 1287 -> 1386 mm.
Caveat: most of the ET0 rise comes from wind speed (+12%); reanalysis wind trends are less
reliable than temperature, and the radiation source switches from SRB to SYN1deg in 2001.
The exact pixel 37.51/67.42 is not a field (summer NDVI ~0.2); the app's demo point is now the
double-crop field 37.5021, 67.3888 in the same POWER cell (see step 4a).

## Steps

| # | Step | Done when |
|---|---|---|
| 1 | Foundation | done |
| 2 | Crop table + per-crop calculation | done (see "Step 2 method" and "Step 4c") |
| 3 | Web app = Telegram Mini App | done; live on GitHub Pages and confirmed inside Telegram (14 Nov) |
| 4 | Field memory + map + GDD calibration | done: 4a GIBS layers on Leaflet with time slider + tap readout; 4b field passport (NDVI 3 seasons, SMAP same-day, climate shift); 4c wheat + cotton GDD calibrated with MCD12Q2 (see above). Open idea: calibrate other crops if a crop map (field identity) becomes available. |
| A | Satellite sees the harvest | done 14 Nov: MCD12Q2 region grid, per-pixel season-end map + per-year strip; the planned "herd" (onion area) count was tested and rejected (documented on the site). |
| B | Market window | done 14 Nov: onion model in 16 regions, calendar strip, 1985–2004 vs 2006–2025 toggle. |
| 5 | Telegram bot (launcher) | done 15 Nov: `bot/bot.js` (no deps, long polling, `npm run bot`), /start → web_app button, shared location → Mini App `?lat&lon`; app reads `?lat&lon` and Telegram `start_param` "lat_lon"; sets commands + menu button on start; `WEBAPP_URL` now set in `.env`. Only one poller at a time (409). |
| 5-old | Telegram bot (launcher) | /start + menu button opens the Mini App; a sent location opens it at that field. Token only from `.env` (`.env.example` done). |
| 6 | Water outlook + HLS | GRACE basin storage series precomputed to JSON; HLS for one pilot district. |
| 7 | Submission | Basis exists: the project site (root, uz/en) already holds the problem, method, NASA data table, limitations, AI-use disclosure and credits. Still to do: English README, submission-form text (copy from `site/text.js` en), demo (7 slides or 30 s video — confirm with Local Lead), team names. |

Later candidates (not in the table yet): carrot, cabbage, tomato, sesame, maize, melon/watermelon.

Research input still expected from the chat session — check before step 3:
`docs/narxlar.md` (price history, for the market & waste light).

## Judging (official criteria)

Impact · Creativity · Validity · Relevance · Presentation. Target awards: Local Impact,
Best Use of Data. First gate is nomination by the Tashkent local judges.
