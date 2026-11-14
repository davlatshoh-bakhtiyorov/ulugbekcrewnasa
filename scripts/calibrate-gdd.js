// GDD yig'indilarini NASA MODIS MCD12Q2 kuzatuvlari bo'yicha kalibrlash.
// npm run calibrate  ->  core/calibration.js (generatsiya qilingan, qo'lda tahrirlanmaydi)
// Kirish: cache/mcd12q2/*.json (npm run mcd12q2; bo'lmasa shu yerda yuklanadi) va NASA POWER pilot qatori.
import { writeFile } from 'node:fs/promises';
import { MCD, fetchBand } from './fetch-mcd12q2.js';
import { loadPilotPower, PILOT } from './power-cache.js';
import { cropById } from '../core/crops.js';
import { CAL_RULES, pixelsFromBands, selectSeasons, calibrateCrop, calibratedCrop } from '../core/calibrate.js';
import { evaluateCrop } from '../core/crop-calc.js';

const bands = {};
for (const b of MCD.bands) bands[b] = await fetchBand(b);
const pixels = pixelsFromBands(bands);
const power = await loadPilotPower();
const dayIndex = new Map(power.days.map((d) => [d.date, d]));
const retrieved = Object.values(bands).map((j) => j.retrieved).sort()[0].slice(0, 10);

const doy = (iso) => Math.round((Date.parse(iso) - Date.parse(`${iso.slice(0, 4)}-01-01`)) / 86400000) + 1;
const iso = (yyyymmdd) => `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6)}`;
const median = (a) => {
  const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2);
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null;
};
const dateOf = (y, d) => (d == null ? null : new Date(Date.UTC(y, 0, d)).toISOString().slice(0, 10));
const mmdd = (d) => new Date(Date.UTC(2001, 0, Math.round(d))).toISOString().slice(5, 10);

const crops = {};
for (const [id, rule] of Object.entries(CAL_RULES.crops)) {
  const crop = cropById(id);
  const seasons = selectSeasons(pixels, rule);
  const cal = calibrateCrop(crop, seasons, dayIndex);

  // Tekshiruv: kalibrlangan model har yili qachon pishadi va MODIS qachon mavsum tugaganini ko'rdi
  const model = evaluateCrop(power.days, crop, { calibration: { crops: { [id]: cal } } });
  const fao = evaluateCrop(power.days, crop, { calibration: null });
  const endOf = (res) => new Map(res.years.filter((y) => y.status === 'mature').map((y) => [Number(y.endDate.slice(0, 4)), doy(iso(y.endDate))]));
  const mEnd = endOf(model), fEnd = endOf(fao);
  const perYear = [];
  for (let y = MCD.years[0]; y <= MCD.years[1]; y++) {
    const obs = seasons.filter((s) => s.year === y).map((s) => doy(s.end));
    const o = obs.length ? Math.round(median(obs)) : null, m = mEnd.get(y) ?? null, f = fEnd.get(y) ?? null;
    perYear.push({ year: y, n: obs.length, observed: o, model: m, fao: f, dates: { observed: dateOf(y, o), model: dateOf(y, m), fao: dateOf(y, f) } });
  }
  const diffs = perYear.filter((r) => r.observed != null && r.model != null).map((r) => r.model - r.observed);
  const faoDiffs = perYear.filter((r) => r.observed != null && r.fao != null).map((r) => r.fao - r.observed);
  cal.check = {
    perYear,
    medianBiasDays: median(diffs),
    medianAbsDays: median(diffs.map(Math.abs)),
    faoMedianBiasDays: median(faoDiffs),
    note: 'End of season per year, as day of year and date: MODIS observed (median over field-years) vs model maturity with calibrated and with FAO GDD. Bias = model - observed, days.',
  };

  // Sezgirlik: boshqa mavsum oxiri belgisi yoki torroq tanlash qoidasi bilan natija qanchaga o'zgaradi
  const alt = (r, endBand) => calibrateCrop(crop, selectSeasons(pixels, r, endBand), dayIndex);
  const other = rule.end === 'dormancy' ? 'midGreendown' : 'dormancy';
  cal.end = rule.end;
  cal.sensitivity = [
    { label: other === 'dormancy' ? 'end = Dormancy (EVI2 back to 15%)' : 'end = MidGreendown (EVI2 down to 50%)', ...pick(alt(rule, other)) },
    { label: 'stricter: QA_Overall = 0, EVI2 amplitude >= 0.2', ...pick(alt({ ...rule, maxQa: 0, minAmp: 0.2 })) },
    ...(id === 'cotton' ? [{ label: 'cotton green-up in April-May only', ...pick(alt({ ...rule, greenupMonths: [4, 5] })) }] : []),
  ];
  crops[id] = cal;

  console.log(`\n== ${crop.name.en}: ${cal.n} field-years, ${cal.pixels} pixels, ${cal.years.join('-')}`);
  console.log(`  FAO total ${cal.faoTotal} GDD -> calibrated ${cal.total} GDD (IQR ${cal.p25}-${cal.p75}), factor ${cal.factor}`);
  console.log(`  stages FAO ${crop.gdd.stages.join('/')} -> ${cal.stages.join('/')}`);
  console.log(`  observed end of season (MCD12Q2 ${rule.end}): median ${mmdd(cal.endDoy.median)} (IQR ${mmdd(cal.endDoy.p25)}-${mmdd(cal.endDoy.p75)}), ${cal.seasonDays} days from model sowing`);
  console.log(`  model maturity: FAO ${fao.ripen.maturity?.median} (${fao.ripen.matured}/${fao.ripen.of} years), calibrated ${model.ripen.maturity?.median} (${model.ripen.matured}/${model.ripen.of} years)`);
  console.log(`  check 2016-2025: model - observed = median ${cal.check.medianBiasDays} d, |.| ${cal.check.medianAbsDays} d; FAO model bias ${cal.check.faoMedianBiasDays} d`);
  for (const s of cal.sensitivity) console.log(`  sensitivity: ${s.label}: ${s.total} GDD (n ${s.n})`);
}

function pick(c) { return { total: c.total ?? null, n: c.n }; }

const out = {
  generated: new Date().toISOString().slice(0, 10),
  verified: false,
  source: {
    product: 'MCD12Q2 v061 Land Cover Dynamics (MODIS Terra+Aqua), 500 m, yearly',
    doi: '10.5067/MODIS/MCD12Q2.061',
    via: 'ORNL DAAC MODIS/VIIRS Land Product Subsets (TESViS) REST API',
    area: { lat: MCD.center.lat, lon: MCD.center.lon, km: MCD.km, grid: `${bands.NumCycles.nrows}x${bands.NumCycles.ncols}` },
    years: MCD.years,
    bands: MCD.bands,
    retrieved,
  },
  climate: { product: 'NASA POWER daily T2M_MAX/T2M_MIN (MERRA-2)', lat: PILOT.lat, lon: PILOT.lon },
  rule: { note: CAL_RULES.note, crops: CAL_RULES.crops },
  notUsed: 'Second cycle of double-crop pixels (green-up July, end November, ~120 days) is a mix of second crops '
    + '(mung bean, maize, vegetables) and is not used to calibrate mung bean.',
  crops,
};

const header = '// AUTO-GENERATED by scripts/calibrate-gdd.js (npm run calibrate). Do not edit by hand.\n'
  + '// GDD totals calibrated on fields near Jarqo\'rg\'on with NASA MODIS MCD12Q2 end-of-season dates.\n';
await writeFile('core/calibration.js', `${header}export const CALIBRATION = ${JSON.stringify(out, null, 1)};\n`);
console.log('\nwrote core/calibration.js');
