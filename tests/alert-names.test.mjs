// Päätös 61 (18.11.2026): paikan nimi ilmoituksen otsikkoon puhelimessa. Taulu ruutu -> nimet (aurora-core) ja otsikon
// muoto; Androidin AlertMessagingService.titleWithNames käännetään javacilla ja verrataan samoihin tapauksiin.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import C from '../aurora-core.js';

const T = 'Revontulia voi näkyä alueellasi';
const lof = {id: 'p1', name: 'Lofootit', lat: 68.2, lon: 14.4};
const hen = {id: 'p2', name: 'Henningsvær', lat: 68.15, lon: 14.2};
const rei = {id: 'p3', name: 'Reine', lat: 68.06, lon: 14.6};
const kil = {id: 'p4', name: 'Kilpisjärvi', lat: 69.05, lon: 20.79};
const cellOf = p => C.alertCell(p.lat, p.lon).key;

test('taulu: yksi paikka, kaksi samassa ruudussa, oma sijainti ensin, tyhjät pois', () => {
  assert.equal(cellOf(lof), cellOf(hen)); assert.equal(cellOf(lof), cellOf(rei));
  const own = {id: 'own', name: 'Oma sijainti', lat: 68.21, lon: 14.45};
  const tb = C.alertNameTable([own, lof, hen, kil, {id: 'x', name: '', lat: 60, lon: 25}, {id: 'y', name: 'NaN', lat: NaN, lon: 1}]);
  assert.deepEqual(tb, {v: 1, cells: {[cellOf(lof)]: ['Oma sijainti', 'Lofootit', 'Henningsvær'], [cellOf(kil)]: ['Kilpisjärvi']}});
  assert.deepEqual(C.alertNameTable([lof, {...lof, id: 'p9'}]).cells[cellOf(lof)], ['Lofootit'], 'sama nimi kerran');
  assert.deepEqual(C.alertNameTable([]), {v: 1, cells: {}});
});
test('otsikko: yksi, kaksi, yli kaksi, ei nimeä', () => {
  assert.equal(C.alertTitleWithNames(T, ['Lofootit']), 'Lofootit: ' + T);
  assert.equal(C.alertTitleWithNames(T, ['Lofootit', 'Henningsvær']), 'Lofootit, Henningsvær: ' + T);
  assert.equal(C.alertTitleWithNames(T, ['Lofootit', 'Henningsvær', 'Reine']), 'Lofootit + 2: ' + T);
  assert.equal(C.alertTitleWithNames(T, ['Oma sijainti']), 'Oma sijainti: ' + T);
  assert.equal(C.alertTitleWithNames(T, []), T);
  assert.equal(C.alertTitleWithNames(T, null), T);
  assert.equal(C.alertTitleWithNames(T, ['', '  ']), T);
});
test('paikan poisto: ruutu ilman nimiä -> otsikko ennallaan', () => {
  const before = C.alertNameTable([lof, kil]), after = C.alertNameTable([kil]);
  assert.equal(C.alertTitleWithNames(T, before.cells[cellOf(lof)]), 'Lofootit: ' + T);
  assert.equal(C.alertTitleWithNames(T, after.cells[cellOf(lof)]), T);
});

// Android: sama muoto Javassa. Funktio poimitaan lähteestä ja ajetaan pienellä apuluokalla (org.json-osa ei
// käänny ilman Androidia, joten nimien luku testataan sovelluksen puolelta).
test('Android titleWithNames = AuroraCore.alertTitleWithNames', {skip: !hasJavac()}, () => {
  const src = fs.readFileSync(new URL('../android/app/src/main/java/fi/suni/auroraweather/AlertMessagingService.java', import.meta.url), 'utf8');
  const m = src.match(/static String titleWithNames\([\s\S]*?\n    }\n/);
  assert.ok(m, 'titleWithNames löytyy');
  const cases = [[], ['A'], ['A', 'B'], ['A', 'B', 'C'], ['Oma sijainti', 'Ä', 'Ö', 'X']];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rvjava-'));
  const body = 'public class T {\n' + m[0] + '\n public static void main(String[] a){\n' +
    cases.map(c => '  System.out.println(titleWithNames("' + T + '", java.util.Arrays.asList(new String[]{' + c.map(x => '"' + x + '"').join(',') + '})));').join('\n') +
    '\n }\n}\n';
  fs.writeFileSync(path.join(dir, 'T.java'), body);
  execFileSync('javac', ['-encoding', 'UTF-8', 'T.java'], {cwd: dir});
  const out = execFileSync('java', ['-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-cp', dir, 'T'], {encoding: 'utf8'}).trim().split('\n');
  assert.deepEqual(out, cases.map(c => C.alertTitleWithNames(T, c)));
});
function hasJavac(){ try{ execFileSync('javac', ['-version'], {stdio: 'ignore'}); return true; }catch(e){ return false; } }

// Päätös 61 vaihe 2 (iOS): projektitiedoston ja oikeuksien rakenne (ei Macia testiympäristössä, joten Swift tarkistetaan
// lähteestä: sama muoto kuin AuroraCore.alertTitleWithNames, App Group samat tiedostoissa).
test('iOS: NotificationService-laajennus, App Groupit ja tunnisteet', () => {
  const rd = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
  const pbx = rd('ios/App/App.xcodeproj/project.pbxproj');
  assert.match(pbx, /productType = "com\.apple\.product-type\.app-extension"/);
  assert.match(pbx, /Embed Foundation Extensions[\s\S]*?dstSubfolderSpec = 13/);
  for(const [bid, ent, grp] of [
    ['fi.suni.auroraweather.NotificationService', 'NotificationService/NotificationService.entitlements', 'group.fi.suni.auroraweather'],
    ['fi.suni.auroraweather.dev.NotificationService', 'NotificationService/NotificationService-Dev.entitlements', 'group.fi.suni.auroraweather.dev']]){
    const re = new RegExp('CODE_SIGN_ENTITLEMENTS = "' + ent.replace(/[.\/-]/g, m => '\\' + m) + '";[\\s\\S]*?PRODUCT_BUNDLE_IDENTIFIER = ' + bid.replace(/\./g, '\\.') + ';[\\s\\S]*?RV_APP_GROUP = ' + grp.replace(/\./g, '\\.') + ';');
    assert.match(pbx, re, bid);
    assert.ok(rd('ios/App/' + ent).includes('<string>' + grp + '</string>'), ent);
  }
  assert.match(pbx, /CODE_SIGN_ENTITLEMENTS = "App\/App-Dev\.entitlements";\s*RV_APP_GROUP = group\.fi\.suni\.auroraweather\.dev;/);
  assert.equal((pbx.match(/CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;\s*RV_APP_GROUP = group\.fi\.suni\.auroraweather;/g) || []).length, 2);
  assert.ok(rd('ios/App/App/App.entitlements').includes('<string>group.fi.suni.auroraweather</string>'));
  assert.ok(rd('ios/App/App/App-Dev.entitlements').includes('<string>group.fi.suni.auroraweather.dev</string>'));
  for(const pl of ['ios/App/App/Info.plist', 'ios/App/NotificationService/Info.plist']) assert.match(rd(pl), /<key>RVAppGroup<\/key>\s*<string>\$\(RV_APP_GROUP\)<\/string>/, pl);
  assert.match(rd('ios/App/NotificationService/Info.plist'), /com\.apple\.usernotifications\.service/);
  const sw = rd('ios/App/NotificationService/NotificationService.swift');
  assert.ok(sw.includes('names[0] + ", " + names[1]') && sw.includes('names[0] + " + " + String(names.count - 1)') && sw.includes('pre + ": " + title'));
  assert.ok(sw.includes('"rv-alert-names"') && rd('ios/App/App/AlertActionsPlugin.swift').includes('"rv-alert-names"'));
  assert.ok(rd('ios/App/App/AlertActionsPlugin.swift').includes('CAPPluginMethod(name: "setAlertNames"'));
  assert.ok(rd('index.html').includes('ALERT_NAMES_IOS.setAlertNames({json: s})'));
});
