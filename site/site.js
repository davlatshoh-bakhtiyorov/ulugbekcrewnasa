// Loyiha sayti (GitHub Pages ildizi). Raqamlarning hammasi data fayllaridan va ilova bilan bir xil core/ kodidan:
//  web/data/gibs-layers.json   - NDVI kadrlari (bosh qismdagi animatsiya)
//  docs/pilot-ekinlar-jarqorgon.json - pilot dala natijasi (npm run pilot)
//  site/data/climate.json      - 13 viloyat iqlim siljishi (npm run site-data)
//  core/calibration.js         - NASA MODIS bo'yicha GDD kalibrlash (npm run calibrate)
import { TEXT, SRC, LINKS } from './text.js';
import { t as at, num, mmdd, setLang as setAppLang, fullDate } from '../web/i18n.js';
import { card, calBlock, modisChip, esc } from '../web/cards.js';
import { barChart } from '../web/chart.js';
import { advise } from '../core/advisor.js';
import { CROPS, cropById } from '../core/crops.js';
import { salinityImpact } from '../core/crop-calc.js';
import { NASA_LAYERS, layerByKey, tileTemplate, colorAt } from '../core/gibs.js';
import { CALIBRATION } from '../core/calibration.js';
import { doyToMMDD } from '../core/field.js';

const TESTS = 49; // npm test natijasi (14-noyabr)
const EOX = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg';
const EOX_ATTR = '<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless 2020</a> by EOX';
const GIBS_ATTR = 'NASA <a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener">GIBS</a> / EOSDIS';
const $ = (id) => document.getElementById(id);

// ---------------- til ----------------
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* yo'q */ } } };
let lang = new URLSearchParams(location.search).get('lang') ?? store.get('fs-site-lang') ?? (navigator.language?.toLowerCase().startsWith('uz') ? 'uz' : 'en');
if (!TEXT[lang]) lang = 'en';

function s(key, p = {}) {
  const str = TEXT[lang][key] ?? TEXT.en[key] ?? key;
  return str.replace(/\{(\w+)\}/g, (_, k) => (p[k] ?? `{${k}}`));
}
const sgn = (x, d = 0) => (x == null ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${num(Math.abs(x), d)}`);
const chip = (label, cls = 'nasa', href = null) => (href
  ? `<a class="chip ${cls}" href="${href}" target="_blank" rel="noopener">${esc(label)}</a>`
  : `<span class="chip ${cls}">${esc(label)}</span>`);
const powerChip = (a, b) => chip(`NASA POWER · MERRA-2 + CERES · ~0.5° · ${a}–${b}`);
const EARLY = '1985–2004', LATE = '2006–2025';

function applyText() {
  document.documentElement.lang = lang;
  document.title = s('title');
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = s(el.dataset.t, { n: TESTS }); });
  $('lang').textContent = lang === 'en' ? 'UZ' : 'EN';
  setAppLang(lang);
}

// ---------------- ma'lumot ----------------
const D = {};
async function loadJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

// ---------------- bosh qism: NDVI animatsiyasi ----------------
const H = { idx: 0, timer: null, layers: [], frames: [] };

function heroMap() {
  const def = layerByKey('ndvi');
  H.frames = D.gibs.layers.ndvi.frames;
  const map = L.map('heroMap', {
    zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
    boxZoom: false, keyboard: false, touchZoom: false, attributionControl: true,
  });
  map.fitBounds([[37.15, 66.85], [38.35, 68.15]]);
  L.tileLayer(EOX, { maxZoom: 14, attribution: EOX_ATTR }).addTo(map);
  H.layers = H.frames.map((d) => L.tileLayer(tileTemplate(def, d), {
    maxNativeZoom: def.z, maxZoom: 14, opacity: 0, className: 'nasa-tiles', attribution: GIBS_ATTR,
  }).addTo(map));
  H.idx = H.frames.length - 1;
  H.layers[H.idx].setOpacity(0.85);
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  $('heroPlay').onclick = () => (H.timer ? stopHero() : playHero());
  if (!reduce) playHero(); else stopHero();
  heroLegend(def);
}

function showFrame(i) {
  H.layers[H.idx].setOpacity(0);
  H.idx = i;
  H.layers[H.idx].setOpacity(0.85);
  heroLabel();
}
function playHero() {
  clearInterval(H.timer);
  H.timer = setInterval(() => showFrame((H.idx + 1) % H.frames.length), 1400);
  $('heroPlay').textContent = '❚❚';
  $('heroPlay').setAttribute('aria-label', s('pause'));
}
function stopHero() {
  clearInterval(H.timer);
  H.timer = null;
  $('heroPlay').textContent = '▶';
  $('heroPlay').setAttribute('aria-label', s('play'));
}
function heroLabel() {
  if (!H.frames.length) return;
  $('heroLabel').innerHTML = `${esc(s('heroCap'))} · <b>${esc(fullDate(H.frames[H.idx]))}</b>`;
  $('heroMap').setAttribute('aria-label', `${s('heroCap')} · ${fullDate(H.frames[H.idx])}`);
}
function heroLegend(def) {
  const entries = D.gibs.layers.ndvi.entries, { min, max, ticks } = def.legend;
  const stops = [];
  for (let i = 0; i <= 24; i++) {
    const v = min + ((max - min) * i) / 24, c = colorAt(entries, Math.min(v, max - 1e-6));
    if (c) stops.push(`rgb(${c.join(',')}) ${((i / 24) * 100).toFixed(1)}%`);
  }
  $('heroLegend').innerHTML = `<div class="lg-bar" style="background:linear-gradient(90deg,${stops.join(',')})"></div>
    <div class="lg-ticks">${ticks.map((v, i) => `<span class="${i === 0 ? 'first' : i === ticks.length - 1 ? 'last' : ''}" style="left:${((v - min) / (max - min)) * 100}%">${esc(num(v, Number.isInteger(v) ? 0 : 2))}</span>`).join('')}</div>`;
  $('heroChips').innerHTML = chip(`${def.product} · ${def.res} · ${at('p_16d')}`);
}

// ---------------- raqamlar qatori ----------------
function renderStats() {
  const sur = D.climate.points.find((p) => p.id === 'surkhandarya');
  const wheat = D.pilot.natijalar.find((r) => r.cropId === 'winter_wheat');
  const g = wheat.ripen.gddModel;
  const tiles = [
    { v: `${num(sur.early.heatDays)} → ${num(sur.late.heatDays)}`, l: s('st_heat'), sub: s('st_heatSub', { a: EARLY, b: LATE }) },
    g?.source === 'modis' && {
      v: `${mmdd(g.fao.maturity?.median)} → ${mmdd(wheat.ripen.maturity?.median)}`, l: s('st_wheat'),
      sub: s('st_wheatSub', { n: num(g.observed.n), a: g.observed.years[0], b: g.observed.years[1] }),
    },
    { v: '6', l: s('st_data'), sub: s('st_dataSub') },
  ].filter(Boolean);
  $('stats').innerHTML = tiles.map((x) => `<div class="stat"><b>${esc(x.v)}</b><span>${esc(x.l)}</span><small>${esc(x.sub)}</small></div>`).join('');
}

// ---------------- muammo ----------------
function renderProblem() {
  const en = lang === 'en';
  const T = [
    { v: '≈ 12¢', l: s('pr_t1'), src: SRC.eastfruit },
    { v: en ? '150–200k' : '150–200 ming', l: s('pr_t2'), src: SRC.eastfruit },
    { v: '20–30%', l: s('pr_t3'), src: SRC.uzdaily },
    { v: en ? '4.9%' : '4,9%', l: s('pr_t4'), src: SRC.uzdaily },
  ];
  $('problemTiles').innerHTML = T.map((x) => `<div class="tile"><b>${esc(x.v)}</b><span>${esc(x.l)}</span>${chip(x.src.label, 'src', x.src.url)}</div>`).join('')
    + `<p class="muted small">${esc(s('pr_note'))}</p>`;
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
    <p class="q">${esc(at('qLast'))}</p>
    ${group('lastCrop', [...CROPS.map((c) => [c.id, c.name[lang]]), ['unknown', at('dontKnow')]])}
    <p class="q">${esc(at('qWater'))}</p>
    ${group('water', [['enough', at('water_enough')], ['sometimes', at('water_sometimes')], ['scarce', at('water_scarce')], ['unknown', at('dontKnow')]])}
    <p class="q">${esc(at('qSalt'))}</p>
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
  // Pilot natijasi sho'r "medium" bilan saqlangan; sho'r javobi o'zgarsa, faqat sho'r qismi qayta hisoblanadi (sof funksiya)
  const salinity = ANS.salinity;
  const results = D.pilot.natijalar.map((r) => ({ ...r, salinity: salinityImpact(cropById(r.cropId), salinity) }));
  const a = advise(results, {
    lastCrop: ANS.lastCrop === 'unknown' ? null : ANS.lastCrop,
    water: ANS.water === 'unknown' ? null : ANS.water,
    salinity,
  });
  $('demoCards').innerHTML = a.top.map((o, i) => card(o, i + 1, false)).join('');
}

// ---------------- NASA ma'lumotlari jadvali ----------------
function renderData() {
  const span = (key) => {
    const f = D.gibs.layers[key].frames;
    return `${f[0]} … ${f.at(-1)}`;
  };
  const rows = [
    { name: 'NASA POWER daily (MERRA-2 + CERES)', res: s('r_power'), gives: s('g_power'), how: s('h_power') },
    { name: 'MODIS MCD12Q2 v061 phenology', res: s('r_mcd'), gives: s('g_mcd'), how: s('h_mcd') },
    ...NASA_LAYERS.map((l) => ({
      name: l.product, res: `${l.res} · ${at(`p_${l.step}`)} · ${span(l.key)}`, gives: s(`g_${l.key}`), how: s('h_gibs'),
    })),
  ];
  // "Qanday o'qiymiz" ustuni sarlavha ostida qisqa izoh (title) bo'lib qoladi - jadval tor bo'lsin
  $('dataTable').innerHTML = `<thead><tr><th>${esc(s('th_data'))}</th><th>${esc(s('th_res'))}</th><th>${esc(s('th_gives'))}</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td title="${esc(r.how)}"><b>${esc(r.name)}</b><small>${esc(r.how)}</small></td><td>${esc(r.res)}</td><td>${esc(r.gives)}</td></tr>`).join('')}</tbody>`;
}

// ---------------- iqlim xaritasi ----------------
const METRICS = ['heatDays', 'frostFree', 'lastSpringFrost', 'et0AprSep'];
const C = { metric: 'heatDays', sel: 'surkhandarya', map: null, markers: [] };
// Yaqin markazlar (Farg'ona vodiysi, Toshkent-Sirdaryo-Jizzax, Buxoro-Navoiy) yorlig'i ustma-ust tushmasin:
// yorliq nuqtadan bir necha piksel suriladi (mamlakat masshtabida 1 px ≈ 2-5 km, nuqta o'zi joyida qoladi).
const NUDGE = { tashkent: [-6, -12], syrdarya: [8, 8], jizzakh: [-10, 0], samarkand: [-2, 12], namangan: [-6, -12], andijan: [12, -2], fergana: [-4, 14], navoi: [6, -8], bukhara: [-6, 6] };
const delta = (p, m) => (p.late[m] == null || p.early[m] == null ? null : Math.round(p.late[m] - p.early[m]));
const pname = (p) => p[lang] ?? p.en;

function climateMap() {
  C.map = L.map('clMap', { scrollWheelZoom: false, dragging: !L.Browser.mobile, zoomSnap: 0.25 });
  C.map.fitBounds([[37.1, 56.0], [45.5, 73.9]]);
  L.tileLayer(EOX, { maxZoom: 12, attribution: `${EOX_ATTR} · NASA POWER` }).addTo(C.map);
}

function renderClimate() {
  $('clIntro').textContent = s('cl_p', { a: EARLY, b: LATE });
  $('clMetric').innerHTML = METRICS.map((m) => `<button type="button" class="opt" data-m="${m}" aria-pressed="${C.metric === m}">${esc(s(`m_${m}`))}</button>`).join('');
  $('clMetric').onclick = (e) => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    C.metric = b.dataset.m;
    renderClimate();
  };
  $('clLegend').textContent = `${s('cl_legend', { a: EARLY, b: LATE })} ${s(`m_${C.metric}`)}: ${s(`u_${C.metric}`)}.`;
  C.markers.forEach((m) => m.remove());
  C.markers = D.climate.points.map((p) => {
    const d = delta(p, C.metric);
    const [nx, ny] = NUDGE[p.id] ?? [0, 0];
    const icon = L.divIcon({
      className: 'pin', iconSize: null,
      html: `<button type="button" class="pill${p.id === C.sel ? ' on' : ''}" style="margin:${ny}px 0 0 ${nx}px" aria-label="${esc(`${pname(p)}: ${sgn(d)}`)}">${esc(sgn(d))}</button>`,
    });
    return L.marker([p.lat, p.lon], { icon, keyboard: false, title: pname(p) })
      .on('click', () => { C.sel = p.id; renderClimate(); })
      .addTo(C.map);
  });
  renderClimateDetail();
  renderClimateTable();
  const per = D.climate.points[0].period;
  $('clChips').innerHTML = powerChip(per[0].slice(0, 4), per[1].slice(0, 4)) + chip(at('src_frost_def'), '');
}

function renderClimateDetail() {
  const p = D.climate.points.find((x) => x.id === C.sel);
  const d = (doy) => mmdd(doyToMMDD(doy));
  const rows = [
    ['lastSpringFrost', d], ['firstAutumnFrost', d], ['frostFree', (v) => num(v)], ['heatDays', (v) => num(v)],
    ['jjaTmax', (v) => `${num(v, 1)} °C`], ['et0AprSep', (v) => `${num(v)} mm`],
  ];
  const tr = p.trend.heatDays;
  $('clDetail').innerHTML = `<h3>${esc(pname(p))}</h3>
    <p class="muted small">${p.lat.toFixed(2)}° N, ${p.lon.toFixed(2)}° E · ${esc(s('elev', { m: num(p.elev) }))}</p>
    <table class="shift"><thead><tr><th></th><th>${EARLY}</th><th>${LATE}</th></tr></thead><tbody>
      ${rows.map(([k, f]) => `<tr><td>${esc(s(`row_${k}`))}</td><td>${f(p.early[k])}</td><td>${f(p.late[k])}</td></tr>`).join('')}
    </tbody></table>
    ${tr != null ? `<p class="muted small">${esc(s('row_heatDays'))}: ${sgn(tr, 1)} · ${esc(s('trend'))}</p>` : ''}
    <p class="chart-title">${esc(s('cl_heatChart', { name: pname(p) }))}</p>
    <div id="clChart"></div>`;
  barChart($('clChart'), {
    points: p.heatByYear.map(([y, v]) => ({ label: String(y), value: v })),
    ref: { value: p.early.heatDays, label: s('cl_mean', { a: EARLY }) },
    fmt: (v) => num(v),
    unit: s('u_heatDays'),
  });
}

function renderClimateTable() {
  const head = METRICS.map((m) => `<th>${esc(s(`m_${m}`))}</th>`).join('');
  const d = (doy) => mmdd(doyToMMDD(doy));
  const cell = (p, m) => {
    const f = m === 'lastSpringFrost' ? d : (v) => num(v);
    return `${f(p.early[m])} → ${f(p.late[m])} <small>(${sgn(delta(p, m))})</small>`;
  };
  $('clTable').innerHTML = `<thead><tr><th>${esc(s('region'))}</th>${head}</tr></thead><tbody>
    ${D.climate.points.map((p) => `<tr><td>${esc(pname(p))}</td>${METRICS.map((m) => `<td>${cell(p, m)}</td>`).join('')}</tr>`).join('')}</tbody>`;
}

// ---------------- bitta dala: Jarqo'rg'on ----------------
function renderField() {
  const R = D.pilot.natijalar, r0 = R[0];
  const a = r0.period.from.slice(0, 4), b = r0.period.to.slice(0, 4);
  $('fIntro').textContent = s('f_p', { n: Number(b) - Number(a) + 1, a, b });
  const unit = lang === 'en' ? 'm³/ha' : 'm³/ga';
  const row = (r) => {
    const c = cropById(r.cropId), rp = r.ripen;
    const ripen = rp.applicable ? at('years', { k: rp.matured, n: rp.of }) : s('perennial', { a: rp.cuttings.low, b: rp.cuttings.high });
    const spoil = r.spoilage?.level ? s(`spoil_${r.spoilage.level}`) : at('lv_unknown');
    const cal = rp.gddModel?.source === 'modis' ? ' <span class="tag">MODIS</span>' : '';
    return `<tr><td><b>${esc(c.name[lang])}</b></td><td>${r.sow ? mmdd(r.sow) : '—'}</td><td>${esc(ripen)}${cal}</td>
      <td>${rp.applicable ? mmdd(rp.maturity?.median) : '—'}</td><td>${num(r.water.m3ha.p80)} ${unit}</td><td>${esc(spoil)}</td>
      <td>${num(c.salt.threshold, 1)} dS/m</td></tr>`;
  };
  $('cropTable').innerHTML = `<thead><tr><th>${esc(s('th_crop'))}</th><th>${esc(s('th_sow'))}</th><th>${esc(s('th_ripen'))}</th>
    <th>${esc(s('th_mat'))}</th><th>${esc(s('th_wat'))}</th><th>${esc(s('th_spoil'))}</th><th>${esc(s('th_salt'))}</th></tr></thead>
    <tbody>${R.map(row).join('')}</tbody>`;
  const cal = R.find((r) => r.ripen.gddModel?.source === 'modis')?.ripen.gddModel;
  $('cropChips').innerHTML = powerChip(a, b) + chip('FAO-56 Rev.1 (2025) · Tables 6.1–6.12, 8.8–8.11', '') + (cal ? modisChip(cal) : '');
  $('calGrid').innerHTML = R.filter((r) => r.ripen.gddModel?.source === 'modis').map((r) => `
    <div class="calcard"><h4>${esc(cropById(r.cropId).name[lang])}</h4>${calBlock(r)}
      <div class="chips">${modisChip(r.ripen.gddModel)}</div></div>`).join('');
}

function renderMethod() {
  $('meTests').textContent = s('me_6', { n: TESTS });
  $('updated').textContent = s('updated', { d: [D.climate.generated, CALIBRATION.generated].sort().at(-1) });
}

// ---------------- yig'ish ----------------
function safe(fn, id) {
  try { fn(); } catch (e) {
    console.error(e);
    if (id && $(id)) $(id).innerHTML = `<p class="error">${esc(s('loadErr'))}</p>`;
  }
}

function renderAll() {
  applyText();
  heroLabel();
  if (D.climate && D.pilot) safe(renderStats, 'stats');
  safe(renderProblem, 'problemTiles');
  if (D.pilot) { safe(renderDemo, 'demoCards'); safe(renderField, 'cropTable'); }
  if (D.gibs) safe(renderData, 'dataTable');
  if (D.climate) safe(renderClimate, 'clDetail');
  if (D.climate) safe(renderMethod);
}

$('lang').onclick = () => {
  lang = lang === 'en' ? 'uz' : 'en';
  store.set('fs-site-lang', lang);
  renderAll();
};

applyText();
renderProblem();
const [gibs, pilot, climate] = await Promise.allSettled([
  loadJson('web/data/gibs-layers.json'), loadJson('docs/pilot-ekinlar-jarqorgon.json'), loadJson('site/data/climate.json'),
]);
if (gibs.status === 'fulfilled') D.gibs = gibs.value;
if (pilot.status === 'fulfilled') D.pilot = pilot.value;
if (climate.status === 'fulfilled') D.climate = climate.value;
if (D.gibs) safe(heroMap, 'heroMap');
if (D.climate) safe(climateMap, 'clMap');
renderAll();
