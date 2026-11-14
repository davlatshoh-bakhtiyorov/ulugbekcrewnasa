# Reja — qadamma-qadam

Talablar: ta'sirli, sodda, qulay, aniq. Veb + Telegram bot.

## Dehqon oqimi (veb va botda bir xil)

1. Dalani ko'rsatadi — botda joylashuv yuboradi, vebda xaritada bosadi.
2. Tugmalar bilan javob beradi: oxirgi ekin · suv ahvoli · sho'rlanish.
3. Uchta variant oladi. Har birida to'rtta belgi (yashil / sariq / qizil):
   suv · pishib ulgurish · tuproqqa foyda · bozor va isrof xavfi — va bir gaplik izoh.
   "Batafsil" bosilsa, NASA dalillari (grafik, manba, aniqlik) ochiladi.

## Aniqlik qoidalari

- Har bir raqam yonida manba, aniqlik (m/km) va davr yoziladi.
- Ehtimol tarixdan hisoblanadi ("42 yildan 39 tasida"), taxmin qilinmaydi.
- Ma'lumot yo'q bo'lsa, vosita "bilmayman" deydi; bo'shliqni to'ldirmaydi.
- Hisoblar FAO-56 misollari bilan testlanadi (`npm test`).

## Qadamlar

| # | Qadam | Holat |
|---|---|---|
| 1 | Poydevor: papka, NASA API jonli tekshiruvi, ET0 va iqlim yadrosi, testlar, pilot nuqta | bajarildi |
| 2 | Ekinlar jadvali (6 ekin, FAO-56 Rev.1 + FAO-29, sahifa raqami bilan) va ekin bo'yicha hisob: pishib ulgurish ehtimoli, suv talabi, issiq kunlar, yig'imda buzilish xavfi, sho'rda hosil | bajarildi (`npm run pilot`) |
| 3 | Veb ilova = Telegram Mini App: dehqon oqimi (`npm run dev`) | jonli: https://davlatshoh-bakhtiyorov.github.io/ulugbekcrewnasa/web/ ; Telegram ichida ishladi (14-noyabr) |
| 4a | Tirik NASA xaritasi: 4 qatlam (NDVI, SMAP namlik, yer harorati, GRACE), sana sirpang'ichi + animatsiya, bosilgan nuqtada har qatlamning qiymati va tarixi | bajarildi (`npm run gibs`) |
| 4b | Dala pasporti: NDVI 3 mavsum (yashil davrlar), SMAP namlik bugun va oldingi yillar, iqlim siljishi | bajarildi |
| 4c | GDD'ni MODIS MCD12Q2 bilan kalibrlash (pishib ulgurish chirog'i): bug'doy va paxta | bajarildi (`npm run mcd12q2`, `npm run calibrate`) |
| C | Loyiha sayti «Neyra» (ildiz, uz/en, v3 — bosh qismda skrollda ochiladigan 3D NASA qatlamlari, alohida katta interaktiv xarita (ilova moduli), har bo'limda bitta vizual, qolgan matn «ⓘ Batafsil» ostida): NDVI animatsiyali bosh qism, muammo (manbali raqamlar), qanday ishlaydi + jonli demo, NASA ma'lumotlari jadvali, 13 viloyat iqlim xaritasi, FAO va MODIS solishtiruvi, usul/cheklov/manbalar yig'ma bloklarda | bajarildi (`npm run site-data`); 7-qadam uchun asos |
| A | Sun'iy yo'ldosh yig'imni ko'radi: MODIS MCD12Q2 bilan har pikselning mavsum oxiri (xarita + yil chizig'i). «Poda» (piyoz maydoni) sanash sinaldi va rad etildi — 500 m piksel piyozni ajratmaydi | bajarildi (`npm run mcd12q2:region`, `npm run harvest`) |
| B | Bozor oynasi: bitta piyoz modeli 16 hududda (NASA POWER) — kim qachon yig'adi, oyna qancha, 1985–2004 → 2006–2025 siljishi | bajarildi (`npm run market-window`) |
| 5 | Telegram bot: /start va Mini App'ni ochuvchi tugma | menyu tugmasi Bot API orqali o'rnatilgan va tasdiqlangan; `bot/` hali bo'sh |
| 6 | Suv prognozi (GRACE) va HLS 30 m — Earthdata Login kerak | |
| 7 | Topshirish: inglizcha README, forma matni (saytning en matnidan), demo (7 slayd yoki 30 s video), jamoa ismlari | sayt tayyor, qolgani kutmoqda |

## Arxitektura

`core/` sof JS funksiyalar. Bitta veb ilova (`web/`) ham brauzerda, ham Telegram ichida Mini App
sifatida ochiladi; NASA API'larga brauzerdan to'g'ridan-to'g'ri murojaat qiladi (server shart emas).
Bot (`bot/`) faqat Mini App'ni ochadi; token `.env` faylida turadi (`.env.example` ga qarang).
Mini App uchun ochiq HTTPS manzil kerak (`WEBAPP_URL`).

## GDD kalibrlash NASA MODIS bilan (4c)

Muammo edi: FAO jadvallaridagi GDD yig'indilari boshqa iqlimlarda o'lchangan, issiq Surxondaryoda mavsum
qisqa chiqardi (kuzgi bug'doy 25-aprelda "pishardi", aslida o'rim may oxiri - iyun) va 6 ekinning hammasi
100% pishib ulgurardi — chiroq hech narsa demasdi.

Yechim: NASA MODIS MCD12Q2 v061 (500 m, yillik fenologiya, doi 10.5067/MODIS/MCD12Q2.061) Jarqo'rg'on
atrofida ±8 km (33×33 piksel), 2016–2025, ORNL TESViS orqali. Har bir dala-yil uchun model ekish sanasidan
MODIS ko'rgan mavsum oxirigacha GDD (NASA POWER harorati, Eq. 6.23) hisoblanadi; mediana yangi yig'indi,
FAO bosqichlari nisbati saqlanadi. Qaysi piksel qaysi ekin — jamoa qoidasi (`verified: false`):

| Ekin | Piksel-yil | Mavsum oxiri belgisi | FAO | Kalibrlangan | Model pishishi | Tekshiruv 2016–2025 (model − MODIS) |
|---|---|---|---|---|---|---|
| Kuzgi bug'doy | 2 tsikl, 1-tsikl may–iyulda tugaydi: 767 (323 piksel) | Dormancy (EVI2 15% ga qaytgan, to'liq qurish) ~2-iyun | 2105 GDD, 25-aprel | 3066 GDD, 3-iyun | 41/41 yil | +0,5 kun (FAO: −36) |
| Paxta | 1 tsikl, aprel–iyunda ko'karadi: 261 (167 piksel) | MidGreendown (EVI2 yarmiga tushgan, barg to'kish) ~11-oktabr | 2150 GDD, 21-avgust | 2823 GDD, 5-oktabr | 32/42 yil | −4,5 kun (FAO: −52) |

Paxtada Dormancy (~6-noyabr) ishlatilmadi: kech terimlar, poya va paxta orasiga ekilgan bug'doy pikselni
noyabrgacha yashil tutadi; u bilan model 42 yildan 23 tasida "sovuq oldin keldi" der edi — ishonarsiz.
Sezgirlik (`core/calibration.js` ichida): bug'doy MidGreendown bilan 2620 GDD; paxta Dormancy bilan 2941;
qattiqroq filtr (QA 0, amplituda ≥ 0,2) ikkalasida ±1–2%.
Cheklov: salqin yillarda (2018, 2020) model paxtani "sovuq oldin" deydi, MODIS esa dalalar mavsumni
tugatganini ko'rdi — ilova buni ochiq yozadi. Piyoz, kartoshka, mosh FAO qiymatida qoldi: 500 m pikselda
ularni ajratib bo'lmaydi (2-tsikl iyul–noyabr, ~120 kun — mosh, makkajo'xori, sabzavot aralash).

## NASA xaritasidan raqam olish (4a)

NASA GIBS qatlamlari rasm (tayl) bo'lib keladi, lekin GIBS har bir qatlam uchun rasmiy rang shkalasini
e'lon qiladi: har bir rang aniq qiymat oralig'iga mos (masalan SMAP: 0.165–0.168 m³/m³). Bosilgan nuqtadagi
piksel rangi shu jadvaldan topiladi va oraliq o'rtasi ko'rsatiladi; shaffof piksel (bulut, qamrov yo'q) —
"ma'lumot yo'q". Tekshiruv: 4 qatlamning test taylida ranglarning 100% i shkalaga mos keldi; namuna
dalada brauzer o'qigan 12 ta NDVI qiymati Python + PIL bilan mustaqil o'qilganiga to'liq teng.

| Qatlam | NASA mahsuloti | Aniqlik | Kadrlar |
|---|---|---|---|
| O'simlik | MODIS Terra MOD13Q1 v061 NDVI | 250 m, 16 kunlik | oxirgi 12 oy |
| Tuproq namligi | SMAP L4 SPL4SMAU v008, ildiz zonasi 0–100 sm | 9 km, kunlik | oxirgi 12 oy |
| Yer harorati | MODIS Terra MOD11A2 v061 LST (kunduz) | 1 km, 8 kunlik | oxirgi 12 oy |
| Suv zaxirasi | GRACE/GRACE-FO JPL Mascon RL06 v02 (CRI) | ~300 km, oylik | har yili iyul, 2003–2022 (GIBS'da 2022-yil iyulgacha) |

Kadr sanalari va rang shkalalari `npm run gibs` bilan `web/data/gibs-layers.json` ga yoziladi (har bir kadr
GIBS'dan `layer-time-actual` sarlavhasi bilan tekshiriladi). Yangi ma'lumot uchun qayta ishga tushiring.
IMERG yog'in qatlami olinmadi: EPSG:3857 da faqat kunlik, quruq mavsumda deyarli bo'sh; yog'in raqamlari
NASA POWER'dan keladi. HLS 30 m — keyinroq (sinalgan sanada tayl bo'sh).

Namuna dala: 37.5021, 67.3888 (Jarqo'rg'on yonida) — yiliga ikki hosil: NDVI mart–aprel ~0.7, may 0.27
(yig'im), iyul–avgust 0.75. Pilot nuqta (37.51, 67.42) bilan bitta NASA POWER katagida, iqlim natijalari bir xil.
