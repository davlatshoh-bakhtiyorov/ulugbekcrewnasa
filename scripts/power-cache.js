// Pilot nuqtasi uchun NASA POWER kunlik qatori (1984-2025), cache/ ga saqlanadi (git'ga kirmaydi).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { powerUrl, parsePower } from '../core/power.js';
import { addEt0 } from '../core/agro.js';

export const PILOT = { lat: 37.51, lon: 67.42, start: '19840101', end: '20251231' };

export async function loadPilotPower() {
  const { lat, lon, start, end } = PILOT;
  const cacheFile = `cache/power-${lat}_${lon}-${start}-${end}.json`;
  let json;
  try {
    json = JSON.parse(await readFile(cacheFile, 'utf8'));
  } catch {
    const url = powerUrl({ lat, lon, start, end });
    console.error(`NASA POWER'dan yuklanmoqda...\n${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`POWER HTTP ${res.status}`);
    json = await res.json();
    await mkdir('cache', { recursive: true });
    await writeFile(cacheFile, JSON.stringify(json));
  }
  const p = parsePower(json);
  addEt0(p.days, { lat: p.lat, elev: p.elev });
  return p;
}
