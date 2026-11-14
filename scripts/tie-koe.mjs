import {createRequire} from 'node:module';
const C = createRequire(import.meta.url)('../aurora-core.js');
const tpl = (await (await fetch('https://tiles.openfreemap.org/planet')).json()).tiles[0];
for(const [n, lat, lon] of [['Pallas', 68.06, 24.06], ['Sodankylä mets', 67.5, 26.3], ['Savukoski', 67.3, 28.6]]){
  for(const z of [12, 13, 14]){
    const t = C.tilesAround(lat, lon, z, 0)[0];
    const b = await (await fetch(tpl.replace('{z}',t.z).replace('{x}',t.x).replace('{y}',t.y))).arrayBuffer();
    const cnt = {};
    for(const f of C.mvtLayerFeatures(b, 'transportation', t.z, t.x, t.y, [2])) cnt[f.props.class] = (cnt[f.props.class] || 0) + 1;
    console.log(n, 'z' + z, (b.byteLength / 1024 | 0) + ' kt', JSON.stringify(cnt));
  }
}
