# Neyra — NASA Space Apps 2026 (Field Shift UZ)

Challenge: **Field Shift: Adapting Farms with NASA Data** · Jamoa: ulugbek-crew · Toshkent

Dehqon dalasini ko'rsatadi va uchta savolga javob beradi; vosita NASA ma'lumotlari asosida
almashlab ekish variantlarini suv, iqlim, tuproq va bozor/isrof xavfi bo'yicha solishtiradi.
Veb sahifa va Telegram bot bitta hisob-kitob yadrosi (`core/`) ustida ishlaydi.

```
core/    sof JS hisob-kitoblar (brauzer + Node)
web/     dehqon uchun ilova (brauzer + Telegram Mini App)
site/    loyiha sayti (uz/en) — ildizdagi index.html bilan
bot/     Telegram bot
tests/   testlar:  npm test
docs/    reja va NASA ma'lumotlari tekshiruvi
```

Jonli: sayt https://davlatshoh-bakhtiyorov.github.io/ulugbekcrewnasa/ · ilova https://davlatshoh-bakhtiyorov.github.io/ulugbekcrewnasa/web/ · bot @ulugbekcrewbot

Ishga tushirish: `npm run dev` -> http://localhost:8080/ (sayt) va http://localhost:8080/web/ (ilova) · testlar: `npm test` · pilot: `npm run pilot`
· NASA xarita kadrlarini yangilash: `npm run gibs`
· Sayt uchun 13 viloyat iqlim siljishi (NASA POWER): `npm run site-data` -> `site/data/climate.json`
· Bozor oynasi (16 hudud, piyoz, NASA POWER): `npm run market-window` -> `site/data/market-window.json`
· Namuna dala NDVI qatori (GIBS taylari Node'da): `npm run field-ndvi` -> `site/data/field-ndvi.json`
· Yig'im vaqti xaritasi (MODIS MCD12Q2, Surxondaryo ±65 km): `npm run mcd12q2:region` (~40 daqiqa) va `npm run harvest` -> `site/data/harvest.json`
· GDD kalibrlash (NASA MODIS MCD12Q2): `npm run mcd12q2` (yuklab olish, ~2 daqiqa) va `npm run calibrate` -> `core/calibration.js`

Reja: `docs/REJA.md` · NASA manbalari holati: `docs/NASA-TEKSHIRUV.md`
