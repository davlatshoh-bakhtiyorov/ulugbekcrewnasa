import { launch, newTab } from './headless.js';
const SH = new URL('./shots/', import.meta.url).pathname;
const chrome = await launch();
try {
  for (const lang of ['en', 'uz']) {
    // --- Mini App, telefon (390x844 @2x) ---
    const a = await newTab(); await a.viewport(390, 844, true, 2); await a.dark(false);
    await a.goto(`http://localhost:8080/web/?lang=${lang}`); await a.wait(4500);
    // ilova ?lang ni o'qimaydi: tugma matni "EN" bo'lsa hozir o'zbekcha, "UZ" bo'lsa inglizcha
    await a.eval(`(() => { const b = document.getElementById('lang'); const cur = b.textContent.trim() === 'EN' ? 'uz' : 'en'; if (cur !== ${JSON.stringify(lang)}) b.click(); })()`); await a.wait(800);
    console.log(lang, 'app lang button now:', await a.eval('document.getElementById("lang").textContent'), '| title:', await a.eval('document.getElementById("step1")?.textContent'));
    await a.click('#btnDemo'); await a.wait(6500);
    console.log(lang, 'phone field:', await a.shot(SH + `${lang}-phone-field.png`));
    await a.click('#primary'); await a.wait(800);
    for (const [q, v] of [['lastCrop', 'onion'], ['water', 'sometimes'], ['salinity', 'low']]) { await a.click(`.opts[data-q="${q}"] .opt[data-v="${v}"]`); await a.wait(250); }
    await a.eval('window.scrollTo(0,0)'); await a.wait(300);
    console.log(lang, 'phone questions:', await a.shot(SH + `${lang}-phone-questions.png`));
    await a.click('#primary'); await a.wait(10000);
    await a.eval('window.scrollTo(0,0)'); await a.wait(300);
    console.log(lang, 'phone results:', await a.shot(SH + `${lang}-phone-results.png`), 'cards', await a.eval('[...document.querySelectorAll(".card h3")].map(h => h.textContent).join(" / ")'));
    await a.click('.card .more'); await a.wait(3000); await a.eval('window.scrollTo(0,0)'); await a.wait(300);
    console.log(lang, 'phone details:', await a.shot(SH + `${lang}-phone-details.png`));
    await a.close();
    // --- Sayt, desktop (1280 x 1400 @2x) ---
    const d = await newTab(); await d.viewport(1280, 1400, false, 2); await d.dark(false);
    await d.goto(`http://localhost:8080/?lang=${lang}`); await d.wait(12000);
    await d.eval('document.querySelectorAll(".reveal").forEach(n => n.classList.add("in")); document.querySelectorAll(".sec").forEach(s => s.classList.add("open"));');
    await d.wait(800);
    for (const [sel, name] of [['#map .mapgrid', 'map'], ['#loop', 'loop'], ['.price-fig', 'price'], ['#demoCards', 'cards'], ['.ndvi-fig', 'ndvi'], ['#winStrip', 'window'], ['#herd .herd-grid > div:first-child', 'harvest'], ['#herdChart', 'harvest-strip'], ['.cl-grid', 'climate'], ['#calGrid', 'calgrid']]) {
      console.log(lang, name + ':', await d.shotEl(sel, SH + `${lang}-${name}.png`, 2));
    }
    // xarita: tuproq namligi qatlami bilan ham
    await d.click('#layerBar [data-k="soil"]'); await d.wait(3500);
    console.log(lang, 'map-soil:', await d.shotEl('#map .mapgrid', SH + `${lang}-map-soil.png`, 2));
    console.log(lang, 'console:', JSON.stringify(d.log.filter((l) => l.type !== 'log')));
    await d.close();
  }
} finally { chrome.kill(); }
