// Tirik NASA xaritasi: qatlam tugmalari, legenda, sana sirpang'ichi + animatsiya,
// va bosilgan nuqtada har bir qatlamning qiymati (GIBS rang shkalasi bo'yicha piksel -> raqam).
import {
  NASA_LAYERS, layerByKey, tileTemplate, tileUrl, lonLatToTilePixel, colormapIndex, decodeColor, applyOffset, colorAt,
} from '../core/gibs.js';
import { t, num, fullDate, monShort } from './i18n.js';
import { barChart } from './chart.js';

const OPACITY = 0.82;
const GIBS_ATTR = 'NASA <a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener">GIBS</a> / EOSDIS';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let map = null;
let DATA = null;            // web/data/gibs-layers.json
const IDX = {};             // key -> rang shkalasi indeksi
const S = {
  active: 'sat',            // 'sat' yoki qatlam kaliti
  chartKey: 'ndvi',         // grafik qaysi qatlam uchun
  frame: {},                // key -> kadr indeksi
  playing: false, playToken: 0,
  visible: null,            // xaritada ko'rinib turgan kadr qatlami
  point: null, pointToken: 0,
  latest: {},               // key -> { v, actual, rgb } (oxirgi kadr, tanlangan nuqta)
  history: {},              // key -> [{ date, v }] | 'loading'
  progress: null,
};
const frameLayers = new Map();

const frames = (key) => DATA?.layers[key]?.frames ?? [];

// ---------------- ma'lumot ----------------

export async function loadNasaLayers() {
  const r = await fetch(new URL('./data/gibs-layers.json', import.meta.url));
  if (!r.ok) throw new Error(`gibs-layers.json HTTP ${r.status}`);
  DATA = await r.json();
  for (const l of NASA_LAYERS) {
    IDX[l.key] = colormapIndex(DATA.layers[l.key].entries);
    S.frame[l.key] = frames(l.key).length - 1;
  }
}

// ---------------- tayldan piksel o'qish ----------------

const tileCache = new Map(); // url -> Promise<{ img: ImageData|null, actual }>
function getTile(url) {
  if (tileCache.has(url)) {
    const p = tileCache.get(url);
    tileCache.delete(url); tileCache.set(url, p); // LRU
    return p;
  }
  const p = (async () => {
    const r = await fetch(url);
    const actual = r.headers.get('layer-time-actual')?.slice(0, 10) ?? null;
    if (!r.ok) return { img: null, actual };
    const blob = await r.blob();
    let bmp;
    try { bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }); }
    catch { bmp = await createImageBitmap(blob); }
    const c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0);
    return { img: ctx.getImageData(0, 0, c.width, c.height), actual };
  })();
  p.catch(() => tileCache.delete(url));
  tileCache.set(url, p);
  while (tileCache.size > 60) tileCache.delete(tileCache.keys().next().value);
  return p;
}

/** Bitta qatlam, bitta sana, bitta nuqta -> { v: {lo, hi, value, bound}|null, actual, rgb } */
async function readValue(key, date, lat, lon) {
  const def = layerByKey(key);
  const { tx, ty, px, py } = lonLatToTilePixel(lat, lon, def.z);
  const tile = await getTile(tileUrl(def, date, def.z, tx, ty));
  if (!tile.img) return { v: null, actual: tile.actual, rgb: null };
  const k = (py * tile.img.width + px) * 4, d = tile.img.data;
  const v = applyOffset(def, decodeColor(IDX[key], d[k], d[k + 1], d[k + 2], d[k + 3]));
  return { v, actual: tile.actual ?? date, rgb: v ? [d[k], d[k + 1], d[k + 2]] : null };
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const j = i++; out[j] = await fn(items[j], j); }
  }));
  return out;
}

// ---------------- formatlash ----------------

/** Son, haqiqiy minus belgisi bilan ("−7", "-7" emas) */
const fnum = (v, d) => num(v, d).replace(/^-/, '−');

export function fmtValue(key, v, withUnit = true) {
  if (!v) return t('noData');
  const def = layerByKey(key);
  const shown = fnum(v.value, def.digits);
  const sign = key === 'water' && !v.bound && /^[1-9]/.test(shown) ? '+' : '';
  const b = v.bound ? `${v.bound} ` : '';
  return `${b}${sign}${shown}${withUnit && def.unit ? ` ${def.unit}` : ''}`;
}

const stepLabel = (def) => t(`p_${def.step}`);
const frameLabel = (def, date) => (def.frames.kind === 'yearly' ? date.slice(0, 4) : `${monShort(date)} ${date.slice(2, 4)}`);

// ---------------- xarita qatlamlari ----------------

function frameLayer(key, date) {
  const id = `${key}|${date}`;
  let l = frameLayers.get(id);
  if (!l) {
    const def = layerByKey(key);
    l = L.tileLayer(tileTemplate(def, date), {
      maxNativeZoom: def.z, maxZoom: 17, opacity: 0, zIndex: 5, attribution: GIBS_ATTR, className: 'nasa-tiles',
    });
    frameLayers.set(id, l);
  }
  return l;
}

function whenLoaded(l, ms = 6000) {
  return new Promise((res) => {
    if (!l.isLoading()) return res();
    const done = () => { l.off('load', done); clearTimeout(tm); res(); };
    const tm = setTimeout(done, ms);
    l.on('load', done);
  });
}

function clearFrames(keep = null) {
  for (const l of frameLayers.values()) {
    if (l !== keep && map.hasLayer(l)) { l.setOpacity(0); map.removeLayer(l); }
  }
}

async function showFrame(i, token = S.playToken) {
  const key = S.active;
  if (key === 'sat') return;
  const date = frames(key)[i];
  S.frame[key] = i;
  renderTimebar();
  const l = frameLayer(key, date);
  if (!map.hasLayer(l)) l.addTo(map);
  await whenLoaded(l);
  if (token !== S.playToken || S.active !== key || S.frame[key] !== i) return; // eskirgan
  l.setOpacity(OPACITY);
  if (S.visible && S.visible !== l) {
    const old = S.visible;
    old.setOpacity(0);
    if (!S.playing && map.hasLayer(old)) map.removeLayer(old);
  }
  S.visible = l;
}

function stop() {
  S.playing = false;
  S.playToken++;
  clearFrames(S.visible);
  renderTimebar();
}

async function play() {
  const key = S.active, n = frames(key).length;
  S.playing = true;
  const token = ++S.playToken;
  renderTimebar();
  if (S.frame[key] === n - 1) S.frame[key] = -1; // oxiridan boshlasa - boshidan
  while (S.playing && token === S.playToken) {
    const i = (S.frame[key] + 1) % n;
    await showFrame(i, token);
    if (token !== S.playToken) return;
    await sleep(i === n - 1 ? 1600 : 750); // oxirgi kadrda biroz to'xtaydi
  }
}

function setActive(key) {
  if (S.playing) stop();
  if (S.active === key) return;
  S.active = key;
  if (key !== 'sat') S.chartKey = key;
  S.visible = null;
  clearFrames();
  if (key !== 'sat') {
    const def = layerByKey(key);
    if (map.getZoom() > def.view) map.setView(S.point ? [S.point.lat, S.point.lon] : map.getCenter(), def.view);
    showFrame(S.frame[key]);
  }
  renderAll();
  if (S.point && key !== 'sat') loadHistory(key);
}

// ---------------- DOM ----------------

function renderLayerBar() {
  const keys = ['sat', ...NASA_LAYERS.map((l) => l.key)];
  $('layerBar').innerHTML = keys.map((k) =>
    `<button class="lchip" data-k="${k}" aria-pressed="${S.active === k}">${esc(t(`layer_${k}`))}</button>`).join('');
}

function renderLegend() {
  const el = $('legend');
  if (S.active === 'sat') { el.hidden = true; return; }
  const def = layerByKey(S.active), entries = DATA.layers[S.active].entries;
  const { min, max, ticks } = def.legend, off = def.offset ?? 0;
  const stops = [];
  for (let i = 0; i <= 32; i++) {
    const v = min + ((max - min) * i) / 32;
    const c = colorAt(entries, v - off);
    if (c) stops.push(`rgb(${c.join(',')}) ${((i / 32) * 100).toFixed(1)}%`);
  }
  const pos = (v) => ((v - min) / (max - min)) * 100;
  el.hidden = false;
  el.innerHTML = `<div class="lg-bar" style="background:linear-gradient(90deg,${stops.join(',')})"></div>
    <div class="lg-ticks">${ticks.map((v, i) => `<span class="${i === 0 ? 'first' : i === ticks.length - 1 ? 'last' : ''}" style="left:${pos(v)}%">${esc(num(v, Number.isInteger(v) ? 0 : 2))}</span>`).join('')}</div>
    ${def.legend.ends ? `<div class="lg-ends"><span>← ${esc(t(def.legend.ends[0]))}</span><span>${esc(t(def.legend.ends[1]))} →</span></div>` : ''}
    <p class="lg-desc">${def.unit ? `<b>${esc(def.unit)}</b> · ` : ''}${esc(t(`desc_${S.active}`))}</p>`;
}

function renderTimebar() {
  const el = $('timeBar');
  if (S.active === 'sat') { el.hidden = true; return; }
  const def = layerByKey(S.active), fr = frames(S.active), i = S.frame[S.active];
  el.hidden = false;
  const slider = $('frame');
  slider.max = String(fr.length - 1);
  slider.value = String(i);
  slider.setAttribute('aria-valuetext', fullDate(fr[i]));
  $('play').textContent = S.playing ? '❚❚' : '▶';
  $('play').setAttribute('aria-label', t(S.playing ? 'pause' : 'play'));
  $('frameLabel').textContent = `${fullDate(fr[i])} · ${stepLabel(def)}`;
}

function nasaChip(def, key) {
  const fr = frames(key);
  const per = `${frameLabel(def, fr[0])} – ${frameLabel(def, fr[fr.length - 1])}`;
  return `<span class="chip nasa">${esc(`NASA · ${def.product} · ${def.res} · ${stepLabel(def)} · ${per}`)}</span>`;
}

function renderReadout() {
  const el = $('readout');
  if (!S.point) { el.hidden = true; return; }
  el.hidden = false;
  const rows = NASA_LAYERS.map((def) => {
    const r = S.latest[def.key];
    const sw = r?.rgb ? `background:rgb(${r.rgb.join(',')})` : '';
    const val = r === undefined ? '…' : fmtValue(def.key, r?.v);
    const when = r?.actual ? fullDate(r.actual) : '';
    return `<li><button class="nrow" data-k="${def.key}" aria-pressed="${S.chartKey === def.key}">
      <span class="sw${r?.rgb ? '' : ' empty'}" style="${sw}"></span>
      <span class="nname">${esc(t(`layer_${def.key}`))}<small>${esc([when, def.res].filter(Boolean).join(' · '))}</small></span>
      <b class="nval">${esc(val)}</b></button></li>`;
  }).join('');

  const key = S.chartKey, def = layerByKey(key), h = S.history[key];
  const title = t(def.frames.kind === 'yearly' ? 'histYearly' : 'histMonthly', { name: t(`layer_${key}`) });
  let chart = '';
  if (h === 'loading' || !h) {
    chart = `<p class="muted small">${t('reading')}${S.progress ? ` ${S.progress}` : ''}</p>`;
  } else {
    chart = `<div id="nasaChart"></div>
      <details class="table"><summary>${t('d_table')}</summary>
        <table><thead><tr><th>${t('date')}</th><th>${esc(def.unit || 'NDVI')}</th><th>${t('class')}</th></tr></thead><tbody>
        ${h.map((p) => `<tr><td>${p.date ? esc(fullDate(p.actual ?? p.date)) : esc(p.label)}</td><td>${esc(p.v ? fmtValue(key, p.v, false) : '—')}</td>
          <td>${p.v && p.v.lo != null && p.v.hi != null ? `${fnum(p.v.lo, def.digits + 1)} … ${fnum(p.v.hi, def.digits + 1)}` : '—'}</td></tr>`).join('')}
        </tbody></table></details>`;
  }

  el.innerHTML = `<h3>${t('readTitle')}</h3>
    <p class="muted small">${t('readHint')}</p>
    <ul class="nrows">${rows}</ul>
    <p class="chart-title">${esc(title)}</p>
    ${chart}
    <div class="chips">${nasaChip(def, key)}<span class="chip" title="${esc(t('methodLong'))}">${esc(t('method'))}</span></div>
    <p class="muted small">${esc(t(`desc_${key}`))}</p>`;

  if (Array.isArray(h)) {
    barChart($('nasaChart'), {
      points: h.map((p) => ({ label: p.label, tip: p.date ? fullDate(p.actual ?? p.date) : p.label, value: p.v ? p.v.value : null })),
      fmt: (v) => fnum(v, def.digits),
      unit: def.unit,
    });
  }
}

function renderAll() {
  if (!DATA) return;
  renderLayerBar();
  renderLegend();
  renderTimebar();
  renderReadout();
}

// ---------------- nuqta ----------------

async function loadHistory(key) {
  const p = S.point;
  if (!p) return;
  const token = S.pointToken;
  if (Array.isArray(S.history[key]) || S.history[key] === 'loading') return;
  S.history[key] = 'loading';
  const def = layerByKey(key), fr = frames(key);
  let done = 0;
  S.progress = `0/${fr.length}`;
  if (S.chartKey === key) renderReadout();
  const vals = await pool(fr, 4, async (d) => {
    const r = await readValue(key, d, p.lat, p.lon).catch(() => ({ v: null, actual: null }));
    done++;
    if (token === S.pointToken && S.chartKey === key) {
      S.progress = `${done}/${fr.length}`;
      const st = document.querySelector('#readout .chart-title + p.muted');
      if (st) st.textContent = `${t('reading')} ${S.progress}`;
    }
    return r;
  });
  if (token !== S.pointToken) return;
  let pts = fr.map((d, i) => ({ date: d, actual: vals[i].actual, v: vals[i].v, label: frameLabel(def, d) }));
  if (def.frames.kind === 'yearly') {
    // yo'q yillar bo'sh ustun bo'lib ko'rinadi (vaqt o'qi halol qoladi)
    const by = new Map(pts.map((x) => [x.date.slice(0, 4), x]));
    const y0 = Number(fr[0].slice(0, 4)), y1 = Number(fr[fr.length - 1].slice(0, 4));
    pts = [];
    for (let y = y0; y <= y1; y++) pts.push(by.get(String(y)) ?? { date: null, v: null, label: String(y) });
  }
  S.history[key] = pts;
  S.progress = null;
  renderReadout();
}

export async function readAt(lat, lon) {
  if (!DATA) return;
  const token = ++S.pointToken;
  S.point = { lat, lon };
  S.latest = {};
  S.history = {};
  renderReadout();
  await Promise.all(NASA_LAYERS.map(async (def) => {
    const fr = frames(def.key);
    const r = await readValue(def.key, fr[fr.length - 1], lat, lon).catch(() => ({ v: null, actual: null, rgb: null }));
    if (token !== S.pointToken) return;
    S.latest[def.key] = r;
    renderReadout();
  }));
  if (token === S.pointToken) loadHistory(S.chartKey);
}

// ---------------- ishga tushirish ----------------

export function initNasaMap(leafletMap) {
  map = leafletMap;
  $('layerBar').addEventListener('click', (e) => {
    const b = e.target.closest('.lchip');
    if (b) setActive(b.dataset.k);
  });
  $('play').addEventListener('click', () => (S.playing ? stop() : play()));
  $('frame').addEventListener('input', (e) => {
    if (S.playing) stop();
    showFrame(Number(e.target.value));
  });
  $('readout').addEventListener('click', (e) => {
    const b = e.target.closest('.nrow');
    if (!b) return;
    setActive(b.dataset.k);
  });
  return loadNasaLayers().then(renderAll);
}

export const renderNasa = renderAll;
