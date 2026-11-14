#!/usr/bin/env node
// VÄLIAIKAINEN (2026-11-14): millä tiilitasolla OpenFreeMapin place-tasossa on kyliä/pikkupaikkoja.
// Ajetaan työnkulussa paikannimet-koe.yml (Claude-ympäristöstä OpenFreeMap on estetty). Poistetaan ennen yhdistämistä.
import {createRequire} from 'node:module';
const C = createRequire(import.meta.url)('../aurora-core.js');
const tj = await (await fetch('https://tiles.openfreemap.org/planet')).json();
const tpl = tj.tiles[0];
console.log('tilejson', tpl, 'minzoom', tj.minzoom, 'maxzoom', tj.maxzoom);
const PTS = {Sodankylä: [67.42, 26.6], Kuusamo: [65.97, 29.18], Utsjoki: [69.9, 27.0], Kittilä: [67.66, 24.9], Kemijärvi: [66.71, 27.43], Oulu: [65.01, 25.47]};
const tile = (lat, lon, z) => { const n = 2 ** z, x = Math.floor((lon + 180) / 360 * n), r = lat * Math.PI / 180;
  return [x, Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n)]; };
for(const [nm, [lat, lon]] of Object.entries(PTS)){
  console.log('\n== ' + nm);
  for(let z = 5; z <= 14; z++){
    const [x, y] = tile(lat, lon, z);
    const r = await fetch(tpl.replace('{z}', z).replace('{x}', x).replace('{y}', y));
    if(!r.ok){ console.log('z' + z, 'HTTP', r.status); continue; }
    const pts = C.mvtLayerPoints(await r.arrayBuffer(), 'place', z, x, y);
    const by = {};
    for(const p of pts){ const c = p.props.class; (by[c] ||= []).push(p.props.name + (p.props.rank != null ? '(' + p.props.rank + ')' : '')); }
    console.log('z' + z, Object.entries(by).map(([c, a]) => c + ' ' + a.length + ': ' + a.slice(0, 8).join(', ')).join(' | '));
  }
}
