// NASA MODIS MCD12Q2 (Land Cover Dynamics / fenologiya, 500 m, yillik) ni ORNL DAAC TESViS orqali
// pilot atrofidagi to'r (grid) uchun yuklab oladi: har bir piksel va yil uchun hosil tsikli sanalari.
// npm run mcd12q2  ->  cache/mcd12q2/*.json  (gitignored; GDD kalibrlash skripti shu fayllarni o'qiydi)
// ORNL sekin (bitta so'rov 30-90 s), shuning uchun natija keshlanadi va qayta yuklanmaydi.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const MCD = {
  base: 'https://modis.ornl.gov/rst/api/v1/MCD12Q2/subset',
  center: { lat: 37.51, lon: 67.42 }, // pilot (Jarqo'rg'on)
  km: 8,                              // +-8 km -> ~35 x 35 piksel
  years: [2016, 2025],                // so'nggi 10 yil (ORNL: bitta so'rovda ko'pi bilan 10 sana)
  bands: [
    'NumCycles',
    'Greenup.Num_Modes_01', 'MidGreendown.Num_Modes_01', 'Dormancy.Num_Modes_01',
    'Greenup.Num_Modes_02', 'MidGreendown.Num_Modes_02', 'Dormancy.Num_Modes_02',
    'EVI_Amplitude.Num_Modes_01', 'EVI_Amplitude.Num_Modes_02',
    'QA_Overall.Num_Modes_01', 'QA_Overall.Num_Modes_02',
  ],
  dir: 'cache/mcd12q2',
};

const file = (band) => `${MCD.dir}/${band}.json`;

export async function fetchBand(band) {
  try { return JSON.parse(await readFile(file(band), 'utf8')); } catch { /* yo'q - yuklaymiz */ }
  const { lat, lon } = MCD.center;
  const url = `${MCD.base}?latitude=${lat}&longitude=${lon}&band=${band}`
    + `&startDate=A${MCD.years[0]}001&endDate=A${MCD.years[1]}001&kmAboveBelow=${MCD.km}&kmLeftRight=${MCD.km}`;
  const t0 = Date.now();
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      j.retrieved = new Date().toISOString();
      j.url = url;
      await writeFile(file(band), JSON.stringify(j));
      console.log(`${band}: ${j.subset.length} dates, ${j.nrows}x${j.ncols} px, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
      return j;
    } catch (e) {
      console.log(`${band}: attempt ${attempt} failed (${e.message})`);
    }
  }
  throw new Error(`${band}: failed`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await mkdir(MCD.dir, { recursive: true });
  const queue = [...MCD.bands];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (queue.length) await fetchBand(queue.shift());
  }));
  console.log('done');
}
