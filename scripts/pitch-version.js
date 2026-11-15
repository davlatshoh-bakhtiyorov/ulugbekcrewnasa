// npm run pitch-version -> pitch/index.html (pitch.css?v=, pitch.js?v=) va pitch/pitch.js (strings.js?v=) ga yangi muhr qo'yadi.
// Sabab: GitHub Pages fayllarni 10 daqiqa keshlaydi; muhrsiz yangi index.html eski pitch.js/strings.js bilan aralashib, sahifa bo'sh qolishi mumkin.
// Har pitch/ o'zgarishidan keyin commit'dan oldin ishga tushiring.
import { readFileSync, writeFileSync } from 'node:fs';
const v = new Date().toISOString().slice(0, 16).replace(/[-T:]/g, '');
for (const [f, re] of [['pitch/index.html', /(pitch\.(?:css|js))\?v=[\w-]+/g], ['pitch/pitch.js', /(strings\.js)\?v=[\w-]+/g]]) {
  const s = readFileSync(f, 'utf8'), t = s.replace(re, `$1?v=${v}`);
  if (t === s) throw new Error(`${f}: ?v= topilmadi`);
  writeFileSync(f, t); console.log(f, '->', v);
}
