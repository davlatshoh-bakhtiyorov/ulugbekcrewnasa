// Agro-hisoblar: FAO-56 Penman-Monteith ET0, GDD, sovuq va jazirama statistikasi.
// Sof funksiyalar - brauzerda ham, Node'da ham (Telegram bot) bir xil ishlaydi.
// Manba: Allen et al. (1998), FAO Irrigation and Drainage Paper 56.

const SIGMA = 4.903e-9; // Stefan-Boltzmann, MJ K^-4 m^-2 kun^-1

/** To'yingan bug' bosimi e°(T), kPa (FAO-56, 11-tenglama) */
export function satVapPressure(tC) {
  return 0.6108 * Math.exp((17.27 * tC) / (tC + 237.3));
}

/** 'YYYYMMDD' -> yil kuni (1..366) */
export function dayOfYear(yyyymmdd) {
  const y = +yyyymmdd.slice(0, 4), m = +yyyymmdd.slice(4, 6), d = +yyyymmdd.slice(6, 8);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
}

/** Atmosferadan tashqari radiatsiya Ra, MJ/m2/kun (FAO-56, 21-tenglama) */
export function extraterrestrialRadiation(latDeg, doy) {
  const phi = (latDeg * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * doy) / 365);
  const delta = 0.409 * Math.sin((2 * Math.PI * doy) / 365 - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta))));
  return ((24 * 60) / Math.PI) * 0.082 * dr *
    (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws));
}

/**
 * Etalon evapotranspiratsiya ET0, mm/kun (FAO-56 Penman-Monteith, 6-tenglama).
 * tmax, tmin - °C; tdew - shudring nuqtasi °C (yoki ea - kPa to'g'ridan-to'g'ri);
 * rs - quyosh radiatsiyasi MJ/m2/kun; u2 - 2 m dagi shamol m/s; lat - gradus; elev - m.
 * Kerakli qiymat yo'q bo'lsa null qaytaradi (taxmin qilmaydi).
 */
export function et0PenmanMonteith({ tmax, tmin, tdew, ea, rs, u2, lat, elev = 0, doy }) {
  if ([tmax, tmin, rs, u2, lat, doy].some((v) => v == null || Number.isNaN(v))) return null;
  if (ea == null) {
    if (tdew == null || Number.isNaN(tdew)) return null;
    ea = satVapPressure(tdew);
  }
  const t = (tmax + tmin) / 2;
  const P = 101.3 * Math.pow((293 - 0.0065 * elev) / 293, 5.26);
  const gamma = 0.000665 * P;
  const es = (satVapPressure(tmax) + satVapPressure(tmin)) / 2;
  const slope = (4098 * satVapPressure(t)) / Math.pow(t + 237.3, 2);
  const ra = extraterrestrialRadiation(lat, doy);
  const rso = (0.75 + 2e-5 * elev) * ra;
  const rns = 0.77 * rs;
  const rel = rso > 0 ? Math.max(0.3, Math.min(1, rs / rso)) : 0.3;
  const rnl = SIGMA * ((Math.pow(tmax + 273.16, 4) + Math.pow(tmin + 273.16, 4)) / 2) *
    (0.34 - 0.14 * Math.sqrt(ea)) * (1.35 * rel - 0.35);
  const rn = rns - rnl;
  const et0 = (0.408 * slope * rn + gamma * (900 / (t + 273)) * u2 * Math.max(0, es - ea)) /
    (slope + gamma * (1 + 0.34 * u2));
  return Math.max(0, et0);
}

/** Bir kunlik samarali harorat (GDD), yuqori chegara bilan */
export function gddDay(tmax, tmin, base, upper = 30) {
  if (tmax == null || tmin == null) return null;
  const t = Math.min((tmax + tmin) / 2, upper);
  return Math.max(0, t - base);
}

/** Kunlik qatorga ET0 qo'shadi. days: [{date, doy, tmax, tmin, tdew, u2, rs}] */
export function addEt0(days, { lat, elev }) {
  for (const d of days) d.et0 = et0PenmanMonteith({ ...d, lat, elev });
  return days;
}

const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

/**
 * Yillik ko'rsatkichlar (shimoliy yarim shar uchun).
 * Qaytaradi: [{year, lastSpringFrost, firstAutumnFrost, frostFree, heatDays, jjaTmax,
 *              et0AprSep, rainYear, gdd10, complete}]
 */
export function yearlyStats(days, { heatThreshold = 38, frostThreshold = 0 } = {}) {
  const byYear = new Map();
  for (const d of days) {
    const y = +d.date.slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(d);
  }
  const out = [];
  for (const [year, ds] of [...byYear].sort((a, b) => a[0] - b[0])) {
    let lastSpring = null, firstAutumn = null, heat = 0, rain = 0, gdd = 0;
    let et0 = 0, et0n = 0, et0need = 0;
    const jja = [];
    let valid = 0;
    for (const d of ds) {
      if (d.tmin == null || d.tmax == null) continue;
      valid++;
      if (d.tmin <= frostThreshold) {
        if (d.doy < 182) lastSpring = d.doy;
        else if (firstAutumn == null) firstAutumn = d.doy;
      }
      if (d.tmax >= heatThreshold) heat++;
      if (d.rain != null) rain += d.rain;
      if (d.doy >= 91 && d.doy <= 304) gdd += gddDay(d.tmax, d.tmin, 10);
      if (d.doy >= 152 && d.doy <= 243) jja.push(d.tmax);
      if (d.doy >= 91 && d.doy <= 273) {
        et0need++;
        if (d.et0 != null) { et0 += d.et0; et0n++; }
      }
    }
    const complete = valid >= 360;
    out.push({
      year,
      complete,
      lastSpringFrost: lastSpring,
      firstAutumnFrost: firstAutumn,
      // Kuzgi sovuq yil oxirigacha bo'lmasa, mavsum 31-dekabrgacha deb olinadi
      frostFree: (firstAutumn ?? 366) - (lastSpring ?? 0),
      heatDays: heat,
      jjaTmax: mean(jja),
      // 5% dan ko'p kun yetishmasa, yig'indi berilmaydi
      et0AprSep: et0need && et0n / et0need >= 0.95 ? (et0 / et0n) * et0need : null,
      rainYear: rain,
      gdd10: gdd,
    });
  }
  return out;
}

/** Ikki davr o'rtachasini solishtiradi: [y0,y1] oralig'idagi to'liq yillar */
export function periodMeans(stats, y0, y1) {
  const s = stats.filter((r) => r.year >= y0 && r.year <= y1 && r.complete);
  const avg = (k) => mean(s.map((r) => r[k]).filter((v) => v != null));
  return {
    years: s.length,
    lastSpringFrost: avg('lastSpringFrost'),
    firstAutumnFrost: avg('firstAutumnFrost'),
    frostFree: avg('frostFree'),
    heatDays: avg('heatDays'),
    jjaTmax: avg('jjaTmax'),
    et0AprSep: avg('et0AprSep'),
    rainYear: avg('rainYear'),
    gdd10: avg('gdd10'),
  };
}

/** Chiziqli trend: 10 yilga o'zgarish (eng kichik kvadratlar) */
export function trendPerDecade(stats, key) {
  const pts = stats.filter((r) => r.complete && r[key] != null).map((r) => [r.year, r[key]]);
  if (pts.length < 10) return null;
  const mx = mean(pts.map((p) => p[0])), my = mean(pts.map((p) => p[1]));
  let sxy = 0, sxx = 0;
  for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; }
  return (sxy / sxx) * 10;
}

export function climateShift(stats, early = [1985, 2004], late = [2006, 2025]) {
  return {
    early: { range: early, ...periodMeans(stats, ...early) },
    late: { range: late, ...periodMeans(stats, ...late) },
    trend: {
      heatDays: trendPerDecade(stats, 'heatDays'),
      jjaTmax: trendPerDecade(stats, 'jjaTmax'),
      frostFree: trendPerDecade(stats, 'frostFree'),
      et0AprSep: trendPerDecade(stats, 'et0AprSep'),
    },
  };
}
