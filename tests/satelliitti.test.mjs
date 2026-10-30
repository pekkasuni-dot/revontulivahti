import test from 'node:test';
import assert from 'node:assert/strict';
import {geom, latestTime, pickTime, wmsUrl} from '../workers/satelliitti/src/sat.js';

test('latestTime lukee aikaulottuvuuden viimeisen jakson lopun', () => {
  const caps = '<Layer><Name>mtg_fd:ir105_hrfi</Name><Dimension name="time" units="ISO8601">2024-09-23T00:00:00.000Z/2026-10-30T07:50:00.000Z/PT10M</Dimension></Layer>';
  assert.equal(latestTime(caps, 'mtg_fd:ir105_hrfi').toISOString(), '2026-10-30T07:50:00.000Z');
  assert.equal(latestTime(caps, 'muu'), null);
});
test('pickTime: tuorein 10 min jakso, ei tulevaisuudesta', () => {
  const avail = Date.parse('2026-10-30T07:50:00Z');
  assert.equal(pickTime(avail, Date.parse('2026-10-30T08:03:00Z')).toISOString(), '2026-10-30T07:50:00.000Z');
  assert.equal(pickTime(Date.parse('2026-10-30T09:00:00Z'), Date.parse('2026-10-30T08:03:00Z')).toISOString(), '2026-10-30T08:00:00.000Z');
});
test('geom ja wmsUrl vastaavat sovelluksen SAT-asetuksia', () => {
  const g = geom([-2, 54, 42, 72.5], 1100);
  assert.equal(g.width, 1100); assert.equal(g.height, 1070);
  assert.equal(g.bbox.split(',').length, 4);
  const u = wmsUrl('mtg_fd:ir105_hrfi', new Date('2026-10-30T07:50:00Z'), g);
  assert.match(u, /crs=EPSG:3857&bbox=-222639,7170156,4675419,11935769&width=1100&height=\d+&format=image\/png&transparent=true&time=2026-10-30T07:50:00Z$/);
});
