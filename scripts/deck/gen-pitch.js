// Neyra pitch deck (dark, English, 7 slides): problem -> numbers -> causes -> product -> proof -> impact/team.
// node gen-pitch.js [-> deck-pitch-en.html]; then node print.js pitch  -> Neyra-pitch-en.pdf
import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import QRCode from 'qrcode';

const LINKS = { bot: 'https://t.me/ulugbekcrewbot', site: 'https://davlatshoh-bakhtiyorov.github.io/ulugbekcrewnasa/', repo: 'https://github.com/davlatshoh-bakhtiyorov/ulugbekcrewnasa' };
const TEAM = (process.env.TEAM_NAMES || '').split('·').map((s) => s.trim()).filter(Boolean);
const members = [0, 1, 2].map((i) => TEAM[i] || 'Name Surname');
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const qr = (url) => QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: '#eef2ee', light: '#0b0f0d' } });
const img = (f) => (existsSync(new URL(`./${f}`, import.meta.url)) ? f : null);

const PRESS = [
  { f: 'press/yt-81iwFlLzzH4.jpg', cap: 'Onions planted by hand, row by row', src: 'VESAGRO · Feb 2018' },
  { f: 'press/yt-3uI8M5Ex4dA.jpg', cap: 'Surkhandarya onion growers are ruined', src: 'Xabar.uz · May 2018', zoom: 2.3 },
  { f: 'press/yt-5SPo9AEus2w.jpg', cap: '“Onions are not money — they are ash”', src: 'Ozodlik · Jun 2024' },
  { f: 'press/yt-GlbDsv0luWM.jpg', cap: 'Why did watermelons become so cheap?', src: 'Kun.uz · Aug 2024' },
  { f: 'press/ef.jpg', cap: 'Top-quality onions fed to sheep — no demand', src: 'EastFruit · Mar 2024' },
].map((p) => ({ ...p, f: img(p.f) || img(p.f.replace('3uI8M5ex4dA', '3uI8M5Ex4dA')) }));

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
.muted { color: #a7b0a9; } .green { color: #4cc27a; }
.row { display: flex; gap: 48px; align-items: flex-start; } .col { flex: 1; min-width: 0; }
.shot { display: block; max-width: 100%; object-fit: contain; border-radius: 18px; box-shadow: 0 24px 60px rgb(0 0 0 / .55); }
.card { background: #141a16; border: 1px solid #26302a; border-radius: 22px; }
ul.l { margin: 14px 0 0; padding: 0; list-style: none; }
ul.l li { position: relative; padding-left: 38px; margin: 0 0 14px; font-size: 27px; line-height: 1.35; }
ul.l li::before { content: ''; position: absolute; left: 0; top: 13px; width: 14px; height: 14px; border-radius: 50%; background: #4cc27a; }
.cap { font-size: 20px; color: #a7b0a9; margin-top: 12px; }
.src { font-size: 18px; color: #7f8a82; }
/* 1 */
.title { display: grid; grid-template-columns: 1fr 1.25fr; align-items: center; height: 100%; gap: 60px; padding-bottom: 60px; }
.title .mark { width: 440px; filter: drop-shadow(0 30px 60px rgb(76 194 122 / .25)); }
.title .name { font-size: 150px; font-weight: 800; letter-spacing: -.04em; line-height: 1; margin: 0 0 8px; color: #fff; }
.title .tag { font-size: 64px; font-weight: 700; letter-spacing: -.02em; margin: 0 0 22px; color: #4cc27a; }
.title .sub { font-size: 32px; color: #a7b0a9; margin: 0; }
.title .meta { margin-top: 48px; font-size: 24px; color: #a7b0a9; line-height: 1.6; } .title .meta b { color: #eef2ee; }
.wm { font-size: 16px; color: #7f8a82; margin-top: 10px; letter-spacing: .04em; }
/* 2 press wall */
.wall { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); gap: 22px; height: 690px; margin-top: 6px; }
.tile { position: relative; border-radius: 20px; overflow: hidden; background: #141a16; }
.tile img { width: 100%; height: 100%; object-fit: cover; display: block; filter: saturate(.9); }
.tile .ov { position: absolute; left: 0; right: 0; bottom: 0; padding: 70px 22px 18px; background: linear-gradient(transparent, rgb(0 0 0 / .85)); }
.tile .ov b { display: block; font-size: 24px; line-height: 1.25; color: #fff; } .tile .ov span { font-size: 17px; color: #c3cbc5; }
.tile.quote { display: grid; place-items: center; padding: 40px; text-align: center; background: #0f7f45; }
.tile.quote p { margin: 0; font-size: 40px; font-weight: 800; line-height: 1.2; color: #fff; letter-spacing: -.01em; }
.tile.quote small { display: block; margin-top: 16px; font-size: 20px; color: #d7f2e1; font-weight: 500; }
/* 3 numbers */
.hero-num { font-size: 210px; font-weight: 800; letter-spacing: -.05em; line-height: .95; color: #4cc27a; }
.hero-num small { font-size: 44px; font-weight: 700; letter-spacing: 0; color: #fff; margin-left: 14px; }
.nums { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px 40px; }
.num b { display: block; font-size: 84px; font-weight: 800; letter-spacing: -.03em; line-height: 1; color: #fff; }
.num span { display: block; font-size: 23px; color: #c3cbc5; margin-top: 8px; line-height: 1.3; }
/* 4 causes */
.causes { margin: 10px 0 0; padding: 0; list-style: none; }
.causes li { display: grid; grid-template-columns: 56px 1fr; gap: 16px; align-items: start; padding: 14px 0; border-top: 1px solid #26302a; font-size: 27px; line-height: 1.3; }
.causes li:first-child { border-top: 0; }
.causes .m { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; font-weight: 800; font-size: 22px; }
.causes .yes { background: #4cc27a; color: #0b0f0d; } .causes .no { border: 2px solid #3a463e; color: #7f8a82; }
.causes small { display: block; font-size: 20px; color: #a7b0a9; margin-top: 2px; }
/* 5 product */
.phones { display: flex; gap: 28px; align-items: flex-start; }
.phones figure { margin: 0; text-align: center; } .phones img { height: 600px; border-radius: 34px; border: 6px solid #1f2622; box-shadow: 0 24px 60px rgb(0 0 0 / .6); }
.phones figcaption { font-size: 20px; color: #a7b0a9; margin-top: 10px; }
.lights { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; margin: 14px 0 20px; }
.light { display: flex; align-items: center; gap: 12px; font-size: 24px; } .light i { width: 22px; height: 22px; border-radius: 50%; flex: none; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.chip { font-size: 17px; color: #c3cbc5; border: 1px solid #3a463e; border-radius: 10px; padding: 6px 12px; }
/* 6 proof */
.panels { display: grid; grid-template-columns: 1.1fr 1.1fr .9fr; gap: 26px; margin-top: 10px; }
.panel { padding: 22px; height: 760px; display: flex; flex-direction: column; }
.panel h3 { margin: 0 0 6px; font-size: 28px; color: #fff; } .panel p { margin: 0 0 14px; font-size: 21px; color: #a7b0a9; line-height: 1.35; }
.panel img { width: 100%; border-radius: 14px; object-fit: cover; object-position: top; }
.big3 { font-size: 72px; font-weight: 800; letter-spacing: -.03em; line-height: 1.05; color: #4cc27a; margin: 10px 0 6px; }
/* 7 team */
.team { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 10px 0 26px; }
.member { padding: 20px 18px; text-align: center; }
.member .av { width: 84px; height: 84px; border-radius: 50%; margin: 0 auto 12px; background: linear-gradient(135deg, #0f7f45, #4cc27a); }
.member b { display: block; font-size: 24px; color: #fff; } .member span { font-size: 19px; color: #a7b0a9; }
.qrs { display: flex; gap: 30px; } .qrs figure { margin: 0; text-align: center; font-size: 19px; color: #a7b0a9; }
.qrs img { width: 170px; height: 170px; display: block; margin: 0 auto 6px; border-radius: 12px; }
.quote { font-size: 38px; font-weight: 800; letter-spacing: -.01em; color: #4cc27a; margin: 24px 0 0; line-height: 1.2; }
`;

const foot = (n) => `<div class="foot"><span><img src="logo.png" alt=""><b>Neyra</b> · NASA Space Apps Challenge 2026 · Tashkent</span><span>${n} / 7</span></div>`;
const li = (arr) => `<ul class="l">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;

const slides = (q) => [
`<section class="slide"><div class="title">
  <div><img class="mark" src="logo.png" alt="Neyra"><div class="wm">Logo: AI-generated image</div></div>
  <div><p class="name">Neyra</p><p class="tag">See before you sow.</p><p class="sub">Right crop, right time — with NASA Earth data</p>
    <p class="meta"><b>Team ulugbek-crew</b> · ${esc(members.join(' · '))}<br>NASA Space Apps Challenge 2026 · Tashkent<br>Challenge: Field Shift — Adapting Farms with NASA Data</p></div>
</div></section>`,

`<section class="slide"><p class="eyebrow">The problem</p><h1>Planted by hand in February. Fed to sheep in May.</h1>
<div class="wall">
  ${PRESS.map((p) => p.f ? `<div class="tile"><img src="${p.f}" style="${p.zoom ? `transform:scale(${p.zoom})` : ''}" alt=""><div class="ov"><b>${esc(p.cap)}</b><span>${esc(p.src)}</span></div></div>` : '').join('')}
  <div class="tile quote"><p>“Piyoz — pul emas, kul.”<br><span style="font-weight:600;font-size:30px;opacity:.9">Onions are not money — they are ash.</span></p><small>an onion grower, Surkhandarya · Ozodlik, June 2024</small></div>
</div>
<p class="src" style="position:absolute;left:110px;bottom:96px">Covers of public news videos and articles, shown for commentary with attribution.</p>${foot(2)}</section>`,

`<section class="slide"><p class="eyebrow">Every year</p><h1>Good harvests, thrown away</h1>
<div class="row" style="margin-top:0;align-items:center;min-height:760px">
  <div style="flex:0 0 900px"><div class="hero-num">5–7<small>million tonnes</small></div>
    <p style="font-size:30px;margin:14px 0 0;max-width:26em">of fruit and vegetables lost after harvest in Uzbekistan each year — <b>20–30 %</b> of a ≈ 23 Mt crop.</p>
    <p class="src" style="margin-top:14px">Our estimate from UzDaily (23 Oct 2025): post-harvest losses 20–30 % (expert estimate); cold storage 1.14 Mt = 4.9 % of annual output.</p></div>
  <div class="col nums">
    <div class="num"><b>12 ¢</b><span>per kg of onions, April 2024 — 4.4× below the year before · EastFruit</span></div>
    <div class="num"><b>150–200k t</b><span>of onions dumped or fed to cattle in 2024 · EastFruit</span></div>
    <div class="num"><b>8 ¢</b><span>per kg of watermelons, July 2024 — left in the fields · Kun.uz / EastFruit</span></div>
    <div class="num"><b>4.9 %</b><span>of the yearly harvest fits in cold storage · UzDaily</span></div>
  </div>
</div>${foot(3)}</section>`,

`<section class="slide"><p class="eyebrow">Why</p><h1>It is not the weather. It is information.</h1>
<div class="row" style="margin-top:6px">
  <div style="flex:0 0 620px"><img class="shot" src="shots/dark-loop.jpg" style="width:620px;border-radius:24px" alt=""><p class="cap">The onion cycle, 2022–2025 — prices high → everyone plants → record crop, same demand → collapse → nobody plants → ×10</p></div>
  <div class="col"><ul class="causes">
    <li><span class="m yes">✓</span><div>Everyone plants last year's winner<small>nobody sees what the others are sowing — the “herd”</small></div></li>
    <li><span class="m yes">✓</span><div>Everyone harvests in the same two weeks<small>the market window is unknown until it closes</small></div></li>
    <li><span class="m yes">✓</span><div>Water, ripening and soil are guessed, not measured<small>FAO tables from other climates; no field history</small></div></li>
    <li><span class="m no">○</span><div>Demand for onions does not move with price<small>a 30 % bigger crop is a crop nobody buys · FAO</small></div></li>
    <li><span class="m no">○</span><div>Thin export market, expensive logistics<small>Russia, Kazakhstan; the margin dies on the road</small></div></li>
    <li><span class="m no">○</span><div>Cold storage for 4.9 %, no farmer–exporter contracts<small>quality and trust problems follow</small></div></li>
  </ul><p class="src" style="margin-top:12px">✓ what Neyra addresses · ○ outside what satellite data can fix. Sources: EastFruit 2023–24, Kun.uz 2024–25, Podrobno.uz 2024, UzDaily 2025.</p></div>
</div>${foot(4)}</section>`,

`<section class="slide"><p class="eyebrow">The product</p><h1>Neyra — right crop, right time, in three taps</h1>
<div class="row" style="margin-top:8px">
  <div class="phones">${[['dark-phone-field', '1 · Show the field'], ['dark-phone-questions', '2 · Three questions'], ['dark-phone-results', '3 · Three options']].map(([f, c]) => `<figure><img src="shots/${f}.jpg" alt=""><figcaption>${esc(c)}</figcaption></figure>`).join('')}</div>
  <div class="col" style="padding-top:6px">
    <p style="font-size:27px;margin:0 0 6px;line-height:1.4">Six candidate crops are scored year by year over <b>42 years of NASA POWER weather</b> at that point. The best three come back with four lights:</p>
    <div class="lights">${[['#4cc27a', 'Water need (dry year)'], ['#4cc27a', 'Ripens before frost'], ['#e3a008', 'Soil benefit'], ['#d64545', 'Market & waste risk']].map(([c, t]) => `<div class="light"><i style="background:${c}"></i>${esc(t)}</div>`).join('')}</div>
    ${li(['Runs inside Telegram — nothing to install; also on the web', 'Every number shows its source, resolution and period', 'Field passport: 36 months of NDVI, soil moisture vs 10 years, climate shift', 'It supports the farmer’s judgement — it does not replace it'])}
    <div class="chips">${['NASA POWER', 'MODIS NDVI 250 m', 'MODIS phenology', 'MODIS LST', 'SMAP L4', 'GRACE-FO', 'FAO-56 Rev.1'].map((c) => `<span class="chip">${c}</span>`).join('')}</div>
  </div>
</div>${foot(5)}</section>`,

`<section class="slide"><p class="eyebrow">Proof</p><h1>Evidence under every number</h1>
<div class="panels">
  <div class="panel card"><h3>Live: what NASA sees at your field</h3><p>Vegetation 250 m · soil moisture 9 km · land heat 1 km · water storage — tap a point, read the value and 12 months of history, decoded from the official GIBS colour scales.</p><img src="shots/dark-map.jpg" style="height:500px" alt=""></div>
  <div class="panel card"><h3>The FAO table says 25 April. The field says 3 June.</h3><p>We re-scaled FAO heat sums with 767 field-years of MODIS phenology. Check 2016–2025: model within +0.5 day of the satellite (FAO: −36 days). 49 automated tests.</p><img src="shots/dark-ndvi.jpg" style="height:auto;border:1px solid #26302a" alt=""><p style="margin-top:14px">Greenness of the demo field (MODIS NDVI, 250 m) through the 2023–24 season: still green when FAO says “ripe”, yellow when MODIS says the season ended.</p></div>
  <div class="panel card"><h3>Who harvests when</h3><p>Same onion model, 16 regions, NASA POWER 1985–2025. Surkhandarya ripens ahead of</p><div class="big3">30 · 35 · 62<span style="font-size:26px;color:#a7b0a9;font-weight:600;letter-spacing:0"> days</span></div><p>Tashkent · Turkistan (KZ) · Volgograd (RU) — and the window has moved 5–10 days earlier since 1985–2004.</p><img src="shots/dark-window.jpg" style="height:330px" alt=""></div>
</div>${foot(6)}</section>`,

`<section class="slide"><p class="eyebrow">Impact and next</p><h1>What changes</h1>
<div class="row" style="margin-top:6px">
  <div class="col">${li(['A farmer sees ripening date, water, soil and the market window before sowing — in three taps, in Uzbek', 'A region sees its harvest timing from space, year by year, and the herd before the price shows it', 'Six NASA datasets — each one feeds a number on screen; nothing listed that is not used', 'Next: HLS 30 m for crop area · price history for the market light · more crops · Khorezm and Karakalpakstan pilots'])}
    <p class="quote">Neyra does not decide. The farmer decides — with evidence.</p></div>
  <div style="flex:0 0 760px">
    <div class="team">${members.map((m, i) => `<div class="member card"><div class="av"></div><b>${esc(m)}</b><span>${TEAM[i] ? '' : 'role'}</span></div>`).join('')}</div>
    <div class="qrs">${[['bot', 'Telegram bot'], ['site', 'Website'], ['repo', 'Source code']].map(([k, t]) => `<figure><img src="${q[k]}" alt="">${t}</figure>`).join('')}</div>
    <p class="src" style="margin-top:22px">Built with AI assistance (Claude Code) for code and text; every number is computed from the cited NASA and FAO sources and checked by tests. Logo: AI-generated image.</p>
  </div>
</div>${foot(7)}</section>`,
];

const q = { bot: await qr(LINKS.bot), site: await qr(LINKS.site), repo: await qr(LINKS.repo) };
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Neyra — pitch</title><style>${CSS}</style></head><body>${slides(q).join('\n')}</body></html>`;
await writeFile(new URL('./deck-pitch-en.html', import.meta.url), html);
console.log('deck-pitch-en.html', html.length, 'bytes; press tiles:', PRESS.filter((p) => p.f).length);
