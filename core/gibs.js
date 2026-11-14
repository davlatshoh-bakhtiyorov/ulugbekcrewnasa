// NASA GIBS (Global Imagery Browse Services) xarita qatlamlari va ularni raqamga aylantirish.
// Har bir qatlam - rasm (WMTS tayl). GIBS har bir qatlam uchun rasmiy rang shkalasini (colormap)
// e'lon qiladi: har bir rang aniq bir qiymat oralig'iga mos. Shu sababli tayl pikselining rangidan
// qiymat sinfini qaytarib olamiz (masalan, SMAP: 0.165-0.168 m3/m3). Sof funksiyalar, brauzer va Node.

export const GIBS_WMTS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
export const GIBS_COLORMAPS = 'https://gibs.earthdata.nasa.gov/colormaps/v1.3';
export const GIBS_CAPABILITIES = `${GIBS_WMTS}/1.0.0/WMTSCapabilities.xml`;

/**
 * Ilovadagi NASA qatlamlari. z = GIBS bergan eng katta tayl darajasi (GoogleMapsCompatible_LevelN),
 * undan yaqinlashganda tayl kattalashtiriladi (asl aniqlik saqlanadi, yangi detal paydo bo'lmaydi).
 * view = qatlam ochilganda xarita shundan yaqin bo'lsa, shu darajagacha uzoqlashadi (9 km piksel ekranni
 * to'ldirib, bir xil rangga aylanmasligi uchun).
 * frames: 'monthly' - oxirgi n oyning har biridan eng so'nggi sana; 'yearly' - har yil shu oydagi sana.
 * offset: rang shkalasidagi qiymatga qo'shiladi (LST kelvinda keladi -> °C).
 */
export const NASA_LAYERS = [
  {
    key: 'ndvi',
    id: 'MODIS_Terra_L3_NDVI_16Day',
    colormap: 'MODIS_L3_NDVI',
    z: 9,
    view: 12,
    unit: '',
    digits: 2,
    legend: { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] },
    frames: { kind: 'monthly', n: 12 },
    series: { kind: 'recent', months: 36 }, // dala pasporti: so'nggi 3 mavsum, har bir 16 kunlik kadr
    step: '16d',
    res: '250 m',
    product: 'MODIS Terra MOD13Q1 v061 NDVI',
    cmr: 'MOD13Q1',
  },
  {
    key: 'soil',
    id: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture',
    colormap: 'SMAP_Analyzed_Soil_Moisture',
    z: 6,
    view: 8,
    unit: 'm³/m³',
    digits: 3, // shkala qadami 0.002-0.003 m3/m3
    legend: { min: 0, max: 0.5, ticks: [0, 0.1, 0.2, 0.3, 0.4, 0.5] },
    frames: { kind: 'monthly', n: 12 },
    series: { kind: 'sameDay', fromYear: 2015, tolDays: 3 }, // dala pasporti: bugun va oldingi yillarning shu kuni
    step: '1d',
    res: '9 km',
    product: 'SMAP L4 SPL4SMAU v008',
    cmr: 'SPL4SMAU',
  },
  {
    key: 'heat',
    id: 'MODIS_Terra_L3_Land_Surface_Temp_8Day_Day',
    colormap: 'MODIS_Land_Surface_Temp',
    z: 7,
    view: 9,
    unit: '°C',
    offset: -273.15,
    digits: 0,
    legend: { min: -10, max: 70, ticks: [-10, 10, 30, 50, 70] },
    frames: { kind: 'monthly', n: 12 },
    step: '8d',
    res: '1 km',
    product: 'MODIS Terra MOD11A2 v061 LST, day',
    cmr: 'MOD11A2',
  },
  {
    key: 'water',
    id: 'GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI',
    colormap: 'GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI',
    z: 6,
    view: 5,
    unit: 'cm',
    digits: 0,
    legend: { min: -30, max: 30, ticks: [-30, -15, 0, 15, 30], ends: ['less_water', 'more_water'] },
    frames: { kind: 'yearly', month: 7 },
    step: '1m',
    res: '~300 km',
    product: 'GRACE/GRACE-FO JPL Mascon RL06 v02 (CRI)',
    cmr: 'TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06_V2',
  },
];

export const layerByKey = (k) => NASA_LAYERS.find((l) => l.key === k) ?? null;

// ---------------- tayl manzili va koordinatalar ----------------

export function tileUrl(layer, date, z, x, y) {
  return `${GIBS_WMTS}/${layer.id}/default/${date}/GoogleMapsCompatible_Level${layer.z}/${z}/${y}/${x}.png`;
}

/** Leaflet uchun shablon: {z}/{y}/{x} */
export const tileTemplate = (layer, date) =>
  `${GIBS_WMTS}/${layer.id}/default/${date}/GoogleMapsCompatible_Level${layer.z}/{z}/{y}/{x}.png`;

/** Web Mercator: (lat, lon, z) -> tayl (tx, ty) va uning ichidagi piksel (px, py), 256 px tayl */
export function lonLatToTilePixel(lat, lon, z) {
  const n = 256 * 2 ** z;
  const phi = (Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI) / 180;
  const gx = ((lon + 180) / 360) * n;
  const gy = ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * n;
  const tx = Math.floor(gx / 256), ty = Math.floor(gy / 256);
  return { tx, ty, px: Math.floor(gx - tx * 256), py: Math.floor(gy - ty * 256) };
}

// ---------------- rang shkalasi ----------------

const num = (s) => (/^[+-]?INF$/i.test(s.trim()) ? null : Number(s));

/**
 * GIBS colormap XML (v1.3) -> { units, entries: [[r, g, b, lo, hi], ...] }.
 * Shaffof va "nodata" yozuvlar tashlanadi; ochiq chegaralar (-INF, +INF) null bo'ladi.
 * Bir xil rang bir nechta oraliqqa berilgan bo'lsa, oraliqlar birlashtiriladi.
 */
export function parseColormap(xml) {
  let units = '';
  const out = new Map();
  for (const m of xml.matchAll(/<ColorMap\b([^>]*)>([\s\S]*?)<\/ColorMap>/g)) {
    const u = m[1].match(/units="([^"]*)"/);
    if (u && !units) units = u[1];
    for (const e of m[2].matchAll(/<ColorMapEntry\b([^>]*)\/?>/g)) {
      const a = e[1];
      if (/transparent="true"/.test(a) || /nodata="true"/.test(a)) continue;
      const rgb = a.match(/rgb="(\d+),(\d+),(\d+)"/);
      const val = a.match(/\svalue="([[(])([^,\]]+)(?:,([^)\]]+))?[)\]]"/);
      if (!rgb || !val) continue;
      const lo = num(val[2]);
      const hi = val[3] == null ? lo : num(val[3]);
      const key = `${rgb[1]},${rgb[2]},${rgb[3]}`;
      const prev = out.get(key);
      if (!prev) out.set(key, [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), lo, hi]);
      else {
        prev[3] = prev[3] == null || lo == null ? null : Math.min(prev[3], lo);
        prev[4] = prev[4] == null || hi == null ? null : Math.max(prev[4], hi);
      }
    }
  }
  const entries = [...out.values()];
  // Ba'zi shkalalarda chekka sinf aslida ochiq ("< 200 K" = [0.02, 200)). Odatdagidan 20 baravar keng
  // chekka sinf ochiq chegara sifatida olinadi, aks holda o'rtasi (100 K) noto'g'ri qiymat beradi.
  const widths = entries.filter((e) => e[3] != null && e[4] != null).map((e) => e[4] - e[3]).sort((a, b) => a - b);
  const med = widths[Math.floor(widths.length / 2)];
  if (med > 0) {
    const finite = entries.filter((e) => e[3] != null && e[4] != null);
    const lowest = finite.reduce((a, e) => (e[3] < a[3] ? e : a), finite[0]);
    const highest = finite.reduce((a, e) => (e[4] > a[4] ? e : a), finite[0]);
    if (lowest && lowest[4] - lowest[3] > 20 * med) lowest[3] = null;
    if (highest && highest[4] - highest[3] > 20 * med) highest[4] = null;
  }
  return { units, entries };
}

/** Qidiruv jadvali: "r,g,b" -> [lo, hi] */
export function colormapIndex(entries) {
  const idx = new Map();
  for (const [r, g, b, lo, hi] of entries) idx.set((r << 16) | (g << 8) | b, [lo, hi]);
  return { idx, entries };
}

/**
 * Piksel rangi -> qiymat sinfi. Shaffof (a < 255) = ma'lumot yo'q (bulut, suv, qamrovdan tashqari).
 * Avval aniq moslik; bo'lmasa eng yaqin rang, lekin faqat juda kichik farqda (brauzer rang boshqaruvi
 * 1-2 birlik siljitishi mumkin). Topilmasa null - "noma'lum", taxmin qilinmaydi.
 */
export function decodeColor(cm, r, g, b, a = 255, tol = 4) {
  if (a < 255) return null;
  const hit = cm.idx.get((r << 16) | (g << 8) | b);
  let range = hit;
  if (!range) {
    let best = null, bd = Infinity;
    for (const e of cm.entries) {
      const d = Math.max(Math.abs(e[0] - r), Math.abs(e[1] - g), Math.abs(e[2] - b));
      if (d < bd) { bd = d; best = e; }
    }
    if (!best || bd > tol) return null;
    range = [best[3], best[4]];
  }
  const [lo, hi] = range;
  if (lo == null && hi == null) return null;
  if (lo == null) return { lo, hi, value: hi, bound: '<' };
  if (hi == null) return { lo, hi, value: lo, bound: '≥' };
  return { lo, hi, value: (lo + hi) / 2, bound: null };
}

/** Qatlam birligiga o'tkazish (masalan K -> °C) */
export function applyOffset(layer, v) {
  if (v == null) return null;
  const o = layer.offset ?? 0;
  return {
    ...v,
    lo: v.lo == null ? null : v.lo + o,
    hi: v.hi == null ? null : v.hi + o,
    value: v.value + o,
  };
}

/** Legenda uchun: qiymat -> rang (oraliqqa tushgan yozuv) */
export function colorAt(entries, v) {
  for (const [r, g, b, lo, hi] of entries) {
    if ((lo == null || v >= lo) && (hi == null || v < hi)) return [r, g, b];
  }
  return null;
}

// ---------------- vaqt o'lchami ----------------

const iso = (d) => d.toISOString().slice(0, 10);

/**
 * WMTS <Dimension> qiymatlari ("2026-01-01/2026-10-16/P16D", "2022-07-01") -> saralangan sanalar.
 * Davr: PnD yoki PnM (PnY ham). Oxiri boshidan oldin bo'lsa - faqat boshlanish sanasi olinadi.
 */
export function expandDimension(values) {
  const set = new Set();
  for (const v of values) {
    const [a, b, p] = v.split('/');
    const start = new Date(`${a.slice(0, 10)}T00:00:00Z`);
    if (!b || !p) { set.add(iso(start)); continue; }
    const end = new Date(`${b.slice(0, 10)}T00:00:00Z`);
    const m = p.match(/^P(\d+)([DMY])$/);
    if (!m || end < start) { set.add(iso(start)); continue; }
    const n = Number(m[1]);
    for (let d = new Date(start), i = 0; d <= end && i < 20000; i++) {
      set.add(iso(d));
      if (m[2] === 'D') d.setUTCDate(d.getUTCDate() + n);
      else if (m[2] === 'M') d.setUTCMonth(d.getUTCMonth() + n);
      else d.setUTCFullYear(d.getUTCFullYear() + n);
    }
  }
  return [...set].sort();
}

/**
 * Animatsiya kadrlari.
 * monthly: eng so'nggi sana oyidan orqaga n oy; har oydan shu oydagi eng so'nggi mavjud sana.
 * yearly: har yil berilgan oydagi birinchi mavjud sana (yo'q yil tashlab ketiladi).
 */
export function pickFrames(dates, rule) {
  if (!dates.length) return [];
  if (rule.kind === 'monthly') {
    const last = dates[dates.length - 1];
    let y = Number(last.slice(0, 4)), mo = Number(last.slice(5, 7));
    const months = [];
    for (let i = 0; i < rule.n; i++) {
      months.unshift(`${y}-${String(mo).padStart(2, '0')}`);
      if (--mo === 0) { mo = 12; y--; }
    }
    return months.map((ym) => dates.filter((d) => d.startsWith(ym)).pop()).filter(Boolean);
  }
  if (rule.kind === 'yearly') {
    const mm = String(rule.month).padStart(2, '0');
    const byYear = new Map();
    for (const d of dates) if (d.slice(5, 7) === mm && !byYear.has(d.slice(0, 4))) byYear.set(d.slice(0, 4), d);
    return [...byYear.values()].sort();
  }
  throw new Error(`unknown frame rule ${rule.kind}`);
}

const dayNum = (d) => Date.parse(`${d}T00:00:00Z`) / 86400000;

/**
 * Pasport qatorlari.
 * recent: eng so'nggi sanadan orqaga `months` oy ichidagi barcha sanalar.
 * sameDay: har yil (fromYear dan) eng so'nggi sana bilan bir xil oy-kunga eng yaqin sana (± tolDays);
 *          oxirgi element - eng so'nggi sananing o'zi.
 */
export function pickSeries(dates, rule) {
  if (!dates.length) return [];
  const last = dates[dates.length - 1];
  if (rule.kind === 'recent') {
    const [y, m, d] = last.split('-').map(Number);
    const from = new Date(Date.UTC(y, m - 1 - rule.months, d)).toISOString().slice(0, 10);
    return dates.filter((x) => x > from);
  }
  if (rule.kind === 'sameDay') {
    const md = last.slice(5), y1 = Number(last.slice(0, 4));
    const out = [];
    for (let y = rule.fromYear; y < y1; y++) {
      const target = dayNum(`${y}-${md}`);
      let best = null, bd = Infinity;
      for (const x of dates) {
        if (!x.startsWith(String(y))) continue;
        const dd = Math.abs(dayNum(x) - target);
        if (dd < bd) { bd = dd; best = x; }
      }
      if (best && bd <= rule.tolDays) out.push(best);
    }
    out.push(last);
    return out;
  }
  throw new Error(`unknown series rule ${rule.kind}`);
}

/** WMTSCapabilities.xml dan bitta qatlamning <Value> ro'yxati */
export function capabilityDates(capsXml, layerId) {
  const re = new RegExp(`<ows:Identifier>${layerId}</ows:Identifier>[\\s\\S]*?</Layer>`);
  const block = capsXml.match(re)?.[0];
  if (!block) return null;
  const dim = block.match(/<Dimension>[\s\S]*?<\/Dimension>/)?.[0] ?? '';
  return [...dim.matchAll(/<Value>([^<]+)<\/Value>/g)].map((m) => m[1]);
}
