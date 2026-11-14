import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { advise, waterLight, soilLight, marketLight, ripenLight } from '../core/advisor.js';
import { cropById } from '../core/crops.js';

// Haqiqiy pilot natijasi (Jarqo'rg'on, NASA POWER 1984-2025, sho'r "medium") - npm run pilot
const pilot = JSON.parse(readFileSync(new URL('../docs/pilot-ekinlar-jarqorgon.json', import.meta.url)));
const R = Object.fromEntries(pilot.natijalar.map((r) => [r.cropId, r]));

test('suv svetofori: paxta (quruq yil 8 990 m3/ga) - yetarli/ba\'zan/kam', () => {
  assert.equal(R.cotton.water.m3ha.p80, 8990);
  assert.equal(waterLight(R.cotton, 'enough').level, 'green');
  assert.equal(waterLight(R.cotton, 'sometimes').level, 'yellow');
  assert.equal(waterLight(R.cotton, 'scarce').level, 'red');
  assert.equal(waterLight(R.cotton, null).level, 'unknown');
});

test('tuproq svetofori: almashlab ekish qoidalari (sho\'rsiz)', () => {
  const noSalt = { salinity: null };
  assert.equal(soilLight(cropById('cotton'), 'cotton', noSalt).code, 'soil_same_crop');
  assert.equal(soilLight(cropById('mung_bean'), 'winter_wheat', noSalt).level, 'green');
  assert.equal(soilLight(cropById('cotton'), 'alfalfa', noSalt).code, 'soil_after_legume');
  assert.equal(soilLight(cropById('winter_wheat'), 'cotton', noSalt).level, 'yellow');
  assert.equal(soilLight(cropById('winter_wheat'), null, noSalt).code, 'soil_last_unknown');
});

test("tuproq svetofori: sho'r yomonrog'ini oladi (piyoz, o'rtacha sho'r -> qizil)", () => {
  const s = soilLight(cropById('onion'), 'winter_wheat', R.onion);
  assert.equal(s.rotation, 'yellow');
  assert.equal(s.salt.level, 'red');
  assert.equal(s.level, 'red');
});

test("bozor/isrof: piyoz yuqori xavf, beda noma'lum, narx hali yo'q", () => {
  assert.equal(marketLight(R.onion).level, 'red');
  assert.equal(marketLight(R.alfalfa).level, 'unknown');
  assert.equal(marketLight(R.cotton).price, null);
});

test("pishish: ko'p yillik beda - o'rim soni bilan", () => {
  assert.equal(ripenLight(R.alfalfa).code, 'ripen_perennial');
  const w = ripenLight(R.winter_wheat);
  assert.equal(w.level, 'green');
  assert.equal(w.of, 41);
});

test('tavsiya: paxtadan keyin, suv kam, sho\'r o\'rtacha -> bug\'doy, mosh, kartoshka', () => {
  const a = advise(pilot.natijalar, { lastCrop: 'cotton', water: 'scarce', salinity: 'medium' });
  assert.deepEqual(a.top.map((o) => o.cropId), ['winter_wheat', 'mung_bean', 'potato']);
  assert.equal(a.all.length, 6);
  assert.equal(a.rules.verified, false);
});

test("javoblar noma'lum bo'lsa ham ishlaydi, svetofor 'unknown'", () => {
  const a = advise(pilot.natijalar, { lastCrop: null, water: null, salinity: 'unknown' });
  assert.equal(a.top.length, 3);
  for (const o of a.all) assert.equal(o.lights.water.level, 'unknown');
});
