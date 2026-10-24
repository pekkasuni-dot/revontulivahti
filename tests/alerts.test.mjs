// Hälytysten toiston esto (alerts/aurora-alerts.js decide()), 2026-10-22.
process.env.TZ = 'Europe/Helsinki';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const A = require('../alerts/aurora-alerts.js');
const R = require('../alerts/alert-report.js');

const place = {id: 'oulu', name: 'Oulu', tz: 'Europe/Helsinki'};
const good = {idx: 50, aurora: 30, bz: {mean: -8, southMin: 30, bt: 12, btFresh: true, fresh: true, hint: true},
              kp: 5, kpReq: 3, isDark: true, sunAlt: -20, cloud: 10};
const gap = {...good, idx: null, aurora: null, bz: null};        // OVATION ja mag puuttuvat
const low = {...good, idx: 10, bz: {...good.bz, hint: false}};   // aito lasku rajan alle
const T0 = Date.parse('2026-10-22T15:04:00Z');

// Ajaa sarjan 15 min välein; palauttaa lähteneet hälytykset "hh:mm tyyppi/taso".
function run(seq){
  let st = {}; const fires = [], recs = [];
  seq.forEach((m, i) => {
    const now = new Date(T0 + i * 15 * 60e3), r = A.decide(place, m, st, now);
    st = r.state;
    r.alerts.filter(a => a.fire).forEach(a => fires.push(now.toISOString().slice(11, 16) + ' ' + a.type + '/' + a.level));
    recs.push({run: now.toISOString(), logic: A.LOGIC_VERSION, places: [{id: place.id, name: place.name, alerts: r.alerts
      .filter(a => a.type !== 'tonight').map(a => ({t: a.type, l: a.level, on: a.on, fire: a.fire, ...(a.unknown ? {u: true} : {}), why: a.reason}))}]});
  });
  return {fires, recs};
}

test('datakatko ei laukaise samaa hälytystä uudelleen', () => {
  const {fires} = run([good, good, good, good, gap, good, good]);
  assert.deepEqual(fires.filter(f => f.startsWith('16:19')), [], 'ei hälytystä katkon jälkeen: ' + fires.join(', '));
  assert.ok(fires.some(f => f === '15:04 now/normaali'), 'ensimmäinen hälytys lähtee');
});

test('aito lasku rajan alle ja nousu hälyttää uudelleen', () => {
  const {fires} = run([good, good, low, good]);
  assert.ok(fires.includes('15:49 now/normaali'), fires.join(', '));
  assert.ok(fires.includes('15:49 coming/normaali'), 'Tulossa: oikea siirtymä');
});

test('toistoraja: nousu alle repeatMin edellisestä ei hälytä', () => {
  const {fires} = run([good, low, good]);   // uusi nousu 30 min kohdalla
  const repeat = A.ALERT_CFG.repeatMin;
  const again = fires.filter(f => f.startsWith('15:34 now/'));
  if(repeat > 30) assert.deepEqual(again, []); else assert.ok(again.length > 0);
});

test('tuntematon tila: Bz vanha, Bt puuttuu tai Kp puuttuu', () => {
  const c = (m) => A.condition('coming', m, A.ALERT_CFG.levels.normaali);
  assert.equal(c({...good, bz: {...good.bz, fresh: false}}).unknown, true);
  assert.equal(c({...good, bz: {...good.bz, bt: null}}).unknown, true);
  assert.equal(c({...good, bz: {...good.bz, btFresh: false}}).unknown, true);
  assert.equal(c({...good, kp: null}).unknown, true);
  assert.equal(c({...good, cloud: null}).unknown, true);
  assert.ok(!c({...good, isDark: false}).unknown, 'valoisa = aito "ei täyty"');
  assert.equal(A.condition('now', gap, A.ALERT_CFG.levels.normaali).unknown, true);
});

test('loppuraportti: mahdolliset tuplat vain vanhan logiikan ajoista', () => {
  const {recs} = run([good, good, good, good, gap, good, good]);
  assert.deepEqual(R.possibleDuplicates(recs), [], 'uusi logiikka: ei tuplia');
  // Vanhan logiikan loki: sama sarja, mutta katkon jälkeinen ajo hälytti.
  const old = recs.map(r => ({...r, logic: undefined}));
  const after = old[5].places[0].alerts;
  for(const a of after) if(a.t === 'now' && a.on) a.fire = true;
  const dups = R.possibleDuplicates(old);
  assert.ok(dups.length > 0 && dups.every(x => x.run === old[5].run), JSON.stringify(dups));
});

/* ── Loppuraportti: ajojen kattavuus tunneittain (2026-10-23) ── */
test('coverageByHour: tyhjät tunnit ja aukot Suomen ajassa', () => {
  const runs = ['2026-10-22T16:00:00Z', '2026-10-22T16:15:00Z', '2026-10-22T21:19:00Z', '2026-10-22T21:34:00Z'].map(run => ({run}));
  const c = R.coverageByHour(runs, Date.parse(runs[0].run), Date.parse(runs[3].run));
  // 16-21 UTC = klo 19-00 Suomen kesäaikaa (UTC+3): 6 tuntia, ajoja klo 19 (2) ja 00 (2).
  assert.equal(c.hours, 6);
  assert.equal(c.empty, 4, 'klo 20-23 ilman ajoa');
  assert.equal(c.nightEmpty, 4);
  assert.deepEqual(c.days.map(d => d.k), ['2026-10-22', '2026-10-23']);
  assert.equal(c.days[0].counts[19], 2);
  assert.equal(c.days[1].counts[0], 2);
  assert.equal(c.days[0].counts[18], null, 'jakson ulkopuolella');
  assert.equal(c.gaps.length, 1);
  assert.equal(Math.round(c.gaps[0].min), 304);
});

test('loppuraportissa on kattavuusosio', () => {
  const recs = ['2026-10-22T16:00:00Z', '2026-10-22T21:19:00Z'].map(run => ({run, places: [], errors: []}));
  const md = R.buildReport(recs, {places: [], observations: [], cfg: A.ALERT_CFG, now: new Date('2026-10-23T00:00:00Z')});
  assert.match(md, /## Ajojen kattavuus tunneittain/);
  assert.match(md, /Tunteja ilman ajoa 4 \/ 6/);
  assert.match(md, /yli 30 min väli/);
});

// Testipaikkojen vaihto (2026-10-23): vaihdoskohta lokista + HAVAINNOT-ohje
// päivittyy käyttäjän riviä muuttamatta.
const S = require('../alerts/alert-summary.js');
test('testipaikkojen vaihto: placeChange ja HAVAINNOT-ohje', () => {
  const oldP = [{id: 'oulu', name: 'Oulu'}, {id: 'tromssa', name: 'Tromssa'}];
  const newP = [{id: 'oulu', name: 'Oulu'}, {id: 'lyngen', name: 'Lyngen'}];
  const rec = (run, ps, set) => ({run, places: ps.map(p => ({id: p.id, name: p.name})), ...(set ? {placeSet: set} : {})});
  const recs = [rec('2026-10-23T14:50:00Z', oldP), rec('2026-10-23T16:05:00Z', newP, S.placeSetId(newP))];
  assert.deepEqual(S.placeChange(recs, newP), {since: '2026-10-23T16:05:00Z', added: ['Lyngen'], removed: ['Tromssa']});
  assert.equal(S.placeChange(recs.slice(1), newP), null);
  assert.match(S.placeChangeText(S.placeChange(recs, newP)), /ajosta 23\.10\. klo 19\.05.*uudet Lyngen; pois Tromssa/);
  // Vanha pohja: rivi per yö ilman paikkaa + käyttäjän täyttämä rivi.
  const md = S.obsIntro(oldP) + S.OBS_HEADER + '\n|---|---|---|---|---|\n'
    + '| 23.10.2026 | Oulu | kyllä | selkeä | heikkoa |\n| 24.10.2026 | | | | |\n| 24.10.2026 | Kamera Levi | ei | pilvinen | |\n';
  const upd = S.ensureObsTemplate(md, '2026-10-23', '2026-10-24', newP);
  assert.match(upd, /Oulu tai Lyngen/);
  const rows = upd.split('\n').filter(l => /^\| \d/.test(l));
  assert.deepEqual(rows, ['| 23.10.2026 | Oulu | kyllä | selkeä | heikkoa |', '| 23.10.2026 | Lyngen | | | |',
    '| 24.10.2026 | Oulu | | | |', '| 24.10.2026 | Lyngen | | | |', '| 24.10.2026 | Kamera Levi | ei | pilvinen | |']);
  assert.equal(S.ensureObsTemplate(upd, '2026-10-23', '2026-10-24', newP), null);
  assert.equal(S.parseObservations(upd).length, 2);
});

// Kaksi peräkkäistä vaihtoa (2026-10-24: Utsjoki tilalle Helsingin).
test('testipaikkojen vaihto: useampi vaihto lokissa', () => {
  const a = [{id: 'oulu', name: 'Oulu'}, {id: 'tromssa', name: 'Tromssa'}];
  const b = [{id: 'oulu', name: 'Oulu'}, {id: 'helsinki', name: 'Helsinki'}];
  const c = [{id: 'oulu', name: 'Oulu'}, {id: 'utsjoki', name: 'Utsjoki'}];
  const rec = (run, ps) => ({run, placeSet: S.placeSetId(ps), places: ps.map(p => ({id: p.id, name: p.name}))});
  const recs = [rec('2026-10-23T14:50:00Z', a), rec('2026-10-23T21:35:00Z', b), rec('2026-10-24T12:00:00Z', c)];
  const ch = S.placeChanges(recs, c);
  assert.equal(ch.length, 2);
  assert.deepEqual(ch[1], {since: '2026-10-24T12:00:00Z', added: ['Utsjoki'], removed: ['Helsinki']});
  assert.match(S.placeChangeText(ch), /uudet Helsinki; pois Tromssa.*uudet Utsjoki; pois Helsinki/s);
  assert.equal(S.placeChanges(recs, [{id: 'x', name: 'X'}]).pop().since, null);
});

// Pilvimallit (2026-10-24): PNG-purku ja tuoreus.
const CM = require('../alerts/cloud-models.js');
const zlib = require('node:zlib');
test('cloud-models: harmaasävy-PNG puretaan ja vanha ajo hylätään', () => {
  // 3x2-kuva, suodattimet 0 ja 2 (up): arvot 0,50,100 / 10,60,100
  const raw = Buffer.from([0, 0, 50, 100, 2, 10, 10, 0]);
  const chunk = (t, b) => { const l = Buffer.alloc(4); l.writeUInt32BE(b.length); return Buffer.concat([l, Buffer.from(t), b, Buffer.alloc(4)]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(3, 0); ihdr.writeUInt32BE(2, 4); ihdr[8] = 8; ihdr[9] = 0;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  const f = CM.decodeField(png.toString('base64'), {nlat: 2, nlon: 3}, b => new Uint8Array(zlib.inflateSync(b)));
  assert.deepEqual([...f].map(v => Math.round(v * 100)), [0, 50, 100, 10, 60, 100]);
  const g = {run: new Date('2026-10-24T00:00:00Z'), times: [new Date('2026-10-24T00:00:00Z'), new Date('2026-10-25T06:00:00Z')]};
  assert.equal(CM.gridFresh(g, new Date('2026-10-24T08:00:00Z'), 9).ok, true);
  assert.equal(CM.gridFresh(g, new Date('2026-10-24T10:00:00Z'), 9).ok, false);
  assert.equal(CM.gridFresh(null, new Date(), 9).ok, false);
});
