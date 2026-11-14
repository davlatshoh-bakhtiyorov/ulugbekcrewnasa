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
| 2 | Ekinlar jadvali va ekin bo'yicha hisob: pishib ulgurish ehtimoli, suv talabi, yig'imda buzilish xavfi | navbatda |
| 3 | Veb sahifa: dehqon oqimi | |
| 4 | Dala xotirasi (MCD12Q2 + MOD13Q1) va xarita (GIBS) | |
| 5 | Telegram bot | |
| 6 | Suv prognozi (GRACE) va HLS 30 m — Earthdata Login kerak | |
| 7 | Inglizcha loyiha sahifasi va demo | |

## Arxitektura

`core/` sof JS funksiyalar. Veb sahifa NASA API'larga brauzerdan to'g'ridan-to'g'ri murojaat
qiladi (server shart emas). Bot Node'da shu funksiyalarni chaqiradi; unga ochiq internetli
server kerak, token `.env` faylida turadi.
