# NASA manbalari — jonli tekshiruv (2026-11-14)

Brauzerdan tekshirildi. Nuqta: 37.51° sh.k., 67.42° sh.u. (Surxondaryo, Jarqo'rg'on atrofi).

## Loginsiz ishlaydi (brauzerdan to'g'ridan-to'g'ri, CORS ochiq)

| Manba | Nima | Aniqlik | Davr | Holat |
|---|---|---|---|---|
| NASA POWER daily point | harorat, shudring nuqtasi, shamol, radiatsiya, yog'in, tuproq namligi (model) | ~0.5° | 1984–hozir | ishlaydi; 42 yil ≈ 3 soniya; manbalar: MERRA-2, SRB, SYN1deg |
| ORNL TESViS · MOD13Q1 | NDVI / EVI | 250 m | 2000-02 → 2026-10-16 | ishlaydi |
| ORNL TESViS · MCD12Q2 | yillik o'sish sikllari (NumCycles, Greenup, Maturity, Senescence) | 500 m | 2001–2025 | ishlaydi |
| ORNL TESViS · MOD16A2GF | haqiqiy evapotranspiratsiya | 500 m | 2000–2025 | ishlaydi |
| ORNL TESViS · MOD11A2 | yer yuzasi harorati | 1 km | 2000-02 → 2026-10-24 | ishlaydi |
| ORNL TESViS · MOD09A1 | yuza qaytarishi (sho'rlanish indeksi uchun) | 500 m | 2000-02 → 2026-10-24 | ishlaydi |
| GIBS WMTS | xarita qatlamlari | — | — | ishlaydi |

ORNL manzili: `https://modis.ornl.gov/rst/api/v1/{mahsulot}/subset` — bitta so'rovda 10 sanagacha,
javob sekin (bir necha soniyadan o'nlab soniyagacha). Shuning uchun uzoq tarix MCD12Q2 dan
(yiliga bitta qiymat), oxirgi 2–3 yil MOD13Q1 dan olinadi va natija keshlanadi.

## Bu nuqta uchun ORNL'da yo'q

| Manba | Natija | Yechim |
|---|---|---|
| SMAP SPL3SMP_E | "No data available for location" | xaritada GIBS qatlami; sonli qiymat Earthdata Login bilan |
| ECOSTRESS ECO4ESIPTJPL | "No data available for location" | Earthdata Login (AppEEARS) yoki ro'yxatdan chiqariladi |

## Eslatmalar

- POWER'dagi GWETROOT / GWETTOP — MERRA-2 modeli natijasi, SMAP o'lchovi emas.
- Tekshirilgan pikselda 2025 yil yozida NDVI ≈ 0.20–0.23: bu sug'oriladigan dala emas.
  4-qadamda pilot uchun haqiqiy dala pikseli tanlanadi.
- Claude'ning bulut va qurilma muhitlari NASA serverlariga chiqa olmaydi; jonli so'rovlar
  faqat brauzer oynasidan yuboriladi. Sahifaning o'zi ham shunday ishlaydi.
