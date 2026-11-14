import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mcdDate, selectSeasons, gddToDate, calibrateCrop, calibratedCrop, pixelsFromBands, CAL_RULES } from '../core/calibrate.js';
import { CALIBRATION } from '../core/calibration.js';
import { cropById } from '../core/crops.js';

test('MCD12Q2 dates: days since 1970-01-01, 32767 = no value', () => {
  assert.equal(mcdDate(0), '1970-01-01');
  assert.equal(mcdDate(18779), '2021-06-01'); // 2021-01-01 = 18628
  assert.equal(mcdDate(32767), null);
  assert.equal(mcdDate(null), null);
});

test('ORNL grid -> pixel-years (row-major, scale applied, fill dropped)', () => {
  const band = (date, data) => ({ subset: [{ calendar_date: date, data }] });
  const px = pixelsFromBands({
    NumCycles: band('2021-01-01', [2, 32767]),
    'Greenup.Num_Modes_01': band('2021-01-01', [18670, 0]),
    'Dormancy.Num_Modes_01': band('2021-01-01', [18779, 0]),
    'EVI_Amplitude.Num_Modes_01': band('2021-01-01', [2300, 0]),
    'QA_Overall.Num_Modes_01': band('2021-01-01', [0, 0]),
  });
  assert.equal(px.length, 1);
  assert.deepEqual([px[0].year, px[0].px, px[0].cycles], [2021, 0, 2]);
  assert.equal(px[0].c[0].dormancy, '2021-06-01');
  assert.ok(Math.abs(px[0].c[0].amp - 0.23) < 1e-9);
  assert.equal(px[0].c[1].greenup, null, 'band not downloaded -> null, not a guess');
});

test('season selection: cycle count, amplitude, QA, months and year are all required', () => {
  const rule = CAL_RULES.crops.winter_wheat;
  const ok = { greenup: '2021-02-10', dormancy: '2021-06-02', midGreendown: '2021-05-17', amp: 0.23, qa: 0 };
  const P = (cycles, c, year = 2021) => ({ year, px: 1, cycles, c: [c, null] });
  assert.equal(selectSeasons([P(2, ok)], rule).length, 1);
  assert.equal(selectSeasons([P(1, ok)], rule).length, 0, 'single cycle is not wheat');
  assert.equal(selectSeasons([P(2, { ...ok, amp: 0.1 })], rule).length, 0, 'too little green: desert or sparse');
  assert.equal(selectSeasons([P(2, { ...ok, qa: 3 })], rule).length, 0, 'poor quality');
  assert.equal(selectSeasons([P(2, { ...ok, dormancy: '2021-08-20' })], rule).length, 0, 'ends outside May-July');
  assert.equal(selectSeasons([P(2, ok, 2022)], rule).length, 0, 'season must end in the product year');
  assert.equal(selectSeasons([P(2, ok)], rule)[0].end, '2021-06-02', 'wheat uses Dormancy');
  const cot = { greenup: '2021-04-20', midGreendown: '2021-10-11', dormancy: '2021-11-06', amp: 0.3, qa: 0 };
  assert.equal(selectSeasons([P(1, cot)], CAL_RULES.crops.cotton)[0].end, '2021-10-11', 'cotton uses MidGreendown');
});

// Doimiy harorat: Tmax 20, Tmin 10 -> o'rtacha 15 °C
const flat = (from, to) => {
  const m = new Map();
  for (let t = Date.parse(from); t <= Date.parse(to); t += 86400000) {
    const d = new Date(t).toISOString().slice(0, 10).replace(/-/g, '');
    m.set(d, { date: d, tmax: 20, tmin: 10 });
  }
  return m;
};

test('GDD from model sowing (previous autumn for winter wheat) to the observed end', () => {
  const wheat = cropById('winter_wheat'); // Tbase 0 -> 15 GDD/day, sow 10-15
  const days = flat('2020-10-01', '2021-07-01');
  const r = gddToDate(days, wheat, { end: '2021-06-02' });
  assert.equal(r.sow, '2020-10-15');
  assert.equal(r.days, 230);
  assert.equal(r.gdd, 231 * 15, 'both ends inclusive');
  days.delete('20210101');
  assert.equal(gddToDate(days, wheat, { end: '2021-06-02' }), null, 'a missing day gives null, never a filled gap');
});

test('calibration: median total, FAO stage shares kept, applied only where calibrated', () => {
  const cotton = cropById('cotton'); // Tbase 12.5 -> 2.5 GDD/day, sow 04-10
  const days = flat('2021-04-01', '2021-12-31');
  const seasons = ['2021-09-30', '2021-10-10', '2021-10-20'].map((end) => ({ year: 2021, px: end, end }));
  const c = calibrateCrop(cotton, seasons, days);
  const g = (end) => gddToDate(days, cotton, { end }).gdd;
  assert.equal(c.n, 3);
  assert.equal(c.total, Math.round(g('2021-10-10')));
  assert.equal(c.faoTotal, 2150);
  const share = (a) => a.map((x) => x / a.reduce((s, y) => s + y, 0));
  share(c.stages).forEach((x, i) => assert.ok(Math.abs(x - share(cotton.gdd.stages)[i]) < 0.002));
  const cal = { crops: { cotton: c } };
  assert.deepEqual(calibratedCrop(cotton, cal).gdd.stages, c.stages);
  assert.deepEqual(calibratedCrop(cotton, cal).gdd.faoStages, cotton.gdd.stages);
  assert.equal(calibratedCrop(cropById('onion'), cal), cropById('onion'), 'no calibration -> FAO crop unchanged');
  assert.equal(calibratedCrop(cotton, null), cotton);
});

test('shipped calibration: provenance and a model that hits the observed dates', () => {
  assert.equal(CALIBRATION.verified, false);
  assert.equal(CALIBRATION.source.doi, '10.5067/MODIS/MCD12Q2.061');
  for (const id of ['winter_wheat', 'cotton']) {
    const c = CALIBRATION.crops[id];
    assert.ok(c.n >= 100, `${id}: enough field-years`);
    assert.ok(c.p25 <= c.total && c.total <= c.p75);
    assert.ok(Math.abs(c.check.medianBiasDays) <= 7, `${id}: model maturity within a week of MODIS`);
    assert.ok(Math.abs(c.check.faoMedianBiasDays) > 30, `${id}: FAO default is more than a month early`);
  }
});
