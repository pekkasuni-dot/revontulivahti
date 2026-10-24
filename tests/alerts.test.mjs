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

// Ilmoitukset (2026-10-24): teksti, vastaanottajat, napit, kanavat eivät lokiin.
const N = require('../alerts/notify.js');
test('notify: viesti, vastaanottajat ja palautenapit', async () => {
  const run = new Date('2026-10-24T19:15:00Z');
  const places = [{id: 'levi', name: 'Levi', tz: 'Europe/Helsinki', camera: 'levi', cameraLink: true, notify: true},
                  {id: 'oulu', name: 'Oulu', tz: 'Europe/Helsinki', notify: true},
                  {id: 'lyngen', name: 'Lyngen', tz: 'Europe/Oslo', notify: false}];
  const m = {idx: 48, cloud: 20, bz: {mean: -7.24, southMin: 25}, night: {max: 52, best: [['2026-10-24T18:00:00Z', '2026-10-24T20:00:00Z']]}};
  const ev = [
    {id: 'levi', metrics: m, alerts: [{type: 'now', level: 'normaali', fire: true}, {type: 'now', level: 'herkka', fire: true}, {type: 'coming', level: 'normaali', fire: true}]},
    {id: 'oulu', metrics: m, alerts: [{type: 'tonight', level: 'normaali', fire: true}, {type: 'now', level: 'normaali', fire: false}]},
    {id: 'lyngen', metrics: m, alerts: [{type: 'now', level: 'normaali', fire: true}]},
  ];
  const cams = {levi: {youtube: {videoId: 'abc', channelId: 'UCx'}}};
  const list = N.buildNotifications(ev, {places, cfg: {sendLevel: 'normaali'}, run, model: 'harmonie', cameras: cams});
  assert.deepEqual(list.map(n => n.id), ['20261024T1915-levi-now', '20261024T1915-levi-coming', '20261024T1915-oulu-tonight']);
  assert.equal(list[0].message, 'Levi: Revontulia nyt · näkyvyys 48 % · HARMONIE · klo 22.15\nKamera: https://www.youtube.com/channel/UCx/live');
  assert.match(list[1].message, /^Levi: Tulossa · Bz −7,2 nT etelään 25 min · pilvisyys 20 % · HARMONIE · klo 22\.15/);
  assert.equal(list[2].message, 'Oulu: Tänä yönä · paras näkyvyys 52 % klo 21–23 · HARMONIE · klo 22.15');
  assert.ok(N.ID_RE.test(list[0].id) && N.ID_RE.test('testi-123-1') && !N.ID_RE.test('../x'));
  // Lähetys: yksi kanava, kukin hälytys kerran; kanava vain runkoon, ei lokiin.
  const sent = [];
  const log = await N.sendAll(list.slice(0, 2), {NTFY_TOPIC_YHTEINEN: 'salainen-y'}, {url: 'https://w.example/', key: 'k'},
    async (u, o) => { sent.push(JSON.parse(o.body)); return {ok: true, status: 200}; });
  assert.deepEqual(log.map(l => l.status), ['ok', 'ok']);
  assert.ok(!JSON.stringify(log).includes('salainen'));
  assert.equal(sent.length, 2);
  assert.equal(sent[0].topic, 'salainen-y');
  assert.equal((await N.sendAll(list.slice(0, 1), {}, null, async () => ({ok: true})))[0].status, 'ei kanavaa');
  assert.deepEqual(sent[0].actions.map(a => a.label), ['Näkyi', 'Ei näkynyt', 'Pilvessä']);
  const u = new URL(sent[0].actions[2].url);
  assert.equal(u.pathname, '/palaute');
  assert.equal(u.searchParams.get('v'), 'pilvessa');
  assert.equal(u.searchParams.get('k'), null);
  assert.ok(await N.verify('k', u.searchParams.get('h'), u.searchParams.get('s')));
  assert.ok(!(await N.verify('k', '20261024T1915-levi-coming', u.searchParams.get('s'))));
});

// Kenttäpalaute (2026-10-24): PALAUTE.md ja loppuraportin osio.
const FB = require('../alerts/feedback.js');
test('kenttäpalaute: rivit säilyvät ja raportti laskee paikoittain', () => {
  const places = [{id: 'levi', name: 'Levi'}, {id: 'oulu', name: 'Oulu'}];
  const now = new Date('2026-10-24T19:31:00Z');
  let md = FB.appendRow('', FB.rowFor('20261024T1915-levi-now', 'nakyi', places, now));
  md = FB.appendRow(md, FB.rowFor('20261024T1915-levi-now', 'pilvessa', places, now));
  md = FB.appendRow(md, FB.rowFor('testi-1-1', 'ei', places, now));
  const fb = FB.parseFeedback(md);
  assert.deepEqual(fb.map(f => f.answer), ['nakyi', 'pilvessa']);
  assert.ok(!/Pekka|opas/.test(md));
  const recs = [{run: '2026-10-24T19:15:00Z', cloudModel: 'harmonie',
    places: [{id: 'levi', clouds: {ecmwf: 80, icon_eu: 40, harmonie: 10}}, {id: 'oulu', clouds: {}}],
    sent: [{id: '20261024T1915-levi-now', place: 'levi', t: 'now', status: 'ok'},
           {id: '20261024T1915-oulu-tonight', place: 'oulu', t: 'tonight', status: 'ok'},
           {id: '20261024T1915-oulu-now', place: 'oulu', t: 'now', status: 'HTTP 500'}]}];
  const sec = FB.reportSection(recs, fb, places);
  assert.match(sec, /\| Levi \| 1 \| 1 \| 0 \| 1 \| 0 \|/);
  assert.match(sec, /\| Oulu \| 1 \| 0 \| 0 \| 0 \| 1 \|/);
  assert.match(sec, /\| \*\*Yhteensä\*\* \| 2 \|/);
  assert.match(sec, /Näkyi, Pilvessä \| 80 % \| 40 % \| 10 % \|/);
  assert.match(sec, /\| Pilvessä \| 1 \| 80 % \| 40 % \| 10 % \|/);
});
