import {createRequire} from 'node:module';
const C = createRequire(import.meta.url)('../aurora-core.js');
const tj = await (await fetch('https://tiles.openfreemap.org/planet')).json();
const tpl = tj.tiles[0];
async function road(lat, lon){
  for(const [z, km] of C.ROAD_SNAP.steps){
    const tiles = C.tilesInRadius(lat, lon, z, km); let bytes = 0;
    const feats = (await Promise.all(tiles.map(async t => { const r = await fetch(tpl.replace('{z}',t.z).replace('{x}',t.x).replace('{y}',t.y)); const b = await r.arrayBuffer(); bytes += b.byteLength; return C.mvtLayerFeatures(b,'transportation',t.z,t.x,t.y,[2]); }))).flat();
    const b = C.nearestRoadPoint(feats, lat, lon, km);
    console.log(' z'+z, tiles.length+' tiiltä', (bytes/1024|0)+' kt', b ? b.cls+' '+b.km.toFixed(2)+' km '+b.lat.toFixed(5)+','+b.lon.toFixed(5) : '-');
    if(b) return b;
  }
}
for(const [n, lat, lon] of [['Pallastunturi', 68.06, 24.06], ['Inarijärvi', 69.0, 27.9], ['Saana', 69.045, 20.82], ['Levi keskusta', 67.8045, 24.8085]]){ console.log(n); await road(lat, lon); }
