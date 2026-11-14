// Bitta qatorli ustunli grafik (SVG): har yilgi qiymat + "quruq yil" chizig'i.
// Bosilganda/ustiga kelganda yil va qiymat ko'rsatiladi; jadval ko'rinishi alohida (app.js).
const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}, text) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
}

/** Ustun: nol chizig'iga tayanadi, ma'lumot uchi (musbatda yuqori, manfiyda past) yumaloq */
function barPath(x, y0, y1, w, r) {
  const up = y1 <= y0, h = Math.abs(y0 - y1);
  r = Math.min(r, w / 2, h);
  if (up) return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z`;
  return `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 - r}V${y0}Z`;
}

/**
 * container: HTMLElement; points: [{label, value, tip?}]; ref: {value, label}?; fmt: son formatlovchi
 * Manfiy qiymatlar ham bo'ladi (nol chizig'i o'rtada).
 */
export function barChart(container, { points, ref, fmt, unit }) {
  const W = 340, H = 170, m = { t: 14, r: 8, b: 22, l: 44 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const vals = points.map((p) => p.value).filter((v) => v != null);
  const lo = Math.min(0, ...vals, ref?.value ?? 0);
  const hi = Math.max(0, ...vals, ref?.value ?? 0);
  const span = hi - lo || 1;
  // "chiroyli" qadam: 1, 2, 2.5, 5 x 10^k, ikki-uch chiziq
  const raw = span / 2, mag = 10 ** Math.floor(Math.log10(raw));
  const tickStep = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw);
  const min = Math.floor(lo / tickStep + 1e-9) * tickStep;
  const max = Math.max(Math.ceil(hi / tickStep - 1e-9) * tickStep, min + tickStep);
  const y = (v) => m.t + ph - ((v - min) / (max - min)) * ph;
  const step = pw / points.length, gap = 2, bw = Math.max(1, step - gap);

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img' });
  // to'r chiziqlari (sust)
  for (let k = 0; min + k * tickStep <= max + 1e-9; k++) {
    const v = Math.round((min + k * tickStep) / tickStep) * tickStep, yy = y(v);
    svg.append(el('line', { x1: m.l, x2: W - m.r, y1: yy, y2: yy, class: Math.abs(v) < 1e-9 ? 'axis' : 'grid' }));
    svg.append(el('text', { x: m.l - 6, y: yy + 3, class: 'tick', 'text-anchor': 'end' }, fmt(Math.abs(v) < 1e-9 ? 0 : v)));
  }
  // ustunlar
  const bars = points.map((p, i) => {
    const x = m.l + i * step + gap / 2;
    if (p.value == null) return null;
    const b = el('path', { d: barPath(x, y(0), y(p.value), bw, 2), class: 'bar' });
    svg.append(b);
    return b;
  });
  // x o'qi yorliqlari: birinchi, o'rta, oxirgi
  for (const i of [0, Math.floor(points.length / 2), points.length - 1]) {
    svg.append(el('text', { x: m.l + i * step + step / 2, y: H - 6, class: 'tick', 'text-anchor': 'middle' }, points[i].label));
  }
  // quruq yil chizig'i, to'g'ridan-to'g'ri yorliq bilan
  if (ref?.value != null) {
    const yy = y(ref.value);
    svg.append(el('line', { x1: m.l, x2: W - m.r, y1: yy, y2: yy, class: 'ref' }));
    svg.append(el('text', { x: W - m.r, y: yy - 4, class: 'ref-label', 'text-anchor': 'end' }, `${ref.label}: ${fmt(ref.value)}`));
  }

  // hover / bosish: butun ustun kengligi - nishon
  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  tip.hidden = true;
  const hit = el('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent' });
  svg.append(hit);
  let active = -1;
  const show = (ev) => {
    const r = svg.getBoundingClientRect();
    const sx = ((ev.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(points.length - 1, Math.floor((sx - m.l) / step)));
    if (active >= 0 && bars[active]) bars[active].classList.remove('on');
    active = i;
    if (bars[i]) bars[i].classList.add('on');
    const p = points[i];
    tip.textContent = `${p.tip ?? p.label}: ${p.value == null ? '—' : `${fmt(p.value)}${unit ? ` ${unit}` : ''}`}`;
    tip.hidden = false;
    const left = ((m.l + i * step + step / 2) / W) * r.width;
    tip.style.left = `${Math.max(40, Math.min(r.width - 40, left))}px`;
  };
  const hide = () => {
    tip.hidden = true;
    if (active >= 0 && bars[active]) bars[active].classList.remove('on');
    active = -1;
  };
  hit.addEventListener('pointermove', show);
  hit.addEventListener('pointerdown', show);
  hit.addEventListener('pointerleave', hide);

  const wrap = document.createElement('div');
  wrap.className = 'chart-wrap';
  wrap.append(svg, tip);
  container.append(wrap);
}
