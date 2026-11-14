// Dala pasporti: NASA qatorlaridan dala haqida qisqa xulosalar. Sof funksiyalar.
//  - NDVI (MODIS MOD13Q1) qatoridan "yashil davrlar" - dalada nechta ekin o'sgani (taxminan)
//  - SMAP L4 ildiz zonasi namligi: bugun va oldingi yillarning shu kuni
//  - NASA POWER: iqlim siljishi (core/agro.js climateShift ustida)

/**
 * Yashil davr qoidasi (jamoa qoidasi, agronom tekshirmagan): NDVI >= on bo'lganda davr boshlanadi,
 * NDVI < off ga tushganda tugaydi (ikki chegara - kichik tebranish ikkita davr bo'lib qolmasligi uchun).
 * Yig'imdan keyin NDVI keskin tushadi, shu sabab har bir davr taxminan bitta ekin.
 */
export const GREEN_RULE = {
  on: 0.5,
  off: 0.4,
  verified: false,
  note: 'Green period: starts when NDVI >= 0.5, ends when NDVI < 0.4 (hysteresis). Team rule, not reviewed by an agronomist.',
};

/** series: [{date, value|null}] (sana bo'yicha) -> [{start, end, peakDate, peak, openStart, openEnd}] */
export function greenPeriods(series, rule = GREEN_RULE) {
  const out = [];
  let cur = null, first = true;
  for (const p of series) {
    if (p.value == null) continue;
    if (!cur) {
      if (p.value >= rule.on) cur = { start: p.date, end: p.date, peakDate: p.date, peak: p.value, openStart: first, openEnd: false };
    } else if (p.value < rule.off) {
      out.push(cur);
      cur = null;
    } else {
      cur.end = p.date;
      if (p.value > cur.peak) { cur.peak = p.value; cur.peakDate = p.date; }
    }
    first = false;
  }
  if (cur) out.push({ ...cur, openEnd: true });
  return out;
}

/**
 * Yillar bo'yicha: davr eng yashil nuqtasi tushgan yilga yoziladi.
 * Qator to'liq qamramagan yillar `partial` belgilanadi (masalan, qator noyabrdan boshlansa).
 */
export function periodsByYear(periods, series) {
  const dates = series.map((p) => p.date);
  const y0 = Number(dates[0].slice(0, 4)), y1 = Number(dates[dates.length - 1].slice(0, 4));
  const out = [];
  for (let y = y0; y <= y1; y++) {
    const inYear = dates.filter((d) => d.startsWith(String(y)));
    const ps = periods.filter((p) => p.peakDate.startsWith(String(y)));
    out.push({
      year: y,
      count: ps.length,
      periods: ps,
      from: inYear[0] ?? null,
      to: inYear[inYear.length - 1] ?? null,
      // yanvar boshidan noyabrgacha qamrab olgan yil "to'liq" hisoblanadi
      partial: !inYear.length || inYear[0].slice(5) > '01-31' || inYear[inYear.length - 1].slice(5) < '10-01',
    });
  }
  return out;
}

/** "Shu kun" taqqoslash. points: [{date, value|null}], oxirgisi - bugun. */
export function sameDayCompare(points) {
  if (!points.length) return null;
  const today = points[points.length - 1];
  const past = points.slice(0, -1).filter((p) => p.value != null);
  if (today.value == null || !past.length) return { today, past, median: null, wetter: null, drier: null, of: past.length };
  const vals = past.map((p) => p.value).sort((a, b) => a - b);
  const mid = Math.floor(vals.length / 2);
  const median = vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
  const eps = 1e-9;
  return {
    today,
    past,
    median,
    wetter: past.filter((p) => p.value > today.value + eps).length,
    drier: past.filter((p) => p.value < today.value - eps).length,
    of: past.length,
    from: past[0].date.slice(0, 4),
    to: past[past.length - 1].date.slice(0, 4),
  };
}

/** Yil kuni (1..366, kabisa bo'lmagan yil) -> 'MM-DD' */
export function doyToMMDD(doy) {
  if (doy == null) return null;
  return new Date(Date.UTC(2001, 0, Math.round(doy))).toISOString().slice(5, 10);
}
