# NASA Space Apps 2026 — project page text (paste into the form; all English)

**Project Name**
Neyra — see before you sow

**High-Level Project Summary**
Neyra is a decision-support tool that helps farmers in Uzbekistan plant the right crop at the right time. The farmer
taps a field on a map and answers three questions with buttons — last crop, water situation, salinity. Neyra returns
three crop-rotation options, each with four traffic lights (water need, ripens in time, soil benefit, market and waste
risk) and a one-sentence explanation, computed in the browser from 42 years of NASA POWER daily weather, NASA MODIS
vegetation and phenology, SMAP soil moisture and GRACE water storage, combined with FAO-56 crop science. It runs as a
web page and as a Telegram Mini App, in Uzbek and English. It matters because the loss is not weather but information:
in 2024 everyone planted onions after a good year, prices fell to 12 US cents per kg and 150–200 thousand tonnes were
dumped. Neyra shows, before sowing, what the field can ripen, how much water it needs, what it does to the soil and
when the harvest meets the market — with the source under every number. It supports the farmer's judgement; it does
not replace it.

**Link to Project Demo**
https://davlatshoh-bakhtiyorov.github.io/ulugbekcrewnasa/docs/demo/Neyra-pitch-en.pdf  (7 slides)

**Link to Final Project**
https://davlatshoh-bakhtiyorov.github.io/ulugbekcrewnasa/  (site; the app is at /web/ and in Telegram: https://t.me/ulugbekcrewbot; source: https://github.com/davlatshoh-bakhtiyorov/ulugbekcrewnasa)

**Detailed Project Description**
*What it does.* (1) Pick the field: a live map with NASA layers — MODIS NDVI 250 m, SMAP L4 root-zone soil moisture
9 km, MODIS land surface temperature 1 km, GRACE/GRACE-FO water storage — with a date slider; tapping any point reads
the pixel through the official NASA GIBS colour scale and shows a 12-frame history. (2) Three questions, buttons only.
(3) Three options: six candidate crops (winter wheat, cotton, onion, potato, mung bean, alfalfa) are evaluated year
by year over 1984–2025 for that point; the top three are shown with four lights; "Details" opens the evidence
(charts, per-year tables, source chips). (4) Field passport: 36 months of NDVI with green periods (crops per year),
soil moisture today vs the same day in 2015–2024, and the local climate shift 1985–2004 → 2006–2025.

*How it works.* Water: FAO-56 Rev.1 Penman–Monteith ET0 from POWER (Tmax, Tmin, dew point, wind, solar) × crop
coefficients adjusted for local wind and humidity, minus effective rain; reported as the dry-year (80th percentile)
net field need. Ripening: growing degree-days from sowing to the FAO stage total; a spring crop fails the year if an
autumn frost comes first. FAO heat-sum totals are indicative and made every season here too short, so we re-scaled
wheat and cotton with 767 field-years of MODIS MCD12Q2 phenology (323 pixels around Jarqo'rg'on, 2016–2025): the
model now ends the season within +0.5 day of the satellite (FAO: −36 days). Soil: rotation rule combined with
salinity yield loss (FAO-56 Rev.1 Tables 8.8–8.11, cross-checked against FAO-29). Market and waste: spoilage risk in
the 14 days after maturity (rain days for grain and cotton, heat for onion and potato); the price part says "unknown"
until a price history is added. Probabilities are counted over history ("in 32 of 42 years"), never guessed;
missing data says "unknown". All calculations are pure JavaScript, tested against FAO-56 worked examples (49 tests).

*Beyond one field.* The site shows the onion price cycle with sourced points; a harvest-timing map (MODIS season
end of every 500 m pixel around Surkhandarya, 2016–2025); the market window — the same onion model run for 16
regions of Central Asia and southern Russia with NASA POWER: Surkhandarya ripens 30 days before Tashkent, 35 before
Turkistan (KZ), 62 before Volgograd (RU), and the window has moved 5–10 days earlier since 1985–2004; and a
climate-shift map of 13 Uzbek regions. We also state what we tested and rejected: counting onion area from 500 m
pixels (it is the wheat tail in warm springs) — that needs 10–30 m imagery and a field map.

*Benefits and goals.* A farmer gets, in three taps and in their own language, the evidence that agronomists and
exporters have and they do not: ripening date, water, soil and timing against the market. We hope to add 30 m HLS
for crop area, a price history for the market light, more crops, and pilots in Khorezm and Karakalpakstan.

*Tools.* JavaScript ES modules (browser + Node 18), Leaflet 1.9.4, Telegram Web Apps API, NASA POWER API, NASA GIBS
WMTS tiles and colormaps, ORNL DAAC MODIS subsets API, FAO-56 Rev.1 (2025), GitHub Pages. No build step, no
dependencies, no server: every number is computed on the device.

**Use of Super Intelligence (SI)**
Yes. Claude Code (Anthropic) assisted in writing code and text (pair-programming: implementing formulas we specified
from FAO-56, writing tests, data scripts, the site and this text). No data value comes from AI; every number is
computed from the cited NASA and FAO sources and verified by automated tests. The project logo is an AI-generated
image (marked on the demo slides and in the credits). No NASA branding was generated or used.

**NASA Data**
- NASA POWER daily point data (MERRA-2 + CERES SRB/SYN1deg), parameters T2M_MAX, T2M_MIN, T2MDEW, WS2M,
  ALLSKY_SFC_SW_DWN, PRECTOTCORR, 1984–2025, ~0.5° — water need (FAO-56 ET0 × Kc), growing degree-days and ripening
  dates, frost and heat statistics, harvest-window weather, climate shift for 13 regions, market window for 16 regions.
- MODIS Terra MOD13Q1 v061 NDVI, 250 m, 16-day (via NASA GIBS WMTS tiles and the official colormap) — vegetation at
  the tapped point, green periods (crops per year), demo-field greenness curve.
- MODIS MCD12Q2 v061 Land Cover Dynamics, 500 m, yearly (doi:10.5067/MODIS/MCD12Q2.061, via ORNL DAAC TESViS) —
  calibration of FAO season length for wheat and cotton; harvest-timing map 2016–2025.
- MODIS Terra MOD11A2 v061 land surface temperature, 1 km, 8-day (GIBS) — land heat at the point, 12-month history.
- SMAP L4 SPL4SMAU v008 analysed root-zone soil moisture, 9 km, daily (GIBS) — soil moisture today vs 2015–2024.
- GRACE/GRACE-FO JPL Mascon RL06 v02 CRI liquid water equivalent anomaly (GIBS) — water storage at the point,
  every July 2003–2022.
- NASA GIBS colormaps and layer metadata; NASA Earthdata CMR collection descriptions.

**Space Agency Partner Data and Other References**
- FAO Irrigation and Drainage Paper 56 Rev.1 (2025), doi:10.4060/cd6621en (Tables 6.1–6.4, 6.10–6.12, 8.8–8.11);
  FAO-56 (1998); FAO-29 Rev.1 (1985) Table 4; USDA-SCS effective rainfall method (CROPWAT).
- Sentinel-2 cloudless 2020 basemap by EOX (CC BY-NC-SA 4.0; contains modified Copernicus Sentinel data 2020 — ESA);
  © OpenStreetMap contributors (ODbL).
- Leaflet 1.9.4 (BSD-2-Clause); Telegram Web Apps JavaScript.
- Market figures: EastFruit (25 Aug 2023, 17 Nov 2023, 6 Mar 2024, 16 Apr 2024), Kun.uz (11 May 2018, 8 Jun 2024,
  11 Apr 2025), Podrobno.uz (23 Jul 2024), UzDaily (23 Oct 2025) — linked next to each number on the site.
- Slide 2 of the demo shows cover images of public news videos and an article (Ozodlik 7 Jun 2024, Xabar.uz 13 May 2018,
  Kun.uz 14 Aug 2024, VESAGRO 3 Feb 2018 on YouTube; EastFruit 6 Mar 2024), used for commentary with on-slide attribution.
- Code: own, MIT-style; AI-assisted as stated above. Fonts: system fonts. No copyrighted material beyond the above.
