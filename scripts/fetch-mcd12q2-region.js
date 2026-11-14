// NASA MODIS MCD12Q2 (fenologiya, 500 m, yillik) ni butun viloyat miqyosida ORNL TESViS orqali yuklaydi:
// "poda signali" (A) uchun - har yili qancha piksel ertaki ekin fenologiyasida bo'lganini sanash.
// npm run mcd12q2:region  ->  cache/mcd12q2/<region>/<band>-<year>.json  (gitignored, keshlanadi)
// Har so'rov bitta band + bitta yil (katta to'r: +-65 km -> ~261 x 261 piksel), 3 ta parallel.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { MCD } from './fetch-mcd12q2.js';

export const REGIONS = {
  // Surxondaryo sug'oriladigan zonasi (Termiz-Sherobod-Jarqo'rg'on-Qumqo'rg'on-Denov) +-65 km
  surxondaryo: { id: 'surxondaryo', center: { lat: 37.8, lon: 67.5 }, km: 65, years: [2016, 2025] },
};

export const regionFile = (region, band, year) => `${MCD.dir}/${region.id}/${band}-${year}.json`;

export async function fetchRegionBandYear(region, band, year) {
  const f = regionFile(region, band, year);
  try { return JSON.parse(await readFile(f, 'utf8')); } catch { /* yuklaymiz */ }
  const url = `${MCD.base}?latitude=${region.center.lat}&longitude=${region.center.lon}&band=${band}`
    + `&startDate=A${year}001&endDate=A${year}001&kmAboveBelow=${region.km}&kmLeftRight=${region.km}`;
  const t0 = Date.now();
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (!j.subset?.length) throw new Error('empty subset');
      j.retrieved = new Date().toISOString();
      j.url = url;
      await writeFile(f, JSON.stringify(j));
      console.log(`${band} ${year}: ${j.nrows}x${j.ncols} px, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
      return j;
    } catch (e) {
      console.log(`${band} ${year}: attempt ${attempt} failed (${e.message})`);
      await new Promise((res) => setTimeout(res, 5000 * attempt));
    }
  }
  throw new Error(`${band} ${year}: failed`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const region = REGIONS[process.argv[2] ?? 'surxondaryo'];
  await mkdir(`${MCD.dir}/${region.id}`, { recursive: true });
  const queue = [];
  for (let y = region.years[0]; y <= region.years[1]; y++) for (const b of MCD.bands) queue.push([b, y]);
  console.log(`${region.id}: ${queue.length} requests (${MCD.bands.length} bands x ${region.years[1] - region.years[0] + 1} years), +-${region.km} km`);
  const t0 = Date.now();
  let failed = 0;
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (queue.length) { const [b, y] = queue.shift(); try { await fetchRegionBandYear(region, b, y); } catch (e) { failed++; console.log(e.message); } }
  }));
  console.log(`done in ${((Date.now() - t0) / 60000).toFixed(1)} min, failed: ${failed}`);
}
