// Namuna dala uchun NDVI qatori: GIBS MOD13Q1 (250 m, 16 kunlik) taylarini Node'da o'qib, rasmiy
// colormap bo'yicha raqamga aylantiradi (brauzerdagi web/nasa-map.js bilan bir xil usul).
// npm run field-ndvi  ->  site/data/field-ndvi.json  (sayt: hero izohlari va "dala yashilligi" egri chizig'i)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { decodePNG } from './png.js';
import { NASA_LAYERS, tileUrl, lonLatToTilePixel, colormapIndex, decodeColor, applyOffset } from '../core/gibs.js';

export const FIELD = { lat: 37.5021, lon: 67.3888, note: "Double-crop field near Jarqo'rg'on (demo point of the app)" };

const data = JSON.parse(await readFile('web/data/gibs-layers.json', 'utf8'));
const layer = NASA_LAYERS.find((l) => l.key === 'ndvi');
const info = data.layers.ndvi;
const cm = colormapIndex(info.entries);
const { tx, ty, px, py } = lonLatToTilePixel(FIELD.lat, FIELD.lon, layer.z);
const dates = [...new Set([...info.series, ...info.frames])].sort();

async function read(date) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(tileUrl(layer, date, layer.z, tx, ty));
      const actual = r.headers.get('layer-time-actual');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      if (!actual) return { date, actual: null, value: null, lo: null, hi: null, n9: 0, median9: null };
      const img = decodePNG(Buffer.from(await r.arrayBuffer()));
      const d = img.data, at = (x, y) => { const k = (y * img.width + x) * 4; return applyOffset(layer, decodeColor(cm, d[k], d[k + 1], d[k + 2], d[k + 3])); };
      const v = at(px, py);
      const nb = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = px + dx, y = py + dy;
        if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
        const w = at(x, y); if (w) nb.push(w.value);
      }
      nb.sort((a, b) => a - b);
      return { date, actual, value: v ? +v.value.toFixed(3) : null, lo: v?.lo ?? null, hi: v?.hi ?? null, n9: nb.length, median9: nb.length ? +nb[Math.floor(nb.length / 2)].toFixed(3) : null };
    } catch (e) { if (attempt === 3) throw e; await new Promise((res) => setTimeout(res, 1500 * attempt)); }
  }
}

const out = new Map();
let i = 0, done = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (i < dates.length) { const d = dates[i++]; out.set(d, await read(d)); if (++done % 20 === 0) console.log(`${done}/${dates.length}`); }
}));
const pick = (list) => list.map((d) => out.get(d));
const series = pick(info.series), frames = pick(info.frames);
const missing = series.filter((s) => s.value == null).length;
console.log(`series ${series.length} (no data: ${missing}), frames ${frames.length}`);
for (const s of frames) console.log(`  ${s.date} -> ${s.actual}  NDVI ${s.value}  (3x3 median ${s.median9})`);
await mkdir('site/data', { recursive: true });
await writeFile('site/data/field-ndvi.json', JSON.stringify({
  generated: new Date().toISOString().slice(0, 10),
  field: FIELD, product: layer.id, resolution: '250 m', step: '16-day', zoom: layer.z, tile: { tx, ty, px, py },
  colormap: layer.colormap,
  note: 'value = middle of the colour class of the official GIBS colormap at the 250 m pixel that contains the point (same decode as the app); median9 = median of the 3x3 pixels around it; null = no data (cloud, snow, no coverage). actual = date GIBS really served (layer-time-actual).',
  series, frames,
}, null, 1));
console.log('wrote site/data/field-ndvi.json');
