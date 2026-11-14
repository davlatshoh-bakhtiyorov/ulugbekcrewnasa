// Ekin bo'yicha hisob: pishib ulgurish ehtimoli, suv talabi, issiqlik stressi, yig'imdagi buzilish xavfi,
// sho'rlanishda hosil. Hammasi NASA POWER kunlik qatori ustida, har bir yil alohida hisoblanadi va
// natija tarixdan sanaladi ("N yildan k tasida"). Sof funksiyalar: brauzer va Node'da bir xil.
//
// Kirish qatori: [{date:'YYYYMMDD', doy, tmax, tmin, tdew, u2, rain, et0}] - agro.addEt0() dan keyin.
import { satVapPressure, gddDay } from './agro.js';
import { METHODS, SALINITY_CLASSES } from './crops.js';

// ---------- FAO-56 Rev.1 formulalari ----------

/** RHmin, % (FAO-56 Rev.1, Eq. 6.17) */
export function rhMin(tdew, tmax) {
  if (tdew == null || tmax == null) return null;
  return (100 * satVapPressure(tdew)) / satVapPressure(tmax);
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/**
 * Kc mid / Kc end ni iqlimga moslash (FAO-56 Rev.1, Eq. 6.16 va 6.19).
 * Chegaralar formula ostida berilgan: 1 <= u2 <= 6 m/s, 20 <= RHmin <= 80 %, 0.1 < h < 10 m.
 * Ma'lumot yo'q bo'lsa null (chaqiruvchi jadval qiymatini "moslanmagan" belgisi bilan ishlatadi).
 */
export function adjustKc(kcTab, { u2, rhmin, h }) {
  if (kcTab == null || u2 == null || rhmin == null || h == null) return null;
  const u = clamp(u2, 1, 6), rh = clamp(rhmin, 20, 80), hh = clamp(h, 0.1, 10);
  return kcTab + (0.04 * (u - 2) - 0.004 * (rh - 45)) * Math.pow(hh / 3, 0.3);
}

/**
 * Mavsumning i-kunidagi Kc (FAO-56 Rev.1, Eq. 6.20).
 * L = [Lini, Ldev, Lmid, Llate] kunlarda; kc = {ini, mid, end}.
 */
export function kcOnDay(i, L, kc) {
  const [a, b, c, d] = L;
  if (i <= a) return kc.ini;
  if (i <= a + b) return kc.ini + ((i - a) / b) * (kc.mid - kc.ini);
  if (i <= a + b + c) return kc.mid;
  if (d <= 0) return kc.end;
  const x = Math.min(i, a + b + c + d);
  return kc.mid + ((x - a - b - c) / d) * (kc.end - kc.mid);
}

/** Oylik samarali yog'in, mm (USDA-SCS usuli, FAO CROPWAT) */
export function effectiveRainMonth(p) {
  if (p == null) return null;
  if (p <= 0) return 0;
  return p <= 250 ? (p * (125 - 0.2 * p)) / 125 : 125 + 0.1 * p;
}

/** Sho'rlanishda nisbiy hosil, % (FAO-56 Rev.1 Eq. 8.19 = FAO-29 usuli) */
export function saltYieldPct(ece, { threshold, b }) {
  if (ece == null || threshold == null || b == null) return null;
  if (ece <= threshold) return 100;
  return clamp(100 - b * (ece - threshold), 0, 100);
}

/** Dehqon javobi (unknown/low/medium/high) bo'yicha hosil oralig'i; bilmasa - null */
export function salinityImpact(crop, cls) {
  const c = SALINITY_CLASSES[cls];
  if (!c || !crop.salt) return null;
  const [lo, hi] = c.ece;
  return {
    class: cls,
    ece: [lo, hi],
    // ECe pastki chegarasida eng yaxshi, yuqori chegarasida eng yomon hosil
    yieldPct: [saltYieldPct(lo, crop.salt), saltYieldPct(hi, crop.salt)],
    rating: crop.salt.rating,
    src: [crop.salt.src, METHODS.saltYield, SALINITY_CLASSES.src],
  };
}

// ---------- yordamchilar ----------

export function percentile(values, p) {
  const v = values.filter((x) => x != null && !Number.isNaN(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const pos = (v.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos);
  return v[lo] + (v[hi] - v[lo]) * (pos - lo);
}
const median = (v) => percentile(v, 0.5);
const mean = (v) => {
  const a = v.filter((x) => x != null);
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
};
const round = (x, n = 0) => {
  if (x == null || Number.isNaN(x)) return null;
  return n >= 0 ? Math.round(x * 10 ** n) / 10 ** n : Math.round(x / 10 ** -n) * 10 ** -n;
};

/** 'MM-DD' + n kun -> 'MM-DD' (kabisa bo'lmagan yil bo'yicha) */
export function addDaysMMDD(mmdd, n) {
  const [m, d] = mmdd.split('-').map(Number);
  const t = new Date(Date.UTC(2001, m - 1, d) + Math.round(n) * 86400000);
  return `${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

/** Har oy uchun Peff/P nisbati: 'YYYYMM' -> 0..1 */
export function monthlyRainRatio(days) {
  const tot = new Map();
  for (const d of days) {
    if (d.rain == null) continue;
    const k = d.date.slice(0, 6);
    tot.set(k, (tot.get(k) ?? 0) + d.rain);
  }
  const ratio = new Map();
  for (const [k, p] of tot) ratio.set(k, p > 0 ? effectiveRainMonth(p) / p : 1);
  return ratio;
}

const tmean = (d) => (d.tmax + d.tmin) / 2;
const FROST = 0; // °C, T2M_MIN <= 0 - sovuq kuni (1-qadamdagi bilan bir xil)

// ---------- bir mavsum ----------

/**
 * Ekish kunidan boshlab GDD yig'adi va bosqichlar tugash kunlarini topadi.
 * Natija status: 'mature' | 'frost' (kuzgi sovuq pishishdan oldin) | 'data_end' | 'missing' | 'timeout'.
 */
export function simulateSeason(days, startIdx, crop) {
  const { tBase, tUpper, stages } = crop.gdd;
  const cum = [];
  stages.reduce((s, x) => (cum.push(s + x), s + x), 0);
  let g = 0;
  const ends = [];
  for (let i = startIdx; i < days.length; i++) {
    const d = days[i];
    if (d.tmax == null || d.tmin == null) return { status: 'missing', startIdx };
    if (crop.frostEnds && i > startIdx && d.doy >= 182 && d.tmin <= FROST) {
      return { status: 'frost', startIdx, endIdx: i, stageEnds: ends, gdd: g };
    }
    g += gddDay(d.tmax, d.tmin, tBase, tUpper);
    while (ends.length < 4 && g >= cum[ends.length]) ends.push(i);
    if (ends.length === 4) return { status: 'mature', startIdx, endIdx: i, stageEnds: ends, gdd: g };
    if (i - startIdx > 400) return { status: 'timeout', startIdx };
  }
  return { status: 'data_end', startIdx };
}

/** Bosqich uzunliklari kunlarda */
export function stageLengths(season) {
  const [e0, e1, e2, e3] = season.stageEnds;
  return [e0 - season.startIdx + 1, e1 - e0, e2 - e1, e3 - e2];
}

const cropHeight = (h) => (Array.isArray(h) ? (h[0] + h[1]) / 2 : h);

/** Pishgan mavsum uchun ETc, samarali yog'in va sof sug'orish talabi (mm) */
export function seasonWater(days, season, crop, rainRatio) {
  const L = stageLengths(season);
  const s = season.startIdx;
  const slice = (a, b) => days.slice(a, b + 1);
  const mid = slice(s + L[0] + L[1], s + L[0] + L[1] + L[2] - 1);
  const late = slice(s + L[0] + L[1] + L[2], season.endIdx);
  const h = cropHeight(crop.kc.h);
  const cond = (arr) => ({ u2: mean(arr.map((d) => d.u2)), rhmin: mean(arr.map((d) => rhMin(d.tdew, d.tmax))), h });
  const midAdj = adjustKc(crop.kc.mid, cond(mid));
  const endAdj = crop.kc.end > 0.45 ? adjustKc(crop.kc.end, cond(late)) : crop.kc.end;
  const kc = { ini: crop.kc.ini, mid: midAdj ?? crop.kc.mid, end: endAdj ?? crop.kc.end };
  let etc = 0, et0 = 0, rain = 0, peff = 0, missing = 0;
  for (let i = s; i <= season.endIdx; i++) {
    const d = days[i];
    if (d.et0 == null || d.rain == null) { missing++; continue; }
    etc += kcOnDay(i - s + 1, L, kc) * d.et0;
    et0 += d.et0;
    rain += d.rain;
    peff += d.rain * (rainRatio.get(d.date.slice(0, 6)) ?? 1);
  }
  if (missing) return { missing, etc: null, et0: null, rain: null, peff: null, nir: null, kc, kcAdjusted: midAdj != null };
  return { missing: 0, etc, et0, rain, peff, nir: Math.max(0, etc - peff), kc, kcAdjusted: midAdj != null };
}

/** O'rta mavsum (gullash shu bosqichda) kunlarida o'rtacha harorat >= Tupper bo'lgan kunlar */
export function heatDaysMid(days, season, crop) {
  const L = stageLengths(season);
  const a = season.startIdx + L[0] + L[1], b = a + L[2] - 1;
  let n = 0;
  for (let i = a; i <= b; i++) if (tmean(days[i]) >= crop.gdd.tUpper) n++;
  return n;
}

/** Pishgandan keyingi n kun: yomg'irli kunlar (>= 1 mm), o'rtacha Tmax, o'rtacha nisbiy namlik */
export function harvestWindow(days, endIdx, n) {
  const w = days.slice(endIdx + 1, endIdx + 1 + n);
  if (w.length < n || w.some((d) => d.tmax == null || d.tmin == null || d.rain == null)) return null;
  const rh = w.map((d) => (d.tdew == null ? null
    : (100 * satVapPressure(d.tdew)) / ((satVapPressure(d.tmax) + satVapPressure(d.tmin)) / 2)));
  return {
    rainDays: w.filter((d) => d.rain >= 1).length,
    meanTmax: mean(w.map((d) => d.tmax)),
    meanRh: mean(rh),
  };
}

// ---------- buzilish xavfi (jamoa qoidasi, tekshirilmagan) ----------

export const SPOILAGE_RULE = {
  verified: false,
  windowDays: 14,
  wetRainDays: 3, // oynada >= 3 yomg'irli kun - "nam yig'im" yili (don, tola, pichan uchun)
  hotMeanTmax: 30, // oynada o'rtacha Tmax >= 30 °C - "issiq yig'im" yili (piyoz, kartoshka uchun)
  levels: [0.2, 0.5], // shunday yillar ulushi: < 0.2 past, < 0.5 o'rta, aks holda yuqori
  note: 'Team heuristic, not from a published source. Needs agronomist review.',
};

function spoilageLevel(share) {
  if (share == null) return null;
  return share < SPOILAGE_RULE.levels[0] ? 'low' : share < SPOILAGE_RULE.levels[1] ? 'medium' : 'high';
}

// ---------- asosiy funksiya ----------

/**
 * Bitta ekin va ekish sanasi uchun barcha yillar bo'yicha natija.
 * opts: { sow:'MM-DD', salinity:'unknown'|'low'|'medium'|'high' }
 */
export function evaluateCrop(days, crop, opts = {}) {
  if (crop.perennial) return evaluateForage(days, crop, opts);
  const sow = opts.sow ?? crop.sow;
  const idx = new Map(days.map((d, i) => [d.date, i]));
  const ratio = monthlyRainRatio(days);
  const years = [...new Set(days.map((d) => +d.date.slice(0, 4)))];
  const W = SPOILAGE_RULE.windowDays;
  const recs = [];
  for (const y of years) {
    const i0 = idx.get(`${y}${sow.replace('-', '')}`);
    if (i0 == null) continue;
    const sim = simulateSeason(days, i0, crop);
    const r = { year: y, status: sim.status };
    if (sim.status === 'mature' || sim.status === 'frost') {
      r.days = sim.endIdx - i0 + 1;
      r.endDate = days[sim.endIdx].date;
      // bahorda ekilgandan keyin sovuq (Tmin <= 0) bo'lgan kunlar, 1-iyulgacha
      if (crop.frostEnds) {
        let f = 0;
        for (let i = i0; i <= sim.endIdx && days[i].doy < 182; i++) if (days[i].tmin <= FROST) f++;
        r.frostDaysAfterSow = f;
      }
    }
    if (sim.status === 'mature') {
      const w = seasonWater(days, sim, crop, ratio);
      Object.assign(r, {
        stageDays: stageLengths(sim),
        etcMm: w.etc, peffMm: w.peff, nirMm: w.nir, kcMid: w.kc.mid, kcEnd: w.kc.end,
        heatDays: heatDaysMid(days, sim, crop),
        harvest: harvestWindow(days, sim.endIdx, W),
      });
    }
    recs.push(r);
  }

  const done = recs.filter((r) => r.status === 'mature' || r.status === 'frost');
  const ok = done.filter((r) => r.status === 'mature');
  const N = done.length;
  const pick = (k) => ok.map((r) => r[k]);
  const hv = ok.map((r) => r.harvest).filter(Boolean);
  const wetYears = hv.filter((h) => h.rainDays >= SPOILAGE_RULE.wetRainDays).length;
  const hotYears = hv.filter((h) => h.meanTmax >= SPOILAGE_RULE.hotMeanTmax).length;
  const driver = crop.perishability === 'semi' ? 'heat' : 'rain';
  const share = hv.length ? (driver === 'heat' ? hotYears : wetYears) / hv.length : null;

  return {
    cropId: crop.id,
    name: crop.name,
    sow,
    period: { from: days[0]?.date ?? null, to: days.at(-1)?.date ?? null },
    seasons: N,
    ripen: {
      applicable: true,
      matured: ok.length,
      of: N,
      share: N ? ok.length / N : null,
      frostBeforeMaturity: crop.frostEnds ? N - ok.length : null,
      daysToMaturity: { median: round(median(pick('days'))), min: ok.length ? Math.min(...pick('days')) : null, max: ok.length ? Math.max(...pick('days')) : null },
      maturity: ok.length ? {
        median: addDaysMMDD(sow, median(pick('days')) - 1),
        early: addDaysMMDD(sow, percentile(pick('days'), 0.1) - 1),
        late: addDaysMMDD(sow, percentile(pick('days'), 0.9) - 1),
      } : null,
      src: [crop.gdd.tSrc, crop.gdd.stagesSrc, METHODS.gdd, METHODS.frost],
    },
    springFrost: crop.frostEnds ? { years: done.filter((r) => r.frostDaysAfterSow > 0).length, of: N } : null,
    water: {
      seasons: ok.filter((r) => r.nirMm != null).length,
      etcMm: round(median(pick('etcMm'))),
      peffMm: round(median(pick('peffMm'))),
      nirMm: { median: round(median(pick('nirMm'))), p80: round(percentile(pick('nirMm'), 0.8)) },
      m3ha: { median: round(median(pick('nirMm')) * 10, -1), p80: round(percentile(pick('nirMm'), 0.8) * 10, -1) },
      kcMid: round(median(pick('kcMid')), 2),
      kcEnd: round(median(pick('kcEnd')), 2),
      note: 'Net field need (ETc - effective rain). Canal and field losses not included.',
      src: [crop.kc.src, METHODS.kcCurve, METHODS.kcMidAdjust, METHODS.kcEndAdjust, METHODS.rhMin, METHODS.effectiveRain],
    },
    heat: {
      tUpper: crop.gdd.tUpper,
      stage: 'mid-season (includes flowering)',
      days: { median: round(median(pick('heatDays'))), max: ok.length ? Math.max(...pick('heatDays')) : null },
      yearsWithAny: ok.filter((r) => r.heatDays > 0).length,
      of: ok.length,
      src: [crop.gdd.tSrc, METHODS.gdd],
    },
    spoilage: {
      perishability: crop.perishability,
      driver,
      windowDays: W,
      seasons: hv.length,
      rainDays: round(median(hv.map((h) => h.rainDays)), 1),
      meanTmax: round(median(hv.map((h) => h.meanTmax)), 1),
      meanRh: round(median(hv.map((h) => h.meanRh))),
      wetYears, hotYears,
      level: spoilageLevel(share),
      rule: SPOILAGE_RULE,
    },
    salinity: salinityImpact(crop, opts.salinity ?? 'unknown'),
    years: recs,
  };
}

/**
 * Ko'p yillik yem ekini (beda). Mavsum: bahordagi oxirgi `killTemp` dan kuzdagi birinchi `killTemp` gacha.
 * O'rimlar soni GDD sikllaridan: issiqlik bo'yicha yuqori chegara (suv/parvarish cheklovlari hisobga olinmagan).
 */
export function evaluateForage(days, crop, opts = {}) {
  const kill = crop.season.killTemp;
  const ratio = monthlyRainRatio(days);
  const byYear = new Map();
  days.forEach((d, i) => {
    const y = +d.date.slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(i);
  });
  const recs = [];
  for (const [y, ids] of byYear) {
    if (ids.length < 365 || ids.some((i) => days[i].tmin == null || days[i].tmax == null)) {
      recs.push({ year: y, status: 'missing' });
      continue;
    }
    let start = ids[0], end = ids.at(-1);
    for (const i of ids) {
      if (days[i].tmin > kill) continue;
      if (days[i].doy < 182) start = i + 1;
      else { end = i - 1; break; }
    }
    let gdd = 0, et0 = 0, rain = 0, peff = 0, heat = 0, missing = 0;
    for (let i = start; i <= end; i++) {
      const d = days[i];
      gdd += gddDay(d.tmax, d.tmin, crop.gdd.tBase, crop.gdd.tUpper);
      if (tmean(d) >= crop.gdd.tUpper) heat++;
      if (d.et0 == null || d.rain == null) { missing++; continue; }
      et0 += d.et0;
      rain += d.rain;
      peff += d.rain * (ratio.get(d.date.slice(0, 6)) ?? 1);
    }
    const [f0, f1] = crop.gdd.firstCycle, [m0, m1] = crop.gdd.middleCycle;
    const cuts = (first, mid) => (gdd < first ? 0 : 1 + Math.floor((gdd - first) / mid));
    const etc = missing ? null : crop.kc.seasonAvg * et0;
    recs.push({
      year: y, status: 'season',
      startDate: days[start].date, endDate: days[end].date, days: end - start + 1, gdd,
      cutsLow: cuts(f1, m1), cutsHigh: cuts(f0, m0),
      etcMm: etc, peffMm: missing ? null : peff, nirMm: missing ? null : Math.max(0, etc - peff), heatDays: heat,
    });
  }
  const ok = recs.filter((r) => r.status === 'season');
  const pick = (k) => ok.map((r) => r[k]);
  return {
    cropId: crop.id,
    name: crop.name,
    sow: null,
    period: { from: days[0]?.date ?? null, to: days.at(-1)?.date ?? null },
    seasons: ok.length,
    ripen: {
      applicable: false,
      reason: 'perennial forage: no single harvest date',
      seasonDays: round(median(pick('days'))),
      cuttings: { low: round(median(pick('cutsLow'))), high: round(median(pick('cutsHigh'))) },
      note: 'Thermal potential from GDD cycles; water, variety and management limits are not included.',
      src: [crop.gdd.tSrc, crop.gdd.stagesSrc, crop.season.src, METHODS.gdd],
    },
    springFrost: null,
    water: {
      seasons: ok.filter((r) => r.nirMm != null).length,
      etcMm: round(median(pick('etcMm'))),
      peffMm: round(median(pick('peffMm'))),
      nirMm: { median: round(median(pick('nirMm'))), p80: round(percentile(pick('nirMm'), 0.8)) },
      m3ha: { median: round(median(pick('nirMm')) * 10, -1), p80: round(percentile(pick('nirMm'), 0.8) * 10, -1) },
      kcMid: crop.kc.seasonAvg,
      kcEnd: null,
      note: 'Net field need with season-average Kc. Canal and field losses not included.',
      src: [crop.kc.seasonAvgSrc, crop.season.src, METHODS.effectiveRain],
    },
    heat: {
      tUpper: crop.gdd.tUpper,
      stage: 'whole season',
      days: { median: round(median(pick('heatDays'))), max: ok.length ? Math.max(...pick('heatDays')) : null },
      yearsWithAny: ok.filter((r) => r.heatDays > 0).length,
      of: ok.length,
      src: [crop.gdd.tSrc, METHODS.gdd],
    },
    spoilage: {
      perishability: crop.perishability,
      level: null,
      reason: 'several cuttings per year; harvest-window risk not modelled yet',
    },
    salinity: salinityImpact(crop, opts.salinity ?? 'unknown'),
    years: recs,
  };
}
