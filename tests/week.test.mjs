// 7 vrk:n yöt (aurora-core.js weekWindows), 2026-10-22, KATSELMOINTI 1.2 ja
// osa 2 kohdat 3-4. Yö määräytyy PISTEEN pimeän jakson mukaan, ei puhelimen
// kalenteripäivän mukaan; kellonajat näytetään puhelimen aikavyöhykkeellä.
process.env.TZ = 'Europe/Helsinki';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const C = createRequire(import.meta.url)('../aurora-core.js');

const H = 3600e3, MIN = 60e3;
const CFG = {nights: 7, maxHours: 16, polarFrom: 16, polarTo: 8};
const PLACES = {
  Kilpisjarvi: [69.05, 20.79], Oulu: [65.01, 25.47], Tromssa: [69.65, 18.96],
  Reykjavik: [64.15, -21.94], Siperia: [72, 140],
};
const iso = t => t ? new Date(t).toISOString().slice(0, 16) : '-';
const show = ws => ws.map(w => w.none ? (w.day || '?') + ' ei pimeää' : (w.day || '?') + ' ' + iso(w.start) + '-' + iso(w.end) + (w.p && w.p.all ? ' (kaamos)' : '')).join('\n  ');

// Yhtenäisyys: jokainen tavallinen yö alkaa pimeän jakson alusta, ja seuraava
// pimeä jakso edellisen yön jälkeen on seuraava yö (ei ohitettuja öitä).
function assertContinuous(lat, lon, ws, label){
  assert.equal(ws.length, CFG.nights, label + ': öitä');
  for(let k = 1; k < ws.length; k++){
    const a = ws[k - 1], b = ws[k];
    if(a.none || b.none || (a.p && a.p.all) || (b.p && b.p.all)) continue;
    const next = C.darkPeriod(lat, lon, new Date(a.start.getTime() + 6 * H));   // pimeä jakso yön alun jälkeen
    const nextStart = next.now ? C.darkPeriod(lat, lon, new Date(next.to.getTime() + MIN)).from : next.from;
    // ±1 min: darkPeriod pyöristää rajan minuuttiin, ja tulos voi heittää minuutin kyselyhetken mukaan.
    assert.ok(Math.abs(b.start - nextStart) <= MIN, `${label}: yö ${k + 1} ei ole seuraava pimeä jakso (${iso(nextStart)})\n  ${show(ws)}`);
  }
}
// Yön päivämäärä = illan päivä pisteessä: peräkkäiset päivät ilman aukkoja.
function assertDaysConsecutive(ws, label){
  for(let k = 1; k < ws.length; k++){
    const a = Date.parse(ws[k - 1].day + 'T00:00:00Z'), b = Date.parse(ws[k].day + 'T00:00:00Z');
    assert.equal((b - a) / (24 * H), 1, `${label}: päivät ${ws[k - 1].day} -> ${ws[k].day}\n  ${show(ws)}`);
  }
}

/* ── Kohta 3: puuttuva yö, kun pimeä alkaa vasta keskiyön jälkeen ── */
test('Kilpisjärvi huhtikuun lopussa: ei puuttuvaa yötä (pimeä alkaa ~00.05)', () => {
  const [lat, lon] = PLACES.Kilpisjarvi, now = new Date('2026-04-25T17:00:00Z');   // klo 20 Suomen aikaa
  const ws = C.weekWindows(lat, lon, now, CFG);
  assertContinuous(lat, lon, ws, 'Kilpisjärvi 25.4.');
  assertDaysConsecutive(ws, 'Kilpisjärvi 25.4.');
  assert.equal(ws[0].day, '2026-04-25', 'yö 1 on 25.4. illan yö, vaikka pimeä alkaa 26.4. puolella');
});

test('Kilpisjärvi elokuun puolivälissä: ei puuttuvaa yötä', () => {
  const [lat, lon] = PLACES.Kilpisjarvi, now = new Date('2026-08-15T17:00:00Z');
  const ws = C.weekWindows(lat, lon, now, CFG);
  assertContinuous(lat, lon, ws, 'Kilpisjärvi 15.8.');
  assertDaysConsecutive(ws, 'Kilpisjärvi 15.8.');
});

/* ── Kohta 4: yö pisteen pimeän jakson mukaan, ei puhelimen kalenteripäivän ── */
const DATES = ['2026-04-25T09:00:00Z', '2026-08-15T09:00:00Z', '2026-10-23T09:00:00Z', '2026-12-15T09:00:00Z'];
const ZONES = ['Europe/Helsinki', 'America/New_York', 'Asia/Tokyo'];

for(const [name, [lat, lon]] of Object.entries(PLACES)){
  test(`${name}: yöt samat puhelimen aikavyöhykkeestä riippumatta ja yhtenäiset`, () => {
    for(const s of DATES){
      const now = new Date(s), runs = [];
      for(const tz of ZONES){
        process.env.TZ = tz;
        const ws = C.weekWindows(lat, lon, now, CFG);
        runs.push(ws.map(w => w.none ? 'none:' + w.day : w.day + ' ' + w.start.getTime() + '-' + w.end.getTime()));
        assertContinuous(lat, lon, ws, `${name} ${s} (${tz})`);
        assertDaysConsecutive(ws, `${name} ${s} (${tz})`);
      }
      process.env.TZ = 'Europe/Helsinki';
      assert.deepEqual(runs[1], runs[0], `${name} ${s}: New York vs Helsinki`);
      assert.deepEqual(runs[2], runs[0], `${name} ${s}: Tokio vs Helsinki`);
    }
  });
}

test('Siperia 72° N 140° E: tavallinen pimeä yö ei ole "kaamos" Helsingin keskipäivän takia', () => {
  // 23.10. pisteessä on vielä päivä: Helsingin keskipäivä (09 UTC) on Siperiassa ilta.
  const [lat, lon] = PLACES.Siperia, ws = C.weekWindows(lat, lon, new Date('2026-10-23T09:00:00Z'), CFG);
  for(const w of ws.slice(1)) assert.ok(!(w.p && w.p.all), 'ei kaamosikkunaa: ' + show(ws));
});

// Kaamos = pimeää (aurinko alle -6°) myös keskipäivällä. Tromssassa joulukuun
// keskipäivän aurinko on n. -3°, joten se EI ole kaamosta tällä määritelmällä.
test('kaamos: yö klo 16-08 PISTEEN aurinkoajassa (Huippuvuoret joulukuu)', () => {
  const [lat, lon] = [78.2, 15.6], ws = C.weekWindows(lat, lon, new Date('2026-12-15T09:00:00Z'), CFG);
  const solar = t => ((t.getUTCHours() + t.getUTCMinutes() / 60 + lon / 15) % 24 + 24) % 24;
  for(const w of ws.slice(1)){
    assert.ok(w.p && w.p.all, 'kaamos');
    assert.ok(Math.abs(solar(w.start) - 16) < 0.02 && Math.abs(solar(w.end) - 8) < 0.02, show(ws));
  }
});

test('Tänä yönä (computeNight) = 7 vrk:n yö 1, sama puhelimen aikavyöhykkeestä riippumatta', () => {
  const src = {cloudAt: () => ({pct: 0, factor: 1}), kpBlockAt: () => null};
  for(const [name, [lat, lon]] of Object.entries(PLACES)) for(const s of DATES){
    const now = new Date(s), seen = new Set();
    for(const tz of ZONES){
      process.env.TZ = tz;
      const n = C.computeNight(lat, lon, now, src), w = C.weekWindows(lat, lon, now, CFG)[0];
      if(n.kind !== 'ok'){ assert.ok(w.none, `${name} ${s}: Tänä yönä ei pimeää, 7 vrk yö 1 ${w.day}`); seen.add('none'); continue; }
      if(!(w.p && w.p.all)) assert.equal(n.start.getTime(), w.start.getTime(), `${name} ${s} (${tz}): alku`);
      seen.add(n.start.getTime() + '-' + n.end.getTime());
    }
    process.env.TZ = 'Europe/Helsinki';
    assert.equal(seen.size, 1, `${name} ${s}: Tänä yönä vaihtelee aikavyöhykkeen mukaan`);
  }
});
