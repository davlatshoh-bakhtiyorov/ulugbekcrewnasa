// Pilot: Jarqo'rg'on nuqtasi uchun 6 ekin bo'yicha natija (NASA POWER 1984-2025).
// Ishga tushirish:  npm run pilot            (yoki: node scripts/pilot-crops.js --salinity=medium)
// POWER javobi cache/ papkasiga saqlanadi (git'ga kirmaydi), qayta ishga tushirish tez.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { powerUrl, parsePower } from '../core/power.js';
import { addEt0 } from '../core/agro.js';
import { CROPS } from '../core/crops.js';
import { evaluateCrop } from '../core/crop-calc.js';

const LAT = 37.51, LON = 67.42, START = '19840101', END = '20251231';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const salinity = arg('salinity', 'medium');

const cacheFile = `cache/power-${LAT}_${LON}-${START}-${END}.json`;
let json;
try {
  json = JSON.parse(await readFile(cacheFile, 'utf8'));
} catch {
  const url = powerUrl({ lat: LAT, lon: LON, start: START, end: END });
  console.error(`NASA POWER'dan yuklanmoqda...\n${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`POWER HTTP ${res.status}`);
  json = await res.json();
  await mkdir('cache', { recursive: true });
  await writeFile(cacheFile, JSON.stringify(json));
}
const p = parsePower(json);
addEt0(p.days, { lat: p.lat, elev: p.elev });

const results = CROPS.map((c) => evaluateCrop(p.days, c, { salinity }));

const pad = (s, n) => String(s ?? 'noma\'lum').padEnd(n);
const pct = (x) => (x == null ? 'noma\'lum' : `${Math.round(x * 100)}%`);
console.log(`\nJarqo'rg'on ${LAT}N ${LON}E, balandlik ${p.elev} m. NASA POWER ${p.days[0].date}-${p.days.at(-1).date}, ${p.days.length} kun.`);
console.log(`Sho'rlanish javobi: ${salinity}\n`);
for (const r of results) {
  const rp = r.ripen;
  console.log(`== ${r.name.uz} (${r.name.en})${r.sow ? `, ekish ${r.sow}` : ''}`);
  if (rp.applicable) {
    console.log(`  Pishib ulguradi: ${r.seasons} yildan ${rp.matured} tasida (${pct(rp.share)}); ` +
      `pishish ${rp.maturity?.median} (erta ${rp.maturity?.early}, kech ${rp.maturity?.late}), ${rp.daysToMaturity.median} kun`);
    if (r.springFrost) console.log(`  Ekilgandan keyin bahorgi sovuq: ${r.springFrost.of} yildan ${r.springFrost.years} tasida`);
  } else {
    console.log(`  Ko'p yillik: mavsum ${rp.seasonDays} kun, o'rim (issiqlik bo'yicha) ${rp.cuttings.low}-${rp.cuttings.high} marta`);
  }
  const w = r.water;
  console.log(`  Suv (sof, dala): o'rtacha yil ${w.m3ha.median} m3/ga, quruq yil (5 yildan 4 tasida shundan oshmaydi) ${w.m3ha.p80} m3/ga` +
    `  [ETc ${w.etcMm} mm, samarali yog'in ${w.peffMm} mm, Kc mid ${w.kcMid}]`);
  console.log(`  Issiq kunlar (o'rtacha T >= ${r.heat.tUpper} °C, ${r.heat.stage}): o'rtacha ${r.heat.days.median}, eng ko'p ${r.heat.days.max}; ` +
    `${r.heat.of} yildan ${r.heat.yearsWithAny} tasida bo'lgan`);
  const s = r.spoilage;
  if (s.level) {
    console.log(`  Yig'imdan keyingi ${s.windowDays} kun: yomg'irli kun ${s.rainDays}, o'rtacha Tmax ${s.meanTmax} °C, namlik ${s.meanRh}%; ` +
      `xavf ${s.level} (${s.driver === 'heat' ? `issiq yillar ${s.hotYears}` : `nam yillar ${s.wetYears}`}/${s.seasons}) [tekshirilmagan qoida]`);
  } else console.log(`  Yig'imdagi xavf: noma'lum (${s.reason})`);
  if (r.salinity) {
    console.log(`  Sho'r ECe ${r.salinity.ece[0]}-${r.salinity.ece[1]} dS/m: hosil ${Math.round(r.salinity.yieldPct[1])}-${Math.round(r.salinity.yieldPct[0])}% (${r.salinity.rating})`);
  }
  console.log('');
}

const out = {
  manba: `NASA POWER daily point API (MERRA-2, CERES SRB/SYN1deg; ~0.5°), ${p.days[0].date}..${p.days.at(-1).date}, ${p.days.length} kun`,
  nuqta: { lat: LAT, lon: LON, balandlik_m: p.elev },
  hisoblangan_sana: new Date().toISOString().slice(0, 10),
  sholanish: salinity,
  natijalar: results,
};
await writeFile('docs/pilot-ekinlar-jarqorgon.json', JSON.stringify(out, null, 1));
console.log('Saqlandi: docs/pilot-ekinlar-jarqorgon.json');
