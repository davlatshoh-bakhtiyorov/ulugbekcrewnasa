# Neyra — see before you sow

**NASA Space Apps Challenge 2026 · Tashkent · Challenge: "Field Shift: Adapting Farms with NASA Data" · Team ulugbek-crew**

Neyra helps a farmer plant the **right crop at the right time**. The farmer shows a field on a map and answers
three questions with buttons (last crop · water · salinity). Neyra returns three crop-rotation options, each with four
traffic lights — **water · ripens in time · soil benefit · market & waste risk** — computed in the browser from NASA
Earth observations and FAO crop science. Every number shows its source, resolution and period. Neyra supports the
farmer's judgement; it does not replace it.

- **Live site (English / Uzbek):** https://davlatshoh-bakhtiyorov.github.io/ulugbekcrewnasa/
- **App (web + Telegram Mini App):** https://davlatshoh-bakhtiyorov.github.io/ulugbekcrewnasa/web/ · Telegram bot: https://t.me/ulugbekcrewbot
- **Demo deck (7 slides, PDF):** `docs/demo/Neyra-pitch-en.pdf` · earlier light decks: `Neyra-en.pdf`, `Neyra-uz.pdf` (Uzbek)
- **Telegram bot:** `bot/bot.js` — `/start` opens the Mini App; a shared location opens it at that field (`npm run bot`)
- **Submission text:** `docs/SUBMISSION.md`

## Why

In spring 2024 onion wholesale prices in Uzbekistan fell to about 12 US cents per kg and 150–200 thousand tonnes
were dumped or fed to cattle (EastFruit, 16 Apr 2024). Everyone had planted what paid the year before; demand for
onions hardly moves with price. The same cycle hit Surkhandarya in 2018 and swung back in 2025 (area −30–40 %,
price ×10). Farmers lack one thing *before sowing*: evidence about their own field — water, ripening date, soil,
and when everyone else's crop reaches the market.

## What it does

1. **Pick the field** — tap the map or share your location. Live NASA layers (MODIS NDVI, SMAP L4 soil moisture,
   MODIS land surface temperature, GRACE water storage) with a date slider; tapping a point reads the pixel value
   through the official NASA GIBS colour scales and shows a 12-frame history.
2. **Three questions** — last crop, water situation, salinity (unknown / low / medium / high).
3. **Three options** — six candidate crops (winter wheat, cotton, onion, potato, mung bean, alfalfa) are evaluated
   over 42 years of NASA POWER daily weather for that point; the top three are shown with four lights and a
   one-sentence explanation. "Details" opens the evidence: charts, per-year tables and a source chip under every block.
4. **Field passport** — NDVI of the last 36 months with green periods (crops per year), SMAP root-zone moisture today
   vs the same day in 2015–2024, and the local climate shift 1985–2004 → 2006–2025.

The project site adds: the onion price cycle with sourced points, a **harvest-timing map** (season end of every
500 m MODIS pixel around Surkhandarya, 2016–2025), the **market window** (the same onion model run for 16 regions
of Central Asia and southern Russia), a climate-shift map of 13 Uzbek regions, and the FAO-vs-MODIS calibration.

## NASA data — each dataset feeds a number on screen

| Dataset | Access | Feeds |
|---|---|---|
| NASA POWER daily (MERRA-2 + CERES), ~0.5°, 1984–2025 | POWER API | FAO-56 Penman–Monteith ET0 and crop water need, growing degree-days and ripening date, spring/autumn frost, heat days, harvest-window weather, climate shift, market window |
| MODIS MOD13Q1 v061 NDVI, 250 m, 16-day | GIBS tiles + colormap | vegetation at the tapped point, green periods (crops per year), demo-field greenness curve |
| MODIS MCD12Q2 v061 phenology, 500 m, yearly (doi:10.5067/MODIS/MCD12Q2.061) | ORNL DAAC subsets | calibrated season length for wheat and cotton; harvest-timing map |
| MODIS MOD11A2 v061 LST, 1 km, 8-day | GIBS | land surface temperature at the point, 12-month history |
| SMAP L4 SPL4SMAU v008 root-zone soil moisture, 9 km, daily | GIBS | soil moisture today vs 2015–2024 same day |
| GRACE/GRACE-FO JPL Mascon RL06 v02 CRI, ~300 km, monthly | GIBS | water storage anomaly at the point, 2003–2022 |

Crop science: FAO Irrigation and Drainage Paper 56 Rev.1 (2025, doi:10.4060/cd6621en) — Kc tables 6.1–6.4,
GDD thresholds 6.10, stage totals 6.11–6.12, salt tolerance 8.8–8.11; FAO-29 Rev.1 Table 4 as a cross-check.

## Validity

- 49 automated tests (`npm test`): FAO-56 worked examples (Ex. 3, 8, 18; Rev.1 Ex. 6.6, 6.7), FAO-29 table values,
  GIBS colour decoding, field passport, MODIS calibration.
- FAO heat-sum totals were made for other climates and made every season here too short (wheat "ripe" on 25 April).
  We re-scaled them with 767 field-years of MODIS MCD12Q2 phenology (323 pixels, 2016–2025): the model now ends the
  season within +0.5 day of what the satellite saw (FAO table: −36 days); cotton −4.5 days (FAO: −52).
- Probabilities are counted over history ("in 32 of 42 years"), never guessed. Missing data says "unknown".
- Things we tested and rejected are stated on the site: counting onion area from 500 m pixels does not work
  (it is the wheat tail in warm springs); it needs 10–30 m imagery (HLS/Sentinel-2) and a field map.
- Unverified team rules are marked `verified: false` in code and "unverified" in the UI: traffic-light cut-offs,
  crop identity of MODIS pixels, the 30-day-mean-10 °C sowing rule of the market window, the spoilage heuristic.

## Run locally

```
npm run dev          # http://localhost:8080/ (site) and /web/ (app); serves only web/, core/, site/, docs/*.json
npm test             # 49 tests
npm run pilot        # per-crop evaluation for the pilot field -> docs/pilot-ekinlar-jarqorgon.json
npm run gibs         # refresh GIBS frame dates -> web/data/gibs-layers.json
npm run site-data    # climate shift for 13 regions (NASA POWER) -> site/data/climate.json
npm run market-window  # onion ripening window, 16 regions -> site/data/market-window.json
npm run field-ndvi   # demo-field NDVI series from GIBS tiles -> site/data/field-ndvi.json
npm run mcd12q2 && npm run calibrate        # MODIS GDD calibration -> core/calibration.js
npm run mcd12q2:region && npm run harvest   # harvest-timing map -> site/data/harvest.json
```

Pure ES modules, no build step, no dependencies. Node 18+ for scripts. The Telegram bot token lives only in `.env`
(see `.env.example`).

```
core/    pure calculations (FAO-56 ET0, GDD, crop evaluation, advisor, GIBS decode, calibration) — browser + Node
web/     the app (browser + Telegram Mini App)
site/    the project site (index.html at the repo root)
scripts/ data pipelines (POWER, ORNL MCD12Q2, GIBS), dev server
tests/   node --test
docs/    submission text, demo deck and scripts, Uzbek planning notes (REJA.md), live API checks
```

## Use of AI

Claude Code (Anthropic) assisted in writing code and text. No data value comes from AI: every number is computed
from the cited NASA and FAO sources and checked by tests. The Neyra logo is an AI-generated image.

## Credits and licences

NASA POWER (NASA Langley) · NASA GIBS / EOSDIS tiles and colormaps · ORNL DAAC MODIS/VIIRS Land Product Subsets ·
FAO-56 Rev.1 (2025), FAO-56 (1998), FAO-29 Rev.1 (1985) · Leaflet 1.9.4 (BSD-2-Clause) · Telegram Web Apps script ·
Sentinel-2 cloudless 2020 by EOX (CC BY-NC-SA 4.0; contains modified Copernicus Sentinel data 2020) ·
© OpenStreetMap contributors (ODbL) · market figures: EastFruit, Kun.uz, Podrobno.uz, UzDaily (linked on the site).
A NASA Space Apps Challenge project; NASA does not endorse it.
