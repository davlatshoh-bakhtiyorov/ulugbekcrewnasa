// NASA POWER (MERRA-2 + CERES) kunlik nuqta API - login ham, kalit ham kerak emas.
// Hujjat: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
import { dayOfYear } from './agro.js';

export const POWER_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point';
export const POWER_PARAMS = ['T2M_MAX', 'T2M_MIN', 'T2MDEW', 'WS2M', 'ALLSKY_SFC_SW_DWN', 'PRECTOTCORR'];

export function powerUrl({ lat, lon, start, end, params = POWER_PARAMS }) {
  const q = new URLSearchParams({
    parameters: params.join(','), community: 'AG',
    longitude: String(lon), latitude: String(lat), start, end, format: 'JSON',
  });
  return `${POWER_URL}?${q}`;
}

/** POWER javobini kunlik qatorga aylantiradi; -999 (ma'lumot yo'q) -> null */
export function parsePower(json) {
  const p = json.properties.parameter;
  const fill = json.header?.fill_value ?? -999;
  const v = (name, date) => {
    const x = p[name]?.[date];
    return x == null || x === fill ? null : x;
  };
  const [lon, lat, elev] = json.geometry.coordinates;
  const days = Object.keys(p.T2M_MAX).sort().map((date) => ({
    date,
    doy: dayOfYear(date),
    tmax: v('T2M_MAX', date),
    tmin: v('T2M_MIN', date),
    tdew: v('T2MDEW', date),
    u2: v('WS2M', date),
    rs: v('ALLSKY_SFC_SW_DWN', date),
    rain: v('PRECTOTCORR', date),
  }));
  return { lat, lon, elev, sources: json.header?.sources ?? [], days };
}

export async function fetchPower(opts, fetchImpl = fetch) {
  const res = await fetchImpl(powerUrl(opts));
  if (!res.ok) throw new Error(`NASA POWER javob bermadi: HTTP ${res.status}`);
  return parsePower(await res.json());
}
