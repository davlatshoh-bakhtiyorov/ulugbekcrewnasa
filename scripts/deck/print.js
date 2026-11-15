import { launch, newTab } from './headless.js';
import { writeFile } from 'node:fs/promises';
const here = new URL('./', import.meta.url).pathname;
const chrome = await launch();
try {
  for (const lang of ['en', 'uz']) {
    const t = await newTab(); await t.viewport(1920, 1080, false, 1); await t.dark(false);
    await t.goto(`file://${here}deck-${lang}.html`); await t.wait(1500);
    await t.eval('Promise.all([...document.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })))');
    const bad = await t.eval('[...document.images].filter(i => !i.naturalWidth).map(i => i.getAttribute("src"))');
    const r = await t.send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, displayHeaderFooter: false, scale: 1 });
    const out = `${here}Neyra-${lang}.pdf`;
    await writeFile(out, Buffer.from(r.data, 'base64'));
    console.log(lang, 'pdf written', out, '| missing images:', JSON.stringify(bad), '| console', JSON.stringify(t.log.filter((l) => l.type !== 'log')));
    await t.close();
  }
} finally { chrome.kill(); }
