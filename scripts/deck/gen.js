// Neyra deck generator: HTML (1920x1080 per slide) -> PDF via headless Chrome. node gen.js  -> deck-en.html, deck-uz.html
import { writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';

const LINKS = { bot: 'https://t.me/ulugbekcrewbot', site: 'https://davlatshoh-bakhtiyorov.github.io/ulugbekcrewnasa/', repo: 'https://github.com/davlatshoh-bakhtiyorov/ulugbekcrewnasa' };
const TEAM = process.env.TEAM_NAMES || '';   // "Ism Familiya · Ism Familiya"

const T = {
  en: {
    tag: 'See before you sow.', sub: 'Right crop, right time — with NASA Earth data',
    team: 'Team ulugbek-crew', event: 'NASA Space Apps Challenge 2026 · Tashkent', chal: 'Challenge: Field Shift — Adapting Farms with NASA Data',
    members: TEAM ? `Team members: ${TEAM}` : 'Team members: ulugbek-crew (2)', aiLogo: 'Logo: AI-generated image',
    s2h: 'Why do good vegetables end up as cattle feed?', s2big: '12 ¢', s2unit: 'per kg', s2cap: 'Onion wholesale price, Uzbekistan, April 2024 — 4.4× lower than a year earlier. 150–200 thousand tonnes dumped or fed to cattle.',
    s2line: 'Everyone plants what paid last year. Demand for onions does not move. The cycle turned in 2018, in 2024 — and in 2025 the price went ×10.', s2src: 'Sources: EastFruit 16 Apr 2024 · Kun.uz 8 Jun 2024, 11 Apr 2025 · Podrobno.uz 23 Jul 2024',
    s3h: 'Right crop, right time — in three taps', s3a: 'Show the field', s3b: 'Answer three questions', s3c: 'Compare three options',
    s3a2: 'tap the map or share your location', s3b2: 'last crop · water · salinity — buttons only', s3c2: 'four lights: water · ripens in time · soil · market & waste',
    s3foot: 'Telegram Mini App + web · every number shows its source, resolution and period · it supports the farmer’s judgement, it does not replace it',
    s4h: 'What NASA sees at your field — live', s4badge: 'LIVE DEMO',
    s4l: ['Vegetation — MODIS NDVI, 250 m, every 16 days', 'Soil moisture — SMAP L4 root zone, 9 km, daily', 'Land heat — MODIS LST, 1 km, 8-day', 'Water storage — GRACE/GRACE-FO, monthly', 'Tap any point: values + 12-month history', 'Pixel colours decoded with the official GIBS colour scales'],
    s5h: 'The FAO table says 25 April. The field says 3 June.',
    s5l: ['FAO-56 heat-sum totals come from other climates — here every season came out too short', 'We re-scaled them with 767 field-years of NASA MODIS phenology (MCD12Q2, 2016–2025)', 'Check 2016–2025: model +0.5 day vs satellite · FAO table −36 days', '49 automated tests against FAO-56 worked examples'],
    s5cap: 'Greenness (NDVI) of the demo field near Jarqo‘rg‘on, 2023–2024 season — MODIS Terra MOD13Q1',
    s6h: 'Who harvests when?', s6head: 'Surkhandarya onions ripen <b>30 days</b> before Tashkent, <b>35 days</b> before Turkistan (KZ) and <b>62 days</b> before Volgograd (RU)',
    s6l: ['Same onion model in 16 regions, driven by NASA POWER weather 1985–2025', 'The window moved 5–10 days earlier since 1985–2004', 'MODIS shows when every field around Surkhandarya finished its season, 2016–2025'],
    s6cap1: 'Ripening window by region · bar = 10–90 % of years', s6cap2: 'Season end of every 500 m pixel, 2025 · yellow = early, dark green = late',
    s7h: 'Six NASA datasets — each one feeds a number on screen',
    s7d: [['NASA POWER', 'water need, heat sums, frost, heat days, climate shift, market window'], ['MODIS MOD13Q1', 'vegetation at the field, green periods, hero map'], ['MODIS MCD12Q2', 'calibrated season length, harvest-timing map'], ['MODIS MOD11A2', 'land surface temperature at the point'], ['SMAP L4', 'root-zone soil moisture today vs 2015–2024'], ['GRACE / GRACE-FO', 'water storage anomaly, 2003–2022']],
    s7next: 'Next: HLS 30 m for onion area · price history · more crops · Khorezm and Karakalpakstan pilots',
    s7quote: 'Neyra does not decide. The farmer decides — with evidence.',
    qr: ['Telegram bot', 'Website', 'Source code'],
    s7ai: 'Built with AI assistance (Claude Code) for code and text; every number is computed from the cited NASA and FAO sources and checked by tests.',
  },
  uz: {
    tag: 'Ekishdan oldin ko‘ring.', sub: 'To‘g‘ri ekin, to‘g‘ri vaqt — NASA ma’lumoti bilan',
    team: 'ulugbek-crew jamoasi', event: 'NASA Space Apps Challenge 2026 · Toshkent', chal: 'Challenge: Field Shift — Adapting Farms with NASA Data',
    members: TEAM ? `Jamoa: ${TEAM}` : 'Jamoa: ulugbek-crew (2 kishi)', aiLogo: '',
    s2h: 'Nega yaxshi sabzavot molga beriladi?', s2big: '12 ¢', s2unit: '1 kg uchun', s2cap: 'Piyoz ulgurji narxi, O‘zbekiston, 2024 yil aprel — bir yil oldingidan 4,4 barobar arzon. 150–200 ming tonna tashlab yuborildi yoki molga berildi.',
    s2line: 'Hamma o‘tgan yili pul bo‘lgan ekinni ekadi. Piyozga talab esa o‘zgarmaydi. Aylana 2018 da, 2024 da aylandi — 2025 da narx 10 barobar oshdi.', s2src: 'Manbalar: EastFruit 16.04.2024 · Kun.uz 08.06.2024, 11.04.2025 · Podrobno.uz 23.07.2024',
    s3h: 'To‘g‘ri ekin, to‘g‘ri vaqt — uch marta bosib', s3a: 'Dalani ko‘rsating', s3b: 'Uchta savolga javob bering', s3c: 'Uchta variantni solishtiring',
    s3a2: 'xaritaga bosing yoki joylashuvni yuboring', s3b2: 'oxirgi ekin · suv · sho‘rlanish — faqat tugmalar', s3c2: 'to‘rtta chiroq: suv · pishib ulgurish · tuproq · bozor va isrof',
    s3foot: 'Telegram Mini App + veb · har bir raqam manbasi, aniqligi va davri bilan · qarorni dehqon qiladi, Neyra dalil beradi',
    s4h: 'Dalangizni NASA ko‘rganidek ko‘ring — jonli', s4badge: 'JONLI DEMO',
    s4l: ['O‘simlik — MODIS NDVI, 250 m, har 16 kunda', 'Tuproq namligi — SMAP L4 ildiz qatlami, 9 km, kunlik', 'Yer harorati — MODIS LST, 1 km, 8 kunlik', 'Suv zaxirasi — GRACE/GRACE-FO, oylik', 'Istalgan nuqtaga bosing: qiymatlar + 12 oylik tarix', 'Piksel ranglari GIBS rasmiy shkalasi bilan raqamga aylantiriladi'],
    s5h: 'FAO jadvali 25-aprel deydi. Dala 3-iyun deydi.',
    s5l: ['FAO-56 harorat yig‘indilari boshqa iqlimdan — bu yerda har mavsum juda qisqa chiqdi', 'Biz ularni NASA MODIS fenologiyasining 767 dala-yili bilan qayta masshtabladik (MCD12Q2, 2016–2025)', 'Tekshiruv 2016–2025: model sun’iy yo‘ldoshdan +0,5 kun · FAO jadvali −36 kun', 'FAO-56 namunaviy misollariga qarshi 49 ta avtomatik test'],
    s5cap: 'Jarqo‘rg‘on yonidagi namuna dalaning yashilligi (NDVI), 2023–2024 mavsumi — MODIS Terra MOD13Q1',
    s6h: 'Kim qachon yig‘adi?', s6head: 'Surxondaryo piyozi Toshkentdan <b>30 kun</b>, Turkistondan (QZ) <b>35 kun</b>, Volgograddan (RU) <b>62 kun</b> oldin pishadi',
    s6l: ['Bitta piyoz modeli 16 hududda, NASA POWER ob-havosi 1985–2025', 'Oyna 1985–2004 ga nisbatan 5–10 kun erta siljidi', 'MODIS Surxondaryodagi har bir dala mavsumni qachon tugatganini ko‘rsatadi, 2016–2025'],
    s6cap1: 'Hududlar bo‘yicha pishish oynasi · chiziq = yillarning 10–90 % i', s6cap2: 'Har 500 m pikselning mavsum oxiri, 2025 · sariq = erta, to‘q yashil = kech',
    s7h: 'Oltita NASA ma’lumoti — har biri ekranda raqam beradi',
    s7d: [['NASA POWER', 'suv talabi, harorat yig‘indisi, sovuq, jazirama, iqlim siljishi, bozor oynasi'], ['MODIS MOD13Q1', 'daladagi o‘simlik, yashil davrlar, bosh xarita'], ['MODIS MCD12Q2', 'kalibrlangan mavsum uzunligi, yig‘im vaqti xaritasi'], ['MODIS MOD11A2', 'nuqtadagi yer yuzasi harorati'], ['SMAP L4', 'ildiz qatlami namligi: bugun va 2015–2024'], ['GRACE / GRACE-FO', 'suv zaxirasi anomaliyasi, 2003–2022']],
    s7next: 'Keyingi qadam: HLS 30 m — piyoz maydoni · narx tarixi · ko‘proq ekin · Xorazm va Qoraqalpog‘iston pilotlari',
    s7quote: 'Neyra qaror qilmaydi. Dehqon qaror qiladi — dalil bilan.',
    qr: ['Telegram bot', 'Veb-sayt', 'Manba kodi'],
    s7ai: 'Kod va matn AI yordamida (Claude Code) yozilgan; har bir raqam ko‘rsatilgan NASA va FAO manbalaridan hisoblanadi va testlar bilan tekshiriladi.',
  },
};

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const qr = async (url) => QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: '#101512', light: '#ffffff' } });

const CSS = `
@page { size: 1920px 1080px; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #fff; color: #101512; font: 28px/1.4 ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif; font-feature-settings: "tnum"; }
.slide { position: relative; width: 1920px; height: 1080px; overflow: hidden; page-break-after: always; break-after: page; padding: 96px 110px 80px; background: #fff; }
.slide:last-child { page-break-after: auto; }
h1 { margin: 0 0 18px; font-size: 64px; line-height: 1.08; letter-spacing: -.02em; font-weight: 800; }
h1.big { font-size: 74px; }
.eyebrow { font-size: 22px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #0f7f45; margin: 0 0 18px; }
.foot { position: absolute; left: 110px; right: 110px; bottom: 44px; display: flex; justify-content: space-between; align-items: center; font-size: 20px; color: #5b655e; }
.foot b { color: #101512; font-weight: 700; }
.foot img { height: 34px; vertical-align: middle; margin-right: 12px; }
.green { color: #0f7f45; }
.muted { color: #5b655e; }
.row { display: flex; gap: 48px; align-items: flex-start; }
.col { flex: 1; min-width: 0; }
.shot { display: block; max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 18px; box-shadow: 0 18px 50px rgb(16 21 18 / .14); }
.shot.flat { box-shadow: none; }
ul.l { margin: 18px 0 0; padding: 0; list-style: none; }
ul.l li { position: relative; padding-left: 36px; margin: 0 0 14px; font-size: 28px; line-height: 1.35; }
ul.l li::before { content: ''; position: absolute; left: 0; top: 14px; width: 14px; height: 14px; border-radius: 50%; background: #0f7f45; }
.cap { font-size: 20px; color: #5b655e; margin-top: 12px; }
.badge { display: inline-block; background: #0f7f45; color: #fff; font-weight: 800; letter-spacing: .08em; font-size: 20px; border-radius: 999px; padding: 8px 18px; vertical-align: middle; margin-left: 18px; }
/* 1 */
.title { display: grid; grid-template-columns: 1fr 1.25fr; align-items: center; height: 100%; gap: 60px; padding-bottom: 60px; }
.title .mark { width: 440px; }
.title .name { font-size: 150px; font-weight: 800; letter-spacing: -.04em; line-height: 1; margin: 0 0 8px; }
.title .tag { font-size: 64px; font-weight: 700; letter-spacing: -.02em; margin: 0 0 22px; }
.title .sub { font-size: 32px; color: #5b655e; margin: 0; }
.title .meta { margin-top: 48px; font-size: 24px; color: #5b655e; line-height: 1.6; }
.title .meta b { color: #101512; }
.wm { font-size: 16px; color: #8a938c; margin-top: 10px; letter-spacing: .04em; }
/* 2 */
.bignum { font-size: 230px; font-weight: 800; letter-spacing: -.05em; line-height: .95; color: #0f7f45; }
.bignum small { font-size: 40px; font-weight: 700; letter-spacing: 0; color: #101512; margin-left: 12px; }
.lead { font-size: 32px; line-height: 1.4; max-width: 24em; }
/* 3 */
.steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-top: 10px; }
.step { text-align: center; }
.step .n { display: inline-grid; place-items: center; width: 56px; height: 56px; border-radius: 50%; background: #0f7f45; color: #fff; font-weight: 800; font-size: 28px; margin-bottom: 12px; }
.step h3 { margin: 0 0 4px; font-size: 32px; }
.step p { margin: 0 0 14px; font-size: 22px; color: #5b655e; }
.step img { height: 500px; border-radius: 34px; box-shadow: 0 18px 50px rgb(16 21 18 / .18); border: 6px solid #101512; }
/* 7 */
.grid6 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px 40px; margin-top: 10px; }
.grid6 div { font-size: 24px; line-height: 1.35; padding: 10px 0; border-top: 2px solid #e3e8e1; }
.grid6 b { display: block; font-size: 26px; color: #0f7f45; }
.qrs { display: flex; gap: 36px; }
.qrs figure { margin: 0; text-align: center; font-size: 20px; color: #5b655e; }
.qrs img { width: 190px; height: 190px; display: block; margin: 0 auto 6px; border: 1px solid #e3e8e1; border-radius: 12px; }
.quote { font-size: 36px; font-weight: 700; letter-spacing: -.01em; margin: 28px 0 0; }
`;

function slides(L, lang, q) {
  const foot = (n) => `<div class="foot"><span><img src="logo.png" alt=""><b>Neyra</b> · ${esc(L.event)}</span><span>${n} / 7</span></div>`;
  const li = (arr) => `<ul class="l">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  return [
`<section class="slide"><div class="title">
  <div><img class="mark" src="logo.png" alt="Neyra">${L.aiLogo ? `<div class="wm">${esc(L.aiLogo)}</div>` : ''}</div>
  <div><p class="name">Neyra</p><p class="tag">${esc(L.tag)}</p><p class="sub">${esc(L.sub)}</p>
    <p class="meta"><b>${esc(L.team)}</b> · ${esc(L.members)}<br>${esc(L.event)}<br>${esc(L.chal)}</p></div>
</div></section>`,

`<section class="slide"><p class="eyebrow">${lang === 'en' ? 'The problem' : 'Muammo'}</p><h1>${esc(L.s2h)}</h1>
<div class="row" style="margin-top:30px">
  <div class="col"><div class="bignum">${esc(L.s2big)}<small>${esc(L.s2unit)}</small></div><p class="lead" style="margin-top:10px">${esc(L.s2cap)}</p><p class="lead" style="margin-top:26px"><b>${esc(L.s2line)}</b></p></div>
  <div style="flex:0 0 640px;display:grid;place-items:center"><img class="shot flat" src="shots/${lang}-loop.jpg" style="width:600px" alt=""></div>
</div>
<p class="cap" style="position:absolute;left:110px;bottom:100px">${esc(L.s2src)}</p>${foot(2)}</section>`,

`<section class="slide"><p class="eyebrow">${lang === 'en' ? 'How it works' : 'Qanday ishlaydi'}</p><h1>${esc(L.s3h)}</h1>
<div class="steps">
  ${[['a', 'field'], ['b', 'questions'], ['c', 'results']].map(([k, f], i) => `<div class="step"><span class="n">${i + 1}</span><h3>${esc(L['s3' + k])}</h3><p>${esc(L['s3' + k + '2'])}</p><img src="shots/${lang}-phone-${f}.png" alt=""></div>`).join('')}
</div>
<p class="cap" style="position:absolute;left:110px;right:110px;bottom:92px;font-size:22px;text-align:center">${esc(L.s3foot)}</p>${foot(3)}</section>`,

`<section class="slide"><p class="eyebrow">${lang === 'en' ? 'Live' : 'Jonli'}</p><h1>${esc(L.s4h)}<span class="badge">${esc(L.s4badge)}</span></h1>
<div class="row" style="margin-top:20px;height:720px">
  <div style="flex:0 0 1120px;height:100%"><img class="shot" src="shots/${lang}-map.jpg" style="height:100%;width:100%;object-fit:cover;object-position:top" alt=""></div>
  <div class="col">${li(L.s4l)}</div>
</div>${foot(4)}</section>`,

`<section class="slide"><p class="eyebrow">${lang === 'en' ? 'Why trust it' : 'Nega ishonish mumkin'}</p><h1>${esc(L.s5h)}</h1>
<div class="row" style="margin-top:10px;min-height:700px;align-items:center">
  <div style="flex:0 0 1130px"><img class="shot flat" src="shots/${lang}-ndvi.jpg" style="width:1130px;background:#fff;border:1px solid #e3e8e1;padding:18px" alt=""><p class="cap">${esc(L.s5cap)}</p></div>
  <div class="col">${li(L.s5l)}</div>
</div>${foot(5)}</section>`,

`<section class="slide"><p class="eyebrow">${lang === 'en' ? 'Right time' : 'To‘g‘ri vaqt'}</p><h1>${esc(L.s6h)}</h1>
<p class="lead" style="font-size:34px;max-width:40em;margin:0 0 20px">${L.s6head}</p>
<div class="row" style="height:600px">
  <div style="flex:0 0 1000px;height:100%"><img class="shot flat" src="shots/${lang}-window.jpg" style="height:540px;width:1000px;object-fit:cover;object-position:top;border:1px solid #e3e8e1" alt=""><p class="cap">${esc(L.s6cap1)}</p></div>
  <div class="col"><img class="shot" src="shots/${lang}-harvest.jpg" style="height:380px" alt=""><p class="cap">${esc(L.s6cap2)}</p>${li(L.s6l.slice(0, 2))}</div>
</div>${foot(6)}</section>`,

`<section class="slide"><p class="eyebrow">${lang === 'en' ? 'Impact and next' : 'Ta’sir va kelajak'}</p><h1>${esc(L.s7h)}</h1>
<div class="row" style="margin-top:16px">
  <div class="col"><div class="grid6">${L.s7d.map(([a, b]) => `<div><b>${esc(a)}</b>${esc(b)}</div>`).join('')}</div>
    <p class="lead" style="font-size:26px;margin-top:26px">${esc(L.s7next)}</p><p class="quote green">${esc(L.s7quote)}</p></div>
  <div style="flex:0 0 700px"><div class="qrs">${[['bot', 0], ['site', 1], ['repo', 2]].map(([k, i]) => `<figure><img src="${q[k]}" alt="">${esc(L.qr[i])}</figure>`).join('')}</div>
    <p class="cap" style="margin-top:28px;font-size:19px">${esc(L.s7ai)}</p><p class="cap" style="font-size:22px;color:#101512;margin-top:18px"><b>${esc(L.team)}</b> · ${esc(L.members)}</p></div>
</div>${foot(7)}</section>`,
  ];
}

const q = { bot: await qr(LINKS.bot), site: await qr(LINKS.site), repo: await qr(LINKS.repo) };
for (const lang of ['en', 'uz']) {
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>Neyra — ${lang}</title><style>${CSS}</style></head><body>${slides(T[lang], lang, q).join('\n')}</body></html>`;
  await writeFile(new URL(`./deck-${lang}.html`, import.meta.url), html);
  console.log(`deck-${lang}.html`, html.length, 'bytes');
}
