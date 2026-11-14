// NASA POWER kunlik qatori, cache/ ga saqlanadi (git'ga kirmaydi): pilot nuqta va sayt uchun viloyat nuqtalari.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { powerUrl, parsePower } from '../core/power.js';
import { addEt0 } from '../core/agro.js';

export const PILOT = { lat: 37.51, lon: 67.42, start: '19840101', end: '20251231' };

export async function loadPower({ lat, lon, start = PILOT.start, end = PILOT.end }) {
  const cacheFile = `cache/power-${lat}_${lon}-${start}-${end}.json`;
  let json;
  try {
    json = JSON.parse(await readFile(cacheFile, 'utf8'));
  } catch {
    const url = powerUrl({ lat, lon, start, end });
    console.error(`NASA POWER'dan yuklanmoqda... ${lat}, ${lon}`);
    let res;
    for (let attempt = 1; attempt <= 3; attempt++) {
      res = await fetch(url);
      if (res.ok) break;
      console.error(`  HTTP ${res.status}, attempt ${attempt}`);
    }
    if (!res.ok) throw new Error(`POWER HTTP ${res.status}`);
    json = await res.json();
    await mkdir('cache', { recursive: true });
    await writeFile(cacheFile, JSON.stringify(json));
  }
  const p = parsePower(json);
  addEt0(p.days, { lat: p.lat, elev: p.elev });
  return p;
}

export const loadPilotPower = () => loadPower(PILOT);
