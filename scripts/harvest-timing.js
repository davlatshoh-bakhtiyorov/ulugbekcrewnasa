// "Sun'iy yo'ldosh yig'imni ko'radi": Surxondaryo tekisligida har bir 500 m piksel har yili mavsumni qachon tugatgan
// (NASA MODIS MCD12Q2, 1-tsikl Dormancy = yashillik 15 % ga qaytgan kun). npm run harvest  ->  site/data/harvest.json
// Kirish: cache/mcd12q2/surxondaryo/<band>-<year>.json (npm run mcd12q2:region). Faqat barcha 11 band bor yillar olinadi.
//
// Nega "ertaki ekin maydoni" emas: biz avval 15-maygacha tugagan piksellarni "ertaki ekin (piyoz)" deb sanamoqchi edik.
// Taqsimot buni rad etdi: 1-tsikl Dormancy sanalari deyarli butunlay may oxiri - iyun boshida (kuzgi bug'doy); 15-maygacha
// tugaganlar 2016: 4649, 2017: 179, 2018: 1, 2019: 5068, 2020: 1853, 2022: 233 piksel - bu piyoz maydoni emas, iliq
// bahorda erta pishgan bug'doy. 500 m piksel 1-5 ga piyoz dalasini ajrata olmaydi. Shuning uchun bu skript har pikselning
// mavsum oxiri sanasini beradi (yig'im vaqti xaritasi) va yil bo'yicha taqsimotini sanaydi - bu ma'lumot shuni ko'rsatadi.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { MCD } from './fetch-mcd12q2.js';
import { REGIONS, regionFile } from './fetch-mcd12q2-region.js';
import { pixelsFromBands } from '../core/calibrate.js';

export const RULE = {
  endBand: 'dormancy', from: '04-01', to: '07-31', minAmp: 0.15, maxQa: 2, verified: false,
  note: 'Season end = Dormancy of the first cycle of the year (EVI2 back to 15 % of its amplitude), QA_Overall <= 2, amplitude >= 0.15, '
    + 'end between 1 April and 31 July (spring-ending seasons: mostly winter wheat, also early vegetables). Pixels whose first cycle ends later '
    + '(cotton, second crops) are not in this map. 500 m pixel; crop identity is not known per pixel.',
  rejected: 'An "early crop (onion) area" count (first cycle ending by 15 May) was tested and rejected: it gave 4649 (2016), 179 (2017), 1 (2018), '
    + '5068 (2019), 1853 (2020), 233 (2022) pixels - the tail of the wheat distribution in warm springs, not onion fields. 500 m pixels cannot '
    + 'separate 1-5 ha onion fields; that needs 10-30 m imagery (HLS/Sentinel-2) and a field map.',
};
const RAD = 6371007.181;
const exists = (f) => access(f).then(() => true, () => false);
const doy = (iso) => Math.round((Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8)) - Date.UTC(+iso.slice(0, 4), 0, 1)) / 86400000) + 1;
const q = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
const mmddOfDoy = (y, d) => new Date(Date.UTC(y, 0, d)).toISOString().slice(5, 10);
function sinToLatLon(xm, ym) { const lat = (ym / RAD) * (180 / Math.PI); return [lat, (xm / (RAD * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI)]; }

const region = REGIONS[process.argv[2] ?? 'surxondaryo'];
const years = [];
for (let y = region.years[0]; y <= region.years[1]; y++) {
  const all = await Promise.all(MCD.bands.map((b) => exists(regionFile(region, b, y))));
  if (all.every(Boolean)) years.push(y); else console.log(`${y}: incomplete (${all.filter(Boolean).length}/${MCD.bands.length} bands) - skipped`);
}
if (!years.length) throw new Error('no complete years');
const bands = {};
for (const b of MCD.bands) {
  const files = await Promise.all(years.map((y) => readFile(regionFile(region, b, y), 'utf8').then(JSON.parse)));
  bands[b] = { ...files[0], subset: files.map((f) => f.subset[0]) };
}
const meta = bands.NumCycles;
const grid = { nrows: Number(meta.nrows), ncols: Number(meta.ncols), xll: Number(meta.xllcorner), yll: Number(meta.yllcorner), cell: Number(meta.cellsize) };
const corners = [[0, 0], [grid.ncols, 0], [0, grid.nrows], [grid.ncols, grid.nrows]].map(([c, r]) => sinToLatLon(grid.xll + c * grid.cell, grid.yll + r * grid.cell));
grid.bounds = [[Math.min(...corners.map((c) => c[0])), Math.min(...corners.map((c) => c[1]))], [Math.max(...corners.map((c) => c[0])), Math.max(...corners.map((c) => c[1]))]];

const pixels = pixelsFromBands(bands);
const out = years.map((year) => {
  const px = [], d = [];
  let detected = 0;
  for (const p of pixels) {
    if (p.year !== year || p.cycles < 1) continue;
    detected++;
    const c = p.c[0];
    if (!c[RULE.endBand] || c.amp == null || c.amp < RULE.minAmp || c.qa == null || c.qa > RULE.maxQa) continue;
    const end = c[RULE.endBand];
    if (Number(end.slice(0, 4)) !== year) continue;
    const md = end.slice(5);
    if (md < RULE.from || md > RULE.to) continue;
    px.push(p.px); d.push(doy(end));
  }
  const sorted = [...d].sort((a, b) => a - b);
  // px o'sib boruvchi indekslar - fayl kichik bo'lishi uchun delta (farq) ko'rinishida yoziladi; saytda yig'indi qilinadi
  const dpx = px.map((v, i) => (i ? v - px[i - 1] : v));
  const r = { year, detected, n: d.length, median: q(sorted, 0.5), p25: q(sorted, 0.25), p75: q(sorted, 0.75), p10: q(sorted, 0.1), p90: q(sorted, 0.9), byMay15: d.filter((x) => x <= doy(`${year}-05-15`)).length, pxDelta: dpx, doy: d };
  return r;
});
console.log(`${region.id}: ${grid.nrows}x${grid.ncols} px, bounds ${JSON.stringify(grid.bounds.map((b) => b.map((v) => +v.toFixed(3))))}`);
console.log('year  detected  in-window   median (p25-p75)         by 15 May');
for (const r of out) console.log(`${r.year}  ${String(r.detected).padStart(8)}  ${String(r.n).padStart(9)}   ${mmddOfDoy(r.year, r.median)} (${mmddOfDoy(r.year, r.p25)} - ${mmddOfDoy(r.year, r.p75)})   ${String(r.byMay15).padStart(6)} (${((100 * r.byMay15) / r.n).toFixed(1)} %)`);
await mkdir('site/data', { recursive: true });
await writeFile('site/data/harvest.json', JSON.stringify({
  generated: new Date().toISOString().slice(0, 10),
  source: { product: 'MCD12Q2 v061 Land Cover Dynamics (MODIS Terra+Aqua), 500 m, yearly', doi: '10.5067/MODIS/MCD12Q2.061', via: 'ORNL DAAC MODIS/VIIRS Land Product Subsets (TESViS) REST API', retrieved: meta.retrieved?.slice(0, 10) },
  region: { id: region.id, center: region.center, km: region.km },
  encoding: 'pxDelta = pixel index differences (cumulative sum gives row-major index, r = floor(i / ncols), c = i % ncols); doy = day of year of season end, same order',
  rule: RULE, grid, years: out,
}));
console.log('wrote site/data/harvest.json');
