// npm run shots:pitch yo'q: node scripts/deck/shots-pitch.js pitch/assets  (dev server 8080 ishlayotgan bo'lsin). Pitch uchun ilova skrinshotlari (och rejim, 390x844 @2x): dala tanlangan, 1-savol, natija, NASA ekrani; uz va en
import { launch, newTab } from './headless.js';
import { mkdirSync } from 'node:fs';
const OUT = process.argv[2]; mkdirSync(OUT, { recursive: true });
const chrome = await launch();
try {
  for (const lang of ['uz', 'en']) {
    const t = await newTab(); await t.viewport(390, 844, true, 2); await t.dark(false);
    await t.goto(`http://localhost:8080/web/?lang=${lang}&lat=37.5021&lon=67.3888&safe=1`); await t.wait(5000);
    await t.shot(`${OUT}/${lang}-step1.png`);
    await t.click('#primary'); await t.wait(500); await t.click('.opt[data-v="onion"]'); await t.wait(300); await t.eval('window.scrollTo(0,0)'); await t.shot(`${OUT}/${lang}-step2.png`);
    await t.click('#primary'); await t.wait(400); await t.click('.opt[data-v="sometimes"]'); await t.wait(200); await t.click('#primary'); await t.wait(400); await t.click('.opt[data-v="low"]'); await t.wait(200);
    await t.click('#primary'); await t.wait(9000); await t.eval('window.scrollTo(0,0)'); await t.wait(300); await t.shot(`${OUT}/${lang}-step3.png`);
    await t.click('#openNasa'); await t.wait(5000); await t.eval('window.scrollTo(0,0)'); await t.wait(300); await t.shot(`${OUT}/${lang}-nasa.png`);
    console.log(lang, 'done; console', JSON.stringify(t.log.filter((l) => l.type !== 'log' && !/Haptic/.test(l.text))));
    await t.close();
  }
} finally { chrome.kill(); }
