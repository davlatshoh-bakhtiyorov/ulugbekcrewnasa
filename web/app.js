// Field Shift UZ - dehqon oqimi: dala -> 3 savol -> 3 variant (4 svetofor) -> batafsil (NASA dalillari).
import { powerUrl, parsePower } from '../core/power.js';
import { addEt0 } from '../core/agro.js';
import { CROPS, SOURCES, cropById } from '../core/crops.js';
import { evaluateCrop, SPOILAGE_RULE } from '../core/crop-calc.js';
import { advise, RULES } from '../core/advisor.js';
import { t, num, mmdd, getLang, setLang } from './i18n.js';
import { barChart } from './chart.js';
import { initTelegram, telegramLang, setPrimary, primaryProgress, setBack, haptic, getLocation } from './tg.js';

const START = '19840101', END = '20251231';
const DEMO = { lat: 37.51, lon: 67.42 };

const S = {
  screen: 'field',
  lat: null, lon: null,
  answers: { lastCrop: null, water: null, salinity: null }, // null = hali javob yo'q
  data: null, dataKey: null, dataPromise: null,
  advice: null, detail: null, showOthers: false, error: null,
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
}

function setPoint(lat, lon, fly = true) {
  S.lat = lat; S.lon = lon;
  if (!marker) marker = L.marker([lat, lon]).addTo(map);
  else marker.setLatLng([lat, lon]);
  if (fly) map.setView([lat, lon], 13);
  haptic();
  loadData(lat, lon).catch(() => {}); // oldindan yuklash - savollarga javob berguncha tayyor bo'ladi
  render();
}

// ---------------- svetofor va izoh ----------------

const ICON = { green: '✓', yellow: '!', red: '✕', unknown: '?' };

function lightValue(kind, l) {
  if (kind === 'water') return l.need != null ? `${num(l.need)} m³/${getLang() === 'en' ? 'ha' : 'ga'}` : '';
  if (kind === 'ripen') {
    if (l.code === 'ripen_perennial') return t('cuts', { a: l.cuttings.low, b: l.cuttings.high });
    return l.of ? t('years', { k: l.matured, n: l.of }) : '';
  }
  if (kind === 'soil' && l.salt) return `${l.salt.yieldLow}–${l.salt.yieldHigh}%`;
  return '';
}

function sentence(o) {
  const L = o.lights, R = [];
  if (['green', 'yellow', 'red'].includes(L.water.level)) R.push({ lv: L.water.level, s: t(`r_water_${L.water.level}`) });
  // "neytral" va "noma'lum" - ma'lumot, na plyus, na minus: izohga kirmaydi
  if (!['soil_neutral', 'soil_last_unknown'].includes(L.soil.code)) R.push({ lv: L.soil.rotation, s: t(`r_${L.soil.code}`) });
  if (L.soil.salt && L.soil.salt.level !== 'green') {
    R.push({ lv: L.soil.salt.level, s: t(`r_salt_${L.soil.salt.level}`, { a: L.soil.salt.yieldLow, b: L.soil.salt.yieldHigh }) });
  }
  const m = L.market;
  if (m.code === 'spoil_low') R.push({ lv: 'green', s: t('r_spoil_low') });
  else if (m.code?.startsWith('spoil_')) R.push({ lv: m.level, s: t(`r_${m.code}_${m.driver}`) });
  if (L.ripen.code === 'ripen_perennial') R.push({ lv: 'green', s: t('r_ripen_perennial', { a: L.ripen.cuttings.low, b: L.ripen.cuttings.high }) });
  else if (L.ripen.of) R.push({ lv: L.ripen.level, s: t(`r_${L.ripen.code}`, { k: L.ripen.matured, n: L.ripen.of }) });

  const pos = R.filter((r) => r.lv === 'green').slice(0, 2).map((r) => r.s);
  const neg = (R.find((r) => r.lv === 'red') ?? R.find((r) => r.lv === 'yellow'))?.s;
  let s = pos.join(` ${t('and')} `);
  if (neg) s = s ? `${s}, ${t('but')} ${neg}` : neg;
  return s ? `${s[0].toUpperCase()}${s.slice(1)}.` : '';
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
  $('intro').textContent = t('tagline');
  $('step1').textContent = t('step1');
  $('mapHint').textContent = t('mapHint');
  $('btnLocate').textContent = t('myLocation');
  $('btnDemo').textContent = t('demo');
  $('picked').textContent = S.lat == null ? '' : `${t('picked')}: ${S.lat.toFixed(4)}° N, ${S.lon.toFixed(4)}° E`;
  setBack(null);
  setPrimary(t('next'), () => go('questions'), S.lat != null);
}

function chipGroup(name, options) {
  return `<div class="opts" role="group" data-q="${name}">${options.map(([v, label]) =>
    `<button class="opt" data-v="${v}" aria-pressed="${S.answers[name] === v}">${esc(label)}</button>`).join('')}</div>`;
}

function renderQuestions(el) {
  const lang = getLang();
  el.innerHTML = `
    <h2>${t('step2')}</h2>
    <p class="q">${t('qLast')}</p>
    ${chipGroup('lastCrop', [...CROPS.map((c) => [c.id, c.name[lang]]), ['unknown', t('dontKnow')]])}
    <p class="q">${t('qWater')}</p>
    ${chipGroup('water', [['enough', t('water_enough')], ['sometimes', t('water_sometimes')], ['scarce', t('water_scarce')], ['unknown', t('dontKnow')]])}
    <p class="q">${t('qSalt')}</p>
    ${chipGroup('salinity', [['low', t('salt_low')], ['medium', t('salt_medium')], ['high', t('salt_high')], ['unknown', t('dontKnow')]])}`;
  el.querySelectorAll('.opts').forEach((g) => g.addEventListener('click', (e) => {
    const b = e.target.closest('.opt');
    if (!b) return;
    S.answers[g.dataset.q] = b.dataset.v;
    haptic();
    render();
  }));
  const ready = Object.values(S.answers).every((v) => v != null);
  setBack(() => go('field'));
  setPrimary(t('showResult'), compute, ready);
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
    const results = CROPS.map((c) => evaluateCrop(p.days, c, { salinity }));
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
    setBack(() => go('questions'));
  } else {
    el.innerHTML = `<div class="loading"><div class="spinner" aria-hidden="true"></div><p class="status">${t('loading')}</p></div>`;
    setBack(null);
  }
  setPrimary(null);
}

function card(o, rank) {
  const lang = getLang();
  const kinds = ['water', 'ripen', 'soil', 'market'];
  const sow = o.result.sow ? `<span class="sow">${lang === 'en' ? 'sow' : 'ekish'} ${mmdd(o.result.sow)}</span>` : '';
  return `<article class="card">
    <div class="card-head">${rank ? `<span class="rank">${rank}</span>` : ''}<h3>${esc(o.crop.name[lang])}</h3>${sow}</div>
    <ul class="lights">${kinds.map((k) => {
      const l = o.lights[k];
      return `<li class="light lv-${l.level}"><span class="dot" aria-hidden="true">${ICON[l.level]}</span>
        <span class="lname">${t(`L_${k}`)}</span><span class="lval">${t(`lv_${l.level}`)}${lightValue(k, l) ? ` · ${esc(lightValue(k, l))}` : ''}</span></li>`;
    }).join('')}</ul>
    <p class="why">${esc(sentence(o))}</p>
    <button class="link more" data-detail="${o.cropId}">${t('details')} →</button>
  </article>`;
}

function renderResults(el) {
  const a = S.advice;
  const r0 = a.top[0].result;
  el.innerHTML = `
    <h2>${t('step3')}</h2>
    <p class="meta">${S.lat.toFixed(3)}° N, ${S.lon.toFixed(3)}° E</p>
    <div class="chips">${nasaChip(r0)}</div>
    <p class="muted small">${t('climateNote')}</p>
    ${a.top.map((o, i) => card(o, i + 1)).join('')}
    <button class="link" id="toggleOthers">${S.showOthers ? t('hideOthers') : `${t('others')} (${a.all.length - 3})`}</button>
    ${S.showOthers ? a.all.slice(3).map((o) => card(o, null)).join('') : ''}
    <p class="muted small rules">${t('rulesNote')}</p>
    <div class="row">
      <button class="secondary" id="again">${t('changeAnswers')}</button>
      <button class="secondary" id="newField">${t('newField')}</button>
    </div>`;
  el.querySelectorAll('[data-detail]').forEach((b) => (b.onclick = () => { S.detail = b.dataset.detail; go('details'); }));
  $('toggleOthers').onclick = () => { S.showOthers = !S.showOthers; render(); };
  $('again').onclick = () => go('questions');
  $('newField').onclick = () => go('field');
  setBack(() => go('questions'));
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
      <p class="note">${t('d_gddCaveat')}</p>`
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
      <div class="chips">${nasaChip(r)}${rp.src.map(srcChip).join('')}</div></section>

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
      </ol></section>`;

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
  const field = S.screen === 'field';
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
}

function start() {
  initTelegram();
  setLang(store.get('lang') ?? (telegramLang() === 'en' ? 'en' : 'uz'));
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
}

start();
