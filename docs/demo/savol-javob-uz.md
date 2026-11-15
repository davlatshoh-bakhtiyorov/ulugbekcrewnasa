# Neyra — qanday ishlaydi va hakamlar savollariga javoblar (o‘zbekcha)

Sahnada yoddan aytish uchun. Har javob 2–3 jumla. Raqamlar — kod va ma’lumot fayllaridan (15-noyabr 2026 holati).

---

## 1. Bir nafasda

Neyra dehqondan **uchta narsani** so‘raydi — dala qayerda, o‘tgan yili nima ekilgan, suv va sho‘r qanday — va **42 yillik NASA ob-havosi** bo‘yicha oltita ekinni shu dala uchun sinab ko‘radi: suv qancha ketadi, sovuqdan oldin pishadimi, tuproqqa nima bo‘ladi, yig‘imda buziladimi. Eng yaxshi uchtasini to‘rtta chiroq bilan ko‘rsatadi. **Hamma hisob telefonning o‘zida**, server yo‘q; har raqam ostida manbasi yozilgan.

---

## 2. Ma’lumotlar — nima, qayerdan, nimaga

| Ma’lumot | Qayerdan | Aniqlik · davr | Ilovada nimani beradi |
|---|---|---|---|
| **NASA POWER** — kunlik ob-havo: Tmax, Tmin, shudring nuqtasi, shamol (2 m), quyosh radiatsiyasi, yog‘in | POWER API (MERRA-2 reanaliz + CERES) | ≈ 50 km katak · 1984–2025, 15 341 kun | suv talabi, pishish, sovuq, jazirama, yig‘im ob-havosi, iqlim siljishi, bozor oynasi |
| **MODIS NDVI** (MOD13Q1) — o‘simlik yashilligi 0…1 | NASA GIBS xarita taylari + rasmiy rang shkalasi | 250 m · har 16 kun | xaritadagi «O‘simlik» qatlami, nuqtadagi 12 oylik tarix, pasportdagi 3 mavsum, yashil davrlar |
| **MODIS fenologiya** (MCD12Q2) — har piksel mavsumi qachon boshlanib tugagan | ORNL DAAC (oldindan yuklangan) | 500 m · yiliga 1 marta · 2016–2025 | FAO jadvalini kalibrlash (bug‘doy, paxta); «Kim qachon yig‘adi» xaritasi |
| **MODIS yer harorati** (MOD11A2) | GIBS | 1 km · 8 kun | «Yer harorati» qatlami |
| **SMAP L4** — ildiz qatlami (0–100 sm) tuproq namligi | GIBS | 9 km · kunlik | «Tuproq namligi» qatlami; pasportda bugun vs 2015–2024 ning shu kuni |
| **GRACE / GRACE-FO** — yer osti+usti suv zaxirasi anomaliyasi | GIBS | ≈ 300 km · oylik, 2003–2022 | «Suv zaxirasi» qatlami |
| **FAO-56 Rev.1 (2025)** — ekin koeffitsiyentlari, harorat chegaralari, sho‘rga chidamlilik | FAO hujjati, jadval va sahifa raqami bilan | — | formulalar va ekin parametrlari |

Xaritadagi raqamlar qanday olinadi: GIBS har qatlam uchun «rang → qiymat oralig‘i» jadvalini e’lon qiladi; biz bosilgan pikselning rangini shu jadval bilan raqamga aylantiramiz (oraliq o‘rtasi). Shaffof piksel = «ma’lumot yo‘q» (bulut). Sinov taylarida ranglarning 100 % i jadvalga mos keldi.

---

## 3. Algoritm — to‘rt chiroq qadamma-qadam

Har ekin uchun, **har yil alohida** (1984–2025), keyin yillar bo‘yicha sanaladi («42 yildan 32 tasida»).

**1) Suv** — FAO-56 Penman–Monteith: POWER’ning harorat, namlik, shamol, radiatsiyasidan kunlik bug‘lanish (ET0) hisoblanadi; ekin koeffitsiyenti Kc (FAO 6.1–6.2-jadvallar, shamol va namlikka moslangan) bilan ko‘paytiriladi; samarali yog‘in ayiriladi. Natija — daladagi sof suv talabi, m³/ga. **Quruq yil** = 5 yildan 4 tasida oshmaydigan qiymat (80-persentil). Chiroq dehqon javobiga bog‘liq: «yetarli» bo‘lsa yashil < 10 000, sariq < 14 000; «ba’zan yetmaydi» — < 6 000 / < 9 000; «kam» — < 4 000 / < 6 000 m³/ga.

**2) Pishib ulgurish** — harorat yig‘indisi (GDD): har kuni o‘rtacha harorat bazadan (bug‘doy 0 °C, paxta 12 °C, piyoz 4,5 °C …) qancha yuqori bo‘lsa, shuncha «issiqlik» to‘planadi; ekin FAO jadvalidagi yig‘indiga yetganda «pishdi». Bahor/yoz ekini uchun: agar yig‘indi to‘lguncha kuzgi sovuq (Tmin ≤ 0 °C) kelsa — o‘sha yil «ulgurmadi». Yashil ≥ 90 % yil, sariq ≥ 70 %. Paxta: 42 yildan 32 tasida ulguradi (sariq); bug‘doy: 41/41.

**3) Tuproq** — ikki qism, yomoni olinadi: (a) almashlab ekish qoidasi — o‘sha ekin ketma-ket → qizil; dukkakli (mosh, beda) → yashil; dukkaklidan keyin → yashil; qolgani sariq; (b) sho‘r — dehqon javobi ECe oralig‘iga o‘giriladi (kuchsiz 2–4, o‘rtacha 4–8, kuchli 8–16 dS/m), FAO 8.8–8.11-jadvallar bo‘yicha hosil kamayishi hisoblanadi (chegaradan har 1 dS/m oshganda b % kamayadi); yashil ≥ 90 % hosil, sariq ≥ 70 %.

**4) Bozor va isrof** — pishgandan keyingi 14 kun ob-havosi: don/paxta uchun ≥ 3 yomg‘irli kun = «nam yig‘im», piyoz/kartoshka uchun o‘rtacha Tmax ≥ 30 °C = «issiq yig‘im». Shunday yillar ulushi < 20 % — past xavf, < 50 % — o‘rta, undan ko‘p — yuqori. **Narx qismi hozircha «noma’lum»** — narx tarixi hali ulanmagan, buni yashirmaymiz.

**Tartib:** yashil 2 ball, sariq 1, qizil 0, noma’lum 1; yig‘indi bo‘yicha; teng bo‘lsa — qizili kamrog‘i, keyin suvi kamrog‘i. Birinchi uchtasi ko‘rsatiladi, qolgani «Boshqa ekinlar»da.

---

## 4. Kalibrlash — bizning asosiy ilmiy hissamiz

FAO jadvalidagi harorat yig‘indilari «yo‘naltiruvchi» va boshqa iqlimlar uchun. Surxondaryoda ular bilan kuzgi bug‘doy **25-aprelda** «pishardi» — haqiqatda dala iyun boshigacha yashil. Biz Jarqo‘rg‘on atrofidagi ±8 km (33×33 piksel) uchun MODIS fenologiyasidan har piksel-yilda mavsum **haqiqatda qachon tugaganini** oldik, o‘sha kungacha POWER’dan GDD yig‘dik va medianani yangi jadval qildik:
- **Bug‘doy:** 2 105 → 3 066 GDD (767 dala-yil, 323 piksel); pishish 25-aprel → 3-iyun. Tekshiruv 2016–2025: model MODIS’dan **+0,5 kun** farq qiladi (FAO jadvali −36 kun).
- **Paxta:** 2 150 → 2 823 GDD (261 dala-yil, 167 piksel); 21-avgust → 5-oktabr; tekshiruv −4,5 kun (FAO −52). Sovuqdan oldin 42 yildan 32 tasida ulguradi.
- Piyoz, kartoshka, mosh — FAO qiymatida qoldi: 500 m piksel ularni bir-biridan ajrata olmaydi (buni ilova ham aytadi).

---

## 5. Saytdagi ikki qo‘shimcha

**Bozor oynasi** — bitta piyoz modeli 16 hududda (O‘zbekiston 7, Tojikiston 2, Turkmaniston 1, Qozog‘iston 2, Qirg‘iziston 1, Rossiya 3), NASA POWER bilan. Ekish qoidasi: 30 kunlik o‘rtacha harorat 10 °C ga yetgan birinchi kun (jamoa qoidasi). Surxondaryo Toshkentdan **30**, Turkistondan **35**, Volgograddan **62** kun oldin pishadi; 2006–2025 da hamma joyda 5–10 kun erta. Mutlaq sanalar FAO jadvali noaniqligini ko‘taradi; **hududlar orasidagi farq** ishonchli qism.

**Kim qachon yig‘adi** — MODIS fenologiyasi Surxondaryo ±65 km (261×261 piksel), 2016–2025: har dala mavsumni qachon tugatgan (sariq — erta, to‘q yashil — kech). Medianalar 29-may – 10-iyun. Halol eslatma: shu ma’lumotdan piyoz maydonini sanamoqchi edik — 500 m piksel buni ajrata olmadi (15-maygacha tugaganlar 2016 da 4 649, 2017 da 179, 2018 da 1 — bu erta pishgan bug‘doy, piyoz emas). Keyingi qadam — 30 m HLS.

---

## 6. Nimani qila olmaymiz (so‘rashsa — o‘zimiz aytamiz)

- Chiroq chegaralari (10 000 / 6 000 m³/ga, 90 %/70 % …) — jamoa qoidasi, agronom ko‘rmagan. Raqamlarning o‘zi manbali.
- NASA POWER ≈ 50 km katak — iqlim uchun yaxshi, dalaning mikroiqlimi emas. Dala darajasi MODIS 250 m dan keladi.
- Narx tarixi yo‘q — bozor chirog‘i faqat buzilish xavfi.
- Piyoz maydoni 500 m dan aniqlanmaydi; HLS/Sentinel-2 30 m kerak.
- Bug‘doyning gullashdagi issiq stressi aniqlanmaydi (kunlik o‘rtacha mayda 35 °C ga yetmaydi).
- Kalibrlash faqat Surxondaryo uchun; boshqa viloyatda FAO qiymati ishlaydi (ilova buni aytadi).

---

## 7. Savol-javob

**Bu bashoratmi?** — Yo‘q. Biz kelajakni emas, tarixni sanaymiz: «shu dalada 42 yildan 32 tasida paxta sovuqdan oldin pishgan». Ehtimollik — o‘tgan yillar ulushi, taxmin emas.

**Nega NASA POWER, ob-havo stansiyasi emas?** — Stansiya har dalada yo‘q, 42 yillik qatori ham yo‘q. POWER butun dunyoda, har kuni, bepul. Kamchiligi — 50 km katak; shuning uchun dala darajasini MODIS (250 m) va SMAP beradi.

**50 km katak dehqon uchun yetarlimi?** — Harorat, sovuq, bug‘lanish uchun — ha, bular katta masshtabda o‘zgaradi. Dala o‘ziga xosligi (yashillik, namlik) — sun’iy yo‘ldosh qatlamlaridan.

**FAO jadvalini qanday to‘g‘riladingiz?** — Sun’iy yo‘ldosh dalalar aslida qachon tugaganini ko‘rsatdi; biz jadvalni shu kuzatuvga moslab qayta masshtabladik va alohida 10 yilda tekshirdik: farq yarim kun.

**Sho‘rlanishni qayerdan bilasiz?** — Dehqondan so‘raymiz (u biladi), javobni FAO jadvallari bilan hosilga aylantiramiz. Sun’iy yo‘ldoshdan sho‘rni o‘lchash — keyingi qadam.

**Narx-chi?** — Hozircha yo‘q, ilova «noma’lum» deydi. Bozor chirog‘i yig‘imdagi buzilish xavfi. Narx tarixi ulansa, xuddi shu chiroqqa qo‘shiladi.

**SMAP namligi haqiqiy o‘lchovmi?** — SMAP L4 — sun’iy yo‘ldosh o‘lchovi + yer modeli tahlili (0–100 sm, 9 km). Biz uni «bugun vs 10 yil shu kuni» qilib ko‘rsatamiz — mutlaq raqamdan ko‘ra solishtirish ishonchli.

**Nega aynan 6 ekin?** — Surxondaryoning asosiylari va FAO’da to‘liq manbali parametrlari borlari. Yangi ekin qo‘shish — jadvaldan 10 ta raqam, manba bilan.

**Boshqa viloyatda ishlaydimi?** — Ha, istalgan nuqtada: POWER va GIBS global. Faqat MODIS kalibrlash Surxondaryo uchun; boshqa joyda FAO qiymati va ilova shuni yozadi.

**Nega Telegram?** — Dehqonda bor, o‘rnatish shart emas, joylashuv bir tugma bilan keladi. Brauzerda ham ochiladi.

**Internet bo‘lmasa?** — Kerak: POWER va taylar jonli. Oxirgi dala natijasi telefonda saqlanadi.

**Qanday tekshirdingiz?** — 49 ta avtomatik test: FAO-56 ning nashr etilgan misollari (ET0, Kc) bizning kod bilan bir xil chiqadi; MODIS kalibrlash tekshiruvi; xarita rang dekodi mustaqil Python hisobi bilan teng.

**AI ishlatdingizmi?** — Ha: Claude Code kod va matn yozishda yordam berdi. Hech bir raqam AI dan emas — hammasi formula va ma’lumotdan, testlar bilan. Logo AI bilan yaratilgan.

**Bug‘doy 41/41 — nega 42 emas?** — Kuzgi bug‘doy oktabrda ekilib keyingi yil pishadi; 42 yil ichida 41 ta to‘liq mavsum bor.

**Nega paxta ko‘pincha «sariq»?** — Model 10 yilda sovuq oldin kelgan deydi; shundan 8 tasi 2009 gacha. 2018 va 2020 da MODIS dalalar tugatganini ko‘rdi — model salqin yilda ehtiyotkor; ilova buni ochiq yozadi.

**Dehqon buni tushunadimi?** — Uch tugma, to‘rt chiroq, bitta jumla. Raqam va manbalar «Batafsil» ostida — xohlagan ko‘radi.

**Keyin nima?** — HLS 30 m bilan ekin maydoni (poda signali), narx tarixi, ko‘proq ekin, Xorazm va Qoraqalpog‘iston pilotlari, agronom bilan chegaralarni tasdiqlash.

---

## 8. Raqamlar shpargalkasi

42 yil · 15 341 kun · 6 POWER parametri · 6 ekin · 4 chiroq · 49 test · 767 dala-yil (bug‘doy) / 261 (paxta) · +0,5 kun · 25-aprel → 3-iyun · 32/42 · 30 · 35 · 62 kun · 16 hudud · 13 viloyat · 1 500 so‘m (12 sent) · 150–200 ming t · 5–7 mln t (20–30 %) · 4,9 % sovutgich · 74 → 80 jazirama kun · 254 → 262 sovuqsiz kun.
