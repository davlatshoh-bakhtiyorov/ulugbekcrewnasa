// Neyra pitch deck -> PPTX (pptxgenjs), dark, minimal text. node build-pptx.cjs  -> Neyra-pitch.pptx
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const here = __dirname;
const P = (f) => path.join(here, f);
const has = (f) => fs.existsSync(P(f));
const TEAM = [
  { name: 'Davlatshoh Baxtiyorov', photo: 'team/davlatshoh.jpg', ini: 'DB' },
  { name: "Og'abek Raxmonjonov", photo: 'team/ogabek.jpg', ini: 'OR' },
  { name: 'Abdulla Inogomov', photo: 'team/abdulla.jpg', ini: 'AI' },
];
const C = { bg: '0B0F0D', card: '141A16', line: '26302A', text: 'EEF2EE', muted: 'A7B0A9', dim: '7F8A82', acc: '4CC27A', accD: '0F7F45', warn: 'E3A008', bad: 'D64545' };
const F = 'Arial';

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
pres.author = 'Team ulugbek-crew'; pres.title = 'Neyra - see before you sow'; pres.subject = 'NASA Space Apps Challenge 2026';
pres.defineSlideMaster({
  title: 'DARK', background: { color: C.bg },
  objects: [
    { image: { x: 0.6, y: 6.95, w: 0.28, h: 0.28, path: P('logo.png') } },
    { text: { text: 'Neyra  ·  NASA Space Apps Challenge 2026  ·  Tashkent', options: { x: 0.95, y: 6.92, w: 7, h: 0.34, fontFace: F, fontSize: 10, color: C.dim, margin: 0 } } },
  ],
  slideNumber: { x: 12.3, y: 6.92, w: 0.5, h: 0.34, fontFace: F, fontSize: 10, color: C.dim, align: 'right' },
});
const T = (slide, text, o) => slide.addText(text, { fontFace: F, color: C.text, margin: 0, isTextBox: true, valign: 'top', ...o });
const eyebrow = (slide, s) => T(slide, s.toUpperCase(), { x: 0.6, y: 0.5, w: 8, h: 0.3, fontSize: 11, bold: true, color: C.acc, charSpacing: 3 });
const title = (slide, s, w = 11.5) => T(slide, s, { x: 0.6, y: 0.8, w, h: 0.9, fontSize: 36, bold: true, color: 'FFFFFF' });
const card = (slide, x, y, w, h) => slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: C.card }, line: { color: C.line, width: 0.75 } });
const dot = (slide, x, y, color, d = 0.22) => slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color }, line: { color, width: 0 } });
const img = (slide, f, o) => { if (has(f)) slide.addImage({ path: P(f), ...o }); };
const sec = (name) => { pres.addSection({ title: name }); return name; };

// 1 — title
let s = pres.addSlide({ masterName: 'DARK', sectionTitle: sec('Title') });
img(s, 'logo.png', { x: 1.2, y: 1.9, w: 3.2, h: 3.2 });
T(s, 'Logo: AI-generated image', { x: 1.2, y: 5.25, w: 3.2, h: 0.3, fontSize: 9, color: C.dim });
T(s, 'Neyra', { x: 5.6, y: 1.75, w: 7, h: 1.3, fontSize: 80, bold: true, color: 'FFFFFF' });
T(s, 'See before you sow.', { x: 5.6, y: 3.05, w: 7, h: 0.7, fontSize: 34, bold: true, color: C.acc });
T(s, 'Right crop, right time — with NASA Earth data', { x: 5.6, y: 3.75, w: 7, h: 0.5, fontSize: 18, color: C.muted });
T(s, [
  { text: 'Team ulugbek-crew', options: { bold: true, color: C.text } }, { text: ' · ' + TEAM.map((m) => m.name).join(' · '), options: { color: C.muted } },
], { x: 5.6, y: 4.65, w: 7.2, h: 0.4, fontSize: 13 });
T(s, 'NASA Space Apps Challenge 2026 · Tashkent\nChallenge: Field Shift — Adapting Farms with NASA Data', { x: 5.6, y: 5.05, w: 7.2, h: 0.7, fontSize: 13, color: C.muted });

// 2 — problem: press covers + quote
s = pres.addSlide({ masterName: 'DARK', sectionTitle: sec('Problem') });
eyebrow(s, 'The problem'); title(s, 'Planted by hand in February. Fed to sheep in May.');
const covers = [
  ['press/yt-5SPo9AEus2w.jpg', '“Onions are not money — they are ash”', 'Ozodlik · 2024'],
  ['press/yt-GlbDsv0luWM.jpg', 'Why did watermelons become so cheap?', 'Kun.uz · 2024'],
  ['press/yt-3uI8M5Ex4dA.jpg', 'Surkhandarya onion growers are ruined', 'Xabar.uz · 2018'],
  ['press/ef.jpg', 'Top-quality onions fed to sheep', 'EastFruit · 2024'],
];
covers.forEach(([f, cap, src], i) => {
  const x = 0.6 + (i % 2) * 4.05, y = 1.9 + Math.floor(i / 2) * 2.45;
  img(s, f, { x, y, w: 3.9, h: 1.85, sizing: { type: 'cover', w: 3.9, h: 1.85 }, rounding: false });
  T(s, cap, { x, y: y + 1.9, w: 3.9, h: 0.3, fontSize: 12, bold: true });
  T(s, src, { x, y: y + 2.15, w: 3.9, h: 0.25, fontSize: 10, color: C.dim });
});
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 8.95, y: 1.9, w: 3.8, h: 4.75, rectRadius: 0.14, fill: { color: C.accD }, line: { color: C.accD, width: 0 } });
T(s, '“Piyoz — pul emas, kul.”', { x: 9.25, y: 2.9, w: 3.2, h: 0.9, fontSize: 26, bold: true, color: 'FFFFFF', align: 'center' });
T(s, 'Onions are not money — they are ash.', { x: 9.25, y: 3.85, w: 3.2, h: 0.8, fontSize: 16, color: 'FFFFFF', align: 'center' });
T(s, 'an onion grower, Surkhandarya · Ozodlik, June 2024', { x: 9.25, y: 4.95, w: 3.2, h: 0.5, fontSize: 11, color: 'D7F2E1', align: 'center' });

// 3 — numbers
s = pres.addSlide({ masterName: 'DARK', sectionTitle: sec('Every year') });
eyebrow(s, 'Every year'); title(s, 'Good harvests, thrown away');
T(s, '5–7', { x: 0.6, y: 2.0, w: 5.2, h: 2.0, fontSize: 150, bold: true, color: C.acc });
T(s, 'million tonnes', { x: 0.7, y: 4.0, w: 5.5, h: 0.5, fontSize: 26, bold: true, color: 'FFFFFF' });
T(s, 'of fruit and vegetables lost after harvest in Uzbekistan — every year', { x: 0.7, y: 4.55, w: 5.6, h: 0.8, fontSize: 18, color: C.muted });
T(s, 'Estimate: 20–30 % of a ≈ 23 Mt crop (UzDaily, Oct 2025: losses 20–30 %; cold storage 1.14 Mt = 4.9 %)', { x: 0.7, y: 6.1, w: 7, h: 0.5, fontSize: 9, color: C.dim });
card(s, 7.3, 2.0, 5.4, 1.9); T(s, '1 500 UZS', { x: 7.6, y: 2.15, w: 5, h: 1.0, fontSize: 60, bold: true, color: 'FFFFFF' });
T(s, 'per kilogram of onions, April 2024 (≈ 12 US cents) — 4.4× below the year before · EastFruit', { x: 7.6, y: 3.15, w: 4.9, h: 0.6, fontSize: 13, color: C.muted });
card(s, 7.3, 4.1, 5.4, 1.9); T(s, '150–200k t', { x: 7.6, y: 4.25, w: 5, h: 1.0, fontSize: 60, bold: true, color: 'FFFFFF' });
T(s, 'of onions dumped or fed to cattle in 2024 · EastFruit', { x: 7.6, y: 5.25, w: 4.9, h: 0.6, fontSize: 13, color: C.muted });

// 4 — why
s = pres.addSlide({ masterName: 'DARK', sectionTitle: sec('Why') });
eyebrow(s, 'Why'); title(s, 'It is not the weather. It is information.');
img(s, 'shots/dark-loop.jpg', { x: 0.6, y: 1.95, w: 4.3, h: 4.3, rounding: false });
const causes = ['Everyone plants last year’s winner', 'Everyone harvests in the same two weeks', 'Water, ripening and soil are guessed — not measured'];
causes.forEach((c, i) => {
  const y = 2.15 + i * 1.05;
  dot(s, 5.6, y + 0.05, C.acc, 0.4); T(s, '✓', { x: 5.6, y: y + 0.07, w: 0.4, h: 0.36, fontSize: 16, bold: true, color: C.bg, align: 'center' });
  T(s, c, { x: 6.2, y, w: 6.5, h: 0.6, fontSize: 22, bold: true });
});
T(s, 'Demand for onions does not move with price — so a bigger crop is a crop nobody buys. (FAO, 2024)', { x: 6.2, y: 5.5, w: 6.5, h: 0.8, fontSize: 14, color: C.muted });

// 5 — product
s = pres.addSlide({ masterName: 'DARK', sectionTitle: sec('Product') });
eyebrow(s, 'The product'); title(s, 'Three taps. Four lights.');
[['shots/dark-phone-field.jpg', 'Show the field'], ['shots/dark-phone-questions.jpg', 'Three questions'], ['shots/dark-phone-results.jpg', 'Three options']].forEach(([f, cap], i) => {
  const x = 0.6 + i * 2.35;
  img(s, f, { x, y: 1.95, w: 2.1, h: 4.55, rounding: false });
  T(s, `${i + 1} · ${cap}`, { x, y: 6.55, w: 2.1, h: 0.3, fontSize: 11, color: C.muted, align: 'center' });
});
[[C.acc, 'Water need — dry year'], [C.acc, 'Ripens before frost'], [C.warn, 'Soil benefit'], [C.bad, 'Market & waste risk']].forEach(([c, t], i) => {
  const y = 2.2 + i * 0.62; dot(s, 7.9, y + 0.07, c, 0.26); T(s, t, { x: 8.3, y, w: 4.5, h: 0.45, fontSize: 20, bold: true });
});
T(s, 'Six crops scored over 42 years of NASA POWER weather at your field. Inside Telegram — nothing to install. Every number with its source.', { x: 7.9, y: 4.9, w: 4.9, h: 1.3, fontSize: 15, color: C.muted });

// 6 — proof
s = pres.addSlide({ masterName: 'DARK', sectionTitle: sec('Proof') });
eyebrow(s, 'Proof'); title(s, 'Evidence under every number');
const cw = 3.95, cy = 1.95, ch = 4.75;
[0, 1, 2].forEach((i) => card(s, 0.6 + i * (cw + 0.13), cy, cw, ch));
T(s, 'Live NASA layers at your field', { x: 0.8, y: 2.1, w: 3.6, h: 0.4, fontSize: 16, bold: true });
img(s, 'shots/dark-map.jpg', { x: 0.8, y: 2.6, w: 3.55, h: 3.3, sizing: { type: 'cover', w: 3.55, h: 3.3 } });
T(s, 'The FAO table says 25 April. The satellite says 3 June.', { x: 4.88, y: 2.1, w: 3.6, h: 0.7, fontSize: 16, bold: true });
img(s, 'shots/dark-ndvi.jpg', { x: 4.88, y: 2.95, w: 3.55, h: 1.48 });
T(s, 'Season length re-scaled with 767 field-years of MODIS phenology; model within +0.5 day of the satellite.', { x: 4.88, y: 4.6, w: 3.55, h: 1.2, fontSize: 12, color: C.muted });
T(s, 'Who harvests when', { x: 8.96, y: 2.1, w: 3.6, h: 0.4, fontSize: 16, bold: true });
T(s, '30 · 35 · 62', { x: 8.96, y: 2.55, w: 3.6, h: 0.9, fontSize: 44, bold: true, color: C.acc });
T(s, 'days ahead of Tashkent · Turkistan (KZ) · Volgograd (RU) — same onion model, NASA POWER 1985–2025', { x: 8.96, y: 3.45, w: 3.55, h: 0.9, fontSize: 12, color: C.muted });
img(s, 'shots/dark-window.jpg', { x: 8.96, y: 4.4, w: 3.55, h: 2.1, sizing: { type: 'cover', w: 3.55, h: 2.1 } });

// 7 — team + QR
s = pres.addSlide({ masterName: 'DARK', sectionTitle: sec('Team') });
eyebrow(s, 'Team ulugbek-crew'); title(s, 'Neyra does not decide. The farmer decides — with evidence.', 12.2);
TEAM.forEach((m, i) => {
  const x = 0.6 + i * 2.75;
  if (has(m.photo)) s.addImage({ path: P(m.photo), x: x + 0.55, y: 2.05, w: 1.6, h: 1.6, rounding: true });
  else { dot(s, x + 0.55, 2.05, C.accD, 1.6); T(s, m.ini, { x: x + 0.55, y: 2.55, w: 1.6, h: 0.6, fontSize: 28, bold: true, color: 'FFFFFF', align: 'center' }); }
  T(s, m.name, { x, y: 3.8, w: 2.7, h: 0.4, fontSize: 15, bold: true, align: 'center' });
});
[['qr/bot.png', 'Telegram bot'], ['qr/site.png', 'Website'], ['qr/repo.png', 'Source code']].forEach(([f, cap], i) => {
  const x = 9.0 + i * 1.3;
  img(s, f, { x, y: 2.1, w: 1.15, h: 1.15 }); T(s, cap, { x: x - 0.1, y: 3.3, w: 1.35, h: 0.3, fontSize: 10, color: C.muted, align: 'center' });
});
T(s, 'Six NASA datasets — each one feeds a number on screen. Next: HLS 30 m for crop area · price history · more crops · Khorezm and Karakalpakstan pilots.', { x: 0.6, y: 4.7, w: 8, h: 0.9, fontSize: 14, color: C.muted });
T(s, 'Built with AI assistance (Claude Code) for code and text; every number is computed from the cited NASA and FAO sources and checked by tests. Logo: AI-generated image.', { x: 0.6, y: 5.75, w: 12, h: 0.6, fontSize: 10, color: C.dim });

pres.writeFile({ fileName: P('Neyra-pitch.pptx') }).then((f) => console.log('wrote', f, fs.statSync(f).size, 'bytes'));
