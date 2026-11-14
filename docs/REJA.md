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
| 4c | GDD'ni MODIS MCD12Q2 bilan kalibrlash (pishib ulgurish chirog'i) | |
| 5 | Telegram bot: /start va Mini App'ni ochuvchi tugma | |
| 6 | Suv prognozi (GRACE) va HLS 30 m — Earthdata Login kerak | |
| 7 | Inglizcha loyiha sahifasi va demo | |

## Arxitektura

`core/` sof JS funksiyalar. Bitta veb ilova (`web/`) ham brauzerda, ham Telegram ichida Mini App
sifatida ochiladi; NASA API'larga brauzerdan to'g'ridan-to'g'ri murojaat qiladi (server shart emas).
Bot (`bot/`) faqat Mini App'ni ochadi; token `.env` faylida turadi (`.env.example` ga qarang).
Mini App uchun ochiq HTTPS manzil kerak (`WEBAPP_URL`).

## Ma'lum muammo (4-qadamda tuzatiladi)

FAO jadvallaridagi GDD yig'indilari boshqa iqlimlarda o'lchangan. Issiq Surxondaryoda mavsum qisqa
chiqadi: kuzgi bug'doy 25-aprelda "pishadi" (aslida o'rim may oxiri - iyun), mosh 43 kunda (odatda
60-90). Shu sabab pilot nuqtada 6 ekinning hammasi 100% pishib ulguradi. Yechim: har bir ekin GDD'sini
haqiqiy dalalarda MODIS MCD12Q2 (har yilgi ko'karish/qurish sanalari) bilan kalibrlash.

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
