// GDD kalibrlash: FAO-56 Rev.1 GDD yig'indilari boshqa iqlimlarda o'lchangan ("indicative").
// Surxondaryo dalalarida NASA MODIS MCD12Q2 kuzatgan mavsum oxiri sanalari bo'yicha, modeldagi ekish
// sanasidan shu kungacha to'plangan GDD (NASA POWER harorati, Eq. 6.23) hisoblanadi; mediana yangi yig'indi
// bo'ladi, FAO bosqichlari nisbati saqlanib masshtablanadi. Sof funksiyalar.
import { gddDay } from './agro.js';

/**
 * Qaysi dala-yil qaysi ekinga to'g'ri keladi (jamoa qoidasi, verified: false).
 * MCD12Q2 ekin turini bilmaydi; Surxondaryoda kuzgi ekin - asosan bug'doy, yozgi yagona ekin - asosan paxta.
 *  cycles: MCD12Q2 NumCycles; cycle: qaysi tsikl (1 yoki 2);
 *  greenupMonths / endMonths: oy oraliqlari [boshi, oxiri]; end: mavsum oxiri belgisi (MCD12Q2 bandi);
 *  minAmp: EVI2 amplitudasi (cho'l va siyrak o'simlikni chiqarib tashlash uchun); maxQa: QA_Overall.
 */
export const CAL_RULES = {
  verified: false,
  note: 'Team rule: a double-cycle pixel-year whose first cycle ends in May-July is taken as winter wheat; '
    + 'a single-cycle pixel-year that greens up in April-June and ends in September-December as cotton. '
    + 'End of the FAO late stage = the MCD12Q2 date that matches local harvest practice: wheat is cut as dry grain after '
    + 'full senescence (Dormancy: EVI2 back to 15% of the cycle amplitude); cotton is picked after defoliation, while stalks, '
    + 'late pickings and wheat sown into cotton keep the pixel green into November, so cotton uses MidGreendown '
    + '(EVI2 down to 50% of the amplitude). The other marker is reported as a sensitivity.',
  crops: {
    winter_wheat: { cycles: [2], cycle: 1, greenupMonths: [10, 4], endMonths: [5, 7], end: 'dormancy', minAmp: 0.15, maxQa: 2 },
    cotton: { cycles: [1], cycle: 1, greenupMonths: [4, 6], endMonths: [9, 12], end: 'midGreendown', minAmp: 0.15, maxQa: 2 },
  },
};

const inMonths = (date, [a, b]) => {
  const m = Number(date.slice(5, 7));
  return a <= b ? m >= a && m <= b : m >= a || m <= b; // [10, 4] = oktabr..aprel
};

/** MCD12Q2 sanasi: 1970-01-01 dan kunlar -> 'YYYY-MM-DD' (32767 = bo'sh) */
export function mcdDate(v) {
  if (v == null || v >= 32767 || v < 0) return null;
  return new Date(v * 86400000).toISOString().slice(0, 10);
}

/**
 * Dala-yillarni tanlaydi. pixels: [{ year, px, cycles, c: [{greenup, midGreendown, dormancy, amp, qa}, ...] }]
 * -> [{ year, px, greenup, end, midGreendown }]
 */
export function selectSeasons(pixels, rule, endBand = rule.end) {
  const out = [];
  for (const p of pixels) {
    if (!rule.cycles.includes(p.cycles)) continue;
    const c = p.c[rule.cycle - 1];
    if (!c || !c.greenup || !c[endBand]) continue;
    if (c.amp == null || c.amp < rule.minAmp) continue;
    if (c.qa == null || c.qa > rule.maxQa) continue;
    if (!inMonths(c.greenup, rule.greenupMonths) || !inMonths(c[endBand], rule.endMonths)) continue;
    if (Number(c[endBand].slice(0, 4)) !== p.year) continue; // mavsum shu yili tugashi kerak
    out.push({ year: p.year, px: p.px, greenup: c.greenup, end: c[endBand], midGreendown: c.midGreendown });
  }
  return out;
}

/**
 * Ekish sanasidan (model qoidasi: crop.sow, kuzgi ekin uchun oldingi yil) kuzatilgan oxirgacha GDD.
 * dayIndex: Map(POWER sanasi 'YYYYMMDD' -> day). Harorat yo'q kun bo'lsa null (taxmin qilinmaydi).
 */
export function gddToDate(dayIndex, crop, season) {
  const endYear = Number(season.end.slice(0, 4));
  const sowYear = crop.sow > season.end.slice(5) ? endYear - 1 : endYear; // kuzda ekilsa - o'tgan yil
  const sow = `${sowYear}-${crop.sow}`;
  if (sow >= season.end) return null;
  let g = 0;
  for (let t = Date.parse(`${sow}T00:00:00Z`); ; t += 86400000) {
    const d = new Date(t).toISOString().slice(0, 10);
    if (d > season.end) break;
    const day = dayIndex.get(d.replace(/-/g, ''));
    if (!day || day.tmax == null || day.tmin == null) return null;
    g += gddDay(day.tmax, day.tmin, crop.gdd.tBase, crop.gdd.tUpper);
  }
  return { sow, gdd: g, days: Math.round((Date.parse(season.end) - Date.parse(sow)) / 86400000) };
}

const quantile = (sorted, q) => {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};

/** Bir ekin uchun kalibrlash natijasi */
export function calibrateCrop(crop, seasons, dayIndex) {
  const rows = [];
  for (const s of seasons) {
    const r = gddToDate(dayIndex, crop, s);
    if (r) rows.push({ ...s, ...r });
  }
  const g = rows.map((r) => r.gdd).sort((a, b) => a - b);
  const faoTotal = crop.gdd.stages.reduce((a, b) => a + b, 0);
  const median = quantile(g, 0.5);
  if (median == null) return { cropId: crop.id, n: 0, faoTotal };
  const factor = median / faoTotal;
  const years = [...new Set(rows.map((r) => r.year))].sort();
  const endDoy = rows.map((r) => (Date.parse(r.end) - Date.parse(`${r.end.slice(0, 4)}-01-01`)) / 86400000 + 1).sort((a, b) => a - b);
  return {
    cropId: crop.id,
    n: rows.length,
    pixels: new Set(rows.map((r) => r.px)).size,
    years: [years[0], years[years.length - 1]],
    faoTotal,
    total: Math.round(median),
    p25: Math.round(quantile(g, 0.25)),
    p75: Math.round(quantile(g, 0.75)),
    factor: Math.round(factor * 1000) / 1000,
    stages: crop.gdd.stages.map((x) => Math.round(x * factor)),
    endDoy: { median: Math.round(quantile(endDoy, 0.5)), p25: Math.round(quantile(endDoy, 0.25)), p75: Math.round(quantile(endDoy, 0.75)) },
    seasonDays: Math.round(quantile(rows.map((r) => r.days).sort((a, b) => a - b), 0.5)),
  };
}

/**
 * ORNL TESViS subset javoblari (bitta band = bitta JSON, 10 yil) -> piksel-yillar.
 * bands: { NumCycles, 'Greenup.Num_Modes_01', ... } ; 32767 = bo'sh. Piksel raqami - to'rda qator bo'yicha.
 */
export function pixelsFromBands(bands) {
  const nc = bands.NumCycles;
  const v = (band, yi, i, scale = 1) => {
    const x = bands[band]?.subset[yi]?.data[i];
    return x == null || x >= 32767 ? null : x * scale;
  };
  const out = [];
  nc.subset.forEach((s, yi) => s.data.forEach((cycles, i) => {
    if (cycles >= 32767) return;
    const c = ['01', '02'].map((m) => ({
      greenup: mcdDate(v(`Greenup.Num_Modes_${m}`, yi, i)),
      midGreendown: mcdDate(v(`MidGreendown.Num_Modes_${m}`, yi, i)),
      dormancy: mcdDate(v(`Dormancy.Num_Modes_${m}`, yi, i)),
      amp: v(`EVI_Amplitude.Num_Modes_${m}`, yi, i, 1e-4),
      qa: v(`QA_Overall.Num_Modes_${m}`, yi, i),
    }));
    out.push({ year: Number(s.calendar_date.slice(0, 4)), px: i, cycles, c });
  }));
  return out;
}

/** Ekinga kalibrlangan GDD bosqichlarini qo'yadi (bo'lmasa - FAO asl qiymati qoladi) */
export function calibratedCrop(crop, calibration) {
  const c = calibration?.crops?.[crop.id];
  if (!c?.n || !crop.gdd?.stages) return crop;
  return { ...crop, gdd: { ...crop.gdd, stages: c.stages, faoStages: crop.gdd.stages, calibration: c } };
}
