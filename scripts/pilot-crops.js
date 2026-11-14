// Pilot: Jarqo'rg'on nuqtasi uchun 6 ekin bo'yicha natija (NASA POWER 1984-2025).
// Ishga tushirish:  npm run pilot            (yoki: node scripts/pilot-crops.js --salinity=medium [--fao])
// POWER javobi cache/ papkasiga saqlanadi (git'ga kirmaydi), qayta ishga tushirish tez.
import { writeFile } from 'node:fs/promises';
import { CROPS } from '../core/crops.js';
import { evaluateCrop } from '../core/crop-calc.js';
import { CALIBRATION } from '../core/calibration.js';
import { loadPilotPower, PILOT } from './power-cache.js';

const LAT = PILOT.lat, LON = PILOT.lon;
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const salinity = arg('salinity', 'medium');
// --fao : faqat FAO-56 Rev.1 GDD yig'indilari (NASA MODIS kalibrlashsiz), taqqoslash uchun
const calibration = process.argv.includes('--fao') ? null : CALIBRATION;

const p = await loadPilotPower();

const results = CROPS.map((c) => evaluateCrop(p.days, c, { salinity, calibration }));

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
  gdd: calibration ? `FAO-56 Rev.1 stages scaled to NASA MODIS MCD12Q2 (core/calibration.js, ${calibration.generated}) for ${Object.keys(calibration.crops).join(', ')}; FAO values for the rest` : 'FAO-56 Rev.1 only',
  natijalar: results,
};
if (calibration) {
  await writeFile('docs/pilot-ekinlar-jarqorgon.json', JSON.stringify(out, null, 1));
  console.log('Saqlandi: docs/pilot-ekinlar-jarqorgon.json');
} else console.log('--fao: fayl yozilmadi (asosiy natija kalibrlangan model bilan saqlanadi)');
