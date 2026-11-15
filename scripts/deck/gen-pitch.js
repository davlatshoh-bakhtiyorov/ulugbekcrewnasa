// Neyra pitch deck (dark, 7 slides, EN + UZ): node gen-pitch.js -> deck-pitch-en.html, deck-pitch-uz.html; then node print.js pitch
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import QRCode from 'qrcode';
import { TEAM, L, shot } from './strings.mjs';

const LINKS = { bot: 'https://t.me/ulugbekcrewbot', site: 'https://davlatshoh-bakhtiyorov.github.io/ulugbekcrewnasa/', repo: 'https://github.com/davlatshoh-bakhtiyorov/ulugbekcrewnasa' };
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const qr = (url) => QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: '#eef2ee', light: '#0b0f0d' } });
const img = (f) => (existsSync(new URL(`./${f}`, import.meta.url)) ? f : null);

const CSS = `
@page { size: 1920px 1080px; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #0b0f0d; color: #eef2ee; font: 28px/1.4 ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif; font-feature-settings: "tnum"; }
.slide { position: relative; width: 1920px; height: 1080px; overflow: hidden; page-break-after: always; break-after: page; padding: 96px 110px 80px; background: #0b0f0d; }
.slide:last-child { page-break-after: auto; }
h1 { margin: 0 0 18px; font-size: 66px; line-height: 1.08; letter-spacing: -.02em; font-weight: 800; color: #fff; }
.eyebrow { font-size: 22px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #4cc27a; margin: 0 0 18px; }
.foot { position: absolute; left: 110px; right: 110px; bottom: 44px; display: flex; justify-content: space-between; align-items: center; font-size: 20px; color: #7f8a82; }
.foot b { color: #eef2ee; font-weight: 700; } .foot img { height: 34px; vertical-align: middle; margin-right: 12px; }
.row { display: flex; gap: 48px; align-items: flex-start; } .col { flex: 1; min-width: 0; }
.shot { display: block; max-width: 100%; object-fit: contain; border-radius: 18px; box-shadow: 0 24px 60px rgb(0 0 0 / .55); }
.card { background: #141a16; border: 1px solid #26302a; border-radius: 22px; }
.cap { font-size: 20px; color: #a7b0a9; margin-top: 12px; } .src { font-size: 18px; color: #7f8a82; }
.title { display: grid; grid-template-columns: 1fr 1.25fr; align-items: center; height: 100%; gap: 60px; padding-bottom: 60px; }
.title .mark { width: 440px; }
.title .name { font-size: 150px; font-weight: 800; letter-spacing: -.04em; line-height: 1; margin: 0 0 8px; color: #fff; }
.title .tag { font-size: 64px; font-weight: 700; letter-spacing: -.02em; margin: 0 0 22px; color: #4cc27a; }
.title .sub { font-size: 32px; color: #a7b0a9; margin: 0; }
.title .meta { margin-top: 48px; font-size: 24px; color: #a7b0a9; line-height: 1.6; } .title .meta b { color: #eef2ee; }
.wm { font-size: 16px; color: #7f8a82; margin-top: 10px; letter-spacing: .04em; }
.wall4 { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 22px; flex: 1; height: 690px; }
.tile { position: relative; border-radius: 20px; overflow: hidden; background: #141a16; }
.tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tile .ov { position: absolute; left: 0; right: 0; bottom: 0; padding: 70px 22px 18px; background: linear-gradient(transparent, rgb(0 0 0 / .85)); }
.tile .ov b { display: block; font-size: 24px; line-height: 1.25; color: #fff; } .tile .ov span { font-size: 17px; color: #c3cbc5; }
.tile.quote { display: grid; place-items: center; padding: 40px; text-align: center; background: #0f7f45; }
.tile.quote p { margin: 0; font-size: 40px; font-weight: 800; line-height: 1.2; color: #fff; letter-spacing: -.01em; }
.tile.quote small { display: block; margin-top: 16px; font-size: 20px; color: #d7f2e1; font-weight: 500; }
.hero-num { font-size: 210px; font-weight: 800; letter-spacing: -.05em; line-height: .95; color: #4cc27a; }
.hero-num small { font-size: 44px; font-weight: 700; letter-spacing: 0; color: #fff; margin-left: 14px; }
.num b { display: block; font-size: 84px; font-weight: 800; letter-spacing: -.03em; line-height: 1; color: #fff; }
.num span { display: block; font-size: 23px; color: #c3cbc5; margin-top: 8px; line-height: 1.3; }
.causes { margin: 10px 0 0; padding: 0; list-style: none; }
.causes li { display: grid; grid-template-columns: 56px 1fr; gap: 16px; align-items: start; padding: 14px 0; border-top: 1px solid #26302a; font-size: 27px; line-height: 1.3; }
.causes li:first-child { border-top: 0; }
.causes .m { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; font-weight: 800; font-size: 22px; }
.causes .yes { background: #4cc27a; color: #0b0f0d; }
.causes.big li { font-size: 34px; font-weight: 700; padding: 22px 0; grid-template-columns: 68px 1fr; }
.causes.big .m { width: 52px; height: 52px; font-size: 26px; }
.phones { display: flex; gap: 28px; align-items: flex-start; }
.phones figure { margin: 0; text-align: center; } .phones img { height: 600px; border-radius: 34px; border: 6px solid #1f2622; box-shadow: 0 24px 60px rgb(0 0 0 / .6); }
.phones figcaption { font-size: 20px; color: #a7b0a9; margin-top: 10px; }
.lights { display: grid; grid-template-columns: 1fr; gap: 18px; margin: 14px 0 20px; }
.light { display: flex; align-items: center; gap: 14px; font-size: 32px; font-weight: 700; } .light i { width: 28px; height: 28px; border-radius: 50%; flex: none; }
.panels { display: grid; grid-template-columns: 1.1fr 1.1fr .9fr; gap: 26px; margin-top: 10px; }
.panel { padding: 22px; height: 760px; display: flex; flex-direction: column; }
.panel h3 { margin: 0 0 6px; font-size: 28px; color: #fff; } .panel p { margin: 0 0 14px; font-size: 21px; color: #a7b0a9; line-height: 1.35; }
.panel img { width: 100%; border-radius: 14px; object-fit: cover; object-position: top; }
.big3 { font-size: 72px; font-weight: 800; letter-spacing: -.03em; line-height: 1.05; color: #4cc27a; margin: 10px 0 6px; }
.team3 { display: flex; gap: 40px; }
.team3 figure { margin: 0; text-align: center; width: 300px; }
.team3 img, .av-ini { width: 240px; height: 240px; border-radius: 50%; object-fit: cover; display: block; margin: 0 auto 18px; border: 4px solid #26302a; }
.av-ini { display: grid; place-items: center; background: linear-gradient(135deg, #0f7f45, #4cc27a); font-size: 72px; font-weight: 800; color: #fff; }
.team3 figcaption { font-size: 26px; font-weight: 700; color: #fff; }
.qrs { display: flex; gap: 30px; } .qrs figure { margin: 0; text-align: center; font-size: 19px; color: #a7b0a9; }
.qrs img { width: 170px; height: 170px; display: block; margin: 0 auto 6px; border-radius: 12px; }
`;

function slides(lang, q) {
  const T = L[lang], sh = (n) => shot(lang, n);
  const foot = (n) => `<div class="foot"><span><img src="logo.png" alt=""><b>Neyra</b>${esc(T.foot.replace(/^Neyra/, ''))}</span><span>${n} / 7</span></div>`;
  return [
`<section class="slide"><div class="title">
  <div><img class="mark" src="logo.png" alt="Neyra"><div class="wm">${esc(T.wm)}</div></div>
  <div><p class="name">Neyra</p><p class="tag">${esc(T.tag)}</p><p class="sub">${esc(T.sub)}</p>
    <p class="meta"><b>${esc(T.team)}</b> · ${esc(TEAM.map((m) => m.name).join(' · '))}<br>${esc(T.event)}<br>${esc(T.chal)}</p></div>
</div></section>`,
`<section class="slide"><p class="eyebrow">${esc(T.e2)}</p><h1>${esc(T.h2)}</h1>
<div class="row" style="margin-top:10px">
  <div class="wall4">${T.covers.map(([f, cap, src, z]) => (img(f) ? `<div class="tile"><img src="${f}" style="${z ? `transform:scale(${z})` : ''}" alt=""><div class="ov"><b>${esc(cap)}</b><span>${esc(src)}</span></div></div>` : '')).join('')}</div>
  <div class="tile quote" style="flex:0 0 520px;height:690px"><p>${esc(T.quote)}${T.quote2 ? `<br><span style="font-weight:600;font-size:30px;opacity:.9">${esc(T.quote2)}</span>` : ''}</p><small>${esc(T.quoteBy)}</small></div>
</div>${foot(2)}</section>`,
`<section class="slide"><p class="eyebrow">${esc(T.e3)}</p><h1>${esc(T.h3)}</h1>
<div class="row" style="margin-top:0;align-items:center;min-height:760px">
  <div style="flex:0 0 900px"><div class="hero-num">${esc(T.big)}<small>${esc(T.bigUnit)}</small></div>
    <p style="font-size:30px;margin:14px 0 0;max-width:24em">${esc(T.bigCap)}</p>
    <p class="src" style="margin-top:14px">${esc(T.est)}</p></div>
  <div class="col" style="display:grid;gap:22px">
    <div class="card" style="padding:28px 32px"><div class="num"><b>${esc(T.n1)}</b><span>${esc(T.n1c)}</span></div></div>
    <div class="card" style="padding:28px 32px"><div class="num"><b>${esc(T.n2)}</b><span>${esc(T.n2c)}</span></div></div>
  </div>
</div>${foot(3)}</section>`,
`<section class="slide"><p class="eyebrow">${esc(T.e4)}</p><h1>${esc(T.h4)}</h1>
<div class="row" style="margin-top:6px;align-items:center">
  <div style="flex:0 0 620px"><img class="shot" src="${sh('loop')}" style="width:620px;border-radius:24px" alt=""></div>
  <div class="col"><ul class="causes big">${T.causes.map((c) => `<li><span class="m yes">✓</span><div>${esc(c)}</div></li>`).join('')}</ul>
  <p class="cap" style="font-size:24px;margin-top:26px;max-width:26em">${esc(T.demand)}</p></div>
</div>${foot(4)}</section>`,
`<section class="slide"><p class="eyebrow">${esc(T.e5)}</p><h1>${esc(T.h5)}</h1>
<div class="row" style="margin-top:8px">
  <div class="phones">${['phone-field', 'phone-questions', 'phone-results'].map((f, i) => `<figure><img src="${sh(f)}" alt=""><figcaption>${esc(T.phones[i])}</figcaption></figure>`).join('')}</div>
  <div class="col" style="padding-top:30px">
    <div class="lights">${['#4cc27a', '#4cc27a', '#e3a008', '#d64545'].map((c, i) => `<div class="light"><i style="background:${c}"></i>${esc(T.lights[i])}</div>`).join('')}</div>
    <p class="cap" style="font-size:24px;margin-top:34px;max-width:22em">${esc(T.prod)}</p>
  </div>
</div>${foot(5)}</section>`,
`<section class="slide"><p class="eyebrow">${esc(T.e6)}</p><h1>${esc(T.h6)}</h1>
<div class="panels">
  <div class="panel card"><h3>${esc(T.p1)}</h3><img src="${sh('map')}" style="height:600px;margin-top:10px" alt=""></div>
  <div class="panel card"><h3>${esc(T.p2)}</h3><img src="${sh('ndvi')}" style="height:auto;border:1px solid #26302a;margin-top:10px" alt=""><p style="margin-top:16px">${esc(T.p2c)}</p></div>
  <div class="panel card"><h3>${esc(T.p3)}</h3><div class="big3">30 · 35 · 62<span style="font-size:26px;color:#a7b0a9;font-weight:600;letter-spacing:0"> ${esc(T.days)}</span></div><p>${esc(T.p3c)}</p><img src="${sh('window')}" style="height:360px" alt=""></div>
</div>${foot(6)}</section>`,
`<section class="slide"><p class="eyebrow">${esc(T.e7)}</p><h1>${esc(T.h7)}</h1>
<div class="row" style="margin-top:30px;align-items:flex-start">
  <div class="team3">${TEAM.map((m) => `<figure>${img(m.photo) ? `<img src="${m.photo}" alt="">` : `<div class="av-ini">${m.ini}</div>`}<figcaption>${esc(m.name)}</figcaption></figure>`).join('')}</div>
  <div class="qrs" style="margin-left:auto">${['bot', 'site', 'repo'].map((k, i) => `<figure><img src="${q[k]}" alt="">${esc(T.qr[i])}</figure>`).join('')}</div>
</div>
<p class="cap" style="font-size:24px;margin-top:60px;max-width:40em">${esc(T.next)}</p>
<p class="src" style="position:absolute;left:110px;right:110px;bottom:96px">${esc(T.ai)}</p>${foot(7)}</section>`,
  ];
}

const q = { bot: await qr(LINKS.bot), site: await qr(LINKS.site), repo: await qr(LINKS.repo) };
for (const lang of ['en', 'uz']) {
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>Neyra — pitch (${lang})</title><style>${CSS}</style></head><body>${slides(lang, q).join('\n')}</body></html>`;
  await writeFile(new URL(`./deck-pitch-${lang}.html`, import.meta.url), html);
  console.log(`deck-pitch-${lang}.html`, html.length, 'bytes');
}
