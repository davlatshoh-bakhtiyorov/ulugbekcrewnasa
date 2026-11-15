import { launch, newTab } from './headless.js';
const SH = new URL('./shots/', import.meta.url).pathname;
const chrome = await launch();
try {
  const lang = process.argv[2] || 'en'; const pre = lang === 'en' ? 'dark' : `dark-${lang}`;
  const a = await newTab(); await a.viewport(390, 844, true, 2); await a.dark(true);
  await a.goto(`http://localhost:8080/web/?lang=${lang}`); await a.wait(4500);
  await a.eval(`(() => { const b = document.getElementById('lang'); const cur = b.textContent.trim() === 'EN' ? 'uz' : 'en'; if (cur !== ${JSON.stringify(lang)}) b.click(); })()`); await a.wait(800);
  await a.click('#btnDemo'); await a.wait(6500);
  await a.shot(SH + `${pre}-phone-field.png`);
  await a.click('#primary'); await a.wait(800);
  await a.click('.opt[data-v="onion"]'); await a.wait(300); await a.eval('window.scrollTo(0,0)'); await a.shot(SH + `${pre}-phone-questions.png`); await a.click('#primary'); await a.wait(500);
  await a.click('.opt[data-v="sometimes"]'); await a.wait(250); await a.click('#primary'); await a.wait(500);
  await a.click('.opt[data-v="low"]'); await a.wait(250);
  await a.click('#primary'); await a.wait(10000); await a.eval('window.scrollTo(0,0)'); await a.wait(300);
  console.log('phone results cards:', await a.eval('[...document.querySelectorAll(".card h3")].map(h => h.textContent).join(" / ")'));
  await a.shot(SH + `${pre}-phone-results.png`);
  await a.close();
  const d = await newTab(); await d.viewport(1280, 1400, false, 2); await d.dark(true);
  await d.goto(`http://localhost:8080/?lang=${lang}`); await d.wait(12000);
  await d.eval('document.querySelectorAll(".reveal").forEach(n => n.classList.add("in")); document.querySelectorAll(".sec").forEach(s => s.classList.add("open"));'); await d.wait(800);
  for (const [sel, name] of [['#map .mapgrid', 'map'], ['#loop', 'loop'], ['.ndvi-fig', 'ndvi'], ['#winStrip', 'window'], ['#herd .herd-grid > div:first-child', 'harvest'], ['#demoCards', 'cards'], ['.cl-grid', 'climate']]) {
    console.log(name + ':', (await d.shotEl(sel, SH + `${pre}-${name}.png`, 2)).replace(/.*shots\//, ''));
  }
  console.log('console:', JSON.stringify(d.log.filter((l) => l.type !== 'log')));
  await d.close();
} finally { chrome.kill(); }
