// Sayt uchun O'zbekiston bo'yicha iqlim siljishi: har bir viloyat markazi (taxminiy koordinata) uchun
// NASA POWER kunlik qatori (1984-2025), 1985-2004 va 2006-2025 davrlari solishtiriladi.
// npm run site-data  ->  site/data/climate.json   (POWER javoblari cache/ da qoladi)
import { writeFile, mkdir } from 'node:fs/promises';
import { loadPower, PILOT } from './power-cache.js';
import { yearlyStats, climateShift } from '../core/agro.js';
import { POWER_PARAMS } from '../core/power.js';

// Viloyat markazlari (taxminiy). Hisob nuqta atrofidagi ~0.5° NASA POWER katagi uchun, aniq shahar uchun emas.
export const POINTS = [
  { id: 'karakalpakstan', uz: "Qoraqalpog'iston (Nukus)", en: 'Karakalpakstan (Nukus)', lat: 42.46, lon: 59.61 },
  { id: 'khorezm', uz: 'Xorazm (Urganch)', en: 'Khorezm (Urgench)', lat: 41.55, lon: 60.63 },
  { id: 'bukhara', uz: 'Buxoro', en: 'Bukhara', lat: 39.77, lon: 64.42 },
  { id: 'navoi', uz: 'Navoiy', en: 'Navoi', lat: 40.10, lon: 65.38 },
  { id: 'kashkadarya', uz: 'Qashqadaryo (Qarshi)', en: 'Kashkadarya (Karshi)', lat: 38.86, lon: 65.79 },
  { id: 'surkhandarya', uz: "Surxondaryo (Jarqo'rg'on, pilot)", en: "Surkhandarya (Jarqo'rg'on, pilot)", lat: PILOT.lat, lon: PILOT.lon },
  { id: 'samarkand', uz: 'Samarqand', en: 'Samarkand', lat: 39.65, lon: 66.96 },
  { id: 'jizzakh', uz: 'Jizzax', en: 'Jizzakh', lat: 40.12, lon: 67.84 },
  { id: 'syrdarya', uz: 'Sirdaryo (Guliston)', en: 'Syrdarya (Gulistan)', lat: 40.49, lon: 68.78 },
  { id: 'tashkent', uz: 'Toshkent viloyati', en: 'Tashkent region', lat: 41.30, lon: 69.24 },
  { id: 'namangan', uz: 'Namangan', en: 'Namangan', lat: 41.00, lon: 71.67 },
  { id: 'andijan', uz: 'Andijon', en: 'Andijan', lat: 40.78, lon: 72.35 },
  { id: 'fergana', uz: "Farg'ona", en: 'Fergana', lat: 40.39, lon: 71.79 },
];

const KEYS = ['lastSpringFrost', 'firstAutumnFrost', 'frostFree', 'heatDays', 'jjaTmax', 'et0AprSep'];
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

const out = [];
const queue = [...POINTS];
await Promise.all(Array.from({ length: 3 }, async () => {
  while (queue.length) {
    const pt = queue.shift();
    const p = await loadPower(pt);
    const stats = yearlyStats(p.days);
    const s = climateShift(stats);
    const pick = (o) => Object.fromEntries(KEYS.map((k) => [k, r1(o[k])]));
    out.push({
      ...pt,
      elev: Math.round(p.elev),
      period: [p.days[0].date, p.days.at(-1).date],
      missingDays: p.days.filter((d) => d.tmax == null || d.tmin == null).length,
      early: { range: s.early.range, years: s.early.years, ...pick(s.early) },
      late: { range: s.late.range, years: s.late.years, ...pick(s.late) },
      trend: Object.fromEntries(Object.entries(s.trend).map(([k, v]) => [k, r1(v)])),
      heatByYear: stats.filter((r) => r.complete).map((r) => [r.year, r.heatDays]),
    });
    console.log(`${pt.en}: heat days ${r1(s.early.heatDays)} -> ${r1(s.late.heatDays)}, frost-free ${r1(s.early.frostFree)} -> ${r1(s.late.frostFree)}`);
  }
}));
out.sort((a, b) => POINTS.findIndex((p) => p.id === a.id) - POINTS.findIndex((p) => p.id === b.id));

await mkdir('site/data', { recursive: true });
await writeFile('site/data/climate.json', JSON.stringify({
  generated: new Date().toISOString().slice(0, 10),
  source: {
    product: 'NASA POWER daily point API, community AG (MERRA-2 temperature; CERES SRB/SYN1deg radiation)',
    params: POWER_PARAMS,
    resolution: '~0.5° (about 50 km) cell around each point',
    url: 'https://power.larc.nasa.gov/',
  },
  definitions: {
    heatDays: 'days per year with daily maximum 2 m air temperature >= 38 °C (T2M_MAX)',
    frostFree: 'days between the last spring and the first autumn day with T2M_MIN <= 0 °C',
    lastSpringFrost: 'day of year of the last T2M_MIN <= 0 °C before 1 July',
    firstAutumnFrost: 'day of year of the first T2M_MIN <= 0 °C after 1 July',
    jjaTmax: 'June-August mean daily maximum temperature, °C',
    et0AprSep: 'April-September reference evapotranspiration, FAO-56 Penman-Monteith, mm (part of the rise is wind; reanalysis wind trends are less reliable)',
  },
  points: out,
}, null, 1));
console.log('wrote site/data/climate.json');
