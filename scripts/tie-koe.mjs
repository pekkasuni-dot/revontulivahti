import {createRequire} from 'node:module';
const C = createRequire(import.meta.url)('../aurora-core.js');
const tpl = (await (await fetch('https://tiles.openfreemap.org/planet')).json()).tiles[0];
async function road(lat, lon){
  const got = new Map(); let n = 0, bytes = 0;
  for(const [z, km] of C.ROAD_SNAP.steps){
    const feats = (await Promise.all(C.tilesInRadius(lat, lon, z, km).map(t => {
      const k = t.z + '/' + t.x + '/' + t.y;
      if(!got.has(k)) got.set(k, (async () => { n++; const b = await (await fetch(tpl.replace('{z}',t.z).replace('{x}',t.x).replace('{y}',t.y))).arrayBuffer(); bytes += b.byteLength; return C.mvtLayerFeatures(b,'transportation',t.z,t.x,t.y,[2]); })());
      return got.get(k);
    }))).flat();
    const b = C.nearestRoadPoint(feats, lat, lon, km);
    if(b) return console.log('  z'+z+' '+km+' km:', b.cls, b.km.toFixed(2)+' km', b.lat.toFixed(5)+','+b.lon.toFixed(5), '|', n, 'tiiltä', (bytes/1024|0)+' kt', b.km <= C.ROAD_SNAP.keepKm ? '(ei siirtoa)' : '');
  }
  console.log('  ei tietä |', n, 'tiiltä', (bytes/1024|0)+' kt');
}
for(const [nm, lat, lon] of [['Pallastunturi', 68.06, 24.06], ['Inarijärvi', 69.0, 27.9], ['Saana', 69.045, 20.82], ['Levi keskusta', 67.8045, 24.8085], ['Sodankylä metsä', 67.5, 26.3], ['Savukoski', 67.3, 28.6], ['Helsinki', 60.17, 24.94]]){ console.log(nm); await road(lat, lon); }
