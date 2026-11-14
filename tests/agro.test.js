import test from 'node:test';
import assert from 'node:assert/strict';
import {
  satVapPressure, dayOfYear, extraterrestrialRadiation, et0PenmanMonteith,
  gddDay, yearlyStats, periodMeans, trendPerDecade,
} from '../core/agro.js';
import { parsePower, powerUrl } from '../core/power.js';

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b} (±${tol})`);

test("to'yingan bug' bosimi - FAO-56 3-misol", () => {
  near(satVapPressure(24.5), 3.075, 0.002);
  near(satVapPressure(15), 1.705, 0.002);
});

test('yil kuni', () => {
  assert.equal(dayOfYear('20260101'), 1);
  assert.equal(dayOfYear('20260706'), 187);
  assert.equal(dayOfYear('20241231'), 366);
});

test('Ra - FAO-56 8-misol (20°J, 3-sentabr) va 18-misol (Bryussel, 6-iyul)', () => {
  near(extraterrestrialRadiation(-20, 246), 32.2, 0.1);
  near(extraterrestrialRadiation(50.8, 187), 41.09, 0.1);
});

test('ET0 - FAO-56 18-misol: Bryussel, 6-iyul = 3.9 mm/kun', () => {
  const et0 = et0PenmanMonteith({
    tmax: 21.5, tmin: 12.3, ea: 1.409, rs: 22.07, u2: 2.078, lat: 50.8, elev: 100, doy: 187,
  });
  near(et0, 3.88, 0.05);
});

test("ET0 - kerakli qiymat yo'q bo'lsa null (taxmin qilmaydi)", () => {
  assert.equal(et0PenmanMonteith({ tmax: 30, tmin: 15, tdew: 5, rs: null, u2: 2, lat: 38, doy: 180 }), null);
});

test('GDD', () => {
  assert.equal(gddDay(30, 20, 10), 15);
  assert.equal(gddDay(8, 2, 10), 0);
  assert.equal(gddDay(44, 30, 10, 30), 20); // yuqori chegara 30°C
});

test('POWER javobini tahlil qilish: -999 -> null', () => {
  const json = {
    geometry: { coordinates: [67.42, 37.51, 417.48] },
    header: { fill_value: -999, sources: ['MERRA2'] },
    properties: { parameter: {
      T2M_MAX: { 20260701: 39.92, 20260702: 35.56 }, T2M_MIN: { 20260701: 23.96, 20260702: 24.08 },
      T2MDEW: { 20260701: 5.5, 20260702: 7.97 }, WS2M: { 20260701: 2.85, 20260702: 4.27 },
      ALLSKY_SFC_SW_DWN: { 20260701: 27.8, 20260702: -999 }, PRECTOTCORR: { 20260701: 0, 20260702: 0.03 },
    } },
  };
  const p = parsePower(json);
  assert.equal(p.elev, 417.48);
  assert.equal(p.days.length, 2);
  assert.equal(p.days[0].doy, 182);
  assert.equal(p.days[1].rs, null);
  assert.ok(powerUrl({ lat: 37.51, lon: 67.42, start: '20260701', end: '20260702' }).includes('community=AG'));
});

test('yillik statistika va trend - sun\'iy qator', () => {
  const days = [];
  for (let y = 2000; y < 2020; y++) {
    const n = y % 4 === 0 ? 366 : 365;
    for (let doy = 1; doy <= n; doy++) {
      const dt = new Date(Date.UTC(y, 0, doy));
      const date = `${y}${String(dt.getUTCMonth() + 1).padStart(2, '0')}${String(dt.getUTCDate()).padStart(2, '0')}`;
      // qish sovuq (60-kungacha va 320-kundan keyin), yoz issiq; har yili jazirama 1 kunga ko'payadi
      const frost = doy <= 60 || doy >= 320;
      const hot = doy >= 200 && doy < 200 + (y - 2000);
      days.push({ date, doy, tmin: frost ? -2 : 12, tmax: hot ? 40 : 25, rain: 1, et0: 5 });
    }
  }
  const st = yearlyStats(days);
  assert.equal(st.length, 20);
  assert.equal(st[0].lastSpringFrost, 60);
  assert.equal(st[0].firstAutumnFrost, 320);
  assert.equal(st[0].frostFree, 260);
  assert.equal(st[5].heatDays, 5);
  near(st[1].et0AprSep, 5 * 183, 0.001);
  near(trendPerDecade(st, 'heatDays'), 10, 1e-9);
  assert.equal(periodMeans(st, 2000, 2009).years, 10);
  near(periodMeans(st, 2000, 2009).heatDays, 4.5, 1e-9);
});
