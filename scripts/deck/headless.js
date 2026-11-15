// Headless Chrome over CDP, no dependencies (Node 22 has fetch + WebSocket).
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const PROFILE = '/tmp/neyra-chrome-prof';

export async function launch() {
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 150; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return proc; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('chrome did not start');
}

export async function newTab() {
  const info = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const listeners = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.rej(new Error(JSON.stringify(msg.error))) : p.res(msg.result); }
    else listeners.forEach((l) => l(msg));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const log = [], netFail = [];
  const str = (a) => a.value !== undefined ? String(a.value) : (a.description ?? a.type);
  listeners.push((msg) => {
    if (msg.method === 'Runtime.consoleAPICalled') log.push({ type: msg.params.type, text: msg.params.args.map(str).join(' ') });
    if (msg.method === 'Runtime.exceptionThrown') { const d = msg.params.exceptionDetails; log.push({ type: 'exception', text: (d.exception?.description || d.text) + ` @${d.url || ''}:${d.lineNumber}` }); }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level !== 'info' && msg.params.entry.level !== 'verbose') log.push({ type: 'log:' + msg.params.entry.level, text: `${msg.params.entry.text} ${msg.params.entry.url || ''}` });
    if (msg.method === 'Network.loadingFailed') netFail.push(`FAILED ${msg.params.errorText} ${msg.params.type}`);
    if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400) netFail.push(`${msg.params.response.status} ${msg.params.response.url}`);
  });
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable'); await send('Network.enable');
  const tab = {
    send, log, netFail,
    viewport: (width, height, mobile = false, scale = 1) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile }),
    dark: (on) => send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: on ? 'dark' : 'light' }] }),
    async goto(url) {
      const loaded = new Promise((r) => listeners.push((m) => { if (m.method === 'Page.loadEventFired') r(); }));
      await send('Page.navigate', { url }); await loaded;
    },
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    click(sel) { return this.eval(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'MISSING ${sel}'; el.scrollIntoView({block:'center'}); el.click(); return 'clicked ${sel}'; })()`); },
    wait: (ms) => new Promise((r) => setTimeout(r, ms)),
    scrollTo(sel) { return this.eval(`(() => { document.documentElement.style.scrollBehavior = 'auto'; const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'MISSING ${sel}'; const y = el.getBoundingClientRect().top + window.scrollY - 64; window.scrollTo({ top: y, behavior: 'instant' }); return window.scrollY; })()`); },
    async shot(file, full = false) {
      let clip;
      if (full) { const m = await send('Page.getLayoutMetrics'); const cs = m.cssContentSize || m.contentSize; clip = { x: 0, y: 0, width: cs.width, height: Math.min(cs.height, 16000), scale: 1 }; }
      const r = await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: full });
      await writeFile(file, Buffer.from(r.data, 'base64')); return file;
    },
    /** Element screenshot at `scale` device pixels per CSS px (element scrolled to the viewport centre first) */
    async shotEl(sel, file, scale = 2, pad = 0) {
      const r = await this.eval(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; el.scrollIntoView({ block: 'center', behavior: 'instant' }); const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; })()`);
      if (!r) return 'MISSING ' + sel;
      await this.wait(250);
      // CDP clip = sahifa (hujjat) koordinatalari, captureBeyondViewport bilan (Puppeteer elementHandle.screenshot kabi)
      const r2 = await this.eval(`(() => { const b = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: b.left + window.scrollX, y: b.top + window.scrollY, w: b.width, h: b.height }; })()`);
      const res = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: Math.max(0, r2.x - pad), y: Math.max(0, r2.y - pad), width: r2.w + 2 * pad, height: r2.h + 2 * pad, scale } });
      await writeFile(file, Buffer.from(res.data, 'base64')); return `${file} ${Math.round(r2.w)}x${Math.round(r2.h)}`;
    },
    // horizontal overflow report
    overflow() { return this.eval(`(() => { const w = document.documentElement.clientWidth; const out = []; for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (r.right > w + 1 && r.width > 0) out.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').join('.') : '') + ' right=' + Math.round(r.right)); } return { scrollWidth: document.documentElement.scrollWidth, clientWidth: w, offenders: out.slice(0, 12) }; })()`); },
    async close() { ws.close(); await fetch(`http://127.0.0.1:${PORT}/json/close/${info.id}`); },
  };
  return tab;
}
