// Cloudflare-ajastimen aikataulu (workers/ajastin/src/schedule.js, 2026-10-23).
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {SCHEDULE, dueWorkflows, hasActiveRun, CAMERA_POINTS, CAMERA_DARK_DEG, sunAltitude, cameraAreaDark} from '../workers/ajastin/src/schedule.js';
const require = createRequire(import.meta.url);
const AuroraCore = require('../aurora-core.js');
const camerasJson = require('../data/cameras.json');

const at = s => Date.parse('2026-10-23T' + s + ':00Z');
const day = (wf, d0 = at('00:00')) => { const n = []; for(let t = d0; t < d0 + 864e5; t += 300e3) if(dueWorkflows(t).includes(wf)) n.push(new Date(t).toISOString().slice(11, 16)); return n; };

test('käynnistyskerrat vuorokaudessa vastaavat pyydettyjä välejä', () => {
  assert.equal(day('alert-fcm.yml').length, 48, 'hälytysajo (FCM) 30 min');
  assert.deepEqual(day('alert-fcm.yml').slice(0, 3), ['00:05', '00:35', '01:05']);
  assert.equal(day('alert-dryrun.yml').length, 0, 'ntfy-kuivaharjoitus poistettu (2026-11-11)');
  assert.ok(!SCHEDULE.some(s => s.wf === 'alert-dryrun.yml'));
  assert.equal(day('camera-status.yml').length, 96, 'kamerat 15 min (lokakuussa aina pimeää jollain kameralla)');
  assert.deepEqual(day('pilvidata-ecmwf.yml'), ['01:15', '07:15', '13:15', '19:15']);
  assert.deepEqual(day('ecmwf-7d.yml'), ['08:25', '20:25']);
  assert.equal(day('wind-icon_eu.yml').length, 8);
  assert.equal(day('pilvidata-harmonie.yml')[0], '02:25');
});

test('välit tasaiset: hälytysajo 30 min, kamerat 15 min (pimeä)', () => {
  const mins = a => a.map(x => +x.slice(0, 2) * 60 + +x.slice(3));
  for(const [wf, iv] of [['alert-fcm.yml', 30], ['camera-status.yml', 15]]){
    const m = mins(day(wf));
    assert.ok(m.slice(1).every((x, i) => x - m[i] === iv), wf);
  }
});

test('kaikki minuutit 5:llä jaollisia (Worker herää */5)', () => {
  for(const s of SCHEDULE) if(!s.every) assert.equal(s.minute % 5, 0, s.wf);
  // Myöhässä herännyt (scheduledTime :07) pyöristyy alas omaan 5 min ikkunaansa.
  assert.ok(dueWorkflows(at('01:17')).includes('pilvidata-ecmwf.yml'));
});

test('kesken oleva ajo estää uuden käynnistyksen', () => {
  assert.equal(hasActiveRun({workflow_runs: [{status: 'completed'}]}), false);
  assert.equal(hasActiveRun({workflow_runs: [{status: 'completed'}, {status: 'in_progress'}]}), true);
  assert.equal(hasActiveRun({workflow_runs: [{status: 'queued'}]}), true);
  assert.equal(hasActiveRun({}), false);
});

// Päätös 55 (2026-11-15): kameratahti auringon korkeuden mukaan.
const dayAt = (iso, wf = 'camera-status.yml') => day(wf, Date.parse(iso + 'T00:00:00Z'));

test('kamerapisteet = data/cameras.json (uusi kamera -> CAMERA_POINTS)', () => {
  const cams = camerasJson.cameras || camerasJson;
  const key = p => p[0].toFixed(4) + ',' + p[1].toFixed(4);
  assert.deepEqual(CAMERA_POINTS.map(key).sort(), cams.map(c => key([c.lat, c.lon])).sort());
  assert.equal(CAMERA_DARK_DEG, -6);
});

test('auringon korkeus = aurora-core.js sunAltitude', () => {
  for(let t = Date.parse('2026-01-01T00:00Z'); t < Date.parse('2027-01-01T00:00Z'); t += 7 * 3600e3 + 13 * 60e3)
    for(const [lat, lon] of CAMERA_POINTS) assert.ok(Math.abs(sunAltitude(t, lat, lon) - AuroraCore.sunAltitude(t, lat, lon)) < 1e-9);
});

test('kamerat: pimeässä 15 min, valoisassa tasatunnein, vain 15 min ruudukolla', () => {
  for(const d of ['2026-03-20', '2026-06-21', '2026-09-01', '2026-11-16', '2026-12-21']){
    const runs = dayAt(d);
    for(const hm of runs){
      const m = +hm.slice(3), t = Date.parse(d + 'T' + hm + ':00Z');
      assert.equal(m % 15, 0, d + ' ' + hm);
      if(m !== 0) assert.ok(cameraAreaDark(t), d + ' ' + hm + ' ajo ei-tasatunnilla vain pimeässä');
    }
    // Jokainen pimeä 15 min ruutu ajetaan, jokainen tasatunti ajetaan aina.
    for(let t = Date.parse(d + 'T00:00Z'); t < Date.parse(d + 'T00:00Z') + 864e5; t += 900e3){
      const hm = new Date(t).toISOString().slice(11, 16);
      if(cameraAreaDark(t) || hm.endsWith(':00')) assert.ok(runs.includes(hm), d + ' ' + hm);
    }
  }
  assert.equal(dayAt('2026-11-16').length, 96, 'marraskuu: pimeää aina jollain kameralla');
  const summer = dayAt('2026-06-21').length;
  assert.ok(summer > 24 && summer < 60, 'juhannus: ' + summer);
});

test('kamerat: heräämisen viive ei muuta tahtia (nimellisaika pyöristyy 5 min)', () => {
  const t = Date.parse('2026-06-21T12:00:00Z');
  assert.equal(cameraAreaDark(t), false, 'juhannuksen keskipäivä UTC valoisa kaikilla kameroilla');
  assert.ok(dueWorkflows(t + 3 * 60e3).includes('camera-status.yml'));
  assert.ok(!dueWorkflows(Date.parse('2026-06-21T12:15:00Z')).includes('camera-status.yml'));
});
