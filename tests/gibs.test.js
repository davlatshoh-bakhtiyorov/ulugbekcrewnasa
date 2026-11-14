import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  lonLatToTilePixel, parseColormap, colormapIndex, decodeColor, applyOffset, expandDimension, pickFrames,
  capabilityDates, layerByKey, tileUrl, colorAt,
} from '../core/gibs.js';

test('Web Mercator tile and pixel for the pilot point', () => {
  // Mustaqil hisob (Python, 14-noyabr): z6 da tayl 43/24, piksel (252, 203)
  assert.deepEqual(lonLatToTilePixel(37.51, 67.42, 6), { tx: 43, ty: 24, px: 252, py: 203 });
  const z0 = lonLatToTilePixel(0, 0, 0);
  assert.deepEqual([z0.tx, z0.ty, z0.px, z0.py], [0, 0, 128, 128]);
});

test('tile URL follows the GIBS WMTS REST pattern', () => {
  const u = tileUrl(layerByKey('soil'), '2026-11-10', 6, 43, 24);
  assert.equal(u, 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/SMAP_L4_Analyzed_Root_Zone_Soil_Moisture/default/2026-11-10/GoogleMapsCompatible_Level6/6/24/43.png');
});

const XML = `<ColorMaps>
  <ColorMap title="No Data"><Entries>
    <ColorMapEntry rgb="0,0,0" transparent="true" sourceValue="[-9999]" value="[-9999]" nodata="true" ref="0"/>
  </Entries></ColorMap>
  <ColorMap title="Thing" units="cm"><Entries>
    <ColorMapEntry rgb="0,51,255" transparent="false" sourceValue="[-INF,-30.00)" value="[-INF,-30.00)" ref="1"/>
    <ColorMapEntry rgb="10,20,30" transparent="false" value="[-30.00,-29.75)" ref="2"/>
    <ColorMapEntry rgb="10,20,30" transparent="false" value="[-29.75,-29.50)" ref="3"/>
    <ColorMapEntry rgb="9,9,9" transparent="true" value="[0,1)" ref="4"/>
    <ColorMapEntry rgb="255,51,0" transparent="false" value="[30.00,+INF)" ref="5"/>
  </Entries></ColorMap></ColorMaps>`;

test('colormap parser: skips transparent/nodata, keeps open ends, merges duplicate colours', () => {
  const cm = parseColormap(XML);
  assert.equal(cm.units, 'cm');
  assert.deepEqual(cm.entries, [[0, 51, 255, null, -30], [10, 20, 30, -30, -29.5], [255, 51, 0, 30, null]]);
  const ix = colormapIndex(cm.entries);
  assert.deepEqual(decodeColor(ix, 10, 20, 30), { lo: -30, hi: -29.5, value: -29.75, bound: null });
  assert.deepEqual(decodeColor(ix, 0, 51, 255), { lo: null, hi: -30, value: -30, bound: '<' });
  assert.deepEqual(decodeColor(ix, 255, 51, 0), { lo: 30, hi: null, value: 30, bound: '≥' });
  assert.equal(decodeColor(ix, 10, 20, 30, 0), null, 'transparent pixel = no data');
  assert.deepEqual(decodeColor(ix, 12, 21, 29).value, -29.75, 'tiny colour shift tolerated');
  assert.equal(decodeColor(ix, 120, 120, 120), null, 'unknown colour is not guessed');
  assert.deepEqual(colorAt(cm.entries, -29.6), [10, 20, 30]);
});

test('shipped SMAP colormap decodes the pixels read independently from a GIBS tile', () => {
  // 14-noyabr: SMAP L4 tayli 2026-11-10, z6 43/24, Python+PIL bilan o'qilgan ranglar va GIBS XML oraliqlari
  const data = JSON.parse(readFileSync(new URL('../web/data/gibs-layers.json', import.meta.url)));
  const ix = colormapIndex(data.layers.soil.entries);
  const a = decodeColor(ix, 148, 201, 0);
  assert.equal(a.lo, 0.165); assert.equal(a.hi, 0.168);
  const b = decodeColor(ix, 255, 186, 0);
  assert.equal(b.lo, 0.028); assert.equal(b.hi, 0.03);
  assert.equal(data.layers.soil.units, 'm³/m³');
  assert.equal(data.layers.heat.units, 'K');
  // LST shkalasining chekka sinflari "< 200 K" va "≥ 350 K" - ochiq chegara, o'rtacha qiymat emas
  const lst = colormapIndex(data.layers.heat.entries);
  assert.deepEqual(decodeColor(lst, 201, 0, 255), { lo: null, hi: 200, value: 200, bound: '<' });
  assert.equal(decodeColor(lst, 255, 1, 0).bound, '≥');
});

test('LST kelvin -> °C offset', () => {
  const v = applyOffset(layerByKey('heat'), { lo: 300.02, hi: 300.62, value: 300.32, bound: null });
  assert.ok(Math.abs(v.value - 27.17) < 1e-9);
  assert.equal(applyOffset(layerByKey('heat'), null), null);
});

test('time dimension expands 16-day, monthly and single values', () => {
  assert.deepEqual(expandDimension(['2026-01-01/2026-02-02/P16D']), ['2026-01-01', '2026-01-17', '2026-02-02']);
  assert.deepEqual(expandDimension(['2022-05-01/2022-07-01/P1M', '2002-04-04']), ['2002-04-04', '2022-05-01', '2022-06-01', '2022-07-01']);
  assert.deepEqual(expandDimension(['2020-01-20/2020-01-10/P1M']), ['2020-01-20'], 'end before start -> start only');
});

test('frame picking: last date of each of the last n months; yearly by month', () => {
  const dates = ['2026-08-13', '2026-08-29', '2026-09-14', '2026-09-30', '2026-10-16'];
  assert.deepEqual(pickFrames(dates, { kind: 'monthly', n: 3 }), ['2026-08-29', '2026-09-30', '2026-10-16']);
  assert.deepEqual(pickFrames(dates, { kind: 'monthly', n: 5 }), ['2026-08-29', '2026-09-30', '2026-10-16'], 'months with no data are skipped');
  const yearly = ['2003-06-01', '2003-07-01', '2004-07-15', '2004-07-30', '2005-08-01'];
  assert.deepEqual(pickFrames(yearly, { kind: 'yearly', month: 7 }), ['2003-07-01', '2004-07-15']);
});

test('capabilities parser finds the Dimension values of one layer', () => {
  const caps = `<Layer><ows:Identifier>A</ows:Identifier><Dimension><Value>2020-01-01/2020-01-03/P1D</Value></Dimension></Layer>
    <Layer><ows:Identifier>B</ows:Identifier><Dimension><Value>2021-01-01</Value><Value>2021-02-01</Value></Dimension></Layer>`;
  assert.deepEqual(capabilityDates(caps, 'B'), ['2021-01-01', '2021-02-01']);
  assert.equal(capabilityDates(caps, 'C'), null);
});
