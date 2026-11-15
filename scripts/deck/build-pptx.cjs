// Neyra pitch deck -> PPTX (pptxgenjs), dark, EN + UZ. node build-pptx.cjs -> Neyra-pitch.pptx (EN), Neyra-pitch-uz.pptx
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const { TEAM, L, shot } = require('./strings.cjs');
const here = __dirname;
const P = (f) => path.join(here, f);
const has = (f) => fs.existsSync(P(f));
const C = { bg: '0B0F0D', card: '141A16', line: '26302A', text: 'EEF2EE', muted: 'A7B0A9', dim: '7F8A82', acc: '4CC27A', accD: '0F7F45', warn: 'E3A008', bad: 'D64545' };
const F = 'Arial';

async function build(lang) {
  const T = L[lang], sh = (n) => shot(lang, n);
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.author = 'Team ulugbek-crew'; pres.title = `Neyra - ${T.tag}`; pres.subject = 'NASA Space Apps Challenge 2026';
  pres.defineSlideMaster({
    title: 'DARK', background: { color: C.bg },
    objects: [
      { image: { x: 0.6, y: 6.95, w: 0.28, h: 0.28, path: P('logo.png') } },
      { text: { text: T.foot, options: { x: 0.95, y: 6.92, w: 7, h: 0.34, fontFace: F, fontSize: 10, color: C.dim, margin: 0 } } },
    ],
    slideNumber: { x: 12.3, y: 6.92, w: 0.5, h: 0.34, fontFace: F, fontSize: 10, color: C.dim, align: 'right' },
  });
  const X = (slide, text, o) => slide.addText(text, { fontFace: F, color: C.text, margin: 0, isTextBox: true, valign: 'top', ...o });
  const eyebrow = (slide, s) => X(slide, s.toUpperCase(), { x: 0.6, y: 0.5, w: 8, h: 0.3, fontSize: 11, bold: true, color: C.acc, charSpacing: 3 });
  const title = (slide, s, w = 11.5) => X(slide, s, { x: 0.6, y: 0.8, w, h: 0.9, fontSize: 36, bold: true, color: 'FFFFFF' });
  const card = (slide, x, y, w, h) => slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: C.card }, line: { color: C.line, width: 0.75 } });
  const dot = (slide, x, y, color, d = 0.22) => slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color }, line: { color, width: 0 } });
  const img = (slide, f, o) => { if (has(f)) slide.addImage({ path: P(f), ...o }); };
  const sec = (name) => { pres.addSection({ title: name }); return name; };

  let s = pres.addSlide({ masterName: 'DARK', sectionTitle: sec('1') });
  img(s, 'logo.png', { x: 1.2, y: 1.9, w: 3.2, h: 3.2 });
  X(s, T.wm, { x: 1.2, y: 5.25, w: 3.2, h: 0.3, fontSize: 9, color: C.dim });
  X(s, 'Neyra', { x: 5.6, y: 1.75, w: 7, h: 1.3, fontSize: 80, bold: true, color: 'FFFFFF' });
  X(s, T.tag, { x: 5.6, y: 3.05, w: 7, h: 0.7, fontSize: 34, bold: true, color: C.acc });
  X(s, T.sub, { x: 5.6, y: 3.75, w: 7, h: 0.5, fontSize: 18, color: C.muted });
  X(s, [{ text: T.team, options: { bold: true, color: C.text } }, { text: ' · ' + TEAM.map((m) => m.name).join(' · '), options: { color: C.muted } }], { x: 5.6, y: 4.65, w: 7.2, h: 0.5, fontSize: 13 });
  X(s, `${T.event}\n${T.chal}`, { x: 5.6, y: 5.15, w: 7.2, h: 0.7, fontSize: 13, color: C.muted });

  s = pres.addSlide({ masterName: 'DARK', sectionTitle: sec('2') });
  eyebrow(s, T.e2); title(s, T.h2);
  T.covers.forEach(([f, cap, src], i) => {
    const x = 0.6 + (i % 2) * 4.05, y = 1.9 + Math.floor(i / 2) * 2.45;
    img(s, f, { x, y, w: 3.9, h: 1.85, sizing: { type: 'cover', w: 3.9, h: 1.85 } });
    X(s, cap, { x, y: y + 1.9, w: 3.9, h: 0.3, fontSize: 12, bold: true });
    X(s, src, { x, y: y + 2.15, w: 3.9, h: 0.25, fontSize: 10, color: C.dim });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.95, y: 1.9, w: 3.8, h: 4.75, rectRadius: 0.14, fill: { color: C.accD }, line: { color: C.accD, width: 0 } });
  X(s, T.quote, { x: 9.25, y: 2.9, w: 3.2, h: 0.9, fontSize: 26, bold: true, color: 'FFFFFF', align: 'center' });
  if (T.quote2) X(s, T.quote2, { x: 9.25, y: 3.85, w: 3.2, h: 0.8, fontSize: 16, color: 'FFFFFF', align: 'center' });
  X(s, T.quoteBy, { x: 9.25, y: 4.95, w: 3.2, h: 0.5, fontSize: 11, color: 'D7F2E1', align: 'center' });

  s = pres.addSlide({ masterName: 'DARK', sectionTitle: sec('3') });
  eyebrow(s, T.e3); title(s, T.h3);
  X(s, T.big, { x: 0.6, y: 2.0, w: 5.2, h: 2.0, fontSize: 150, bold: true, color: C.acc });
  X(s, T.bigUnit, { x: 0.7, y: 4.0, w: 5.5, h: 0.5, fontSize: 26, bold: true, color: 'FFFFFF' });
  X(s, T.bigCap, { x: 0.7, y: 4.55, w: 5.6, h: 0.8, fontSize: 18, color: C.muted });
  X(s, T.est, { x: 0.7, y: 6.1, w: 7, h: 0.5, fontSize: 9, color: C.dim });
  card(s, 7.3, 2.0, 5.4, 1.9); X(s, T.n1, { x: 7.6, y: 2.15, w: 5, h: 1.0, fontSize: 60, bold: true, color: 'FFFFFF' });
  X(s, T.n1c, { x: 7.6, y: 3.15, w: 4.9, h: 0.6, fontSize: 13, color: C.muted });
  card(s, 7.3, 4.1, 5.4, 1.9); X(s, T.n2, { x: 7.6, y: 4.25, w: 5, h: 1.0, fontSize: 60, bold: true, color: 'FFFFFF' });
  X(s, T.n2c, { x: 7.6, y: 5.25, w: 4.9, h: 0.6, fontSize: 13, color: C.muted });

  s = pres.addSlide({ masterName: 'DARK', sectionTitle: sec('4') });
  eyebrow(s, T.e4); title(s, T.h4.replace('. ', '.\n'));
  img(s, sh('loop'), { x: 0.6, y: 1.95, w: 4.3, h: 4.3 });
  T.causes.forEach((c, i) => {
    const y = 2.15 + i * 1.05;
    dot(s, 5.6, y + 0.05, C.acc, 0.4); X(s, '✓', { x: 5.6, y: y + 0.07, w: 0.4, h: 0.36, fontSize: 16, bold: true, color: C.bg, align: 'center' });
    X(s, c, { x: 6.2, y, w: 6.5, h: 0.6, fontSize: 22, bold: true });
  });
  X(s, T.demand, { x: 6.2, y: 5.5, w: 6.5, h: 0.8, fontSize: 14, color: C.muted });

  s = pres.addSlide({ masterName: 'DARK', sectionTitle: sec('5') });
  eyebrow(s, T.e5); title(s, T.h5);
  ['phone-field', 'phone-questions', 'phone-results'].forEach((f, i) => {
    const x = 0.6 + i * 2.35;
    img(s, sh(f), { x, y: 1.95, w: 2.1, h: 4.55 });
    X(s, T.phones[i], { x, y: 6.55, w: 2.1, h: 0.3, fontSize: 11, color: C.muted, align: 'center' });
  });
  [C.acc, C.acc, C.warn, C.bad].forEach((c, i) => { const y = 2.2 + i * 0.62; dot(s, 7.9, y + 0.07, c, 0.26); X(s, T.lights[i], { x: 8.3, y, w: 4.5, h: 0.45, fontSize: 20, bold: true }); });
  X(s, T.prod, { x: 7.9, y: 4.9, w: 4.9, h: 1.3, fontSize: 15, color: C.muted });

  s = pres.addSlide({ masterName: 'DARK', sectionTitle: sec('6') });
  eyebrow(s, T.e6); title(s, T.h6);
  const cw = 3.95, cy = 1.95, ch = 4.75;
  [0, 1, 2].forEach((i) => card(s, 0.6 + i * (cw + 0.13), cy, cw, ch));
  X(s, T.p1, { x: 0.8, y: 2.1, w: 3.6, h: 0.4, fontSize: 16, bold: true });
  img(s, sh('map'), { x: 0.8, y: 2.6, w: 3.55, h: 3.3, sizing: { type: 'cover', w: 3.55, h: 3.3 } });
  X(s, T.p2, { x: 4.88, y: 2.1, w: 3.6, h: 0.7, fontSize: 16, bold: true });
  img(s, sh('ndvi'), { x: 4.88, y: 2.95, w: 3.55, h: 1.48 });
  X(s, T.p2c, { x: 4.88, y: 4.6, w: 3.55, h: 1.2, fontSize: 12, color: C.muted });
  X(s, T.p3, { x: 8.96, y: 2.1, w: 3.6, h: 0.4, fontSize: 16, bold: true });
  X(s, [{ text: '30 · 35 · 62', options: { fontSize: 44, bold: true, color: C.acc } }, { text: ` ${T.days}`, options: { fontSize: 16, color: C.muted } }], { x: 8.96, y: 2.55, w: 3.6, h: 0.9 });
  X(s, T.p3c, { x: 8.96, y: 3.45, w: 3.55, h: 0.9, fontSize: 12, color: C.muted });
  img(s, sh('window'), { x: 8.96, y: 4.4, w: 3.55, h: 2.1, sizing: { type: 'cover', w: 3.55, h: 2.1 } });

  s = pres.addSlide({ masterName: 'DARK', sectionTitle: sec('7') });
  eyebrow(s, T.e7); title(s, T.h7, 12.2);
  TEAM.forEach((m, i) => {
    const x = 0.6 + i * 2.75;
    if (has(m.photo)) s.addImage({ path: P(m.photo), x: x + 0.55, y: 2.05, w: 1.6, h: 1.6, rounding: true });
    else { dot(s, x + 0.55, 2.05, C.accD, 1.6); X(s, m.ini, { x: x + 0.55, y: 2.55, w: 1.6, h: 0.6, fontSize: 28, bold: true, color: 'FFFFFF', align: 'center' }); }
    X(s, m.name, { x, y: 3.8, w: 2.7, h: 0.4, fontSize: 15, bold: true, align: 'center' });
  });
  ['bot', 'site', 'repo'].forEach((k, i) => { const x = 9.0 + i * 1.3; img(s, `qr/${k}.png`, { x, y: 2.1, w: 1.15, h: 1.15 }); X(s, T.qr[i], { x: x - 0.1, y: 3.3, w: 1.35, h: 0.3, fontSize: 10, color: C.muted, align: 'center' }); });
  X(s, T.next, { x: 0.6, y: 4.7, w: 8, h: 0.9, fontSize: 14, color: C.muted });
  X(s, T.ai, { x: 0.6, y: 5.75, w: 12, h: 0.6, fontSize: 10, color: C.dim });

  const out = P(lang === 'en' ? 'Neyra-pitch.pptx' : `Neyra-pitch-${lang}.pptx`);
  await pres.writeFile({ fileName: out });
  console.log('wrote', path.basename(out), fs.statSync(out).size, 'bytes');
}
(async () => { for (const lang of ['en', 'uz']) await build(lang); })();
