// NASA GIBS qatlamlari uchun kadr sanalari va rang shkalalarini tayyorlaydi.
// npm run gibs  ->  web/data/gibs-layers.json
// Har bir kadr GIBS'dan tekshiriladi: tayl so'raladi va javobdagi layer-time-actual sarlavhasi
// so'ralgan sanaga teng bo'lishi kerak (aks holda kadr tashlanadi). Ma'lumot yangilanishi uchun qayta ishga tushiring.
import { writeFile, mkdir } from 'node:fs/promises';
import {
  NASA_LAYERS, GIBS_CAPABILITIES, GIBS_COLORMAPS, capabilityDates, expandDimension, pickFrames, pickSeries,
  parseColormap, tileUrl, lonLatToTilePixel,
} from '../core/gibs.js';

const PROBE = { lat: 37.5021, lon: 67.3888 }; // namuna dala (Jarqo'rg'on yonida, web/app.js DEMO)
const OUT = 'web/data/gibs-layers.json';

async function text(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

async function verify(layer, date) {
  const { tx, ty } = lonLatToTilePixel(PROBE.lat, PROBE.lon, layer.z);
  const r = await fetch(tileUrl(layer, date, layer.z, tx, ty));
  await r.arrayBuffer();
  const actual = r.headers.get('layer-time-actual')?.slice(0, 10) ?? null;
  return r.ok && actual === date ? null : `${date}: HTTP ${r.status}, actual ${actual}`;
}

const round = (v) => (v == null ? null : Math.round(v * 1e4) / 1e4);

/** Sanalarni 6 tadan parallel tekshiradi -> { ok: [...], dropped: [...] } (tartib saqlanadi) */
async function verifyAll(layer, list) {
  const res = new Array(list.length);
  let i = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (i < list.length) { const j = i++; res[j] = await verify(layer, list[j]); }
  }));
  return { ok: list.filter((_, j) => !res[j]), dropped: res.filter(Boolean) };
}

const caps = await text(GIBS_CAPABILITIES);
const out = { generated: new Date().toISOString().slice(0, 10), capabilities: GIBS_CAPABILITIES, probe: PROBE, layers: {} };

for (const layer of NASA_LAYERS) {
  const values = capabilityDates(caps, layer.id);
  if (!values) throw new Error(`layer not in capabilities: ${layer.id}`);
  const dates = expandDimension(values);
  const { ok: frames, dropped } = await verifyAll(layer, pickFrames(dates, layer.frames));
  let series = null;
  if (layer.series) {
    const v = await verifyAll(layer, pickSeries(dates, layer.series));
    series = v.ok;
    dropped.push(...v.dropped);
  }
  const cm = parseColormap(await text(`${GIBS_COLORMAPS}/${layer.colormap}.xml`));
  out.layers[layer.key] = {
    id: layer.id,
    frames,
    ...(series ? { series } : {}),
    units: cm.units,
    entries: cm.entries.map(([r, g, b, lo, hi]) => [r, g, b, round(lo), round(hi)]),
  };
  console.log(`${layer.key.padEnd(6)} ${layer.id}`);
  console.log(`       available ${dates[0]}..${dates.at(-1)} (${dates.length}), frames ${frames.length}: ${frames[0]} .. ${frames.at(-1)}`);
  if (series) console.log(`       passport series ${series.length}: ${series[0]} .. ${series.at(-1)}`);
  console.log(`       colormap ${layer.colormap}: ${cm.entries.length} colours, units "${cm.units}"`);
  if (dropped.length) console.log(`       dropped: ${dropped.join('; ')}`);
}

await mkdir('web/data', { recursive: true });
await writeFile(OUT, `${JSON.stringify(out)}\n`);
console.log(`-> ${OUT}`);
