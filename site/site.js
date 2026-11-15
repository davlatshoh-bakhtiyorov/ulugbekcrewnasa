// Neyra sayti (GitHub Pages ildizi). Raqamlarning hammasi data fayllaridan va ilova bilan bir xil core/ kodidan:
//  web/data/gibs-layers.json         - NASA qatlamlari kadrlari (katta xarita)
//  site/data/field-ndvi.json         - namuna dalaning NDVI qatori (npm run field-ndvi)
//  docs/pilot-ekinlar-jarqorgon.json - pilot dala natijasi (npm run pilot)
//  site/data/climate.json            - 13 viloyat iqlim siljishi (npm run site-data)
//  site/data/market-window.json      - 16 hudud piyoz pishish oynasi (npm run market-window)
//  site/data/harvest.json            - har pikselning mavsum oxiri yil bo'yicha (npm run harvest) - bo'lmasa bo'lim yashirin
//  core/calibration.js               - NASA MODIS bo'yicha GDD kalibrlash (npm run calibrate)
import { TEXT, SRC, PRICE_POINTS } from './text.js';
import { t as at, num, mmdd, setLang as setAppLang } from '../web/i18n.js';
import { card, calBlock, modisChip, esc } from '../web/cards.js';
import { barChart } from '../web/chart.js';
import { advise } from '../core/advisor.js';
import { CROPS, cropById } from '../core/crops.js';
import { salinityImpact } from '../core/crop-calc.js';
import { NASA_LAYERS, layerByKey } from '../core/gibs.js';
import { initNasaMap, readAt, renderNasa, setPassportHandler } from '../web/nasa-map.js';
import { CALIBRATION } from '../core/calibration.js';
import { doyToMMDD } from '../core/field.js';

const TESTS = 49; // npm test natijasi (14-noyabr)
const FIELD = { lat: 37.5021, lon: 67.3888 };
const EOX = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg';
const EOX_ATTR = '<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless 2020</a> by EOX';
const GIBS_ATTR = 'NASA <a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener">GIBS</a> / EOSDIS';
const $ = (id) => document.getElementById(id);
const SVG = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, text) => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
};

// ---------------- til ----------------
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* yo'q */ } } };
let lang = new URLSearchParams(location.search).get('lang') ?? store.get('fs-site-lang') ?? (navigator.language?.toLowerCase().startsWith('uz') ? 'uz' : 'en');
if (!TEXT[lang]) lang = 'en';
const T = () => TEXT[lang];
function s(key, p = {}) {
  const str = T()[key] ?? TEXT.en[key] ?? key;
  return String(str).replace(/\{(\w+)\}/g, (_, k) => (p[k] ?? `{${k}}`));
}
const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
const sgn = (x, d = 0) => (x == null ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${num(Math.abs(x), d)}`);
const chip = (label, cls = 'nasa', href = null) => (href
  ? `<a class="chip ${cls}" href="${href}" target="_blank" rel="noopener">${esc(label)}</a>`
  : `<span class="chip ${cls}">${esc(label)}</span>`);
const srcChip = (k) => chip(SRC[k].label, 'src', SRC[k].url);
const EARLY = '1985–2004', LATE = '2006–2025';
const doy01 = (m) => (Date.UTC(2001, Number(m.slice(0, 2)) - 1, Number(m.slice(3, 5))) - Date.UTC(2001, 0, 1)) / 864e5 + 1; // MM-DD -> kun (kabisa emas)
const dayOf = (iso) => Math.round(Date.parse(iso) / 864e5);

function applyText() {
  document.documentElement.lang = lang;
  document.title = s('title');
  document.querySelectorAll('[data-t]').forEach((n) => { n.textContent = s(n.dataset.t, { n: TESTS }); });
  setAppLang(lang);
}

// ---------------- ma'lumot ----------------
const D = {};
async function loadJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

// ---------------- katta interaktiv NASA xaritasi (web/nasa-map.js) ----------------
let BIG = null;
async function bigMap() {
  BIG = L.map('nasaMap', { scrollWheelZoom: false });
  BIG.setView([FIELD.lat, FIELD.lon], 11);
  L.tileLayer(EOX, { maxZoom: 17, attribution: EOX_ATTR }).addTo(BIG);
  const marker = L.circleMarker([FIELD.lat, FIELD.lon], { radius: 7, color: '#fff', weight: 2, fillColor: '#111', fillOpacity: 1 }).addTo(BIG);
  BIG.on('click', (e) => { marker.setLatLng(e.latlng); readAt(e.latlng.lat, e.latlng.lng); });
  setPassportHandler(() => { location.href = 'web/'; });
  await initNasaMap(BIG);
  document.querySelector('#layerBar [data-k="ndvi"]')?.click();
  readAt(FIELD.lat, FIELD.lon);
}

// ---------------- "Batafsil" tugmalari ----------------
const infoLabel = (b, open) => { b.textContent = open ? `× ${s('close')}` : `ⓘ ${s('details')}`; };
function infoToggles() {
  document.querySelectorAll('main .sec').forEach((sec) => {
    if (!sec.querySelector('.detail') || sec.querySelector('.info')) return;
    const row = sec.querySelector('.h2row') ?? sec.querySelector('h2');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'info'; b.setAttribute('aria-expanded', 'false');
    b.onclick = () => { const open = sec.classList.toggle('open'); b.setAttribute('aria-expanded', String(open)); infoLabel(b, open); if (open) { safe(renderPrice); safe(renderNdvi); } };
    infoLabel(b, false);
    row.append(b);
  });
}

// ---------------- raqamlar qatori ----------------
function windowDiff(periodKey, otherId) {
  if (!D.window) return null;
  const ref = D.window.regions.find((r) => r.id === D.window.reference), o = D.window.regions.find((r) => r.id === otherId);
  const a = ref?.periods[periodKey]?.maturity?.median, b = o?.periods[periodKey]?.maturity?.median;
  return a && b ? Math.round(doy01(b) - doy01(a)) : null;
}
function renderStats() {
  const sur = D.climate?.points.find((p) => p.id === 'surkhandarya');
  const wheat = D.pilot?.natijalar.find((r) => r.cropId === 'winter_wheat');
  const g = wheat?.ripen.gddModel;
  const arrow = '<span class="arrow">→</span>';
  const kz = windowDiff('all', 'turkistan');
  const tiles = [
    sur && { v: `${num(sur.early.heatDays)} ${arrow} ${num(sur.late.heatDays)}`, l: s('st_heat'), sub: s('st_heatSub') },
    g?.source === 'modis' && { v: `${esc(mmdd(g.fao.maturity?.median))} ${arrow} ${esc(mmdd(wheat.ripen.maturity?.median))}`, l: s('st_wheat'), sub: s('st_wheatSub', { n: num(g.observed.n) }) },
    kz != null && { v: num(kz), l: s('st_window'), sub: s('st_windowSub') },
  ].filter(Boolean);
  $('stats').innerHTML = tiles.map((x) => `<div class="stat"><b>${x.v}</b><span>${esc(x.l)}</span><small>${esc(x.sub)}</small></div>`).join('');
}

// ---------------- muammo: aylana, narx nuqtalari, faktlar ----------------
const wrap2 = (str, max = 15) => {
  if (str.length <= max) return [str];
  const words = str.split(' ');
  let best = null, bd = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const d = Math.abs(a.length - b.length);
    if (d < bd) { bd = d; best = [a, b]; }
  }
  return best ?? [str];
};
function renderLoop() {
  const W = 420, cx = 210, cy = 214, R = 136;
  const svg = el('svg', { viewBox: `0 0 ${W} ${W}`, role: 'img', 'aria-label': s('loop_cap') });
  const defs = el('defs');
  const mk = el('marker', { id: 'arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
  mk.append(el('path', { d: 'M0 0 L10 5 L0 10 z', fill: 'var(--brand)' }));
  defs.append(mk); svg.append(defs);
  svg.append(el('circle', { cx, cy, r: R, class: 'ring' }));
  const years = ['2022–23', '2023', '2023/24', '2024', '2025'];
  const n = 5, pts = [];
  for (let i = 0; i < n; i++) {
    const a = ((-90 + i * (360 / n)) * Math.PI) / 180;
    pts.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), a });
  }
  // yoy strelkalar: tugundan keyingisigacha, ikki tomonda 17° bo'sh joy
  for (let i = 0; i < n; i++) {
    const a0 = pts[i].a + (17 * Math.PI) / 180, a1 = pts[(i + 1) % n].a - (17 * Math.PI) / 180 + (i === n - 1 ? 2 * Math.PI : 0);
    const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0), x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    svg.append(el('path', { d: `M${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`, class: 'arc', 'marker-end': 'url(#arrow)' }));
  }
  pts.forEach((p, i) => {
    const lines = wrap2(s(`loop_${i + 1}`), 16), w = 124, h = lines.length > 1 ? 50 : 34;
    svg.append(el('rect', { x: p.x - w / 2, y: p.y - h / 2, width: w, height: h, rx: 10, class: `node${i === 3 ? ' hot' : ''}${i === 1 ? ' on' : ''}` }));
    lines.forEach((ln, j) => svg.append(el('text', { x: p.x, y: p.y + (j - (lines.length - 1) / 2) * 15 + 4.5 }, ln)));
    svg.append(el('text', { x: p.x, y: p.y - h / 2 - 6, class: 'yr' }, years[i]));
  });
  svg.append(el('text', { x: cx, y: cy - 4, class: 'center' }, lang === 'en' ? 'onions' : 'piyoz'));
  svg.append(el('text', { x: cx, y: cy + 16, class: 'center' }, '2018 · 2024'));
  $('loop').replaceChildren(svg);
}
function chartWidth(id, min = 320) { return Math.max(min, Math.round($(id)?.clientWidth || 0)); }
function renderPrice() {
  const W = chartWidth('priceChart'), narrow = W < 520, Hh = narrow ? 220 : 250, m = { l: 46, r: 16, t: 24, b: 30 };
  const t0 = dayOf('2023-07-01'), t1 = dayOf('2025-07-01'), ymax = 8600;
  const x = (iso) => m.l + ((dayOf(iso) - t0) / (t1 - t0)) * (W - m.l - m.r);
  const y = (v) => m.t + (1 - v / ymax) * (Hh - m.t - m.b);
  const svg = el('svg', { viewBox: `0 0 ${W} ${Hh}`, width: W, height: Hh, role: 'img', 'aria-label': s('price_h') });
  for (let v = 0; v <= 8000; v += narrow ? 4000 : 2000) {
    svg.append(el('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'grid' }));
    svg.append(el('text', { x: m.l - 8, y: y(v) + 4, class: 'tick', 'text-anchor': 'end' }, num(v)));
  }
  const months = T().mon;
  const ticks = narrow ? ['2024-01-01', '2025-01-01'] : ['2023-07-01', '2024-01-01', '2024-07-01', '2025-01-01', '2025-07-01'];
  for (const iso of ticks) {
    const d = new Date(iso);
    svg.append(el('line', { x1: x(iso), x2: x(iso), y1: Hh - m.b, y2: Hh - m.b + 5, class: 'grid' }));
    svg.append(el('text', { x: x(iso), y: Hh - m.b + 18, class: 'tick', 'text-anchor': 'middle' }, `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`));
  }
  const unit = lang === 'en' ? 'UZS/kg' : "so'm/kg";
  let lastLx = -1e9, lastAbove = false;
  const notes = PRICE_POINTS.map((p, i) => {
    const px = x(p.date), range = Array.isArray(p.uzs), lo = range ? p.uzs[0] : p.uzs, hi = range ? p.uzs[1] : p.uzs;
    const low = hi < 2000, cy = y(range ? (lo + hi) / 2 : lo);
    const crowded = px - lastLx < 72; lastLx = px;
    const above = y(hi) > 60 && (!crowded || !lastAbove); lastAbove = above;
    if (range) svg.append(el('rect', { x: px - 7, y: y(hi), width: 14, height: Math.max(3, y(lo) - y(hi)), rx: 4, class: 'range' }));
    svg.append(el('circle', { cx: px, cy, r: 11, class: `pt${low ? ' low' : ''}` }));
    svg.append(el('text', { x: px, y: cy + 4, class: 'num' }, String(i + 1)));
    const val = range ? `${num(lo)}–${num(hi)}` : num(lo);
    if (crowded && !above) svg.append(el('text', { x: px + 15, y: cy + 4, class: 'val', 'text-anchor': 'start' }, val));
    else svg.append(el('text', { x: px, y: above ? y(hi) - 16 : y(lo) + 28, class: 'val', 'text-anchor': px > W - 70 ? 'end' : 'middle' }, val));
    const d = new Date(p.date);
    return `<li><span class="n${low ? ' low' : ''}">${i + 1}</span><b>${esc(`${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`)}</b> · ${esc(val)} ${esc(unit)} — ${esc(p.note[lang])} ${srcChip(p.src)}</li>`;
  });
  $('priceChart').replaceChildren(svg);
  $('priceNotes').innerHTML = notes.join('');
}
function renderProblem() {
  renderLoop();
  renderPrice();
  const en = lang === 'en';
  const F = [
    { v: en ? '1,500 UZS' : '1 500 so‘m', l: s('f_price'), src: 'eastfruit' },
    { v: en ? '150–200k' : '150–200 ming', l: s('f_waste'), src: 'eastfruit' },
    { v: en ? '4.9 %' : '4,9 %', l: s('f_cold'), src: 'uzdaily' },
  ];
  $('facts').innerHTML = F.map((f) => `<div class="fact"><b>${esc(f.v)}</b><span>${esc(f.l)}</span>${srcChip(f.src)}</div>`).join('');
  $('problemChips').innerHTML = ['eastfruit2023', 'eastfruitNov2023', 'eastfruit', 'kunuz2024', 'kunuz2025', 'kunuz2018', 'podrobno'].map(srcChip).join('') + chip(s('src_news'), '');
}

// ---------------- sinov: namuna dala ----------------
const ANS = { lastCrop: 'winter_wheat', water: 'sometimes', salinity: 'low' };
function renderDemo() {
  const r0 = D.pilot.natijalar[0];
  const a = r0.period.from.slice(0, 4), b = r0.period.to.slice(0, 4);
  $('demoHint').textContent = s('demo_hint', { n: Number(b) - Number(a) + 1, a, b });
  const group = (name, options) => `<div class="opts" role="group" data-q="${name}">${options.map(([v, label]) =>
    `<button type="button" class="opt" data-v="${v}" aria-pressed="${ANS[name] === v}">${esc(label)}</button>`).join('')}</div>`;
  $('demoQ').innerHTML = `
    <p class="q">${esc(s('demo_q1'))}</p>
    ${group('lastCrop', [...CROPS.map((c) => [c.id, c.name[lang]]), ['unknown', at('dontKnow')]])}
    <p class="q">${esc(s('demo_q2'))}</p>
    ${group('water', [['enough', at('water_enough')], ['sometimes', at('water_sometimes')], ['scarce', at('water_scarce')], ['unknown', at('dontKnow')]])}
    <p class="q">${esc(s('demo_q3'))}</p>
    ${group('salinity', [['low', at('salt_low')], ['medium', at('salt_medium')], ['high', at('salt_high')], ['unknown', at('dontKnow')]])}`;
  $('demoQ').querySelectorAll('.opts').forEach((g) => (g.onclick = (e) => {
    const btn = e.target.closest('.opt');
    if (!btn) return;
    ANS[g.dataset.q] = btn.dataset.v;
    g.querySelectorAll('.opt').forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
    renderDemoCards();
  }));
  renderDemoCards();
}
function renderDemoCards() {
  const salinity = ANS.salinity;
  const results = D.pilot.natijalar.map((r) => ({ ...r, salinity: salinityImpact(cropById(r.cropId), salinity) }));
  const a = advise(results, {
    lastCrop: ANS.lastCrop === 'unknown' ? null : ANS.lastCrop,
    water: ANS.water === 'unknown' ? null : ANS.water,
    salinity,
  });
  $('demoCards').innerHTML = a.top.map((o, i) => card(o, i + 1, false)).join('');
}

// ---------------- kalendar chizig'i (umumiy) ----------------
/** rows: [{label, sub, early, median, late, sow?, ref?, val}] (MM-DD yoki DOY->MM-DD tayyor), m0..m1 oylar */
function stripHtml(rows, m0, m1, head) {
  const d0 = doy01(`${String(m0).padStart(2, '0')}-01`), d1 = doy01(`${String(m1).padStart(2, '0')}-01`);
  const X = (mm) => `${(((doy01(mm) - d0) / (d1 - d0)) * 100).toFixed(2)}%`;
  const months = T().mon;
  const h = `<div class="cs-head"><span>${esc(head)}</span><div class="cs-months">${Array.from({ length: m1 - m0 }, (_, i) => {
    const mm = `${String(m0 + i).padStart(2, '0')}-01`; return `<span style="left:${X(mm)}">${esc(months[m0 + i - 1])}</span>`;
  }).join('')}</div></div>`;
  return h + rows.map((r) => `
    <div class="cs-row${r.ref ? ' ref' : ''}">
      <div class="cs-lab">${esc(r.label)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</div>
      <div class="cs-track" style="--n:${m1 - m0}" title="${esc(r.title ?? '')}">
        ${r.sow ? `<i class="cs-sow" style="left:${X(r.sow)}"></i>` : ''}
        <i class="cs-bar" style="left:${X(r.early)};width:calc(${X(r.late)} - ${X(r.early)})"></i>
        <i class="cs-dot" style="left:${X(r.median)}"></i>
        <span class="cs-val" style="left:${X(r.median)}">${esc(r.val ?? mmdd(r.median))}</span>
      </div>
    </div>`).join('');
}

// ---------------- yig'im vaqti xaritasi (A) ----------------
const HD = { map: null, overlay: null, year: null };
const RAD = 6371007.181; // MODIS sinusoidal sfera radiusi, m
const DOY_LO = 110, DOY_HI = 190; // rang shkalasi: 20-aprel .. 9-iyul
function sinToLatLon(xm, ym) { const lat = (ym / RAD) * (180 / Math.PI); return [lat, (xm / (RAD * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI)]; }
function doyColor(d) {
  const k = Math.max(0, Math.min(1, (d - DOY_LO) / (DOY_HI - DOY_LO)));
  const stops = [[242, 193, 78], [156, 204, 90], [31, 157, 79], [14, 77, 42]];
  const i = Math.min(stops.length - 2, Math.floor(k * (stops.length - 1))), f = k * (stops.length - 1) - i;
  return `rgb(${stops[i].map((c, j) => Math.round(c + (stops[i + 1][j] - c) * f)).join(',')})`;
}
function herdMap() {
  const g = D.harvest.grid;
  HD.map = L.map('herdMap', { scrollWheelZoom: false, dragging: !L.Browser.mobile });
  L.tileLayer(EOX, { maxZoom: 13, attribution: `${EOX_ATTR} · NASA MODIS MCD12Q2` }).addTo(HD.map);
  const ys = D.harvest.years;
  // xarita chegarasi: mavsum topilgan piksellar qamrovi (to'r 120 x 120 km, dalalar uning bir qismi)
  const rs = [], cs = [];
  for (const y of ys) for (const idx of y.px) { rs.push(Math.floor(idx / g.ncols)); cs.push(idx % g.ncols); }
  rs.sort((a, b) => a - b); cs.sort((a, b) => a - b);
  const qn = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
  const r0 = qn(rs, 0.05), r1 = qn(rs, 0.95), c0 = qn(cs, 0.05), c1 = qn(cs, 0.95); // zich qism (chekka yakka piksellarsiz)
  const ll = (r, c) => sinToLatLon(g.xll + c * g.cell, g.yll + (g.nrows - r) * g.cell);
  const ext = [ll(r0, c0), ll(r0, c1 + 1), ll(r1 + 1, c0), ll(r1 + 1, c1 + 1)];
  HD.map.fitBounds(Number.isFinite(r0) ? [[Math.min(...ext.map((e) => e[0])), Math.min(...ext.map((e) => e[1]))], [Math.max(...ext.map((e) => e[0])), Math.max(...ext.map((e) => e[1]))]] : g.bounds, { padding: [8, 8] });
  $('herdYear').min = ys[0].year; $('herdYear').max = ys.at(-1).year;
  $('herdYear').value = HD.year = ys.at(-1).year;
  $('herdYear').oninput = () => { HD.year = Number($('herdYear').value); drawHarvestYear(); renderHarvestChart(); };
}
function drawHarvestYear() {
  const g = D.harvest.grid, yr = D.harvest.years.find((y) => y.year === HD.year);
  $('herdYearOut').textContent = HD.year;
  $('hvN').textContent = s('hv_n', { n: num(yr.n) });
  const [[lat0, lon0], [lat1, lon1]] = g.bounds;
  const W = 1400, Hh = Math.round((W * (lat1 - lat0)) / ((lon1 - lon0) * Math.cos(((lat0 + lat1) / 2) * Math.PI / 180)));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
  const ctx = cv.getContext('2d');
  const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const my0 = merc(lat0), my1 = merc(lat1);
  const X = (lon) => ((lon - lon0) / (lon1 - lon0)) * W, Y = (lat) => ((my1 - merc(lat)) / (my1 - my0)) * Hh;
  yr.px.forEach((idx, k) => {
    const r = Math.floor(idx / g.ncols), c = idx % g.ncols;
    const xm = g.xll + c * g.cell, ym = g.yll + (g.nrows - 1 - r) * g.cell;
    const p = [[xm, ym + g.cell], [xm + g.cell, ym + g.cell], [xm + g.cell, ym], [xm, ym]].map(([a, b]) => sinToLatLon(a, b));
    ctx.fillStyle = doyColor(yr.doy[k]);
    ctx.beginPath();
    p.forEach(([la, lo], i) => (i ? ctx.lineTo(X(lo), Y(la)) : ctx.moveTo(X(lo), Y(la))));
    ctx.closePath(); ctx.fill();
  });
  HD.overlay?.remove();
  HD.overlay = L.imageOverlay(cv.toDataURL('image/png'), [[lat0, lon0], [lat1, lon1]], { opacity: 0.85, interactive: false }).addTo(HD.map);
}
function renderHarvestChart() {
  const rows = D.harvest.years.map((y) => ({
    label: String(y.year), sub: `${num(y.n)} px`, early: doyToMMDD(y.p25), median: doyToMMDD(y.median), late: doyToMMDD(y.p75), ref: y.year === HD.year,
    title: `${y.year}: ${mmdd(doyToMMDD(y.median))} (p25–p75 ${mmdd(doyToMMDD(y.p25))} – ${mmdd(doyToMMDD(y.p75))}), n = ${num(y.n)}`,
  }));
  $('herdChart').innerHTML = stripHtml(rows, 4, 8, s('hv_legend'));
}
function renderHarvest() {
  if (!D.harvest) return;
  $('herd').hidden = false; $('navHerd').hidden = false;
  for (const y of D.harvest.years) if (!y.px) { let acc = 0; y.px = y.pxDelta.map((d) => (acc += d)); }
  if (!HD.map) herdMap();
  drawHarvestYear();
  renderHarvestChart();
  $('hvLo').textContent = mmdd(doyToMMDD(DOY_LO)); $('hvHi').textContent = mmdd(doyToMMDD(DOY_HI));
  const med = [...D.harvest.years.map((y) => y.detected)].sort((a, b) => a - b), mid = med[Math.floor(med.length / 2)];
  const gaps = D.harvest.years.filter((y) => y.detected < 0.7 * mid).map((y) => y.year);
  $('hvGap').textContent = gaps.length ? s('hv_gap', { years: gaps.join(', ') }) : '';
  $('herdChips').innerHTML = chip(s('src_mcd')) + chip(s('src_rule'), 'unv');
}

// ---------------- bozor oynasi (B) ----------------
const WN = { period: 'all' };
function renderWindow() {
  if (!D.window) return;
  const P = WN.period, regs = D.window.regions, refId = D.window.reference;
  const tk = windowDiff(P, 'tashkent'), kz = windowDiff(P, 'turkistan'), ru = windowDiff(P, 'volgograd');
  $('winHead').innerHTML = s('win_head', { tk: num(tk), kz: num(kz), ru: num(ru) });
  $('winPeriod').innerHTML = ['all', 'early', 'late'].map((k) => `<button type="button" class="${k === P ? 'on' : ''}" data-p="${k}">${esc(s(`win_${k}`))}</button>`).join('');
  $('winPeriod').onclick = (e) => { const b = e.target.closest('[data-p]'); if (!b) return; WN.period = b.dataset.p; renderWindow(); };
  const rows = regs.map((r) => ({ r, p: r.periods[P] })).filter((x) => x.p?.maturity).sort((a, b) => doy01(a.p.maturity.median) - doy01(b.p.maturity.median));
  const countries = D.window.countries;
  $('winStrip').innerHTML = stripHtml(rows.map(({ r, p }) => ({
    label: r[lang] ?? r.en, sub: countries[r.cc]?.[lang] ?? r.cc, early: p.maturity.early, median: p.maturity.median, late: p.maturity.late, sow: p.sow, ref: r.id === refId,
    title: `${r[lang] ?? r.en}: ${mmdd(p.maturity.median)} (${mmdd(p.maturity.early)} – ${mmdd(p.maturity.late)}), ${s('win_sow')} ${mmdd(p.sow)}`,
  })), 3, 11, s('win_ripe'));
  $('winChips').innerHTML = chip(s('src_power')) + chip('FAO-56 Rev.1 · Tables 6.10, 6.11', '') + chip(s('src_rule'), 'unv');
}

// ---------------- iqlim xaritasi ----------------
const METRICS = ['heatDays', 'frostFree', 'lastSpringFrost', 'et0AprSep'];
const C = { metric: 'heatDays', sel: 'surkhandarya', map: null, markers: [] };
const NUDGE = { tashkent: [-6, -12], syrdarya: [8, 8], jizzakh: [-10, 0], samarkand: [-2, 12], namangan: [-6, -12], andijan: [12, -2], fergana: [-4, 14], navoi: [6, -8], bukhara: [-6, 6] };
const delta = (p, m) => (p.late[m] == null || p.early[m] == null ? null : Math.round(p.late[m] - p.early[m]));
const pname = (p) => p[lang] ?? p.en;
function climateMap() {
  C.map = L.map('clMap', { scrollWheelZoom: false, dragging: !L.Browser.mobile, zoomSnap: 0.25 });
  C.map.fitBounds([[37.1, 56.0], [45.5, 73.9]]);
  L.tileLayer(EOX, { maxZoom: 12, attribution: `${EOX_ATTR} · NASA POWER` }).addTo(C.map);
}
function renderClimate() {
  $('clMetric').innerHTML = METRICS.map((m) => `<button type="button" class="${C.metric === m ? 'on' : ''}" data-m="${m}">${esc(s(`m_${m}`))}</button>`).join('');
  $('clMetric').onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; C.metric = b.dataset.m; renderClimate(); };
  const maxAbs = Math.max(1, ...D.climate.points.map((p) => Math.abs(delta(p, C.metric) ?? 0)));
  C.markers.forEach((m) => m.remove());
  C.markers = D.climate.points.map((p) => {
    const d = delta(p, C.metric), k = Math.abs(d ?? 0) / maxAbs;
    const size = Math.round(26 + 24 * k), light = Math.round(60 - 30 * k);
    const [nx, ny] = NUDGE[p.id] ?? [0, 0];
    const icon = L.divIcon({ className: 'pin', iconSize: null,
      html: `<button type="button" class="bub${p.id === C.sel ? ' on' : ''}" style="width:${size}px;height:${size}px;margin:${ny}px 0 0 ${nx}px;background:hsl(145 55% ${light}%)" aria-label="${esc(`${pname(p)}: ${sgn(d)}`)}">${esc(sgn(d))}</button>` });
    return L.marker([p.lat, p.lon], { icon, keyboard: false, title: pname(p) }).on('click', () => { C.sel = p.id; renderClimate(); }).addTo(C.map);
  });
  renderClimateDetail();
  renderClimateTable();
  $('clChips').innerHTML = chip(s('src_power')) + chip(s('src_frost'), '');
}
function renderClimateDetail() {
  const p = D.climate.points.find((x) => x.id === C.sel);
  const d = (doy) => mmdd(doyToMMDD(doy));
  const big = [
    ['heatDays', (v) => num(v), s('u_days')], ['frostFree', (v) => num(v), s('u_days')],
    ['lastSpringFrost', d, ''], ['et0AprSep', (v) => num(v), 'mm'],
  ];
  const tr = p.trend.heatDays;
  $('clDetail').innerHTML = `<h3>${esc(pname(p))}</h3>
    <p class="muted small">${p.lat.toFixed(2)}° N, ${p.lon.toFixed(2)}° E · ${esc(s('elev', { m: num(p.elev) }))}</p>
    <div class="bignums">${big.map(([k, f, u]) => `<div class="bignum"><b><span class="then">${f(p.early[k])}</span><span class="arrow">→</span>${f(p.late[k])}${u ? ` <small>${u}</small>` : ''}</b><span>${esc(s(`m_${k}`))} · ${EARLY} → ${LATE}</span></div>`).join('')}</div>
    <table class="shift"><tbody>
      <tr><td>${esc(s('row_firstAutumnFrost'))}</td><td>${d(p.early.firstAutumnFrost)}</td><td class="now">${d(p.late.firstAutumnFrost)}</td></tr>
      <tr><td>${esc(s('row_jjaTmax'))}</td><td>${num(p.early.jjaTmax, 1)} °C</td><td class="now">${num(p.late.jjaTmax, 1)} °C</td></tr>
    </tbody></table>
    ${tr != null ? `<p class="muted small">${esc(s('row_heatDays'))}: ${esc(s('trend', { v: sgn(tr, 1) }))}</p>` : ''}
    <p class="chart-title">${esc(s('cl_chart', { r: pname(p) }))}</p>
    <div id="clChart"></div>`;
  barChart($('clChart'), {
    points: p.heatByYear.map(([y, v]) => ({ label: String(y), value: v })),
    ref: { value: p.early.heatDays, label: s('cl_ref') },
    fmt: (v) => num(v), unit: s('u_days'),
  });
}
function renderClimateTable() {
  const d = (doy) => mmdd(doyToMMDD(doy));
  const cell = (p, m) => { const f = m === 'lastSpringFrost' ? d : (v) => num(v); return `${f(p.early[m])} → ${f(p.late[m])} <small>(${sgn(delta(p, m))})</small>`; };
  $('clTable').innerHTML = `<thead><tr><th>${esc(s('region'))}</th>${METRICS.map((m) => `<th>${esc(s(`m_${m}`))}</th>`).join('')}</tr></thead><tbody>
    ${D.climate.points.map((p) => `<tr><td>${esc(pname(p))}</td>${METRICS.map((m) => `<td>${cell(p, m)}</td>`).join('')}</tr>`).join('')}</tbody>`;
}

// ---------------- bitta dala: NDVI egri chizig'i + mavsumlar ----------------
const NDVI_YEAR = 2024; // toza bug'doy mavsumi: 2023-11 .. 2024-08 (dala ikki hosilli; 2025 da qishki ekin kuchsiz)
function renderNdvi() {
  if (!D.ndvi) return;
  const cal = CALIBRATION.crops.winter_wheat, chk = cal.check.perYear.find((y) => y.year === NDVI_YEAR);
  const from = `${NDVI_YEAR - 1}-11-01`, to = `${NDVI_YEAR}-08-20`;
  const pts = D.ndvi.series.filter((p) => p.date >= from && p.date <= to);
  $('ndviTitle').textContent = s('ndvi_h', { season: `${NDVI_YEAR - 1}–${NDVI_YEAR}` });
  const W = chartWidth('ndviChart'), narrow = W < 520, Hh = narrow ? 250 : 300, m = { l: 38, r: 12, t: 54, b: 30 };
  const t0 = dayOf(from), t1 = dayOf(to);
  const X = (iso) => m.l + ((dayOf(iso) - t0) / (t1 - t0)) * (W - m.l - m.r);
  const Y = (v) => m.t + (1 - v) * (Hh - m.t - m.b);
  const svg = el('svg', { viewBox: `0 0 ${W} ${Hh}`, width: W, height: Hh, role: 'img', 'aria-label': $('ndviTitle').textContent });
  if (chk?.dates.fao && chk?.dates.observed) svg.append(el('rect', { x: X(chk.dates.fao), y: m.t, width: X(chk.dates.observed) - X(chk.dates.fao), height: Hh - m.t - m.b, class: 'band' }));
  for (const v of [0, 0.25, 0.5, 0.75, 1]) {
    svg.append(el('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: 'grid' }));
    svg.append(el('text', { x: m.l - 6, y: Y(v) + 4, class: 'tick', 'text-anchor': 'end' }, num(v, 2)));
  }
  const months = T().mon;
  let k = 0;
  for (let d = new Date(Date.UTC(NDVI_YEAR - 1, 10, 1)); d < new Date(to); d.setUTCMonth(d.getUTCMonth() + 1), k++) {
    if (narrow && k % 2) continue;
    const iso = d.toISOString().slice(0, 10);
    svg.append(el('text', { x: X(iso), y: Hh - m.b + 16, class: 'tick', 'text-anchor': 'start' }, months[d.getUTCMonth()]));
  }
  let path = '', area = '', open = false, lastX = null;
  pts.forEach((p) => {
    if (p.value == null) { if (open) { area += ` L${lastX} ${Y(0)} Z`; open = false; } return; }
    const px = X(p.date).toFixed(1), py = Y(p.value).toFixed(1);
    if (!open) { path += ` M${px} ${py}`; area += ` M${px} ${Y(0)} L${px} ${py}`; open = true; } else { path += ` L${px} ${py}`; area += ` L${px} ${py}`; }
    lastX = px;
  });
  if (open) area += ` L${lastX} ${Y(0)} Z`;
  svg.append(el('path', { d: area, class: 'area' }));
  svg.append(el('path', { d: path, class: 'line' }));
  pts.filter((p) => p.value != null).forEach((p) => svg.append(el('circle', { cx: X(p.date), cy: Y(p.value), r: 3, class: 'pt' })));
  const valAt = (iso) => { const before = pts.filter((p) => p.value != null && p.date <= iso); return before.length ? before.at(-1).value : null; };
  const mark = (iso, cls, label, ty, anchor) => {
    if (!iso) return;
    const x = X(iso);
    svg.append(el('line', { x1: x, x2: x, y1: ty + 5, y2: Hh - m.b, class: `mk ${cls}` }));
    svg.append(el('text', { x: x + (anchor === 'end' ? -6 : 6), y: ty, class: `mtxt ${cls}`, 'text-anchor': anchor }, label));
  };
  const d5 = (iso) => mmdd(iso?.slice(5));
  mark(chk?.dates.fao, 'fao', `FAO · ${d5(chk?.dates.fao)}`, 16, 'end');
  mark(chk?.dates.observed, 'obs', `MODIS · ${d5(chk?.dates.observed)}`, 16, 'start');
  mark(chk?.dates.model, 'cal', `Neyra · ${d5(chk?.dates.model)}`, 38, 'end');
  $('ndviChart').replaceChildren(svg);
  const nd = (iso) => { const v = valAt(iso); return v == null ? '' : ` (NDVI ${num(v, 2)})`; };
  $('ndviLegend').innerHTML = [
    ['fao', d5(chk?.dates.fao), `${s('ndvi_fao')}${nd(chk?.dates.fao)}`],
    ['obs', d5(chk?.dates.observed), `${s('ndvi_modis')}${nd(chk?.dates.observed)}`],
    ['cal', d5(chk?.dates.model), s('ndvi_cal')],
  ].map(([c, d, txt]) => `<li class="${c}"><i></i><b>${esc(d)}</b> — ${esc(txt)}</li>`).join('');
}
function renderField() {
  const R = D.pilot.natijalar, r0 = R[0];
  const a = r0.period.from.slice(0, 4), b = r0.period.to.slice(0, 4);
  const unit = lang === 'en' ? 'm³/ha' : 'm³/ga';
  const row = (r) => {
    const c = cropById(r.cropId), rp = r.ripen;
    const ripen = rp.applicable ? at('years', { k: rp.matured, n: rp.of }) : s('perennial', { a: rp.cuttings.low, b: rp.cuttings.high });
    const spoil = r.spoilage?.level ? s(`spoil_${r.spoilage.level}`) : at('lv_unknown');
    const cal = rp.gddModel?.source === 'modis' ? ' <span class="tag">MODIS</span>' : '';
    return `<tr><td><b>${esc(c.name[lang])}</b></td><td>${r.sow ? mmdd(r.sow) : '—'}</td><td>${esc(ripen)}${cal}</td>
      <td>${rp.applicable ? mmdd(rp.maturity?.median) : '—'}</td><td class="r">${num(r.water.m3ha.p80)} ${unit}</td><td>${esc(spoil)}</td><td class="r">${num(c.salt.threshold, 1)} dS/m</td></tr>`;
  };
  $('cropTable').innerHTML = `<thead><tr><th>${esc(s('th_crop'))}</th><th>${esc(s('th_sow'))}</th><th>${esc(s('th_ripe'))}</th>
    <th>${esc(s('th_mature'))}</th><th class="r">${esc(s('th_water'))}</th><th>${esc(s('th_spoil'))}</th><th class="r">${esc(s('th_salt'))}</th></tr></thead>
    <tbody>${R.map(row).join('')}</tbody>`;
  const cal = R.find((r) => r.ripen.gddModel?.source === 'modis')?.ripen.gddModel;
  $('cropChips').innerHTML = chip(s('src_power')) + chip(s('src_fao'), '') + (cal ? modisChip(cal) : '') + chip(s('src_ndvi'));
  $('calGrid').innerHTML = R.filter((r) => r.ripen.gddModel?.source === 'modis').map((r) => `
    <div class="calcard"><h3>${esc(cropById(r.cropId).name[lang])}</h3>${calBlock(r)}</div>`).join('');
  renderNdvi();
}

// ---------------- usul: ma'lumotlar jadvali ----------------
function renderData() {
  const span = (key) => { const f = D.gibs.layers[key].frames; return `${f[0]} … ${f.at(-1)}`; };
  const rows = [
    { name: 'NASA POWER daily (MERRA-2 + CERES)', res: s('r_power'), gives: s('g_power'), how: s('h_power') },
    { name: 'MODIS MCD12Q2 v061 phenology', res: s('r_mcd'), gives: s('g_mcd'), how: s('h_mcd') },
    ...NASA_LAYERS.map((l) => ({ name: l.product, res: `${l.res} · ${at(`p_${l.step}`)} · ${span(l.key)}`, gives: s(`g_${l.key}`), how: s('h_gibs') })),
  ];
  $('dataTable').innerHTML = `<thead><tr><th>${esc(s('th_data'))}</th><th>${esc(s('th_res'))}</th><th>${esc(s('th_gives'))}</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td><b>${esc(r.name)}</b><small>${esc(r.how)}</small></td><td>${esc(r.res)}</td><td>${esc(r.gives)}</td></tr>`).join('')}</tbody>`;
}
function renderMethod() {
  $('meTests').textContent = s('me_6', { n: TESTS });
  const dates = [D.climate?.generated, CALIBRATION.generated, D.window?.generated, D.ndvi?.generated].filter(Boolean).sort();
  $('updated').textContent = s('updated', { d: dates.at(-1) });
}

// ---------------- paydo bo'lish ----------------
function reveal() {
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' }) : null;
  document.querySelectorAll('.reveal').forEach((n) => (io ? io.observe(n) : n.classList.add('in')));
}

// ---------------- yig'ish ----------------
function safe(fn, id) {
  try { fn(); } catch (e) {
    console.error(e);
    if (id && $(id)) $(id).innerHTML = `<p class="error">${esc(s('loadErr', { f: id }))}</p>`;
  }
}
function renderAll() {
  applyText();
  document.querySelectorAll('.info').forEach((b) => infoLabel(b, b.getAttribute('aria-expanded') === 'true'));
  try { renderNasa(); } catch (e) { console.error(e); }
  safe(renderStats, 'stats');
  safe(renderProblem, 'priceChart');
  if (D.pilot) { safe(renderDemo, 'demoCards'); safe(renderField, 'cropTable'); }
  safe(renderHarvest, 'herdChart');
  safe(renderWindow, 'winStrip');
  if (D.climate) safe(renderClimate, 'clDetail');
  if (D.gibs) safe(renderData, 'dataTable');
  safe(renderMethod);
}
let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { safe(renderPrice); safe(renderNdvi); }, 200); });
$('lang').onclick = () => { lang = lang === 'en' ? 'uz' : 'en'; store.set('fs-site-lang', lang); renderAll(); };

applyText();
reveal();
infoToggles();
const got = await Promise.allSettled([
  loadJson('web/data/gibs-layers.json'), loadJson('docs/pilot-ekinlar-jarqorgon.json'), loadJson('site/data/climate.json'),
  loadJson('site/data/market-window.json'), loadJson('site/data/field-ndvi.json'), loadJson('site/data/harvest.json'),
]);
['gibs', 'pilot', 'climate', 'window', 'ndvi', 'harvest'].forEach((k, i) => { if (got[i].status === 'fulfilled') D[k] = got[i].value; else if (k !== 'harvest') console.error(got[i].reason); });
if (D.gibs) bigMap().catch(console.error);
if (D.climate) safe(climateMap, 'clMap');
renderAll();
