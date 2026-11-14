// Ekinlar jadvali. Har bir qiymat manbasi, jadval raqami va bosma sahifa raqami bilan.
// Qoida: manbasiz qiymat yo'q; tekshirilmagan qiymat `verified: false` bilan belgilanadi.
//
// Asosiy manba FAO-56 ning 2025 yilgi qayta ko'rilgan nashri (56 Rev.1): unda bosqich uzunliklari
// kunda emas, GDD (harorat yig'indisi) da berilgan - iqlim o'zgarishini hisobga oladi.
// Sahifa raqamlari - kitobdagi bosma raqam (PDF faylida +32).
// Sho'rga chidamlilik FAO-29 ning 4-jadvali bilan solishtirib tekshirilgan (tests/crops.test.js).

export const SOURCES = {
  fao56r1: {
    short: 'FAO-56 Rev.1 (2025)',
    cite: 'Pereira, L.S., Allen, R.G., Paredes, P., López-Urrea, R., Raes, D., Smith, M., Kilic, A. & Salman, M. (2025). ' +
      'Crop evapotranspiration - Guidelines for computing crop water requirements. FAO Irrigation and Drainage Paper 56 Rev.1. Rome, FAO.',
    url: 'https://doi.org/10.4060/cd6621en',
  },
  fao56: {
    short: 'FAO-56 (1998)',
    cite: 'Allen, R.G., Pereira, L.S., Raes, D. & Smith, M. (1998). Crop evapotranspiration - Guidelines for computing crop ' +
      'water requirements. FAO Irrigation and Drainage Paper 56. Rome, FAO.',
    url: 'https://www.fao.org/3/x0490e/x0490e0b.htm',
  },
  fao29: {
    short: 'FAO-29 Rev.1 (1985)',
    cite: 'Ayers, R.S. & Westcot, D.W. (1985). Water quality for agriculture. FAO Irrigation and Drainage Paper 29 Rev.1. Rome, FAO.',
    url: 'https://openknowledge.fao.org/handle/20.500.14283/t0234e',
  },
  cropwat: {
    short: 'FAO CROPWAT 8.0, USDA-SCS',
    cite: 'Smith, M. (1992). CROPWAT - A computer program for irrigation planning and management. FAO Irrigation and ' +
      'Drainage Paper 46. Effective rainfall option "USDA Soil Conservation Service".',
    url: 'https://www.fao.org/land-water/databases-and-software/cropwat/en/',
  },
};

const r1 = (table, page, row) => ({ doc: 'fao56r1', table, page, row, verified: true });
const f29 = (table, page, row) => ({ doc: 'fao29', table, page, row, verified: true });

// Hisob usullari (formulalar) manbasi - UI "Batafsil" oynasida ko'rsatiladi
export const METHODS = {
  gdd: { ...r1('Eq. 6.23a-c', 203, 'GDD = min(Tmean, Tupper) - Tbase, >= 0') },
  kcCurve: { ...r1('Eq. 6.20', 201, 'Kc linear in dev and late stages') },
  kcMidAdjust: { ...r1('Eq. 6.16', 190, 'Kc mid climate adjustment (u2, RHmin, h)') },
  kcEndAdjust: { ...r1('Eq. 6.19', 195, 'Kc end climate adjustment, only when Kc end (Tab) > 0.45') },
  rhMin: { ...r1('Eq. 6.17', 193, 'RHmin = e°(Tdew) / e°(Tmax) x 100') },
  saltYield: { ...r1('Eq. 8.19', 285, 'Yact/Ymax = 1 - b/100 (ECe - ECe threshold)') },
  effectiveRain: {
    doc: 'cropwat', table: 'USDA-SCS', page: null, verified: false,
    row: 'Peff = P (125 - 0.2 P) / 125 for P <= 250 mm/month; Peff = 125 + 0.1 P above. Formula seen in secondary sources, primary page not yet checked',
  },
  frost: { doc: null, table: null, page: null, verified: true, row: 'Frost day = daily minimum 2 m air temperature <= 0 °C (NASA POWER T2M_MIN)' },
};

/**
 * Ekin maydonlari:
 *  kc       - Kc ini/mid/end va o'simlik balandligi h (m), [min,max] oraliq bo'lsa o'rtasi olinadi
 *  gdd      - Tbase/Tupper (°C) va bosqichlar GDD: [ini, dev, mid, late]
 *  salt     - ECe chegarasi (dS/m) va b (% hosil kamayishi har 1 dS/m), FAO-29 bilan solishtirish
 *  sow      - pilot uchun misol ekish sanasi (UI'da dehqon o'zi tanlaydi) - manba emas, taxmin
 *  frostEnds - kuzgi sovuq (Tmin <= 0 °C) mavsumni tugatadimi (bahorda/yozda ekiladigan ekinlar)
 *  perishability - yig'imdan keyingi saqlanish turi: dry (don/tola) | semi (piyoz, kartoshka) | hay (pichan)
 */
export const CROPS = [
  {
    id: 'winter_wheat',
    name: { uz: "Kuzgi bug'doy", en: 'Winter wheat' },
    family: 'cereal',
    kc: {
      ini: 0.70, mid: 1.15, end: 0.25, h: [0.70, 1.10],
      src: r1('6.2', 169, 'Wheat, common (Triticum aestivum) - Winter, low grain moisture at harvest'),
    },
    gdd: {
      tBase: 0, tUpper: 35, tSrc: r1('6.10', 205, 'Wheat, common (Triticum aestivum)'),
      stages: [560, 405, 730, 410], stagesSrc: r1('6.11', 210, 'Wheat, Winter (Triticum aestivum) - Long season'),
      alt: { short: [395, 445, 440, 365] },
    },
    salt: {
      threshold: 6.0, b: 7.1, rating: 'MT', src: r1('8.9', 282, 'Wheat, common (Triticum aestivum)'),
      fao29: { ece100: 6.0, ece90: 7.4, ece50: 13, ece0: 20, src: f29('4', 31, 'Wheat (Triticum aestivum)') },
    },
    sow: '10-15', frostEnds: false, perennial: false, perishability: 'dry',
  },
  {
    id: 'cotton',
    name: { uz: 'Paxta', en: 'Cotton' },
    family: 'fibre',
    kc: { ini: 0.40, mid: 1.10, end: 0.50, h: 1.20, src: r1('6.2', 168, 'Cotton (Gossypium hirsutum)') },
    gdd: {
      tBase: 12.5, tUpper: 35, tSrc: r1('6.10', 205, 'Cotton (Gossypium hirsutum)'),
      stages: [345, 905, 615, 285], stagesSrc: r1('6.11', 209, 'Cotton (Gossypium hirsutum) - Long season'),
      alt: { short: [280, 520, 800, 350] },
    },
    salt: {
      threshold: 7.7, b: 5.2, rating: 'T', src: r1('8.9', 282, 'Cotton (Gossypium hirsutum)'),
      fao29: { ece100: 7.7, ece90: 9.6, ece50: 17, ece0: 27, src: f29('4', 31, 'Cotton (Gossypium hirsutum)') },
    },
    sow: '04-10', frostEnds: true, perennial: false, perishability: 'dry',
  },
  {
    id: 'onion',
    name: { uz: 'Piyoz', en: 'Onion (dry)' },
    family: 'allium',
    kc: { ini: 0.70, mid: 1.05, end: 0.70, h: 0.45, src: r1('6.1', 165, 'Onions (Allium cepa) - Dry') },
    gdd: {
      tBase: 4.5, tUpper: 35, tSrc: r1('6.10', 204, 'Onions (Allium cepa)'),
      stages: [460, 470, 880, 480], stagesSrc: r1('6.11', 209, 'Onions (Allium cepa) - Common'),
    },
    salt: {
      threshold: 1.2, b: 16.0, rating: 'S/MS', src: r1('8.8', 281, 'Onion (Allium cepa)'),
      fao29: { ece100: 1.2, ece90: 1.8, ece50: 4.3, ece0: 7.4, src: f29('4', 31, 'Onion (Allium cepa)') },
    },
    sow: '03-01', frostEnds: true, perennial: false, perishability: 'semi',
  },
  {
    id: 'potato',
    name: { uz: 'Kartoshka', en: 'Potato' },
    family: 'solanaceae',
    kc: { ini: 0.50, mid: 1.10, end: 0.60, h: 0.60, src: r1('6.1', 165, 'Potato (Solanum tuberosum) - Short season') },
    gdd: {
      tBase: 2, tUpper: 30, tSrc: r1('6.10', 204, 'Potato (Solanum tuberosum)'),
      stages: [260, 490, 525, 325], stagesSrc: r1('6.11', 209, 'Potato (Solanum tuberosum) - Short season'),
      alt: { long: [405, 530, 490, 835] },
    },
    salt: {
      threshold: 1.7, b: 12.0, rating: 'MS', src: r1('8.8', 281, 'Potato (Solanum tuberosum)'),
      fao29: { ece100: 1.7, ece90: 2.5, ece50: 5.9, ece0: 10, src: f29('4', 31, 'Potato (Solanum tuberosum)') },
    },
    sow: '02-20', frostEnds: true, perennial: false, perishability: 'semi',
  },
  {
    id: 'mung_bean',
    name: { uz: 'Mosh', en: 'Mung bean' },
    family: 'legume',
    // FAO-56 Rev.1 Kc va GDD jadvallarida mosh "Black and green gram (Vigna mungo)" ichida "Green gram" qatori.
    // Mosh botanik nomi Vigna radiata; Table 6.10 da uning alohida qatori bor (Tbase 8, Tupper 40), lekin
    // GDD bosqichlari faqat V. mungo uchun berilgan, shuning uchun Tbase/Tupper ham shu qatordan olindi.
    kc: {
      ini: 0.40, mid: 1.10, end: 0.40, h: [0.60, 0.90],
      src: r1('6.2', 168, 'Black and green gram (Vigna mungo) - Green gram'),
    },
    gdd: {
      tBase: 10, tUpper: 40, tSrc: r1('6.10', 205, 'Black and green gram (Vigna mungo)'),
      stages: [110, 240, 420, 200], stagesSrc: r1('6.12', 211, 'Black & green gram (Vigna mungo) - Common'),
    },
    salt: {
      threshold: 1.8, b: 20.7, rating: 'S', src: r1('8.9', 282, 'Bean, mung (Vigna radiata)'),
      fao29: null, // FAO-29 4-jadvalida mosh yo'q
    },
    sow: '06-25', frostEnds: true, perennial: false, perishability: 'dry',
  },
  {
    id: 'alfalfa',
    name: { uz: 'Beda', en: 'Alfalfa' },
    family: 'legume',
    kc: {
      ini: 0.50, mid: 1.20, end: 1.15, h: null,
      src: r1('6.4', 176, 'Alfalfa for hay; typical multiple cutting cycles'),
      // O'rimlar ta'siri o'rtachalangan butun mavsum Kc (beda pichan uchun)
      seasonAvg: 1.05, seasonAvgSrc: r1('text, end of section before 6.6', 198, 'for alfalfa hay, the average, full-season Kc mid often is 1.05'),
    },
    gdd: {
      tBase: 0, tUpper: 30, tSrc: r1('6.10', 205, 'Alfalfa (Medicago sativa)'),
      // O'rim sikllari, GDD: [min uzunlik, max uzunlik]
      firstCycle: [850, 940], middleCycle: [530, 820],
      stagesSrc: r1('6.12', 212, 'Alfalfa (Medicago sativa) - first cutting cycle / middle cycles, Total GDD'),
    },
    // Mavsum: bahordagi oxirgi -4 °C dan kuzdagi birinchi -4 °C gacha
    season: {
      killTemp: -4,
      src: { doc: 'fao56', table: '11, note 4', page: null, verified: true,
        row: 'alfalfa: last -4 °C in spring until first -4 °C in fall (Everson et al. 1978)' },
    },
    salt: {
      threshold: 2.0, b: 7.3, rating: 'MS', src: r1('8.11', 284, 'Alfalfa (Medicago sativa)'),
      fao29: { ece100: 2.0, ece90: 3.4, ece50: 8.8, ece0: 16, src: f29('4', 32, 'Alfalfa (Medicago sativa)') },
    },
    sow: null, frostEnds: false, perennial: true, perishability: 'hay',
  },
];

export const cropById = (id) => CROPS.find((c) => c.id === id) ?? null;

/**
 * Dehqon javobi -> tuproq sho'rligi ECe oralig'i (dS/m).
 * DIQQAT: bu moslik tekshirilmagan (verified: false) - agronom bilan tasdiqlash kerak.
 * Asos: USDA sho'rlik sinflari (very slightly 2-4, slightly/moderately 4-8, strongly 8-16 dS/m).
 */
export const SALINITY_CLASSES = {
  unknown: null,
  low: { ece: [2, 4], uz: 'kuchsiz', en: 'low' },
  medium: { ece: [4, 8], uz: "o'rtacha", en: 'medium' },
  high: { ece: [8, 16], uz: 'kuchli', en: 'high' },
  src: { doc: null, table: null, page: null, verified: false,
    row: 'Mapping of farmer answer to ECe range follows USDA salinity classes; source page not yet checked' },
};
