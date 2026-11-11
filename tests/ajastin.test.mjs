// Cloudflare-ajastimen aikataulu (workers/ajastin/src/schedule.js, 2026-10-23).
import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEDULE, dueWorkflows, hasActiveRun} from '../workers/ajastin/src/schedule.js';

const at = s => Date.parse('2026-10-23T' + s + ':00Z');
const day = wf => { const n = []; for(let t = at('00:00'); t < at('00:00') + 864e5; t += 300e3) if(dueWorkflows(t).includes(wf)) n.push(new Date(t).toISOString().slice(11, 16)); return n; };

test('käynnistyskerrat vuorokaudessa vastaavat pyydettyjä välejä', () => {
  assert.equal(day('alert-fcm.yml').length, 48, 'hälytysajo (FCM) 30 min');
  assert.deepEqual(day('alert-fcm.yml').slice(0, 3), ['00:05', '00:35', '01:05']);
  assert.equal(day('alert-dryrun.yml').length, 0, 'ntfy-kuivaharjoitus poistettu (2026-11-11)');
  assert.ok(!SCHEDULE.some(s => s.wf === 'alert-dryrun.yml'));
  assert.equal(day('camera-status.yml').length, 144, 'kamerat 10 min');
  assert.deepEqual(day('pilvidata-ecmwf.yml'), ['01:15', '07:15', '13:15', '19:15']);
  assert.deepEqual(day('ecmwf-7d.yml'), ['08:25', '20:25']);
  assert.equal(day('wind-icon_eu.yml').length, 8);
  assert.equal(day('pilvidata-harmonie.yml')[0], '02:25');
});

test('välit tasaiset: hälytysajo 30 min, kamerat 10 min', () => {
  const mins = a => a.map(x => +x.slice(0, 2) * 60 + +x.slice(3));
  for(const [wf, iv] of [['alert-fcm.yml', 30], ['camera-status.yml', 10]]){
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
