// "Bozor oynasi" (B): bir xil piyoz GDD modeli (FAO-56 Rev.1) NASA POWER bilan Markaziy Osiyo va Rossiya
// janubidagi hududlarda - qaysi hudud qachon yig'adi, Surxondaryoning oynasi necha kun, va bu 1985-2004 -> 2006-2025
// qanday siljigan. npm run market-window  ->  site/data/market-window.json
// Ekish sanasi qoidasi (jamoa qoidasi, verified: false): har yili 1-yanvardan boshlab orqadagi 30 kunlik o'rtacha
// havo harorati birinchi marta 10 °C ga yetgan kun = "iqlim ruxsat bergan eng erta ekish"; davr bo'yicha mediana olinadi.
import { writeFile, mkdir } from 'node:fs/promises';
import { loadPower } from './power-cache.js';
import { cropById } from '../core/crops.js';
import { evaluateCrop } from '../core/crop-calc.js';

export const REGIONS = [
  { id: 'surkhandarya', cc: 'UZ', lat: 37.51, lon: 67.42, uz: 'Surxondaryo', en: 'Surkhandarya' },
  { id: 'kashkadarya', cc: 'UZ', lat: 38.86, lon: 65.79, uz: 'Qashqadaryo', en: 'Kashkadarya' },
  { id: 'bukhara', cc: 'UZ', lat: 39.77, lon: 64.42, uz: 'Buxoro', en: 'Bukhara' },
  { id: 'samarkand', cc: 'UZ', lat: 39.65, lon: 66.96, uz: 'Samarqand', en: 'Samarkand' },
  { id: 'khorezm', cc: 'UZ', lat: 41.55, lon: 60.63, uz: 'Xorazm', en: 'Khorezm' },
  { id: 'tashkent', cc: 'UZ', lat: 41.30, lon: 69.24, uz: 'Toshkent', en: 'Tashkent' },
  { id: 'fergana', cc: 'UZ', lat: 40.39, lon: 71.79, uz: "Farg'ona", en: 'Fergana' },
  { id: 'khatlon', cc: 'TJ', lat: 37.84, lon: 68.78, uz: 'Xatlon', en: 'Khatlon' },
  { id: 'sughd', cc: 'TJ', lat: 40.28, lon: 69.62, uz: "Sug'd", en: 'Sughd' },
  { id: 'lebap', cc: 'TM', lat: 39.08, lon: 63.58, uz: 'Lebap', en: 'Lebap' },
  { id: 'turkistan', cc: 'KZ', lat: 43.30, lon: 68.25, uz: 'Turkiston', en: 'Turkistan' },
  { id: 'jambyl', cc: 'KZ', lat: 42.90, lon: 71.37, uz: 'Jambil', en: 'Jambyl' },
  { id: 'osh', cc: 'KG', lat: 40.53, lon: 72.80, uz: "O'sh", en: 'Osh' },
  { id: 'astrakhan', cc: 'RU', lat: 46.35, lon: 48.04, uz: 'Astraxan', en: 'Astrakhan' },
  { id: 'volgograd', cc: 'RU', lat: 48.71, lon: 44.51, uz: 'Volgograd', en: 'Volgograd' },
  { id: 'rostov', cc: 'RU', lat: 47.24, lon: 39.70, uz: 'Rostov', en: 'Rostov' },
];
export const COUNTRY = { UZ: { uz: "O'zbekiston", en: 'Uzbekistan' }, TJ: { uz: 'Tojikiston', en: 'Tajikistan' }, TM: { uz: 'Turkmaniston', en: 'Turkmenistan' }, KZ: { uz: "Qozog'iston", en: 'Kazakhstan' }, KG: { uz: "Qirg'iziston", en: 'Kyrgyzstan' }, RU: { uz: 'Rossiya', en: 'Russia' } };
export const PERIODS = { early: ['1985', '2004'], late: ['2006', '2025'], all: ['1985', '2025'] };
export const SOW_RULE = { windowDays: 30, meanT: 10, searchUntil: '06-30', verified: false,
  note: 'Sowing = first day of the year on which the trailing 30-day mean air temperature (T2M_MAX+T2M_MIN)/2 reaches 10 °C; median over the years of the period. Team rule, not a published agronomic standard.' };

const median = (a) => { const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };
const doyOf = (yyyymmdd) => Math.round((Date.UTC(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6)) - Date.UTC(+yyyymmdd.slice(0, 4), 0, 1)) / 86400000) + 1;
const mmddOfDoy = (doy) => new Date(Date.UTC(2001, 0, Math.round(doy))).toISOString().slice(5, 10);

/** Har yil uchun ekish kuni (DOY) qoida bo'yicha; null = shu yili topilmadi. */
export function sowingDoys(days, rule = SOW_RULE) {
  const byYear = new Map();
  const w = rule.windowDays;
  for (let i = w - 1; i < days.length; i++) {
    const d = days[i], y = d.date.slice(0, 4);
    if (byYear.has(y) || d.date.slice(4) > rule.searchUntil.replace('-', '')) continue;
    let s = 0, ok = true;
    for (let k = i - w + 1; k <= i; k++) { const t = days[k]; if (t.tmax == null || t.tmin == null) { ok = false; break; } s += (t.tmax + t.tmin) / 2; }
    if (ok && s / w >= rule.meanT) byYear.set(y, doyOf(d.date));
  }
  return byYear;
}

export function periodDays(days, [y0, y1]) { return days.filter((d) => d.date >= `${y0}0101` && d.date <= `${y1}1231`); }

export async function regionWindow(region, crop) {
  const p = await loadPower({ lat: region.lat, lon: region.lon });
  const out = { ...region, elev: p.elev, periods: {} };
  for (const [key, range] of Object.entries(PERIODS)) {
    const days = periodDays(p.days, range);
    const sd = sowingDoys(days);
    const doys = [...sd.values()];
    const sow = doys.length ? mmddOfDoy(median(doys)) : null;
    const r = sow ? evaluateCrop(days, crop, { sow, calibration: null }) : null;
    out.periods[key] = {
      range, years: days.length ? Number(range[1]) - Number(range[0]) + 1 : 0,
      sow, sowYears: doys.length, sowDoy: { median: median(doys), p10: doys.length ? [...doys].sort((a, b) => a - b)[Math.floor(doys.length * 0.1)] : null, p90: doys.length ? [...doys].sort((a, b) => a - b)[Math.floor(doys.length * 0.9)] : null },
      matured: r?.ripen.matured ?? null, of: r?.ripen.of ?? null,
      maturity: r?.ripen.maturity ?? null, daysToMaturity: r?.ripen.daysToMaturity?.median ?? null,
      waterM3ha: r?.water.m3ha ?? null,
    };
  }
  return out;
}

const crop = cropById('onion');
const regions = [];
for (const reg of REGIONS) {
  const w = await regionWindow(reg, crop);
  regions.push(w);
  const a = w.periods.all, e = w.periods.early, l = w.periods.late;
  console.log(`${w.en.padEnd(13)} ${w.cc}  sow ${a.sow}  mature ${a.maturity?.median ?? '-'} (${a.maturity?.early ?? '-'}..${a.maturity?.late ?? '-'})  ${a.matured}/${a.of}  | early ${e.maturity?.median ?? '-'} -> late ${l.maturity?.median ?? '-'}  | water p80 ${a.waterM3ha?.p80 ?? '-'} m3/ha`);
}
const ref = regions.find((r) => r.id === 'surkhandarya');
const out = {
  generated: new Date().toISOString().slice(0, 10),
  crop: { id: crop.id, name: crop.name, gdd: crop.gdd, sowRule: SOW_RULE },
  climate: { product: 'NASA POWER daily T2M_MAX/T2M_MIN/T2MDEW/WS2M/ALLSKY_SFC_SW_DWN/PRECTOTCORR (MERRA-2 + CERES, ~0.5°)', period: ['1984-01-01', '2025-12-31'] },
  method: 'Same crop model in every region (FAO-56 Rev.1 Eq. 6.23 GDD, Table 6.10 thresholds, Table 6.11 stage totals; no regional calibration), so differences between regions come from climate only. Absolute dates carry the FAO-table uncertainty (see the wheat/cotton calibration); differences between regions are the robust part.',
  periods: PERIODS, reference: ref.id, countries: COUNTRY, regions,
};
await mkdir('site/data', { recursive: true });
await writeFile('site/data/market-window.json', JSON.stringify(out, null, 1));
console.log('wrote site/data/market-window.json');
