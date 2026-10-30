// Satelliittikuvan haku EUMETViewistä (puhdasta logiikkaa, testattavissa Nodessa).
// EUMETSAT legal affairs 30.10.2026: EUMETViewin kuvat CC BY 4.0 viiveestä riippumatta,
// maininta "Contains modified EUMETSAT Meteosat data 2026" (sovelluksessa sat.license).
export const WMS = 'https://view.eumetsat.int/geoserver/wms';
export const CAPS = 'https://view.eumetsat.int/geoserver/ows?service=WMS&version=1.3.0&request=GetCapabilities';
const R = 6378137, SLOT_MS = 10 * 60e3;

function projY(lat){ return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)); }
// Sama geometria kuin index.html satGeom(): bbox EPSG:3857-metreinä, korkeus Mercator-suhteesta.
export function geom(bbox, width){
  const [lon0, lat0, lon1, lat1] = bbox, d = Math.PI / 180;
  const x0 = lon0 * d * R, x1 = lon1 * d * R, y0 = projY(lat0) * R, y1 = projY(lat1) * R;
  const height = Math.round(width * (y1 - y0) / (x1 - x0));
  return {bbox: [x0, y0, x1, y1].map(v => Math.round(v)).join(','), width, height};
}
// Uusin aika GetCapabilities-vastauksen aikaulottuvuudesta ("alku/loppu/PT10M", pilkulla erotetut jaksot).
export function latestTime(capsText, layer){
  const i = capsText.indexOf('<Name>' + layer + '</Name>');
  const m = i >= 0 && /<Dimension name="time"[^>]*>([^<]+)</.exec(capsText.slice(i, i + 8000));
  const end = m && m[1].trim().split(',').pop().split('/')[1];
  const t = end ? new Date(end) : null;
  return t && !isNaN(t) ? t : null;
}
// Tuorein 10 min kuva, ei tulevaisuudesta (sama kuin index.html satPickTime).
export function pickTime(avail, now){ return new Date(Math.floor(Math.min(+avail, now) / SLOT_MS) * SLOT_MS); }
export function wmsUrl(layer, time, g){
  return WMS + '?service=WMS&version=1.3.0&request=GetMap&layers=' + encodeURIComponent(layer)
    + '&styles=&crs=EPSG:3857&bbox=' + g.bbox + '&width=' + g.width + '&height=' + g.height
    + '&format=image/png&transparent=true&time=' + time.toISOString().replace('.000Z', 'Z');
}
