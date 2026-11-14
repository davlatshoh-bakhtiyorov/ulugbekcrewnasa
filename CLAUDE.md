# Field Shift UZ — project brief (NASA Space Apps 2026)

Hackathon: 14–15 Nov 2026, local event Tashkent, team "ulugbek-crew" (2 people).
Challenge: **Field Shift: Adapting Farms with NASA Data** — a decision-support tool that uses
NASA Earth observations + local soil info + crop characteristics + farmer priorities to help
farmers explore crop-rotation strategies (soil health, water, adaptation). It must support the
farmer's judgment, not replace it.

## What we are building

A farmer shows a field and answers three questions; the tool compares 3 rotation options on
water, climate fit, soil benefit, and market/waste risk. One calculation core, one front end:
a web app in `web/` that runs both in the browser and as a **Telegram Mini App** (team decision,
14 Nov). The bot in `bot/` is thin: /start, a menu button that opens the Mini App, optionally
receiving a location and opening the Mini App with it. The Mini App URL must be public HTTPS
(`WEBAPP_URL` in `.env`).

Repo: https://github.com/davlatshoh-bakhtiyorov/ulugbekcrewnasa (public since 14 Nov, branch `main`).
Live Mini App (GitHub Pages from `main`, root; `index.html` redirects to `web/`, `.nojekyll`):
https://davlatshoh-bakhtiyorov.github.io/ulugbekcrewnasa/web/ — every push to `main` redeploys.
Bot: @ulugbekcrewbot. Default menu button set via Bot API `setChatMenuButton` (web_app,
text "Dalani tekshirish") on 14 Nov — API said ok, but `getChatMenuButton` still returned
"commands"; confirm on a phone, fallback is BotFather -> Bot Settings -> Menu Button.
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
scripts/serve.js   npm run dev -> http://localhost:8080/ (serves only web/ and core/)
core/calibrate.js  GDD calibration (pure): MCD12Q2 grid -> pixel-years, crop rules, GDD sow->observed end, median, scaling
core/calibration.js  GENERATED by npm run calibrate (do not edit): calibrated wheat + cotton GDD with provenance and checks
scripts/fetch-mcd12q2.js  npm run mcd12q2 -> cache/mcd12q2/*.json (11 bands, ±8 km grid, 2016-2025, ~30 s per band)
scripts/calibrate-gdd.js  npm run calibrate -> core/calibration.js (prints sensitivity and the 2016-2025 check)
scripts/power-cache.js    pilot POWER series with cache (used by pilot and calibrate)
cache/             POWER responses (gitignored)
bot/               empty
```

Step 3 status: full flow verified in a 375 px browser viewport, uz and en, light and dark
(map tap / demo point -> 3 questions -> 3 cards with 4 lights -> details with chart, table view
and a source chip under every block). **Not yet verified inside Telegram**: needed a public HTTPS
URL first — now live on GitHub Pages (see top); the live site was checked in a 375 px browser
(demo point -> results in 2.5 s incl. POWER fetch, no console errors). Imports are relative
(`../core/`), so the site root must contain both `web/` and `core/`. Inside Telegram the user
confirmed it works ("HA ISHLADI", 14 Nov).

Step 4a (14 Nov, user asked for a "wow" with visual maps and moisture): field screen has a layer bar
(Satellite · Vegetation NDVI · Soil moisture SMAP L4 · Land heat MODIS LST · Water storage GRACE),
a date slider with play (12 monthly frames; GRACE: every July 2003–2022), a legend, and a tap readout
"What NASA sees at this point": the value of every layer at the tapped pixel plus a 12-frame history
chart + table of the selected layer. Numbers come from the map pixels: GIBS publishes an official
colormap per layer (colour -> value range); `core/gibs.js` decodes the pixel colour and shows the
range middle; transparent = "no data". Verified: 100% of colours in test tiles match the colormaps;
browser NDVI series at the demo field equals an independent Python+PIL decode. Tiles are read with
fetch + createImageBitmap (CORS open, `layer-time-actual` header gives the real date).
Layers and products (from GIBS layer-metadata): MOD13Q1 v061 NDVI 250 m 16-day (z9, colormap
MODIS_L3_NDVI); SMAP L4 SPL4SMAU v008 root zone 9 km daily (z6, SMAP_Analyzed_Soil_Moisture);
MOD11A2 v061 LST day 1 km 8-day (z7, MODIS_Land_Surface_Temp, kelvin -> °C); GRACE/GRACE-FO JPL
Mascon RL06 v02 CRI (z6, ends 2022-07 in GIBS; anomaly vs a time-mean per CMR — baseline period not
stated there, so the UI says "long-term mean"; GIBS colours: blue = less water, legend says so).
Skipped: IMERG (EPSG:3857 only daily, empty in the dry season), HLS (empty tile on the tested date).
Demo point moved to a real double-crop field 37.5021, 67.3888 (NDVI Mar–Apr ~0.7, May 0.27,
Jul–Aug 0.75); same NASA POWER cell as the pilot point, so climate results are unchanged.
Tile CORS is open; Telegram: `disableVerticalSwipes()` (7.7+) so map drags don't close the app.

Step 4b part 1 — field passport (14 Nov): screen "Dala pasporti", opened from the map readout and
from a teaser card under the 3 options. Blocks: (1) NDVI line chart of the last 36 months (69
MOD13Q1 16-day frames decoded from GIBS, ~3 MB of tiles) with "green periods" shaded and listed per
year — rule: starts at NDVI >= 0.5, ends < 0.4 (`GREEN_RULE`, verified: false); demo field: 2024 two
periods, 2025 one, 2026 two. (2) SMAP L4 root-zone moisture today vs the same calendar day 2015–2024
(GIBS has no 2025-11-07..13), median + "wetter in k of n years", bar per year with gaps. (3) Climate
shift from the POWER data already loaded: 1985–2004 vs 2006–2025 table (frost dates, frost-free,
>= 38 °C days, JJA Tmax, ET0 with the wind caveat) + heat days per year chart.
MCD12Q2 via ORNL was tested for the passport and dropped there: 25 years of NumCycles took 54 s
(3 parallel requests), and at the demo 500 m pixel it reports 1 cycle in 21 of 25 years while the
250 m NDVI shows clear double cropping in 2024 and 2026 (pixel mixing). MCD12Q2 is used offline
for the GDD calibration over many pixels instead (step 4c below).

Traffic lights (core/advisor.js, all cut-offs `verified: false`):
water = dry-year (p80) net need vs farmer's water answer; ripen = share of years matured;
soil = rotation rule (same crop red, legume green, after legume green, else yellow) combined with
salinity yield (worst case); market & waste = spoilage level only — price part shows "unknown"
until `docs/narxlar.md` exists. Ranking: sum of light scores, ties -> fewer reds -> less water.

External resources used by the page (list them in the submission): Leaflet 1.9.4 (cdnjs, BSD-2),
Telegram WebApp JS (telegram.org), EOX Sentinel-2 cloudless 2020 tiles (CC BY-NC-SA 4.0,
attribution shown), OpenStreetMap tiles (ODbL, attribution shown), NASA GIBS WMTS tiles and colormaps
(attribution "NASA GIBS / EOSDIS" shown).

Confirmed crops (14 Nov): winter wheat, cotton, onion, potato, mung bean, alfalfa.

Step 2 method, per year, then counted over years ("in k of N years"):
- Ripening: GDD from sowing (Rev.1 Eq. 6.23, Table 6.10 thresholds) until the Table 6.11/6.12
  stage total; spring/summer crops fail if an autumn frost (T2M_MIN <= 0 °C after 1 July) comes first.
- Water: Kc curve Eq. 6.20 with stage lengths from that year's GDD; Kc mid/end climate-adjusted
  (Eq. 6.16/6.19, RHmin from T2MDEW via Eq. 6.17); minus effective rain (USDA-SCS monthly,
  `verified: false` until the CROPWAT page is checked). Net field need, m3/ha = mm x 10.
- Heat: mid-season days with daily mean T >= Tupper (Table 6.10). Sourced, but blind to wheat
  heat stress (mean never reaches 35 °C in May) — a Tmax-based flowering threshold needs a source.
- Spoilage: 14 days after maturity; rain days (grain, cotton) or mean Tmax (onion, potato).
  Thresholds are a team heuristic, `verified: false`.
- Alfalfa: season between -4 °C frosts, Kc 1.05 season average, cuttings from GDD cycles
  (thermal upper bound).

**Step 4c — GDD calibration with NASA MODIS (done 14 Nov; fixes the old "known problem").** FAO GDD
totals are "indicative"; in hot Surxondaryo they made seasons too short (wheat "matured" 25 Apr) and all
six crops ripened in 100% of years, so the ripening light carried no information. Now: MCD12Q2 v061
(doi 10.5067/MODIS/MCD12Q2.061) grid ±8 km around 37.51/67.42 (33x33 px), 2016-2025, via ORNL TESViS.
Per pixel-year: GDD (POWER temps, Eq. 6.23) from the model sowing date to the MODIS end of season;
median = new total; FAO stage shares kept. Crop identity per pixel is a team rule (`verified: false`,
`CAL_RULES` in core/calibrate.js): wheat = 2-cycle pixel, cycle 1 ending May-July, end = Dormancy (EVI2
back to 15%, full senescence; dry grain is cut after it); cotton = 1-cycle pixel greening Apr-Jun, end =
MidGreendown (EVI2 down to 50%, defoliation / picking starts — Dormancy ~6 Nov is kept green by late
pickings, stalks and wheat sown into cotton; with it cotton would "ripen" in only 23 of 42 years).
Results: wheat 2105 -> 3066 GDD (767 field-years, 323 px), maturity 25 Apr -> 3 Jun, 2016-2025 check
model - MODIS median +0.5 d (FAO -36 d), dry-year water 3760 -> 6200 m3/ha; cotton 2150 -> 2823 GDD
(261 field-years, 167 px), maturity 21 Aug -> 5 Oct, check -4.5 d (FAO -52 d), ripens before frost in
32 of 42 years (FAO: 42/42) — 8 of the 10 frost years are 2009 or earlier; in 2018 and 2020 the model
says frost first while MODIS saw the fields finish (UI says so). Sensitivity stored in calibration.js.
Onion, potato, mung bean stay on FAO values (UI note says why): a 500 m pixel cannot tell them apart;
cycle 2 of double-crop pixels (Jul-Nov, ~120 days) mixes mung bean, maize and vegetables.
`evaluateCrop(days, crop, { calibration })` — pass `CALIBRATION` (app, pilot) or null for FAO only
(`npm run pilot -- --fao`); results carry `ripen.gddModel` (FAO vs calibrated, per-year check). The
details screen shows season bars (FAO table / calibrated / MODIS-observed with IQR), a note with n,
pixels, years and the check, a per-year table, and a MODIS source chip.

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
| 5 | Telegram bot (launcher) | /start + menu button opens the Mini App; a sent location opens it at that field. Token only from `.env` (`.env.example` done). |
| 6 | Water outlook + HLS | GRACE basin storage series precomputed to JSON; HLS for one pilot district. |
| 7 | Submission | English README, project page text, demo (7 slides or 30 s video — confirm with Local Lead), list of NASA data and all external resources, AI-use disclosure. |

Later candidates (not in the table yet): carrot, cabbage, tomato, sesame, maize, melon/watermelon.

Research input still expected from the chat session — check before step 3:
`docs/narxlar.md` (price history, for the market & waste light).

## Judging (official criteria)

Impact · Creativity · Validity · Relevance · Presentation. Target awards: Local Impact,
Best Use of Data. First gate is nomination by the Tashkent local judges.
