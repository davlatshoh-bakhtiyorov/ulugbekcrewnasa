import test from 'node:test';
import assert from 'node:assert/strict';
import { CROPS, cropById, SOURCES } from '../core/crops.js';
import {
  adjustKc, kcOnDay, effectiveRainMonth, saltYieldPct, rhMin, salinityImpact,
  evaluateCrop, simulateSeason, stageLengths, addDaysMMDD, percentile,
} from '../core/crop-calc.js';
import { satVapPressure } from '../core/agro.js';

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b} (±${tol})`);

// ---------- FAO-56 Rev.1 ishlangan misollari ----------

test('Kc mid moslash - FAO-56 Rev.1 Example 6.6 (p.191): Taipei 1.07, Mocha 1.30', () => {
  near(adjustKc(1.20, { u2: 1.3, rhmin: 75, h: 2 }), 1.07, 0.005);
  near(adjustKc(1.20, { u2: 4.6, rhmin: 44, h: 2 }), 1.30, 0.005);
});

test('Kc moslash - chegaralar (u2 1..6, RHmin 20..80) va yetishmagan qiymat -> null', () => {
  assert.equal(adjustKc(1.2, { u2: 10, rhmin: 44, h: 2 }), adjustKc(1.2, { u2: 6, rhmin: 44, h: 2 }));
  assert.equal(adjustKc(1.2, { u2: 2, rhmin: 5, h: 2 }), adjustKc(1.2, { u2: 2, rhmin: 20, h: 2 }));
  assert.equal(adjustKc(1.2, { u2: null, rhmin: 44, h: 2 }), null);
});

test('Kc egri chizig\'i - FAO-56 Rev.1 Example 6.7 (p.201): 0.15, 0.77, 1.19, 0.56', () => {
  const L = [25, 25, 30, 20], kc = { ini: 0.15, mid: 1.19, end: 0.35 };
  near(kcOnDay(20, L, kc), 0.15, 0.005);
  near(kcOnDay(40, L, kc), 0.77, 0.005);
  near(kcOnDay(70, L, kc), 1.19, 0.005);
  near(kcOnDay(95, L, kc), 0.56, 0.005);
});

test('RHmin - Eq. 6.17', () => {
  near(rhMin(20, 20), 100, 1e-9);
  near(rhMin(10, 30), (100 * satVapPressure(10)) / satVapPressure(30), 1e-9);
  assert.equal(rhMin(null, 30), null);
});

test("samarali yog'in - USDA-SCS", () => {
  assert.equal(effectiveRainMonth(0), 0);
  near(effectiveRainMonth(100), 84, 1e-9);
  near(effectiveRainMonth(250), 150, 1e-9);
  near(effectiveRainMonth(300), 155, 1e-9);
  assert.equal(effectiveRainMonth(null), null);
});

// ---------- sho'rlanish: ikki mustaqil FAO nashri bir-biriga mos kelishi ----------

test("sho'rlanish - FAO-56 Rev.1 (b, chegara) FAO-29 4-jadvalidagi 90/50/0% hosilni qaytaradi", () => {
  for (const c of CROPS) {
    const f = c.salt.fao29;
    if (!f) continue;
    assert.equal(c.salt.threshold, f.ece100, `${c.id} threshold`);
    near(saltYieldPct(f.ece90, c.salt), 90, 2);
    near(saltYieldPct(f.ece50, c.salt), 50, 3);
    near(saltYieldPct(f.ece0, c.salt), 0, 3);
  }
});

test("sho'rlanish - dehqon javobi: bilmasa null, bilsa oraliq", () => {
  const cotton = cropById('cotton');
  assert.equal(salinityImpact(cotton, 'unknown'), null);
  const s = salinityImpact(cotton, 'high'); // 8..16 dS/m
  near(s.yieldPct[0], 100 - 5.2 * 0.3, 1e-9);
  near(s.yieldPct[1], 100 - 5.2 * 8.3, 1e-9);
});

// ---------- jadval yaxlitligi ----------

test('ekinlar jadvali: har bir qiymatda manba, jadval va sahifa bor', () => {
  assert.equal(CROPS.length, 6);
  for (const c of CROPS) {
    for (const s of [c.kc.src, c.gdd.tSrc, c.gdd.stagesSrc, c.salt.src]) {
      assert.ok(SOURCES[s.doc], `${c.id}: noma'lum manba ${s.doc}`);
      assert.ok(s.table && Number.isInteger(s.page) && s.row, `${c.id}: jadval/sahifa yo'q`);
      assert.equal(typeof s.verified, 'boolean');
    }
    if (!c.perennial) {
      assert.equal(c.gdd.stages.length, 4);
      assert.ok(c.gdd.stages.every((x) => x > 0));
      assert.match(c.sow, /^\d\d-\d\d$/);
    }
    assert.ok(c.gdd.tUpper > c.gdd.tBase);
  }
});

// ---------- mavsum simulyatsiyasi - sun'iy qator ----------

function synthetic({ years = [2001, 2002, 2003], frost = () => false } = {}) {
  // u2 = 2 va RHmin = 45% bo'lsin -> Kc moslash nolga teng (jadval qiymati o'zgarmaydi)
  const e = 0.45 * satVapPressure(30), l = Math.log(e / 0.6108);
  const tdew = (237.3 * l) / (17.27 - l);
  const days = [];
  for (const y of years) {
    for (let doy = 1; doy <= 365; doy++) {
      const t = new Date(Date.UTC(y, 0, doy));
      const date = `${y}${String(t.getUTCMonth() + 1).padStart(2, '0')}${String(t.getUTCDate()).padStart(2, '0')}`;
      days.push({ date, doy, tmax: 30, tmin: frost(y, doy) ? -1 : 10, tdew, u2: 2, rain: 0, et0: 5 });
    }
  }
  return days;
}

test('mavsum: piyoz, o\'rtacha 20 °C -> 15.5 GDD/kun, bosqichlar 30/30/57/31 kun', () => {
  const days = synthetic();
  const onion = cropById('onion');
  const s = simulateSeason(days, days.findIndex((d) => d.date === '20010301'), onion);
  assert.equal(s.status, 'mature');
  assert.deepEqual(stageLengths(s), [30, 30, 57, 31]);
});

test("baholash: suv talabi qo'lda hisoblangan qiymatga teng, ehtimol yillardan sanaladi", () => {
  // 2002 yilda 19-iyul (doy 200) sovuq - piyoz pishmay qoladi (pishish doy 207)
  const days = synthetic({ frost: (y, doy) => y === 2002 && doy === 200 });
  const r = evaluateCrop(days, cropById('onion'), { sow: '03-01' });
  assert.equal(r.seasons, 3);
  assert.equal(r.ripen.matured, 2);
  assert.equal(r.ripen.frostBeforeMaturity, 1);
  assert.equal(r.ripen.maturity.median, '07-26'); // 1-mart + 147 kun
  // Kc yig'indisi: 30x0.70 + 26.425 (rivojlanish) + 57x1.05 + 26.95 (kech) = 134.225; x 5 mm
  near(r.years[0].etcMm, 671.125, 0.01);
  assert.equal(r.water.m3ha.median, 6710);
  assert.equal(r.heat.days.median, 0); // o'rtacha 20 °C < Tupper 35 °C
  assert.equal(r.spoilage.driver, 'heat');
  assert.equal(r.spoilage.hotYears, 2); // o'rtacha Tmax 30 >= 30
  assert.equal(r.spoilage.level, 'high');
});

test("ma'lumot yetishmasa yil hisobga olinmaydi (to'ldirilmaydi)", () => {
  const days = synthetic();
  days[100].tmin = null; // 2001-04-11
  const r = evaluateCrop(days, cropById('onion'), { sow: '03-01' });
  assert.equal(r.seasons, 2);
  assert.equal(r.years.find((y) => y.year === 2001).status, 'missing');
});

test('beda: -4 °C mavsumi va GDD sikllari', () => {
  const days = synthetic({ years: [2001], frost: (y, doy) => doy === 40 || doy === 320 });
  // tmin -1 > -4 => mavsum butun yil; GDD = 365 x min(20,30) = 7300
  const r = evaluateCrop(days, cropById('alfalfa'));
  assert.equal(r.ripen.applicable, false);
  assert.equal(r.ripen.seasonDays, 365);
  assert.equal(r.ripen.cuttings.high, 1 + Math.floor((7300 - 850) / 530));
  assert.equal(r.ripen.cuttings.low, 1 + Math.floor((7300 - 940) / 820));
  near(r.water.etcMm, 1.05 * 5 * 365, 1);
});

test('yordamchilar', () => {
  assert.equal(addDaysMMDD('03-01', 147), '07-26');
  assert.equal(addDaysMMDD('12-25', 10), '01-04');
  assert.equal(percentile([1, 2, 3, 4], 0.5), 2.5);
  assert.equal(percentile([], 0.5), null);
});
