// Neyra jonli taqdimot (sayt ichida, /pitch/). 8 ekran: 3D Yer -> Surxondaryo dalasi -> muammo -> raqamlar -> sabab ->
// jonli demo (ilova iframe ichida) -> dalil -> jamoa. Boshqaruv: → / Bo'shliq / PageDown, ← / PageUp, Home/End, F, L.
// Matnlar: strings.js (uz/en, decklar bilan bir xil). Yer teksturasi: NASA Blue Marble (GIBS). Dala: EOX + NASA MODIS NDVI.
import { L as STR, TEAM, LINKS } from './strings.js';
import { layerByKey, tileTemplate } from '../core/gibs.js';

const FIELD = { lat: 37.5021, lon: 67.3888 };
const REGION = { lat: 37.8, lon: 67.5 };
const EOX = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg';
const EOX_ATTR = '<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless 2020</a> by EOX';
const GIBS_ATTR = 'NASA <a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener">GIBS</a> / EOSDIS';
const N = 8;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* yo'q */ } } };
const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
let lang = new URLSearchParams(location.search).get('lang') ?? store.get('fs-site-lang') ?? (navigator.language?.toLowerCase().startsWith('uz') ? 'uz' : 'en');
if (!STR[lang]) lang = 'en';
const T = () => STR[lang];
const fmtN = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');

// ---------------- matn ----------------
function applyText() {
  document.documentElement.lang = lang;
  document.title = `Neyra — ${T().tag}`;
  document.querySelectorAll('[data-t]').forEach((n) => { n.textContent = T()[n.dataset.t] ?? ''; });
  document.querySelectorAll('[data-img]').forEach((img) => { const src = img.dataset.img.replace('{lang}', lang); if (img.getAttribute('src') !== src) img.src = src; });
  $('names').textContent = TEAM.map((m) => m.name).join(' · ');
  $('langBtn').textContent = lang === 'en' ? 'UZ' : 'EN';
  $('wall').innerHTML = T().covers.map(([k, cap, src, z], i) => `<div class="tile" style="--i:${i}"><img src="assets/press-${k}.jpg" alt="" style="${z ? `transform-origin:center 30%;--z:${z}` : ''}"><div class="ov"><b>${esc(cap)}</b><span>${esc(src)}</span></div></div>`).join('')
    + `<div class="tile quote" style="--i:4"><div><p>${esc(T().quote)}${T().quote2 ? `<span>${esc(T().quote2)}</span>` : ''}</p><small>${esc(T().quoteBy)}</small></div></div>`;
  $('causes').innerHTML = T().causes.map((c, i) => `<li class="in" style="--i:${i + 1}"><span class="m">✓</span><span>${esc(c)}</span></li>`).join('');
  $('lights').innerHTML = ['#4cc27a', '#4cc27a', '#e3a008', '#d64545'].map((c, i) => `<li class="in" style="--i:${i + 1}"><i style="background:${c}"></i>${esc(T().lights[i])}</li>`).join('');
  $('team').innerHTML = TEAM.map((m, i) => `<figure class="in" style="--i:${i}"><img src="assets/team-${m.photo.replace('team/', '').replace('.jpg', '')}.jpg" alt=""><figcaption>${esc(m.name)}</figcaption></figure>`).join('');
  $('qrs').innerHTML = ['bot', 'site', 'repo'].map((k, i) => `<figure class="in" style="--i:${i + 3}"><a href="${LINKS[k]}" target="_blank" rel="noopener"><img src="assets/qr-${k}.png" alt=""></a>${esc(T().qr[i])}</figure>`).join('');
  renderLoop();
  document.querySelectorAll('.slide').forEach((sl) => sl.querySelectorAll('.in:not([style*="--i"])').forEach((el, i) => el.style.setProperty('--i', i)));
  const app = $('app');
  if (app.dataset.loaded) app.src = `../web/?lang=${lang}`;
}

// ---------------- piyoz aylanasi (SVG) ----------------
const wrap2 = (str, max = 15) => {
  if (str.length <= max) return [str];
  const w = str.split(' '); let best = null, bd = Infinity;
  for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(' '), b = w.slice(i).join(' '); const d = Math.abs(a.length - b.length); if (d < bd) { bd = d; best = [a, b]; } }
  return best ?? [str];
};
function renderLoop() {
  const W = 420, cx = 210, cy = 214, R = 136, n = 5, pts = [];
  for (let i = 0; i < n; i++) { const a = ((-90 + i * (360 / n)) * Math.PI) / 180; pts.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), a }); }
  let arcs = '', nodes = '';
  for (let i = 0; i < n; i++) {
    const a0 = pts[i].a + (17 * Math.PI) / 180, a1 = pts[(i + 1) % n].a - (17 * Math.PI) / 180 + (i === n - 1 ? 2 * Math.PI : 0);
    arcs += `<path class="arc" style="--i:${i}" pathLength="1" marker-end="url(#pa)" d="M${(cx + R * Math.cos(a0)).toFixed(1)} ${(cy + R * Math.sin(a0)).toFixed(1)} A${R} ${R} 0 0 1 ${(cx + R * Math.cos(a1)).toFixed(1)} ${(cy + R * Math.sin(a1)).toFixed(1)}"/>`;
  }
  pts.forEach((p, i) => {
    const lines = wrap2(T().loop[i], 16), w = 124, h = lines.length > 1 ? 50 : 34;
    nodes += `<g class="n" style="--i:${i}"><rect x="${p.x - w / 2}" y="${p.y - h / 2}" width="${w}" height="${h}" rx="10" class="node${i === 3 ? ' hot' : ''}${i === 1 ? ' on' : ''}"/>`
      + lines.map((ln, j) => `<text x="${p.x}" y="${p.y + (j - (lines.length - 1) / 2) * 15 + 4.5}">${esc(ln)}</text>`).join('')
      + `<text class="yr" x="${p.x}" y="${p.y - h / 2 - 6}">${esc(T().loopYears[i])}</text></g>`;
  });
  $('loop').innerHTML = `<svg viewBox="0 0 ${W} ${W}" role="img"><defs><marker id="pa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#4cc27a"/></marker></defs>
    <circle cx="${cx}" cy="${cy}" r="${R}" class="ring"/>${arcs}${nodes}<text class="center" x="${cx}" y="${cy - 4}">${esc(T().loopCenter)}</text><text class="center" x="${cx}" y="${cy + 16}">2018 · 2024</text></svg>`;
}

// ---------------- 3D Yer (three.js) ----------------
const G = { ok: false, spin: true, token: 0, visible: true };
function ll2xyz(lat, lon, r) {
  const phi = ((lon + 180) / 360) * Math.PI * 2, th = ((90 - lat) / 180) * Math.PI;
  return new THREE.Vector3(-r * Math.cos(phi) * Math.sin(th), r * Math.cos(th), r * Math.sin(phi) * Math.sin(th));
}
function initGlobe() {
  if (!window.THREE) return false;
  try {
    const canvas = $('globe');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 200);
    camera.position.set(0, 0, 3.1);
    const group = new THREE.Group(); scene.add(group);
    const tex = new THREE.TextureLoader().load('assets/earth.jpg');
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), new THREE.MeshPhongMaterial({ map: tex, shininess: 8, specular: new THREE.Color(0x1a2a3a) }));
    group.add(globe);
    const atm = new THREE.Mesh(new THREE.SphereGeometry(1.04, 64, 48), new THREE.MeshBasicMaterial({ color: 0x79b8ff, transparent: true, opacity: 0.09, side: THREE.BackSide, depthWrite: false }));
    group.add(atm);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.011, 16, 16), new THREE.MeshBasicMaterial({ color: 0x4cc27a }));
    pin.position.copy(ll2xyz(FIELD.lat, FIELD.lon, 1.004)); globe.add(pin);
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.016, 0.03, 32), new THREE.MeshBasicMaterial({ color: 0x4cc27a, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    halo.position.copy(pin.position); halo.lookAt(new THREE.Vector3(0, 0, 0)); globe.add(halo);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xffffff, 0.95); sun.position.set(-3, 1.5, 2.5); scene.add(sun);
    const n = 1600, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const r = 40 + Math.random() * 30, t = Math.acos(2 * Math.random() - 1), p = Math.random() * Math.PI * 2; pos.set([r * Math.sin(t) * Math.cos(p), r * Math.sin(t) * Math.sin(p), r * Math.cos(t)], i * 3); }
    const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 0.09, transparent: true, opacity: 0.85 }));
    scene.add(stars);
    Object.assign(G, { ok: true, renderer, scene, camera, group, globe, halo, stars });
    resetGlobe();
    const resize = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    addEventListener('resize', resize); resize();
    let last = performance.now();
    const tick = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (!G.visible) { requestAnimationFrame(tick); return; } // yashirin bo'lsa chizilmaydi (batareya, silliqlik)
      if (G.spin && !reduce) G.globe.rotation.y -= dt * 0.03; // manfiy = old tomon sharqqa siljiydi
      G.halo.scale.setScalar(1 + 0.25 * Math.sin(t / 300));
      G.stars.rotation.y += dt * 0.004;
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return true;
  } catch (e) { console.error('globe', e); return false; }
}
const HOME = { ry: -Math.PI / 2 - (38 * Math.PI) / 180, rx: 0.38, z: 3.1, x: 0.95 }; // bosh ekran: Yer o'ngda, old tomonda Yaqin Sharq; sekin sharqqa (Markaziy Osiyoga) aylanadi
function resetGlobe() {
  if (!G.ok) return;
  G.token++;
  G.spin = true;
  G.globe.rotation.y = HOME.ry; G.group.rotation.x = HOME.rx; G.camera.position.z = HOME.z; G.group.position.x = HOME.x;
}
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
function flyGlobe(lat, lon, dur) {
  return new Promise((resolve) => {
    const my = ++G.token;
    G.spin = false;
    const from = { ry: G.globe.rotation.y, rx: G.group.rotation.x, z: G.camera.position.z, x: G.group.position.x };
    let ty = -Math.PI / 2 - (lon * Math.PI) / 180;
    const tau = Math.PI * 2; ty = from.ry + ((((ty - from.ry) % tau) + tau * 1.5) % tau) - tau / 2; // eng yaqin yo'nalish
    const to = { ry: ty, rx: (lat * Math.PI) / 180, z: 1.38, x: 0 };
    const t0 = performance.now();
    const step = (t) => {
      if (my !== G.token) return resolve(false);
      const p = dur ? Math.min(1, (t - t0) / dur) : 1, e = ease(p);
      G.globe.rotation.y = from.ry + (to.ry - from.ry) * e;
      G.group.rotation.x = from.rx + (to.rx - from.rx) * e;
      G.camera.position.z = from.z + (to.z - from.z) * e;
      G.group.position.x = from.x + (to.x - from.x) * e;
      if (p < 1) requestAnimationFrame(step); else resolve(true);
    };
    requestAnimationFrame(step);
  });
}

// ---------------- orbitadan dalaga: Leaflet qismi ----------------
const FM = { map: null, ndvi: null, token: 0 };
async function ensureFlyMap() {
  if (FM.map) return;
  FM.map = L.map('flyMap', { zoomControl: false, attributionControl: true, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false, zoomAnimation: true, fadeAnimation: true });
  L.tileLayer(EOX, { maxZoom: 17, attribution: EOX_ATTR }).addTo(FM.map);
  FM.map.setView([REGION.lat, REGION.lon], 7, { animate: false });
  try {
    const gl = await fetch('../web/data/gibs-layers.json').then((r) => r.json());
    const def = layerByKey('ndvi'), date = gl.layers.ndvi.frames.at(-1);
    FM.ndvi = L.tileLayer(tileTemplate(def, date), { maxNativeZoom: def.z, maxZoom: 17, opacity: 0, className: 'nasa-tiles', attribution: GIBS_ATTR }).addTo(FM.map);
    FM.date = date;
  } catch (e) { console.error('ndvi layer', e); }
  L.marker([FIELD.lat, FIELD.lon], { icon: L.divIcon({ className: '', html: '<div class="field-pin"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false }).addTo(FM.map);
}
async function runFly() {
  const my = ++FM.token;
  $('flyMap').classList.remove('on'); $('flyLabel').classList.remove('on'); $('flyCap').classList.remove('on');
  await ensureFlyMap();
  if (my !== FM.token) return;
  FM.map.invalidateSize(false);
  FM.map.setView([REGION.lat, REGION.lon], G.ok ? 7 : 5, { animate: false });
  FM.ndvi?.setOpacity(0);
  if (G.ok) { const done = await flyGlobe(FIELD.lat, FIELD.lon, reduce ? 0 : 3200); if (!done || my !== FM.token) return; }
  $('flyMap').classList.add('on');
  await wait(reduce ? 50 : 1000); if (my !== FM.token) return;
  $('globe').classList.add('off'); $('earthStatic').classList.add('off');
  $('flyLabel').classList.add('on');
  FM.map.flyTo([FIELD.lat, FIELD.lon], 13, { duration: reduce ? 0.1 : 5, easeLinearity: 0.15 });
  await wait(reduce ? 200 : 5200); if (my !== FM.token) return;
  FM.ndvi?.setOpacity(0.85);
  $('flyCap').classList.add('on');
}
function stopFly() { FM.token++; $('flyMap').classList.remove('on'); }

// ---------------- raqamlar ----------------
function countUp(el, render, dur = 1500) {
  const t0 = performance.now();
  const step = (t) => { const p = reduce ? 1 : Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - p, 3); el.textContent = render(e); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function animateNumbers() {
  countUp($('big'), (e) => `${Math.round(5 * e)}–${Math.round(7 * e)}`, 1600);
  setTimeout(() => countUp($('n1'), (e) => `${fmtN(1500 * e)} ${lang === 'en' ? 'UZS' : 'so‘m'}`, 1400), 500);
  setTimeout(() => countUp($('n2'), (e) => (lang === 'en' ? `${Math.round(150 * e)}–${Math.round(200 * e)}k t` : `${Math.round(150 * e)}–${Math.round(200 * e)} ming t`), 1400), 800);
}
function animateProof() { setTimeout(() => countUp($('big3'), (e) => `${Math.round(30 * e)} · ${Math.round(35 * e)} · ${Math.round(62 * e)}`, 1600), 700); }

// ---------------- demo (ilova iframe) ----------------
function fitPhone() {
  const wrap = document.querySelector('.phone-wrap'), ph = $('phone');
  if (!wrap || !ph) return;
  const s = Math.min(1, (innerHeight * 0.7) / 860);
  ph.style.setProperty('--s', s.toFixed(3)); wrap.style.width = `${Math.round(406 * s)}px`;
}
function loadApp(force = false) {
  const app = $('app');
  if (app.dataset.loaded && !force) return;
  app.dataset.loaded = '1';
  app.src = `../web/?lang=${lang}&v=${Date.now()}`;
  app.onload = () => { try { app.contentWindow.addEventListener('keydown', onKey); } catch { /* boshqa domen emas, lekin ehtiyot */ } };
}

// ---------------- navigatsiya ----------------
let cur = -1;
const slides = [...document.querySelectorAll('.slide')];
function go(i, { replay = false } = {}) {
  i = Math.max(0, Math.min(N - 1, i));
  if (i === cur && !replay) return;
  const prev = cur; cur = i;
  slides.forEach((s, k) => s.classList.toggle('active', k === i));
  $('prog').style.width = `${((i + 1) / N) * 100}%`;
  $('count').textContent = `${i + 1} / ${N}`;
  history.replaceState(null, '', `#${i + 1}`);
  if (prev === 1) stopFly();
  if (i <= 1) { G.visible = true; $('globe').classList.remove('off'); $('earthStatic').classList.remove('off'); } else { $('globe').classList.add('off'); $('earthStatic').classList.add('off'); setTimeout(() => { if (cur > 1) G.visible = false; }, 1000); }
  if (i === 0) resetGlobe();
  if (i === 1) runFly();
  if (i === 3) animateNumbers();
  if (i === 4) renderLoop();
  if (i >= 4) loadApp();
  if (i === 5) fitPhone();
  if (i === 6) animateProof();
}
function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (k === 'ArrowRight' || k === ' ' || k === 'PageDown' || k === 'Enter') { e.preventDefault(); go(cur + 1); }
  else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); go(cur - 1); }
  else if (k === 'Home') go(0);
  else if (k === 'End') go(N - 1);
  else if (k === 'f' || k === 'F') toggleFull();
  else if (k === 'l' || k === 'L') toggleLang();
  else if (k === 'r' || k === 'R') go(cur, { replay: true });
}
function toggleFull() { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.(); }
function toggleLang() { lang = lang === 'en' ? 'uz' : 'en'; store.set('fs-site-lang', lang); applyText(); if (cur === 3) animateNumbers(); if (cur === 6) animateProof(); }

addEventListener('keydown', onKey);
$('prev').onclick = () => go(cur - 1); $('next').onclick = () => go(cur + 1);
$('langBtn').onclick = toggleLang; $('full').onclick = toggleFull;
$('resetDemo').onclick = () => loadApp(true);
addEventListener('resize', fitPhone);
let tx = null;
addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
addEventListener('touchend', (e) => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(dx) > 60) go(cur + (dx < 0 ? 1 : -1)); });
$('stage').addEventListener('click', (e) => { if (e.target.closest('a, button, iframe, .phone, .leaflet-container')) return; go(cur + (e.clientX > innerWidth / 2 ? 1 : -1)); });

// ---------------- ishga tushirish ----------------
applyText();
G.ok = initGlobe();
if (!G.ok) { $('globe').hidden = true; $('earthStatic').hidden = false; }
const start = Math.max(1, Math.min(N, Number(location.hash.slice(1)) || 1)) - 1;
go(start);
window.__pitch = { go, get cur() { return cur; }, globe: G.ok };
