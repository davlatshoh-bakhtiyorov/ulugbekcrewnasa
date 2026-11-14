// Maslahatchi: evaluateCrop() natijalari + dehqon javoblari -> to'rtta svetofor va 3 ta variant.
// Til bu yerda yo'q: natija kodlar va raqamlar bilan qaytadi, matnni UI (web/i18n.js) yasaydi.
//
// Svetofor chegaralari - jamoa qoidasi (verified: false). FAO raqamlarining o'zi manbali,
// lekin "yashil/sariq/qizil" chegarasi - bizning qaror; UI buni ochiq ko'rsatadi.
import { CROPS, cropById } from './crops.js';

export const LEVEL_SCORE = { green: 2, yellow: 1, red: 0, unknown: 1 };

export const RULES = {
  verified: false,
  note: 'Team thresholds for the traffic lights. Numbers behind them are sourced; the cut-offs are not.',
  // Quruq yil (5 yildan 4 tasida oshmaydigan) sof suv talabi, m3/ga: [yashil <, sariq <]
  water: {
    enough: [10000, 14000],
    sometimes: [6000, 9000],
    scarce: [4000, 6000],
  },
  // Pishib ulgurgan yillar ulushi: yashil >=, sariq >=
  ripen: [0.9, 0.7],
  // Sho'rda eng yomon holatdagi hosil, %: yashil >=, sariq >=
  saltYield: [90, 70],
};

const worse = (a, b) => (LEVEL_SCORE[a] <= LEVEL_SCORE[b] ? a : b);

/** Suv: dehqonning suv ahvoli + quruq yildagi talab */
export function waterLight(result, waterAnswer) {
  const need = result.water?.m3ha?.p80 ?? null;
  const cut = RULES.water[waterAnswer];
  if (need == null) return { level: 'unknown', code: 'water_unknown' };
  if (!cut) return { level: 'unknown', code: 'water_answer_unknown', need };
  const level = need < cut[0] ? 'green' : need < cut[1] ? 'yellow' : 'red';
  return { level, code: `water_${level}`, need, median: result.water.m3ha.median };
}

/** Pishib ulgurish: tarixdagi ulush */
export function ripenLight(result) {
  const r = result.ripen;
  if (!r) return { level: 'unknown', code: 'ripen_unknown' };
  if (!r.applicable) return { level: 'green', code: 'ripen_perennial', cuttings: r.cuttings };
  if (r.share == null) return { level: 'unknown', code: 'ripen_unknown' };
  const level = r.share >= RULES.ripen[0] ? 'green' : r.share >= RULES.ripen[1] ? 'yellow' : 'red';
  return { level, code: `ripen_${level}`, matured: r.matured, of: r.of, date: r.maturity?.median ?? null };
}

/**
 * Tuproqqa foyda: almashlab ekish qoidasi + sho'rlanish.
 *  - o'sha ekin qayta ekilsa (monokultura) - qizil
 *  - dukkakli (mosh, beda) - yashil: havodan azot to'playdi
 *  - oldin dukkakli bo'lgan, endi boshqa oila - yashil: qolgan azotdan foydalanadi
 *  - boshqa holatlar - sariq
 * Sho'r ma'lum bo'lsa, eng yomon hosil (%) bo'yicha baho bilan solishtiriladi, yomonrog'i olinadi.
 */
export function soilLight(crop, lastCropId, result) {
  const last = lastCropId ? cropById(lastCropId) : null;
  let level, code;
  if (last && last.id === crop.id) [level, code] = ['red', 'soil_same_crop'];
  else if (crop.family === 'legume') [level, code] = ['green', 'soil_legume'];
  else if (last && last.family === 'legume') [level, code] = ['green', 'soil_after_legume'];
  else if (last) [level, code] = ['yellow', 'soil_neutral'];
  else [level, code] = ['yellow', 'soil_last_unknown'];
  const out = { level, code, rotation: level };
  const s = result.salinity;
  if (s) {
    const y = s.yieldPct[1];
    const sl = y >= RULES.saltYield[0] ? 'green' : y >= RULES.saltYield[1] ? 'yellow' : 'red';
    out.salt = { level: sl, yieldLow: Math.round(s.yieldPct[1]), yieldHigh: Math.round(s.yieldPct[0]), ece: s.ece };
    out.level = worse(level, sl);
  }
  return out;
}

/** Bozor va isrof: hozircha faqat yig'imdagi buzilish xavfi; narx ma'lumoti hali yo'q */
export function marketLight(result) {
  const s = result.spoilage;
  const map = { low: 'green', medium: 'yellow', high: 'red' };
  if (!s?.level) return { level: 'unknown', code: 'market_unknown', price: null };
  return {
    level: map[s.level], code: `spoil_${s.level}`, driver: s.driver,
    rainDays: s.rainDays, meanTmax: s.meanTmax, price: null,
  };
}

/**
 * Asosiy funksiya. results: evaluateCrop() natijalari massivi.
 * answers: { lastCrop: id|null, water: 'enough'|'sometimes'|'scarce'|null, salinity }
 * Qaytaradi: hamma ekinlar ballar bo'yicha tartiblangan; birinchi 3 tasi - tavsiya.
 */
export function advise(results, answers) {
  const options = results.map((r) => {
    const crop = cropById(r.cropId);
    const lights = {
      water: waterLight(r, answers.water),
      ripen: ripenLight(r),
      soil: soilLight(crop, answers.lastCrop, r),
      market: marketLight(r),
    };
    const score = Object.values(lights).reduce((s, l) => s + LEVEL_SCORE[l.level], 0);
    return { cropId: r.cropId, crop, result: r, lights, score };
  });
  options.sort((a, b) =>
    b.score - a.score ||
    // teng bo'lsa: qizil chirog'i kamrog'i, keyin suvi kamrog'i
    redCount(a) - redCount(b) ||
    (a.result.water.m3ha.p80 ?? Infinity) - (b.result.water.m3ha.p80 ?? Infinity));
  return { top: options.slice(0, 3), all: options, rules: RULES };
}

const redCount = (o) => Object.values(o.lights).filter((l) => l.level === 'red').length;

export const CROP_IDS = CROPS.map((c) => c.id);
