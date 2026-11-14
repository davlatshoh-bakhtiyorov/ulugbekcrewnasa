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
| 3 | Veb ilova = Telegram Mini App: dehqon oqimi | navbatda |
| 4 | Dala xotirasi (MCD12Q2 + MOD13Q1), xarita (GIBS) va GDD'ni MODIS bilan kalibrlash | |
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
