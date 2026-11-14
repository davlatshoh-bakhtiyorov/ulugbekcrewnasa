// Natija kartasi: to'rtta svetofor va bir gaplik izoh. Mini App (app.js) va loyiha sayti (site/) bir xil ishlatadi.
import { t, num, mmdd, getLang, monShort } from './i18n.js';
import { doyToMMDD } from '../core/field.js';
import { CALIBRATION } from '../core/calibration.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------- svetofor va izoh ----------------

export const ICON = { green: '✓', yellow: '!', red: '✕', unknown: '?' };

export function lightValue(kind, l) {
  if (kind === 'water') return l.need != null ? `${num(l.need)} m³/${getLang() === 'en' ? 'ha' : 'ga'}` : '';
  if (kind === 'ripen') {
    if (l.code === 'ripen_perennial') return t('cuts', { a: l.cuttings.low, b: l.cuttings.high });
    return l.of ? t('years', { k: l.matured, n: l.of }) : '';
  }
  if (kind === 'soil' && l.salt) return l.salt.yieldLow === l.salt.yieldHigh ? `${l.salt.yieldLow}%` : `${l.salt.yieldLow}–${l.salt.yieldHigh}%`;
  return '';
}

export function sentence(o) {
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

/** more = false: "Batafsil" tugmasisiz (sayt namunasi uchun) */
export function card(o, rank, more = true) {
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
    ${more ? `<button class="link more" data-detail="${o.cropId}">${t('details')} →</button>` : ''}
  </article>`;
}

// ---- GDD kalibrlash bloki: FAO jadvali va NASA MODIS bo'yicha mavsum uzunligi ----
const doy01 = (m) => (Date.UTC(2001, Number(m.slice(0, 2)) - 1, Number(m.slice(3, 5))) - Date.UTC(2001, 0, 1)) / 864e5 + 1;
const daysAfter = (sow, m) => (doy01(m) - doy01(sow) + 365) % 365; // ekishdan shu kungacha (kabisa bo'lmagan yil)
const andList = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} ${getLang() === 'en' ? 'and' : 'va'} ${a.at(-1)}`);
const sdays = (b) => (b == null ? t('lv_unknown') : `${b > 0 ? '+' : b < 0 ? '−' : ''}${num(Math.abs(b), Number.isInteger(b) ? 0 : 1)}`);

export function modisChip(g) {
  return `<span class="chip nasa" title="doi:${esc(CALIBRATION.source.doi)} · ${esc(CALIBRATION.source.via)}">${esc(t('modisChip', { a: g.observed.years[0], b: g.observed.years[1] }))}</span>`;
}

export function calBlock(r) {
  const g = r.ripen.gddModel, rp = r.ripen, sow = r.sow;
  const ob = g.observed.endDoy, o = { median: doyToMMDD(ob.median), early: doyToMMDD(ob.p25), late: doyToMMDD(ob.p75) };
  const rows = [
    { cls: 'fao', label: t('d_calFao'), gdd: g.faoTotal, m: g.fao.maturity, k: g.fao.matured, n: g.fao.of },
    { cls: 'cal', label: t('d_calModel'), gdd: g.total, m: rp.maturity, k: rp.matured, n: rp.of },
  ];
  const span = Math.max(...[...rows.map((x) => x.m?.late), o.late].filter(Boolean).map((m) => daysAfter(sow, m))) + 12;
  const x = (m) => `${((daysAfter(sow, m) / span) * 100).toFixed(2)}%`;
  const whisk = (m, cls = '') => `<i class="swhisk ${cls}" style="left:${x(m.early)};width:calc(${x(m.late)} - ${x(m.early)})"></i>`;
  const bar = (row) => `<div class="srow">
      <div class="shead"><span>${esc(row.label)}</span><b>${mmdd(row.m?.median)} · ${num(row.gdd)} GDD</b></div>
      <div class="strack" title="${esc(`${row.label}: ${mmdd(row.m?.median)} (${t('d_range')} ${mmdd(row.m?.early)} – ${mmdd(row.m?.late)}), ${t('d_matured')}: ${t('years', { k: row.k, n: row.n })}`)}">
        ${row.m ? `<i class="sbar ${row.cls}" style="width:${x(row.m.median)}"></i>${whisk(row.m)}` : ''}</div></div>`;
  const ticks = [];
  for (let i = 1; i <= 12; i++) {
    const m = `${String(i).padStart(2, '0')}-01`, d = daysAfter(sow, m);
    if (d / span > 0.16 && d < span - 4) ticks.push(`<span style="left:${((d / span) * 100).toFixed(2)}%">${esc(monShort(`2001-${m}`))}</span>`);
  }
  const per = g.check?.perYear ?? [];
  const cool = per.filter((y) => y.n && y.observed != null && y.model == null).map((y) => y.year);
  const cell = (d) => (d ? mmdd(d.slice(5)) : '—');
  return `
      <p class="chart-title">${t('d_calTitle')}</p>
      <div class="season" role="img" aria-label="${esc(t('d_calTitle'))}">
        ${rows.map(bar).join('')}
        <div class="srow">
          <div class="shead"><span>${t('d_calObs')}</span><b>${mmdd(o.median)} <small>(${mmdd(o.early)} – ${mmdd(o.late)})</small></b></div>
          <div class="strack" title="${esc(`${t('d_calObsEnd')}: ${mmdd(o.median)} (p25–p75 ${mmdd(o.early)} – ${mmdd(o.late)})`)}">${whisk(o, 'obs')}<i class="sdot" style="left:${x(o.median)}"></i></div>
        </div>
        <div class="saxis"><span class="first">${t('d_sow0')}</span>${ticks.join('')}</div>
      </div>
      <p class="muted small">${esc(t('d_calNote', {
        n: num(g.observed.n), px: num(g.observed.pixels), a: g.observed.years[0], b: g.observed.years[1],
        end: t(`end_${g.observed.end}`), bias: sdays(g.check?.medianBiasDays), fbias: sdays(g.check?.faoMedianBiasDays),
      }))}</p>
      ${cool.length ? `<p class="note">${esc(t('d_calCool', { years: andList(cool) }))}</p>` : ''}
      <details class="table"><summary>${t('d_calTable')}</summary>
        <table><thead><tr><th>${t('d_year')}</th><th>MODIS</th><th>Model</th><th>FAO</th></tr></thead><tbody>
        ${per.map((y) => `<tr><td>${y.year}</td><td>${cell(y.dates.observed)}</td><td>${y.model == null && y.n ? t('d_frostFirst') : cell(y.dates.model)}</td><td>${cell(y.dates.fao)}</td></tr>`).join('')}
        </tbody></table></details>`;
}
