import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { greenPeriods, periodsByYear, sameDayCompare, doyToMMDD } from '../core/field.js';
import { pickSeries } from '../core/gibs.js';

// Namuna dala (37.5021, 67.3888), MOD13Q1 NDVI, GIBS tayllaridan Python+PIL bilan o'qilgan (14-noyabr)
const DEMO = [
  ['2025-11-17', 0.16], ['2025-12-19', 0.26], ['2026-01-17', 0.08], ['2026-02-18', 0.51], ['2026-03-22', 0.69],
  ['2026-04-23', 0.71], ['2026-05-25', 0.27], ['2026-06-26', 0.33], ['2026-07-28', 0.75], ['2026-08-29', 0.75],
  ['2026-09-30', 0.40], ['2026-10-16', 0.24],
].map(([date, value]) => ({ date, value }));

test('green periods: winter crop then second crop at the demo field', () => {
  const p = greenPeriods(DEMO);
  assert.equal(p.length, 2);
  assert.deepEqual([p[0].start, p[0].end, p[0].peakDate, p[0].peak], ['2026-02-18', '2026-04-23', '2026-04-23', 0.71]);
  assert.deepEqual([p[1].start, p[1].end, p[1].peakDate], ['2026-07-28', '2026-09-30', '2026-07-28']);
  assert.equal(p[1].openEnd, false);
});

test('green periods: hysteresis ignores a small dip; missing values are skipped; open ends flagged', () => {
  const s = [0.55, 0.45, 0.6, null, 0.3, 0.52].map((value, i) => ({ date: `2024-0${i + 1}-01`, value }));
  const p = greenPeriods(s);
  assert.equal(p.length, 2);
  assert.equal(p[0].openStart, true, 'series starts already green');
  assert.equal(p[0].peak, 0.6);
  assert.equal(p[1].openEnd, true, 'series ends while still green');
});

test('periods are counted in the year of their peak; partial years flagged', () => {
  const by = periodsByYear(greenPeriods(DEMO), DEMO);
  assert.deepEqual(by.map((y) => [y.year, y.count, y.partial]), [[2025, 0, true], [2026, 2, false]]);
});

test('same-day comparison: today vs earlier years', () => {
  const pts = [0.05, 0.02, null, 0.08, 0.03].map((value, i) => ({ date: `${2021 + i}-11-10`, value }));
  const c = sameDayCompare(pts);
  assert.equal(c.of, 3);
  assert.equal(c.median, 0.05);
  assert.deepEqual([c.wetter, c.drier], [2, 1]);
  assert.equal(sameDayCompare([{ date: '2026-11-10', value: null }, ...pts]).of, 3);
  assert.equal(sameDayCompare([...pts.slice(0, 4), { date: '2025-11-10', value: null }]).median, null, 'no value today -> no comparison');
});

test('day of year -> MM-DD (non-leap)', () => {
  assert.equal(doyToMMDD(74), '03-15');
  assert.equal(doyToMMDD(62), '03-03');
  assert.equal(doyToMMDD(null), null);
});

test('passport series picking: last 36 months; same day each year within tolerance', () => {
  const dates = ['2023-10-10', '2023-11-17', '2025-06-01', '2026-10-16'];
  assert.deepEqual(pickSeries(dates, { kind: 'recent', months: 36 }), ['2023-11-17', '2025-06-01', '2026-10-16']);
  const daily = ['2015-11-09', '2016-11-20', '2017-11-12', '2026-11-10'];
  assert.deepEqual(pickSeries(daily, { kind: 'sameDay', fromYear: 2015, tolDays: 3 }), ['2015-11-09', '2017-11-12', '2026-11-10']);
  const data = JSON.parse(readFileSync(new URL('../web/data/gibs-layers.json', import.meta.url)));
  assert.ok(data.layers.ndvi.series.length >= 60, 'about 69 sixteen-day frames in 3 years');
  assert.equal(data.layers.soil.series.at(-1), data.layers.soil.frames.at(-1), 'same-day series ends today');
});
