// Neyra (Field Shift UZ) - dehqon oqimi: dala -> 3 savol -> 3 variant (4 svetofor) -> batafsil (NASA dalillari).
import { powerUrl, parsePower } from '../core/power.js';
import { addEt0, yearlyStats, climateShift } from '../core/agro.js';
import { greenPeriods, periodsByYear, sameDayCompare, doyToMMDD, GREEN_RULE } from '../core/field.js';
import { layerByKey } from '../core/gibs.js';
import { CROPS, SOURCES, METHODS, cropById } from '../core/crops.js';
import { evaluateCrop, SPOILAGE_RULE } from '../core/crop-calc.js';
import { CALIBRATION } from '../core/calibration.js';
import { advise, RULES } from '../core/advisor.js';
import { t, num, mmdd, getLang, setLang, fullDate, monthName, monShort } from './i18n.js';
import { barChart, lineChart } from './chart.js';
import { ICON, sentence, card, calBlock, modisChip } from './cards.js';
import { initNasaMap, readAt, renderNasa, readSeries, setPassportHandler, fmtValue } from './nasa-map.js';
import { initTelegram, telegramLang, setPrimary, primaryProgress, setBack, haptic, getLocation } from './tg.js';

const START = '19840101', END = '20251231';
// Haqiqiy sug'oriladigan dala, yiliga ikki hosil (MODIS MOD13Q1 NDVI 2026: mart-aprel ~0.7, may 0.27 - yig'im,
// iyul-avgust 0.75). Pilot nuqta 37.51, 67.42 bilan bitta NASA POWER katagida - iqlim natijalari bir xil.
const DEMO = { lat: 37.5021, lon: 67.3888 };

const S = {
  screen: 'field',
  lat: null, lon: null,
  answers: { lastCrop: null, water: null, salinity: null }, // null = hali javob yo'q
  data: null, dataKey: null, dataPromise: null,
  advice: null, detail: null, showOthers: false, error: null,
  q: 0, // qaysi savolda (bittadan ko'rsatiladi)
  nasaFrom: 'results', nasaOpened: false, // "Dala NASA nigohida" ekrani qayerdan ochilgani; birinchi ochilishda NDVI yoqiladi
  pass: null, passFrom: 'nasa', // dala pasporti ma'lumoti va qaysi ekrandan ochilgani
};

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  drop(prefix) { try { Object.keys(localStorage).filter((k) => k.startsWith(prefix)).forEach((k) => localStorage.removeItem(k)); } catch { /* yo'q */ } },
};

// ---------------- NASA POWER ----------------

function loadData(lat, lon) {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (S.dataKey === key && S.dataPromise) return S.dataPromise;
  S.dataKey = key;
  S.data = null;
  S.dataPromise = (async () => {
    let text = store.get(`power:${key}`);
    if (!text) {
      const res = await fetch(powerUrl({ lat, lon, start: START, end: END }));
      if (!res.ok) throw new Error(`POWER HTTP ${res.status}`);
      text = await res.text();
      store.drop('power:'); // faqat oxirgi dala saqlanadi (joy cheklangan)
      store.set(`power:${key}`, text);
    }
    const p = parsePower(JSON.parse(text));
    addEt0(p.days, { lat: p.lat, elev: p.elev });
    if (S.dataKey === key) S.data = p;
    return p;
  })();
  S.dataPromise.catch(() => { if (S.dataKey === key) S.dataPromise = null; });
  return S.dataPromise;
}

// ---------------- xarita ----------------

let map, marker;
function initMap() {
  map = L.map('map', { zoomControl: true, attributionControl: true }).setView([37.95, 67.45], 8);
  const sat = L.tileLayer('https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg', {
    maxZoom: 17, maxNativeZoom: 15,
    attribution: '<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless 2020</a> by EOX (Copernicus Sentinel data 2020)',
  }).addTo(map);
  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  });
  L.control.layers({ 'Sentinel-2': sat, OpenStreetMap: osm }, null, { position: 'topright' }).addTo(map);
  map.on('click', (e) => setPoint(e.latlng.lat, e.latlng.lng, false));
  setPassportHandler(() => { if (S.lat != null) { S.passFrom = 'nasa'; go('passport'); } });
  initNasaMap(map).then(() => { if (S.lat != null) readAt(S.lat, S.lon); }).catch((err) => console.warn('NASA layers:', err));
}

function setPoint(lat, lon, fly = true) {
  S.lat = lat; S.lon = lon;
  if (!marker) marker = L.marker([lat, lon]).addTo(map);
  else marker.setLatLng([lat, lon]);
  if (fly) map.setView([lat, lon], 13);
  haptic();
  loadData(lat, lon).catch(() => {}); // oldindan yuklash - savollarga javob berguncha tayyor bo'ladi
  readAt(lat, lon);
  render();
}

// ---------------- manba belgilari ----------------

function srcChip(src) {
  if (!src) return '';
  const en = getLang() === 'en';
  const d = src.doc ? SOURCES[src.doc]?.short.replace(/\s*\(\d{4}\)$/, '') : null;
  // "6.2" -> jadval; "Eq. 6.20" va boshqalar - o'zicha; hujjat nomi bilan bir xil bo'lsa - tashlab ketiladi
  const table = !src.table || d?.includes(src.table) ? null
    : /^\d/.test(src.table) ? (en ? `Table ${src.table}` : `${src.table}-jadval`) : src.table;
  const page = src.page ? (en ? `p. ${src.page}` : `${src.page}-bet`) : null;
  const parts = [d, table, page].filter(Boolean);
  const label = src.id ? t(`src_${src.id}`) : parts.length ? parts.join(' · ') : src.row;
  return `<span class="chip${src.verified ? '' : ' unv'}" title="${esc(src.row)}">${esc(label)}${src.verified ? '' : ` <b>${t('unverified')}</b>`}</span>`;
}
const chips = (arr) => `<div class="chips">${arr.filter(Boolean).map(srcChip).join('')}</div>`;
function nasaChip(r) {
  return `<span class="chip nasa" title="T2M_MAX, T2M_MIN, T2MDEW, WS2M, ALLSKY_SFC_SW_DWN, PRECTOTCORR">${esc(t('nasaChip', { a: r.period.from.slice(0, 4), b: r.period.to.slice(0, 4) }))}</span>`;
}
const RULE_SRC = { id: 'rule_lights', doc: null, table: null, page: null, verified: false, row: RULES.note };
const SPOIL_SRC = { id: 'rule_spoil', doc: null, table: null, page: null, verified: false, row: SPOILAGE_RULE.note };

// ---------------- ekranlar ----------------

function renderField() {
  const nasa = S.screen === 'nasa';
  $('screen-field').classList.toggle('nasa', nasa);
  $('step1').textContent = t('step1');
  $('mapHint').textContent = t('mapHint');
  $('nasaTitle').textContent = t('nasaScreen');
  $('nasaHint').textContent = t('nasaHint');
  $('btnLocate').textContent = t('myLocation');
  $('btnDemo').textContent = t('demo');
  $('picked').textContent = S.lat == null ? '' : `${t('picked')}: ${S.lat.toFixed(4)}° N, ${S.lon.toFixed(4)}° E`;
  if (nasa) { setBack(() => go(S.nasaFrom)); setPrimary(null); }
  else { setBack(null); setPrimary(t('next'), () => { S.q = 0; go('questions'); }, S.lat != null); }
  renderNasa();
  if (nasa && !S.nasaOpened) { S.nasaOpened = true; setTimeout(() => document.querySelector('#layerBar [data-k="ndvi"]')?.click(), 60); }
}

function chipGroup(name, options) {
  return `<div class="opts big" role="group" data-q="${name}">${options.map(([v, label]) =>
    `<button class="opt" data-v="${v}" aria-pressed="${S.answers[name] === v}">${esc(label)}</button>`).join('')}</div>`;
}

// Uchta savol - bittadan, har birida "Davom etish"
const QS = [
  ['lastCrop', 'qLast', () => [...CROPS.map((c) => [c.id, c.name[getLang()]]), ['unknown', t('dontKnow')]]],
  ['water', 'qWater', () => [['enough', t('water_enough')], ['sometimes', t('water_sometimes')], ['scarce', t('water_scarce')], ['unknown', t('dontKnow')]]],
  ['salinity', 'qSalt', () => [['low', t('salt_low')], ['medium', t('salt_medium')], ['high', t('salt_high')], ['unknown', t('dontKnow')]]],
];

function renderQuestions(el) {
  const i = Math.max(0, Math.min(QS.length - 1, S.q));
  const [name, key, opts] = QS[i];
  const step = t('qStep', { i: i + 1, n: QS.length });
  el.innerHTML = `
    <div class="dots" role="img" aria-label="${esc(step)}">${QS.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'on' : ''}"></i>`).join('')}<span>${esc(step)}</span></div>
    <h2 class="qh">${t(key)}</h2>
    ${chipGroup(name, opts())}`;
  el.querySelector('.opts').addEventListener('click', (e) => {
    const b = e.target.closest('.opt');
    if (!b) return;
    S.answers[name] = b.dataset.v;
    haptic();
    render();
  });
  const last = i === QS.length - 1, ready = S.answers[name] != null;
  setBack(() => { if (i === 0) go('field'); else { S.q = i - 1; go('questions'); } });
  setPrimary(last ? t('showResult') : t('next'), () => { if (last) compute(); else { S.q = i + 1; go('questions'); } }, ready);
}

async function compute() {
  S.error = null;
  go('loading');
  primaryProgress(true);
  try {
    const p = await loadData(S.lat, S.lon);
    $('main').querySelector('.status').textContent = t('computing');
    await new Promise((r) => setTimeout(r, 30));
    const a = S.answers;
    const salinity = a.salinity === 'unknown' ? 'unknown' : a.salinity;
    const results = CROPS.map((c) => evaluateCrop(p.days, c, { salinity, calibration: CALIBRATION }));
    S.advice = advise(results, {
      lastCrop: a.lastCrop === 'unknown' ? null : a.lastCrop,
      water: a.water === 'unknown' ? null : a.water,
      salinity,
    });
    S.showOthers = false;
    go('results');
  } catch (err) {
    S.error = String(err?.message ?? err);
    render();
  } finally {
    primaryProgress(false);
  }
}

function renderLoading(el) {
  if (S.error) {
    el.innerHTML = `<p class="error">${t('loadError')}</p><p class="muted small">${esc(S.error)}</p>
      <button class="secondary" id="retry">${t('retry')}</button>`;
    $('retry').onclick = compute;
    setBack(() => { S.q = QS.length - 1; go('questions'); });
  } else {
    el.innerHTML = `<div class="loading"><div class="spinner" aria-hidden="true"></div><p class="big42"><b>42</b>${t('years42')}</p><p class="status">${t('loading')}</p></div>`;
    setBack(null);
  }
  setPrimary(null);
}


function renderResults(el) {
  const a = S.advice;
  const r0 = a.top[0].result;
  el.innerHTML = `
    <h2>${t('step3')}</h2>
    <p class="meta muted small"><b>${Number(r0.period.to.slice(0, 4)) - Number(r0.period.from.slice(0, 4)) + 1} ${t('yrs')} NASA POWER</b> · ${r0.period.from.slice(0, 4)}–${r0.period.to.slice(0, 4)} · ~0.5° · ${S.lat.toFixed(3)}° N, ${S.lon.toFixed(3)}° E</p>
    ${a.top.map((o, i) => card(o, i + 1)).join('')}
    <button class="navcard" id="openNasa"><b>${t('nasaOpen')}</b><span>${t('nasaOpenSub')}</span><i>→</i></button>
    <button class="link" id="toggleOthers">${S.showOthers ? t('hideOthers') : `${t('others')} (${a.all.length - 3})`}</button>
    ${S.showOthers ? a.all.slice(3).map((o) => card(o, null)).join('') : ''}
    <div class="row">
      <button class="secondary" id="again">${t('changeAnswers')}</button>
      <button class="secondary" id="newField">${t('newField')}</button>
    </div>`;
  el.querySelectorAll('[data-detail]').forEach((b) => (b.onclick = () => { S.detail = b.dataset.detail; go('details'); }));
  $('openNasa').onclick = () => { S.nasaFrom = 'results'; go('nasa'); };
  $('toggleOthers').onclick = () => { S.showOthers = !S.showOthers; render(); };
  $('again').onclick = () => { S.q = 0; go('questions'); };
  $('newField').onclick = () => go('field');
  setBack(() => { S.q = QS.length - 1; go('questions'); });
  setPrimary(null);
}

const kv = (k, v) => `<div class="kv"><span>${esc(k)}</span><b>${v}</b></div>`;

const unitHa = () => (getLang() === 'en' ? 'm³/ha' : 'm³/ga');

function renderDetails(el) {
  const o = S.advice.all.find((x) => x.cropId === S.detail);
  const r = o.result, c = cropById(r.cropId), lang = getLang();
  const w = r.water, rp = r.ripen, L = o.lights;
  const yearsWithWater = r.years.filter((y) => y.status === 'mature' || y.status === 'season');

  const ripenHtml = rp.applicable ? `
      ${kv(t('d_sow'), mmdd(r.sow))}
      ${kv(t('d_matured'), t('years', { k: rp.matured, n: rp.of }))}
      ${kv(t('d_maturity'), `${mmdd(rp.maturity?.median)} <small>(${t('d_range')}: ${mmdd(rp.maturity?.early)} – ${mmdd(rp.maturity?.late)})</small>`)}
      ${r.springFrost ? kv(t('d_springFrost'), t('years', { k: r.springFrost.years, n: r.springFrost.of })) : ''}
      ${rp.gddModel?.source === 'modis' ? calBlock(r) : `<p class="note">${t('d_gddCaveat')}</p>`}`
    : `${kv(t('d_cuttings'), t('cuts', { a: rp.cuttings.low, b: rp.cuttings.high }))}
       ${kv(t('d_season'), `${num(rp.seasonDays)} ${t('days')}`)}`;

  const s = r.salinity;
  const saltHtml = s ? `${kv(`${t('d_salt')} (ECe ${s.ece[0]}–${s.ece[1]} dS/m)`, `${Math.round(s.yieldPct[1])}–${Math.round(s.yieldPct[0])}%`)}
      ${chips([...s.src, c.salt.fao29?.src])}` : `<p class="muted">${t('d_saltNone')}</p>`;

  const sp = r.spoilage;
  const marketHtml = sp.level ? `
      <p class="muted small">${t('d_window', { n: sp.windowDays })}</p>
      ${kv(t('d_rainDays'), num(sp.rainDays, 1))}
      ${kv(t('d_tmax'), `${num(sp.meanTmax, 1)} °C`)}
      ${kv(t('d_rh'), `${num(sp.meanRh)}%`)}
      <div class="chips">${nasaChip(r)}${srcChip(SPOIL_SRC)}</div>`
    : `<p class="muted">${esc(sp.reason ?? '')}</p>`;

  el.innerHTML = `
    <h2>${esc(c.name[lang])}</h2>
    <p class="why">${esc(sentence(o))}</p>

    <section class="block"><h3>${t('d_water')}</h3>
      ${kv(t('d_waterMedian'), `${num(w.m3ha.median)} ${unitHa()}`)}
      ${kv(t('d_waterDry'), `${num(w.m3ha.p80)} ${unitHa()}`)}
      ${kv(t('d_etc'), `${num(w.etcMm)} mm`)}
      ${kv(t('d_peff'), `${num(w.peffMm)} mm`)}
      ${kv(t('d_kcmid'), num(w.kcMid, 2))}
      <p class="muted small">${t('d_waterNote')}</p>
      <p class="chart-title">${t('d_chart')}</p>
      <div id="chart"></div>
      <details class="table"><summary>${t('d_table')}</summary>
        <table><thead><tr><th>${t('d_year')}</th><th>${unitHa()}</th></tr></thead><tbody>
        ${yearsWithWater.map((y) => `<tr><td>${y.year}</td><td>${y.nirMm == null ? '—' : num(y.nirMm * 10)}</td></tr>`).join('')}
        </tbody></table></details>
      <div class="chips">${nasaChip(r)}${w.src.map(srcChip).join('')}</div>
    </section>

    <section class="block"><h3>${t('d_ripen')}</h3>${ripenHtml}
      <div class="chips">${nasaChip(r)}${rp.gddModel?.source === 'modis' ? modisChip(rp.gddModel) : ''}${rp.src.map(srcChip).join('')}</div></section>

    <section class="block"><h3>${t('d_heat')}</h3>
      ${kv(t('d_heatDays', { t: r.heat.tUpper, stage: t(rp.applicable ? 'stage_mid' : 'stage_season') }), `${num(r.heat.days.median)} ${t('days')}`)}
      ${kv(t('d_heatMax'), `${num(r.heat.days.max)} ${t('days')}`)}
      <div class="chips">${nasaChip(r)}${r.heat.src.map(srcChip).join('')}</div></section>

    <section class="block"><h3>${t('d_soil')}</h3>
      ${kv(t('d_rotation'), `<span class="lv-txt lv-${L.soil.rotation}">${ICON[L.soil.rotation]} ${esc(t(`r_${L.soil.code}`))}</span>`)}
      ${chips([RULE_SRC])}
      ${saltHtml}</section>

    <section class="block"><h3>${t('d_market')}</h3>${marketHtml}
      <p class="muted">${t('d_price')}</p></section>

    <section class="block"><h3>${t('d_sources')}</h3>
      <ol class="refs">
        <li>NASA Langley Research Center, POWER Project — daily point API, community AG (MERRA-2; CERES SRB/SYN1deg). <a href="https://power.larc.nasa.gov/" target="_blank" rel="noopener">power.larc.nasa.gov</a></li>
        ${Object.values(SOURCES).map((x) => `<li>${esc(x.cite)} <a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url.replace(/^https?:\/\//, ''))}</a></li>`).join('')}
      </ol>
      <p class="muted small">${t('climateNote')}</p>
      <p class="muted small">${t('rulesNote')}</p></section>`;

  barChart($('chart'), {
    points: yearsWithWater.map((y) => ({ label: String(y.year), value: y.nirMm == null ? null : y.nirMm * 10 })),
    ref: { value: w.m3ha.p80, label: t('d_chartRef') },
    fmt: (v) => num(Math.round(v / 10) * 10),
    unit: unitHa(),
  });
  setBack(() => go('results'));
  setPrimary(null);
  window.scrollTo(0, 0);
}

// ---------------- dala pasporti ----------------

function loadPassport() {
  const key = `${S.lat.toFixed(4)},${S.lon.toFixed(4)}`;
  if (S.pass?.key === key) return S.pass;
  const P = { key, ndvi: null, ndviDone: 0, ndviTotal: 0, soil: null, climate: null, err: {} };
  S.pass = P;
  const { lat, lon } = S;
  const upd = () => { if (S.pass === P) refreshPassport(); };
  readSeries('ndvi', lat, lon, (d, n) => {
    P.ndviDone = d; P.ndviTotal = n;
    const el = document.getElementById('ppProg');
    if (el && S.pass === P) el.textContent = `${t('reading')} ${d}/${n}`;
  }).then((r) => { P.ndvi = r; upd(); }).catch((e) => { P.err.ndvi = String(e); upd(); });
  readSeries('soil', lat, lon).then((r) => { P.soil = r; upd(); }).catch((e) => { P.err.soil = String(e); upd(); });
  loadData(lat, lon).then((p) => {
    const stats = yearlyStats(p.days);
    P.climate = { stats, shift: climateShift(stats), period: { from: p.days[0].date, to: p.days[p.days.length - 1].date } };
    upd();
  }).catch((e) => { P.err.climate = String(e); upd(); });
  return P;
}

function refreshPassport() {
  if (S.screen === 'passport') renderPassport($('main'), true);
}

/** Pasportning qisqa xulosalari (natija ekrani va pasport boshida) */
function passportFacts(P) {
  const f = [];
  if (P.ndvi) {
    const by = periodsByYear(greenPeriods(P.ndvi), P.ndvi).filter((y) => !y.partial);
    const last = by[by.length - 1];
    if (last) f.push(t(last.count === 1 ? 'pp_factGreen1' : 'pp_factGreen', { y: last.year, n: last.count }));
  }
  if (P.soil) {
    const c = sameDayCompare(P.soil);
    if (c?.median != null) f.push(t('pp_factSoil', { v: fmtValue('soil', c.today.v), k: c.wetter, n: c.of }));
  }
  if (P.climate) {
    const { early, late } = P.climate.shift;
    f.push(t('pp_factHeat', { a: num(early.heatDays), b: num(late.heatDays) }));
  }
  return f;
}

const monthRange = (a, b) => {
  const ma = monthName(a), mb = monthName(b);
  return ma === mb ? ma : `${ma}–${mb}`;
};

function ndviBlock(P) {
  const def = layerByKey('ndvi');
  const head = `<h3>${t('pp_ndviTitle')}</h3><p class="muted small">${t('pp_ndviHint')}</p>`;
  const chipsHtml = `<div class="chips"><span class="chip nasa">${esc(`NASA · ${def.product} · ${def.res} · ${t('p_16d')}`)}${P.ndvi ? esc(` · ${fullDate(P.ndvi[0].date)} – ${fullDate(P.ndvi[P.ndvi.length - 1].date)}`) : ''}</span>
    <span class="chip" title="${esc(t('methodLong'))}">${esc(t('method'))}</span>
    <span class="chip unv" title="${esc(GREEN_RULE.note)}">${esc(t('pp_greenRule'))} <b>${t('unverified')}</b></span></div>`;
  if (P.err.ndvi) return `${head}<p class="error">${t('pp_err')}</p>${chipsHtml}`;
  if (!P.ndvi) return `${head}<p class="muted small" id="ppProg">${t('reading')} ${P.ndviDone}/${P.ndviTotal || '…'}</p>${chipsHtml}`;
  const periods = greenPeriods(P.ndvi);
  const by = periodsByYear(periods, P.ndvi);
  const rows = by.map((y) => {
    const desc = y.count
      ? y.periods.map((p) => `${monthRange(p.start, p.end)} (${t('pp_peak')} ${num(p.peak, 2)})`).join('; ')
      : t('pp_noGreen');
    const part = y.partial ? ` <small class="muted">${t('pp_partial', { a: monthName(y.from), b: monthName(y.to) })}</small>` : '';
    return `<div class="yrow"><b>${y.year}</b><span>${y.count ? `<b>${t(y.count === 1 ? 'pp_nGreen1' : 'pp_nGreen', { n: y.count })}</b>: ` : ''}${esc(desc)}${part}</span></div>`;
  }).join('');
  return `${head}<div id="ppNdvi"></div><div class="years">${rows}</div>
    <details class="table"><summary>${t('d_table')}</summary><table><thead><tr><th>${t('date')}</th><th>NDVI</th></tr></thead><tbody>
    ${P.ndvi.map((p) => `<tr><td>${esc(fullDate(p.actual ?? p.date))}</td><td>${p.value == null ? '—' : num(p.value, 2)}</td></tr>`).join('')}
    </tbody></table></details>${chipsHtml}`;
}

function soilBlock(P) {
  const def = layerByKey('soil');
  const head = `<h3>${t('pp_soilTitle')}</h3>`;
  const chip = `<div class="chips"><span class="chip nasa">${esc(`NASA · ${def.product} · ${def.res} · ${t('p_1d')}`)}${P.soil ? esc(` · ${P.soil[0].date.slice(0, 4)}–${P.soil[P.soil.length - 1].date.slice(0, 4)}`) : ''}</span>
    <span class="chip" title="${esc(t('methodLong'))}">${esc(t('method'))}</span></div>`;
  if (P.err.soil) return `${head}<p class="error">${t('pp_err')}</p>${chip}`;
  if (!P.soil) return `${head}<p class="muted small">${t('reading')}</p>${chip}`;
  const c = sameDayCompare(P.soil);
  const today = P.soil[P.soil.length - 1];
  const rows = c?.median != null ? `
    ${kv(t('pp_today', { d: fullDate(today.actual ?? today.date) }), esc(fmtValue('soil', today.v)))}
    ${kv(t('pp_median', { a: c.from, b: c.to }), `${num(c.median, 3)} m³/m³`)}
    ${kv(t('pp_wetter'), t('years', { k: c.wetter, n: c.of }))}` : `<p class="muted">${t('pp_soilNone')}</p>`;
  return `${head}<p class="muted small">${t('pp_soilHint')}</p>${rows}<div id="ppSoil"></div>${chip}<p class="muted small">${t('desc_soil')}</p>`;
}

function climateBlock(P) {
  const head = `<h3>${t('pp_climTitle')}</h3>`;
  if (P.err.climate) return `${head}<p class="error">${t('loadError')}</p>`;
  if (!P.climate) return `${head}<p class="muted small">${t('loading')}</p>`;
  const { early, late } = P.climate.shift;
  const row = (label, a, b, worse) => `<tr><td>${esc(label)}</td><td>${a}</td><td class="${worse ? 'up' : ''}">${b}</td></tr>`;
  const d = (doy) => mmdd(doyToMMDD(doy));
  const range = (r) => `${r[0]}–${r[1]}`;
  return `${head}<p class="muted small">${t('pp_climHint')}</p>
    <table class="shift"><thead><tr><th></th><th>${range(early.range)}</th><th>${range(late.range)}</th></tr></thead><tbody>
      ${row(t('pp_lastFrost'), d(early.lastSpringFrost), d(late.lastSpringFrost))}
      ${row(t('pp_firstFrost'), d(early.firstAutumnFrost), d(late.firstAutumnFrost))}
      ${row(t('pp_frostFree'), num(early.frostFree), num(late.frostFree))}
      ${row(t('pp_heatDays'), num(early.heatDays), num(late.heatDays), late.heatDays > early.heatDays)}
      ${row(t('pp_jjaTmax'), `${num(early.jjaTmax, 1)} °C`, `${num(late.jjaTmax, 1)} °C`, late.jjaTmax > early.jjaTmax)}
      ${row(t('pp_et0'), `${num(early.et0AprSep)} mm`, `${num(late.et0AprSep)} mm`, late.et0AprSep > early.et0AprSep)}
    </tbody></table>
    <p class="note">${t('pp_et0Note')}</p>
    <p class="chart-title">${t('pp_heatChart')}</p><div id="ppHeat"></div>
    <div class="chips"><span class="chip nasa">${esc(t('nasaChip', { a: P.climate.period.from.slice(0, 4), b: P.climate.period.to.slice(0, 4) }))}</span>${srcChip(METHODS.frost)}</div>`;
}

function renderPassport(el, keepScroll = false) {
  const P = loadPassport();
  const y = window.scrollY;
  const facts = passportFacts(P);
  el.innerHTML = `
    <h2>${t('passport')}</h2>
    <p class="meta">${S.lat.toFixed(4)}° N, ${S.lon.toFixed(4)}° E</p>
    ${facts.length ? `<ul class="facts">${facts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    <section class="block">${ndviBlock(P)}</section>
    <section class="block">${soilBlock(P)}</section>
    <section class="block">${climateBlock(P)}</section>`;

  if (P.ndvi) {
    const periods = greenPeriods(P.ndvi);
    const idx = (d) => P.ndvi.findIndex((p) => p.date === d);
    const xTicks = [];
    P.ndvi.forEach((p, i) => { if (i === 0 || p.date.slice(0, 4) !== P.ndvi[i - 1].date.slice(0, 4)) xTicks.push({ i, label: p.date.slice(0, 4) }); });
    if (xTicks.length > 1 && xTicks[1].i < P.ndvi.length * 0.1) xTicks.shift(); // birinchi yil juda qisqa - yorliqlar ustma-ust tushmasin
    lineChart($('ppNdvi'), {
      points: P.ndvi.map((p) => ({ value: p.value, tip: fullDate(p.actual ?? p.date) })),
      yTicks: [0, 0.25, 0.5, 0.75, 1],
      xTicks,
      ref: { value: GREEN_RULE.on, label: t('pp_greenLine') },
      bands: periods.map((p) => ({ i0: idx(p.start), i1: idx(p.end) })),
      fmt: (v) => num(v, 2),
      unit: '',
    });
  }
  if (P.soil && $('ppSoil')) {
    const c = sameDayCompare(P.soil);
    // har yil bitta ustun; ma'lumot yo'q yil bo'sh qoladi (vaqt o'qi halol)
    const byYear = new Map(P.soil.map((p) => [Number(p.date.slice(0, 4)), p]));
    const y0 = Number(P.soil[0].date.slice(0, 4)), y1 = Number(P.soil[P.soil.length - 1].date.slice(0, 4));
    const pts = [];
    for (let yr = y0; yr <= y1; yr++) {
      const p = byYear.get(yr);
      pts.push(p ? { label: String(yr), tip: fullDate(p.actual ?? p.date), value: p.value, hl: yr === y1 }
        : { label: String(yr), tip: String(yr), value: null });
    }
    barChart($('ppSoil'), {
      points: pts,
      ref: c?.median != null ? { value: c.median, label: t('pp_medianShort') } : null,
      fmt: (v) => num(v, 3),
      unit: 'm³/m³',
    });
  }
  if (P.climate) {
    const s = P.climate.stats.filter((r) => r.complete);
    barChart($('ppHeat'), {
      points: s.map((r) => ({ label: String(r.year), value: r.heatDays })),
      fmt: (v) => num(v),
      unit: t('days'),
    });
  }
  setBack(() => go(S.passFrom));
  setPrimary(null);
  if (keepScroll) window.scrollTo(0, y);
}

// ---------------- boshqaruv ----------------

function go(screen) {
  S.screen = screen;
  render();
  if (screen !== 'details') window.scrollTo(0, 0);
}

function render() {
  document.documentElement.lang = getLang();
  document.title = t('title');
  $('title').textContent = t('title');
  $('lang').textContent = t('lang');
  const field = S.screen === 'field' || S.screen === 'nasa';
  $('screen-field').hidden = !field;
  $('main').hidden = field;
  if (field) {
    renderField();
    setTimeout(() => map?.invalidateSize(), 0);
    return;
  }
  const el = $('main');
  if (S.screen === 'questions') renderQuestions(el);
  else if (S.screen === 'loading') renderLoading(el);
  else if (S.screen === 'results') renderResults(el);
  else if (S.screen === 'details') renderDetails(el);
  else if (S.screen === 'passport') renderPassport(el);
}

function start() {
  initTelegram();
  if (new URLSearchParams(location.search).get('safe') === '1') document.documentElement.classList.add('safe'); // taqdimot ramkasi: home-bar uchun joy
  const qt = new URLSearchParams(location.search).get('theme'); if (qt === 'dark' || qt === 'light') document.documentElement.setAttribute('data-theme', qt); // ?theme= taqdimotdan: ramka bilan bir xil rejim
  const ql = new URLSearchParams(location.search).get('lang'); // ?lang=uz|en (sayt / taqdimotdan ochilganda)
  setLang(ql === 'en' || ql === 'uz' ? ql : (store.get('lang') ?? (telegramLang() === 'en' ? 'en' : 'uz')));
  if (ql === 'en' || ql === 'uz') store.set('lang', ql);
  $('lang').onclick = () => {
    setLang(getLang() === 'uz' ? 'en' : 'uz');
    store.set('lang', getLang());
    render();
  };
  $('btnDemo').onclick = () => setPoint(DEMO.lat, DEMO.lon);
  $('btnLocate').onclick = async () => {
    $('picked').textContent = t('locating');
    try {
      const p = await getLocation();
      setPoint(p.lat, p.lon);
    } catch {
      $('picked').textContent = t('locError');
    }
  };
  initMap();
  render();
  // Bot lokatsiya yuborganda (?lat=..&lon=..) yoki t.me/.../app?startapp=lat_lon havolasi bilan ochilsa - dala tayyor
  const q = new URLSearchParams(location.search);
  const sp = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  const [la, lo] = q.has('lat') && q.has('lon') ? [q.get('lat'), q.get('lon')] : (typeof sp === 'string' && sp.includes('_') ? sp.split('_') : []);
  const lat = Number(la), lon = Number(lo);
  if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && la !== undefined) setPoint(lat, lon);
}

start();
