// Bitta qatorli ustunli grafik (SVG): har yilgi qiymat + "quruq yil" chizig'i.
// Bosilganda/ustiga kelganda yil va qiymat ko'rsatiladi; jadval ko'rinishi alohida (app.js).
const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}, text) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
}

/** Yuqori burchaklari yumaloq, pastki tomoni nol chizig'iga tayangan ustun */
function barPath(x, y, w, h, r) {
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/**
 * container: HTMLElement; points: [{label, value}]; ref: {value, label}; fmt: son formatlovchi
 */
export function barChart(container, { points, ref, fmt, unit }) {
  const W = 340, H = 170, m = { t: 14, r: 8, b: 22, l: 44 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const vals = points.map((p) => p.value).filter((v) => v != null);
  const top = Math.max(...vals, ref?.value ?? 0, 1);
  // "chiroyli" qadam: 1, 2, 2.5, 5 x 10^k, ikki-uch chiziq
  const raw = top / 2, mag = 10 ** Math.floor(Math.log10(raw));
  const tickStep = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw);
  const max = Math.ceil(top / tickStep) * tickStep;
  const y = (v) => m.t + ph - (v / max) * ph;
  const step = pw / points.length, gap = 2, bw = Math.max(1, step - gap);

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img' });
  // to'r chiziqlari (sust)
  for (let v = 0; v <= max + 1e-9; v += tickStep) {
    const yy = y(v);
    svg.append(el('line', { x1: m.l, x2: W - m.r, y1: yy, y2: yy, class: v === 0 ? 'axis' : 'grid' }));
    svg.append(el('text', { x: m.l - 6, y: yy + 3, class: 'tick', 'text-anchor': 'end' }, fmt(v)));
  }
  // ustunlar
  const bars = points.map((p, i) => {
    const x = m.l + i * step + gap / 2;
    if (p.value == null) return null;
    const b = el('path', { d: barPath(x, y(p.value), bw, m.t + ph - y(p.value), 2), class: 'bar' });
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
    tip.textContent = `${p.label}: ${p.value == null ? '—' : `${fmt(p.value)} ${unit}`}`;
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
