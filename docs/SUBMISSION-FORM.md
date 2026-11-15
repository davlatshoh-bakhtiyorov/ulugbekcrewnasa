# Space Apps project form — copy-paste blocks (field order as on the page, 15 Nov 2026)

## Project Name
Neyra — see before you sow

## Summary  (limit 1500 characters — this block is under it)
Neyra helps farmers in Uzbekistan plant the right crop at the right time. A farmer taps a field on a map and answers three questions with buttons — last crop, water situation, salinity. Neyra returns three crop-rotation options, each with four traffic lights (water need, ripens in time, soil benefit, market and waste risk) and a one-sentence explanation. Everything is computed in the browser from 42 years of NASA POWER daily weather, NASA MODIS vegetation and phenology, SMAP soil moisture and GRACE water storage, combined with FAO-56 crop science; every number shows its source, resolution and period. It runs as a web app and as a Telegram Mini App, in Uzbek and English.

Why it matters: the loss is not weather but information. In 2024 everyone planted onions after a good year; wholesale prices fell to 1,500 UZS (about 12 US cents) per kg and 150–200 thousand tonnes were dumped or fed to cattle. Neyra shows, before sowing, what the field can ripen, how much water it needs, what the rotation does to the soil and when the harvest meets the market — including a satellite view of when every field in the region finished its season. We re-scaled the FAO heat-sum tables with 767 field-years of MODIS phenology, so the model ends the season within half a day of what the satellite saw. Neyra supports the farmer's judgement; it does not replace it.

## Project Demonstration (link)
https://davlatshoh-bakhtiyorov.github.io/ulugbekcrewnasa/docs/demo/Neyra-pitch-en.pdf

## Project (link)
https://davlatshoh-bakhtiyorov.github.io/ulugbekcrewnasa/

## Project Details  (rich text; paste as is — headings in bold)
**What it does.** (1) Pick the field: a live map with NASA layers — MODIS NDVI 250 m, SMAP L4 root-zone soil moisture 9 km, MODIS land surface temperature 1 km, GRACE/GRACE-FO water storage — with a date slider; tapping any point reads the pixel through the official NASA GIBS colour scale and shows a 12-frame history. (2) Three questions, buttons only: last crop, water, salinity. (3) Three options: six candidate crops (winter wheat, cotton, onion, potato, mung bean, alfalfa) are evaluated year by year over 1984–2025 for that point; the top three are shown with four lights; "Details" opens the evidence (charts, per-year tables, a source chip under every block). (4) Field passport: 36 months of NDVI with green periods (crops per year), soil moisture today vs the same day in 2015–2024, and the local climate shift 1985–2004 → 2006–2025.

**How it works.** Water: FAO-56 Rev.1 Penman–Monteith ET0 from NASA POWER (Tmax, Tmin, dew point, wind, solar) × crop coefficients adjusted for local wind and humidity, minus effective rain; reported as the dry-year (80th percentile) net field need. Ripening: growing degree-days from sowing to the FAO stage total; a spring crop fails the year if an autumn frost comes first. FAO heat-sum totals are indicative and made every season here too short, so we re-scaled wheat and cotton with 767 field-years of MODIS MCD12Q2 phenology (323 pixels around Jarqo'rg'on, 2016–2025): the model now ends the season within +0.5 day of the satellite (FAO table: −36 days). Soil: rotation rule combined with salinity yield loss (FAO-56 Rev.1 Tables 8.8–8.11, cross-checked against FAO-29). Market and waste: spoilage risk in the 14 days after maturity; the price part says "unknown" until a price history is added. Probabilities are counted over history ("in 32 of 42 years"), never guessed; missing data says "unknown". All calculations are pure JavaScript, tested against FAO-56 worked examples (49 automated tests).

**Beyond one field.** The site shows the onion price cycle with sourced points; a harvest-timing map (MODIS season end of every 500 m pixel around Surkhandarya, 2016–2025); the market window — the same onion model run for 16 regions of Central Asia and southern Russia with NASA POWER: Surkhandarya ripens 30 days before Tashkent, 35 before Turkistan (KZ), 62 before Volgograd (RU), and the window has moved 5–10 days earlier since 1985–2004; and a climate-shift map of 13 Uzbek regions. We also state what we tested and rejected: counting onion area from 500 m pixels (it is the wheat tail in warm springs) — that needs 10–30 m imagery and a field map.

**Benefits and intended impact.** A farmer gets, in three taps and in their own language, the evidence that agronomists and exporters have and they do not: ripening date, water, soil and timing against the market — before the seed is in the ground. Regional agencies get a satellite view of harvest timing year by year. Next: 30 m HLS for crop area, a price history for the market light, more crops, pilots in Khorezm and Karakalpakstan.

**Creativity and factors considered.** No server and no model training: every number is computed on the device from open NASA and FAO sources, so it is auditable. We calibrated textbook agronomy with satellite phenology instead of trusting either alone. The interface is buttons only, in Uzbek, inside Telegram, because that is what farmers already have. Unverified rules are marked "unverified" in the UI and in code.

**Tools.** JavaScript ES modules (browser + Node 18), Leaflet 1.9.4, three.js (in-browser pitch), Telegram Web Apps API, NASA POWER API, NASA GIBS WMTS tiles and colormaps, ORNL DAAC MODIS subsets API, FAO-56 Rev.1 (2025), GitHub Pages / Vercel. Code and text were written with AI assistance (Claude Code); no data value comes from AI.

## Use of Super Intelligence (SI) — select all that apply
Select the options for: code generation / programming assistance; text / writing assistance; image generation (the logo).
If the form has a free-text box: "Claude Code (Anthropic) assisted in writing code and text (implementing formulas we specified from FAO-56, tests, data scripts, site and this text). No data value comes from AI; every number is computed from the cited NASA and FAO sources and verified by automated tests. The project logo is an AI-generated image (marked on the demo slides and in the credits). No NASA branding was generated or used."

## NASA Data — one row per resource (Link Text → Link Url)
| Link Text | Link Url |
|---|---|
| NASA POWER daily point data (MERRA-2 + CERES), 1984–2025 | https://power.larc.nasa.gov/ |
| NASA GIBS — map tiles and official colormaps (MODIS, SMAP L4, GRACE/GRACE-FO, Blue Marble) | https://nasa-gibs.github.io/gibs-api-docs/ |
| MODIS Terra MOD13Q1 v061 NDVI, 250 m, 16-day | https://lpdaac.usgs.gov/products/mod13q1v061/ |
| MODIS MCD12Q2 v061 Land Cover Dynamics (phenology), 500 m | https://doi.org/10.5067/MODIS/MCD12Q2.061 |
| ORNL DAAC MODIS/VIIRS Land Product Subsets (TESViS) | https://modis.ornl.gov/ |
| MODIS Terra MOD11A2 v061 land surface temperature, 1 km, 8-day | https://lpdaac.usgs.gov/products/mod11a2v061/ |
| SMAP L4 SPL4SMAU root-zone soil moisture, 9 km | https://nsidc.org/data/spl4smau |
| GRACE / GRACE-FO JPL mascon water storage anomaly | https://grace.jpl.nasa.gov/ |
| NASA Blue Marble (Earth texture of the pitch globe, via GIBS) | https://earthobservatory.nasa.gov/features/BlueMarble |
| NASA Earthdata CMR (collection metadata) | https://cmr.earthdata.nasa.gov/search/ |

## Space Agency Partner & Other Data — one row per resource
| Link Text | Link Url |
|---|---|
| FAO Irrigation and Drainage Paper 56 Rev.1 (2025) — Kc, GDD, salt tolerance tables | https://doi.org/10.4060/cd6621en |
| FAO-29 Rev.1 (1985) Water quality for agriculture — salt tolerance cross-check | https://www.fao.org/4/t0234e/t0234e00.htm |
| Sentinel-2 cloudless 2020 basemap by EOX (ESA Copernicus data, CC BY-NC-SA 4.0) | https://s2maps.eu |
| OpenStreetMap contributors (ODbL) | https://www.openstreetmap.org/copyright |
| Leaflet 1.9.4 (BSD-2-Clause) | https://leafletjs.com |
| three.js (MIT) — pitch globe | https://threejs.org |
| Telegram Web Apps (Mini App API) | https://core.telegram.org/bots/webapps |
| EastFruit — onion prices at historic lows, 16 Apr 2024 | https://east-fruit.com/en/news/prices-for-onions-in-uzbekistan-hit-historic-lows-what-are-the-reasons |
| EastFruit — will Uzbekistan avoid an onion price collapse, 25 Aug 2023 | https://east-fruit.com/en/news/will-uzbekistan-be-able-to-avoid-a-collapse-in-onion-prices/ |
| EastFruit — onion prices continue declining, 17 Nov 2023 | https://east-fruit.com/en/news/onion-prices-in-uzbekistan-continue-declining-what-are-the-reasons/ |
| EastFruit — top-quality onions fed to sheep in Kazakhstan, 6 Mar 2024 | https://east-fruit.com/novosti/luk-otlichnogo-kachestva-v-kazakhstane-skarmlivayut-ovtsam-sprosa-net-video/ |
| Kun.uz — spring onions left in the fields, 8 Jun 2024 | https://kun.uz/news/2024/06/08/hosili-kop-xaridori-yoq-piyoz-bahorgi-piyoz-nega-dalada-qolib-ketyapti |
| Kun.uz — onion prices surge tenfold as area shrinks, 11 Apr 2025 | https://kun.uz/en/news/2025/04/11/onion-prices-surge-tenfold-in-uzbekistan-as-farmlands-shrink-and-supply-declines |
| Kun.uz — Surkhandarya onion growers, 11 May 2018 | https://kun.uz/news/2018/05/11/surhondarelik-dekonlarning-dardini-kim-esitadi |
| Podrobno.uz — why watermelons went to cattle feed, 23 Jul 2024 | https://podrobno.uz/cat/economic/problemy-s-kachestvom-i-utrata-svyazi-eksporterov-s-fermerami-ekspert-o-tom-pochemu-arbuzy-poshli-na/ |
| UzDaily — post-harvest losses 20–30 %, cold storage 4.9 %, 23 Oct 2025 | https://www.uzdaily.uz/en/growth-in-uzbekistans-fruit-and-vegetable-exports-and-production-calls-for-expansion-of-cold-storage-infrastructure/ |
| Ozodlik video “Eksport: Dehqonlar kasod bo‘ldi” (cover image on slide 2), 7 Jun 2024 | https://www.youtube.com/watch?v=5SPo9AEus2w |
| Kun.uz video “Dalada qolib ketayotgan tarvuzlar” (cover image), 14 Aug 2024 | https://www.youtube.com/watch?v=GlbDsv0luWM |
| Xabar.uz video on Surkhandarya onion growers (cover image), 13 May 2018 | https://www.youtube.com/watch?v=3uI8M5Ex4dA |
| Claude Code (Anthropic) — AI assistance for code and text | https://claude.com/claude-code |
| Source code (GitHub, public) | https://github.com/davlatshoh-bakhtiyorov/ulugbekcrewnasa |
| Telegram bot / Mini App | https://t.me/ulugbekcrewbot |
| Mirror of the site on Vercel | https://neyraapp.vercel.app/ |
