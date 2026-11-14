# Field Shift UZ — project brief (NASA Space Apps 2026)

Hackathon: 14–15 Nov 2026, local event Tashkent, team "ulugbek-crew" (2 people).
Challenge: **Field Shift: Adapting Farms with NASA Data** — a decision-support tool that uses
NASA Earth observations + local soil info + crop characteristics + farmer priorities to help
farmers explore crop-rotation strategies (soil health, water, adaptation). It must support the
farmer's judgment, not replace it.

## What we are building

A farmer shows a field and answers three questions; the tool compares 3 rotation options on
water, climate fit, soil benefit, and market/waste risk. One calculation core, two front ends:
a web page and a Telegram bot.

Team motivation: vegetables are dumped in Uzbekistan because everyone plants what was
expensive last year (onion 2024: wholesale price fell to ~12 US cents/kg, 150–200k t discarded),
and 20–30% is lost after harvest for lack of cold storage. So "market and waste risk" is one
of the four scores — but rotation stays the main screen (judging criterion: Relevance).

## Hard requirements from the team

- Impactful, simple, convenient, accurate.
- Use NASA data as much as possible — but every dataset must feed a number on screen.
  A dataset that is listed but not used hurts the Validity score.
- Work step by step; finish and verify one step before the next.

## Farmer flow (same in web and bot)

1. Show the field: bot = send location; web = tap on the map.
2. Answer with buttons: last crop · water situation · salinity (unknown/low/medium/high).
3. Get three options, each with four traffic lights (water · will it ripen in time ·
   soil benefit · market & waste risk) and a one-sentence explanation.
   "Details" opens the NASA evidence: chart, source, resolution, period.

## Accuracy rules

- Every number carries source, resolution and period.
- Probabilities come from history ("in 39 of 42 years"), never from a guess.
- Missing data returns null and the UI says "unknown" — never fill gaps silently.
- Crop parameters need a cited source (FAO-56 Tables 11/12 for Kc and stage lengths, FAO-29
  for salt tolerance). Do not invent values; mark anything unverified as `verified: false`.
- Calculations are tested against published worked examples (`npm test`).
- POWER soil wetness (GWETROOT/GWETTOP) is MERRA-2 model output, NOT SMAP. Never label it SMAP.

## Language

- UI: Uzbek (Latin script) for farmers, with an English toggle for judges.
- Submission page and all linked material (README, repo docs, slides) must be English.
  README.md and docs/ are currently in Uzbek — translate README before submission (step 7).

## Current state (step 1 done, 14 Nov)

```
core/agro.js    FAO-56 Penman-Monteith ET0, GDD, frost/heat stats, climate shift, trend
core/power.js   NASA POWER URL builder, fetch, parser (-999 -> null)
tests/          8 tests pass (FAO-56 examples 3, 8, 18)   ->  npm test
docs/REJA.md             step plan (Uzbek)
docs/NASA-TEKSHIRUV.md   live API check results (Uzbek)
docs/pilot-iqlim-jarqorgon.json   first real result
web/ bot/       empty
```

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
- Verified: `MODIS_Terra_CorrectedReflectance_TrueColor`, Level9, jpg.
- Candidate layers, names NOT yet verified — check WMTSCapabilities.xml before using:
  `SMAP_L3_Passive_Enhanced_Day_Soil_Moisture`, `HLS_L30_Nadir_BRDF_Adjusted_Reflectance`,
  `GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI`.

**Needs Earthdata Login** (step 6; team is registering): GRACE/GRACE-FO mascons (basin water
storage), GPM IMERG, HLS 30 m, SMAP numeric values, ECOSTRESS.

First thing to do in a new session: confirm this machine reaches the endpoints, e.g.
`curl -s "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M_MAX&community=AG&longitude=67.42&latitude=37.51&start=20260701&end=20260702&format=JSON"`

## Pilot: Surxondaryo (earliest harvest in the country; onion dumping documented; on the Amu Darya)

Climate point 37.51N 67.42E (Jarqo'rg'on area), NASA POWER, 1985–2004 vs 2006–2025:
last spring frost day 74 -> 62; frost-free 254 -> 262 days; days >= 38 °C 74 -> 80 per year
(94 in 2025); Apr–Sep mean T 27.1 -> 27.9 °C; Apr–Sep ET0 1287 -> 1386 mm.
Caveat: most of the ET0 rise comes from wind speed (+12%); reanalysis wind trends are less
reliable than temperature, and the radiation source switches from SRB to SYN1deg in 2001.
The exact pixel 37.51/67.42 is not a field (summer NDVI ~0.2) — pick a real field in step 4.

## Steps

| # | Step | Done when |
|---|---|---|
| 1 | Foundation | done |
| 2 | Crop table + per-crop calculation | For a point and sowing date: probability of ripening before first frost (from 42 years), water need (sum Kc x ET0 minus effective rain, m3/ha), heat-stress days at flowering, spoilage risk at harvest (temperature/humidity in harvest window x perishability). Tested. A script prints the pilot result. |
| 3 | Web page | Farmer flow works on a phone, uz/en toggle, every number shows its source. |
| 4 | Field memory + map | Crop cycles per year from MCD12Q2, last 3 years NDVI from MOD13Q1, GIBS layers on Leaflet, results cached. |
| 5 | Telegram bot | Location -> buttons -> three options, same core. Token only from `.env` (never commit it; provide `.env.example`). |
| 6 | Water outlook + HLS | GRACE basin storage series precomputed to JSON; HLS for one pilot district. |
| 7 | Submission | English README, project page text, demo (7 slides or 30 s video — confirm with Local Lead), list of NASA data and all external resources, AI-use disclosure. |

Candidate crops (not yet confirmed by the team): winter wheat, cotton, onion, potato, carrot,
cabbage, tomato, mung bean, sesame, maize, alfalfa, melon/watermelon.

Research inputs prepared in the chat session will appear here — check before step 2 and step 3:
`docs/ekinlar-manbalar.md` (crop parameters with sources), `docs/narxlar.md` (price history).

## Judging (official criteria)

Impact · Creativity · Validity · Relevance · Presentation. Target awards: Local Impact,
Best Use of Data. First gate is nomination by the Tashkent local judges.
