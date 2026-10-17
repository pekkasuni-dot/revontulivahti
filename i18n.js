/* ══════════════════════════════════════════════════════════════
   Revontulivahti — käännökset (2026-10)
   ──────────────────────────────────────────────────────────────
   KAIKKI käyttöliittymän tekstit kielittäin tässä tiedostossa.
   - Avain sama kaikilla kielillä; {nimi} = paikkamerkki (t(avain, {nimi:..})).
   - Puuttuva avain -> englanti -> suomi -> avain itse (ks. t()).
   - Päivämäärät ja kellonajat EIVÄT ole täällä: ne muotoillaan
     Intl-rajapinnalla kielen localen mukaan (LANG_META.locale).
   - Karttojen paikannimet tulevat tiileistä (name:fi / name:en /
     name:zh-Hans / name:es / name:fr), ks. labelTextField() index.html:ssä.
   - Brändinimi "AuroraAwesome" ja mallien nimet (ECMWF, ICON-EU,
     HARMONIE) jätetään kääntämättä.
   Muutos tähän tiedostoon bumppaa version (.githooks/pre-commit).
   ══════════════════════════════════════════════════════════════ */
'use strict';

const LANG_META = {
  fi:        {name: 'Suomi',    locale: 'fi-FI', htmlLang: 'fi',      mapName: ['name:fi']},
  en:        {name: 'English',  locale: 'en-GB', htmlLang: 'en',      mapName: ['name:en']},
  'zh-Hans': {name: '简体中文', locale: 'zh-CN', htmlLang: 'zh-Hans', mapName: ['name:zh-Hans', 'name:zh']},
  es:        {name: 'Español',  locale: 'es-ES', htmlLang: 'es',      mapName: ['name:es']},
  fr:        {name: 'Français', locale: 'fr-FR', htmlLang: 'fr',      mapName: ['name:fr']},
};
const LANG_FALLBACK = 'en';

const I18N = {
  // ────────────────────────────────────────────── suomi
  fi: {
    'meta.desc': 'Näenkö revontulet tästä pisteestä tänä yönä? Revontuliennuste, pilvisyys ja pimeys yhdessä kartassa.',
    'app.loading': 'Haetaan revontuli- ja säätietoja…',
    'app.update': 'Uusi versio saatavilla — päivitä',
    'map.aria': 'Revontulikartta',
    'common.close': 'Sulje',

    'btn.locate': 'Näytä oma sijainti',
    'btn.menu': 'Toimintonapit näkyviin tai piiloon',
    'btn.clouds': 'Pilvikerros päälle tai pois',
    'btn.aurora': 'Revontuliennuste päälle tai pois',
    'btn.mapStyle': 'Karttapohja',
    'btn.mapStyleCur': 'Karttapohja: {name}',
    'btn.cameras': 'Revontulikamerat päälle tai pois',
    'btn.settings': 'Asetukset',

    'menu.mapStyle': 'Karttapohjan valinta',
    'style.general': 'Yleiskartta',
    'style.satellite': 'Satelliittikartta',
    'menu.wind': 'Tuulen korkeus',
    'wind.surface.aria': 'Tuuli pinnalla, {h}',
    'wind.850.aria': 'Tuuli 850 hPa, noin {h}',
    'wind.500.aria': 'Tuuli 500 hPa, noin {h}',
    'wind.300.aria': 'Tuuli 300 hPa, noin {h}',
    'wind.surface.name': 'pinta ({h})', 'wind.850.name': '850 hPa (~{h})',
    'wind.500.name': '500 hPa (~{h})', 'wind.300.name': '300 hPa (~{h})',
    'wind.unavailable': '{model} ei tarjoa tätä korkeutta',
    'wind.loading': 'Haetaan tuulidataa: {level}…',
    'wind.failed': 'Tuulidatan lataus epäonnistui.',
    'menu.aurora': 'Revontulet',
    'aurora.infoBtn': 'Revontulien selite ja tiedot',
    'aurora.infoBtnTitle': 'Tietoa',
    'menu.cameras': 'Kamerat',

    'settings.title': 'Asetukset',
    'settings.language': 'Kieli',
    'settings.haptics': 'Värinäpalaute',
    'settings.buttons': 'Näkyvät napit',
    'btnName.locate': 'Oma sijainti',
    'btnName.aurora': 'Revontulet',
    'btnName.mapStyle': 'Karttapohja',
    'btnName.cameras': 'Kamerat',
    'settings.clock': 'Kellonaika',
    'settings.distance': 'Etäisyydet',

    'cam.all': 'Kaikki kamerat',
    'cam.dialog': 'Revontulikamera',
    'cam.gridDialog': 'Kaikki revontulikamerat',
    'cam.youtube': 'Katso YouTubessa',
    'cam.noPreview': 'Esikatselu ei saatavilla juuri nyt — käytä yllä olevaa YouTube-linkkiä.',
    'cam.credit': 'Pikkukuva ja nimi: YouTube. Ei tallenneta omalle palvelimelle.',
    'cam.othersHeading': 'Esikatselu ei saatavilla:',
    'cam.thumbAlt': '{name} — pikkukuva',
    'cam.notLive': 'Lähetys ei käynnissä',
    'cam.static': 'Ei muutu (kiinteä kuva?)',
    'cam.stale': 'Ei päivity ({age})',
    'time.lt1min': 'alle 1 min',
    'time.min': '{n} min',
    'time.h': '{n} h',

    'slider.aria': 'Ennusteen ajankohta, tunteja tästä hetkestä',
    'time.now': 'Nyt',
    'time.nowAt': 'Nyt · {time}',
    'offset.h': '{sign}{h} h', 'offset.m': '{sign}{m} min', 'offset.hm': '{sign}{h} h {m} min',
    'chip.aurora': 'Revontulet',
    'chip.clouds': 'Pilvisyys',

    'attr.suffix': ' · Revontulet: NOAA SWPC · Pilvet & tuuli: {src}',
    'place.own': 'Oma sijainti',

    'locate.insecure': 'Paikannus vaatii suojatun (https) yhteyden.',
    'locate.unsupported': 'Paikannus ei ole käytettävissä tässä selaimessa.',
    'locate.working': 'Paikannetaan…',
    'locate.err1': 'Sijaintilupa on estetty. iPhone: Asetukset → Tietosuoja ja suojaus → Sijaintipalvelut → Safari-sivustot (tai Brave) → "Kun appia käytetään", ja salli sijainti tälle sivulle selaimen osoiterivin valikosta. Android: osoiterivin lukko-kuvake → Luvat → Sijainti.',
    'locate.err2': 'Sijaintia ei saatu juuri nyt. Varmista että puhelimen sijaintipalvelut ovat päällä ja yritä uudelleen.',
    'locate.err3': 'Paikannus kesti liian kauan. Yritä uudelleen (ulkona GPS löytyy nopeammin) tai tarkista sijaintipalvelut.',

    'aurora.class.vlow': 'Hyvin heikko',
    'aurora.class.low': 'Heikko',
    'aurora.class.mid': 'Kohtalainen',
    'aurora.class.high': 'Hyvä',
    'aurora.info.title': 'Revontulet kartalla',
    'aurora.info.p1': 'Väri kertoo NOAA:n OVATION-mallin todennäköisyyden sille, että revontulia näkyy taivaalla ruudun kohdalla. Alle {min} % jätetään värittämättä; siitä ylöspäin {n} porrasta tasavälein.',
    'aurora.info.p2': 'OVATION on lyhyen aikavälin ennuste noin 30–90 minuutiksi eteenpäin (NOAA SWPC, päivittyy noin 5 minuutin välein). {updated} Sovellus ei jatka sitä pidemmälle: kun siirrät aikajanaa, revontulet näyttävät yhä tämän ennusteen, pilvet valitun hetken.',
    'aurora.times': 'Ennuste klo {until} asti, päivitetty {time}.',

    'flag.clouds': 'Pilvet',
    'flag.aurora': 'Revontulet',
    'flag.auroraNow': 'Revontulet (nyt)',


    'chip.outsideArea': 'Alueen ulkopuolella',
    'note.outsideArea': 'Piste on {model}-mallin alueen ulkopuolella, joten pilvisyyttä ei ole saatavilla.',
    'note.kpEstimate': 'Revontulitodennäköisyys on Kp-ennusteeseen perustuva arvio (OVATION-data ei saatavilla).',

    'clouds.loading': 'Haetaan pilvidataa: {model}…',
    'clouds.failed': 'Pilvimallin "{model}" lataus epäonnistui.',
    'err.maplib': 'Karttakirjaston lataus estyi (CDN ei tavoitettavissa). Näkyvyysindeksi toimii silti: paina paikannusta oikeasta reunasta.',
    'err.ovation': 'Revontulidatan haku epäonnistui (NOAA ei tavoitettavissa). Yritä hetken päästä uudelleen.',
    'err.cloudsFailed': 'Pilvikerroksen haku epäonnistui ({status}) — pistekohtainen sää toimii silti. Yritän uudelleen taustalla.',

    // Infoikkuna, säävalikko, aikajana, avaruussää (2026-10)
    'btn.weather': 'Sää: pilvet ja tuuli',
    'btn.windToggle': 'Tuuli päälle tai pois',
    'btn.info': 'Revontulitilanne: tiedot',
    'menu.weather': 'Sää',
    'btnName.weather': 'Sää',
    'btnName.info': 'Info',
    'settings.model': 'Säämalli',
    'settings.updatedAt': 'Päivitetty {time}',
    'time.backNow': 'Palaa nykyhetkeen',
    'info.ownBtn': 'Oma sijainti',
    'info.tabs': 'Näkymä',
    'info.tab.now': 'Nyt',
    'info.tab.night': 'Tänä yönä',
    'info.tab.week': '7 vrk',
    'info.soon': 'Tulossa',
    'info.index': 'Näkyvyysindeksi',
    'info.loc.point': 'Valittu piste · {coords}',
    'info.loc.own': 'Oma sijainti · {coords}',
    'info.locHelp': 'Paikannus ei ole käytettävissä. Valitse piste napauttamalla karttaa.',
    'info.notice': 'Kartta näyttää klo {time}. Ennuste löytyy Tänä yönä -välilehdeltä.',
    'info.dark.range': 'Pimeää klo {from}–{to}',
    'info.dark.light': 'Vielä valoisaa',
    'info.dark.none': 'ei pimeää seuraavan vuorokauden aikana',
    'info.dark.all': 'Pimeää koko vuorokauden',
    'info.verdict.noloc': 'Valitse piste kartalta tai salli paikannus, niin näet tilanteen juuri siinä.',
    'info.verdict.bright': 'Liian valoisaa: revontulet eivät erotu taivaalta juuri nyt.',
    'info.verdict.good': 'Hyvät mahdollisuudet: aktiivisuutta on ja taivas on riittävän selkeä.',
    'info.verdict.mid': 'Kohtalaiset mahdollisuudet: aktiivisuus tai pilvet rajoittavat näkymistä.',
    'info.verdict.cloudy': 'Pilvet peittävät: aktiivisuutta olisi, mutta pilvet estävät näkymän.',
    'info.verdict.weak': 'Heikot mahdollisuudet: revontuliaktiivisuus on nyt vähäistä täällä.',
    'info.src.ovation': 'Revontulet (NOAA OVATION): {times}',
    'info.src.clouds': 'Pilvet: {model}, nykyhetki.',
    'sw.title': 'Avaruussää',
    'sw.source': 'Lähde: NOAA SWPC (DSCOVR/ACE, OVATION)',
    'sw.kp': 'Kp nyt',
    'sw.speed': 'Nopeus',
    'sw.density': 'Tiheys',
    'sw.power': 'Teho',
    'sw.north': 'pohjoinen',
    'sw.bzSouth': 'etelään',
    'sw.bzNorth': 'pohjoiseen',
    'sw.bzSouthFor': 'etelään {min} min',
    'sw.stale': 'Ei tuoretta dataa (viimeisin mittaus klo {time}).',
    'sw.hint': 'Bz etelään {min} min, aktiivisuus voi kasvaa tunnin sisällä.',
  },

  // ────────────────────────────────────────────── English
  en: {
    'meta.desc': 'Can I see the northern lights from here tonight? Aurora forecast, cloud cover and darkness on one map.',
    'app.loading': 'Loading aurora and weather data…',
    'app.update': 'New version available — update',
    'map.aria': 'Aurora map',
    'common.close': 'Close',

    'btn.locate': 'Show my location',
    'btn.menu': 'Show or hide map tools',
    'btn.clouds': 'Cloud layer on or off',
    'btn.aurora': 'Aurora forecast on or off',
    'btn.mapStyle': 'Base map',
    'btn.mapStyleCur': 'Base map: {name}',
    'btn.cameras': 'Aurora cameras on or off',
    'btn.settings': 'Settings',

    'menu.mapStyle': 'Choose base map',
    'style.general': 'Standard map',
    'style.satellite': 'Satellite map',
    'menu.wind': 'Wind altitude',
    'wind.surface.aria': 'Surface wind, {h}',
    'wind.850.aria': 'Wind at 850 hPa, about {h}',
    'wind.500.aria': 'Wind at 500 hPa, about {h}',
    'wind.300.aria': 'Wind at 300 hPa, about {h}',
    'wind.surface.name': 'surface ({h})', 'wind.850.name': '850 hPa (~{h})',
    'wind.500.name': '500 hPa (~{h})', 'wind.300.name': '300 hPa (~{h})',
    'wind.unavailable': '{model} does not provide this altitude',
    'wind.loading': 'Loading wind data: {level}…',
    'wind.failed': 'Wind data failed to load.',
    'menu.aurora': 'Northern lights',
    'aurora.infoBtn': 'Aurora legend and information',
    'aurora.infoBtnTitle': 'Info',
    'menu.cameras': 'Cameras',

    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.haptics': 'Haptic feedback',
    'settings.buttons': 'Visible buttons',
    'btnName.locate': 'My location',
    'btnName.aurora': 'Northern lights',
    'btnName.mapStyle': 'Base map',
    'btnName.cameras': 'Cameras',
    'settings.clock': 'Time format',
    'settings.distance': 'Distances',

    'cam.all': 'All cameras',
    'cam.dialog': 'Aurora camera',
    'cam.gridDialog': 'All aurora cameras',
    'cam.youtube': 'Watch on YouTube',
    'cam.noPreview': 'Preview not available right now — use the YouTube link above.',
    'cam.credit': 'Thumbnail and name: YouTube. Not stored on our server.',
    'cam.othersHeading': 'Preview not available:',
    'cam.thumbAlt': '{name} — thumbnail',
    'cam.notLive': 'Stream is offline',
    'cam.static': 'Not changing (static image?)',
    'cam.stale': 'Not updating ({age})',
    'time.lt1min': 'under 1 min',
    'time.min': '{n} min',
    'time.h': '{n} h',

    'slider.aria': 'Forecast time, hours from now',
    'time.now': 'Now',
    'time.nowAt': 'Now · {time}',
    'offset.h': '{sign}{h} h', 'offset.m': '{sign}{m} min', 'offset.hm': '{sign}{h} h {m} min',
    'chip.aurora': 'Aurora',
    'chip.clouds': 'Cloud cover',

    'attr.suffix': ' · Aurora: NOAA SWPC · Clouds & wind: {src}',
    'place.own': 'My location',

    'locate.insecure': 'Location requires a secure (https) connection.',
    'locate.unsupported': 'Location is not available in this browser.',
    'locate.working': 'Locating…',
    'locate.err1': 'Location permission is blocked. iPhone: Settings → Privacy & Security → Location Services → Safari Websites (or Brave) → "While Using the App", then allow location for this site from the browser\'s address bar menu. Android: lock icon in the address bar → Permissions → Location.',
    'locate.err2': 'Your location could not be determined right now. Make sure location services are on and try again.',
    'locate.err3': 'Locating took too long. Try again (GPS works faster outdoors) or check location services.',

    'aurora.class.vlow': 'Very low',
    'aurora.class.low': 'Low',
    'aurora.class.mid': 'Moderate',
    'aurora.class.high': 'Good',
    'aurora.info.title': 'Northern lights on the map',
    'aurora.info.p1': 'The colour shows the probability from NOAA\'s OVATION model that the northern lights are visible in the sky over that grid cell. Below {min} % is left uncoloured; above that there are {n} evenly spaced steps.',
    'aurora.info.p2': 'OVATION is a short-term forecast about 30–90 minutes ahead (NOAA SWPC, updated about every 5 minutes). {updated} The app does not extend it further: when you move the timeline, the northern lights keep showing this forecast while clouds show the selected time.',
    'aurora.times': 'Forecast until {until}, updated {time}.',

    'flag.clouds': 'Clouds',
    'flag.aurora': 'Aurora',
    'flag.auroraNow': 'Aurora (now)',


    'chip.outsideArea': 'Outside area',
    'note.outsideArea': 'This point is outside the {model} model area, so no cloud cover is available.',
    'note.kpEstimate': 'Aurora probability is an estimate based on the Kp forecast (OVATION data not available).',

    'clouds.loading': 'Loading cloud data: {model}…',
    'clouds.failed': 'Weather model "{model}" failed to load.',
    'err.maplib': 'The map library could not be loaded (CDN unreachable). The visibility index still works: press the location button on the right.',
    'err.ovation': 'Aurora data could not be loaded (NOAA unreachable). Please try again shortly.',
    'err.cloudsFailed': 'Cloud layer failed to load ({status}) — point weather still works. Retrying in the background.',

    // Infoikkuna, säävalikko, aikajana, avaruussää (2026-10)
    'btn.weather': 'Weather: clouds and wind',
    'btn.windToggle': 'Wind on or off',
    'btn.info': 'Aurora conditions: details',
    'menu.weather': 'Weather',
    'btnName.weather': 'Weather',
    'btnName.info': 'Info',
    'settings.model': 'Weather model',
    'settings.updatedAt': 'Updated {time}',
    'time.backNow': 'Back to now',
    'info.ownBtn': 'My location',
    'info.tabs': 'View',
    'info.tab.now': 'Now',
    'info.tab.night': 'Tonight',
    'info.tab.week': '7 days',
    'info.soon': 'Coming soon',
    'info.index': 'Visibility index',
    'info.loc.point': 'Selected point · {coords}',
    'info.loc.own': 'My location · {coords}',
    'info.locHelp': 'Location is not available. Pick a point by tapping the map.',
    'info.notice': 'The map shows {time}. The forecast is on the Tonight tab.',
    'info.dark.range': 'Dark {from}–{to}',
    'info.dark.light': 'Still light',
    'info.dark.none': 'no darkness in the next 24 hours',
    'info.dark.all': 'Dark all day',
    'info.verdict.noloc': 'Pick a point on the map or allow location to see the conditions there.',
    'info.verdict.bright': 'Too bright: the northern lights cannot be seen right now.',
    'info.verdict.good': 'Good chances: there is activity and the sky is clear enough.',
    'info.verdict.mid': 'Moderate chances: activity or clouds are limiting visibility.',
    'info.verdict.cloudy': 'Clouds in the way: there is activity, but clouds block the view.',
    'info.verdict.weak': 'Low chances: aurora activity is low here right now.',
    'info.src.ovation': 'Northern lights (NOAA OVATION): {times}',
    'info.src.clouds': 'Clouds: {model}, current time.',
    'sw.title': 'Space weather',
    'sw.source': 'Source: NOAA SWPC (DSCOVR/ACE, OVATION)',
    'sw.kp': 'Kp now',
    'sw.speed': 'Speed',
    'sw.density': 'Density',
    'sw.power': 'Power',
    'sw.north': 'northern',
    'sw.bzSouth': 'southward',
    'sw.bzNorth': 'northward',
    'sw.bzSouthFor': 'southward {min} min',
    'sw.stale': 'No recent data (latest measurement {time}).',
    'sw.hint': 'Bz southward for {min} min, activity may increase within an hour.',
  },

  // ────────────────────────────────────────────── 简体中文
  // HUOM: KIINANKIELISET KÄÄNNÖKSET OVAT TARKISTAMATTOMIA (konekäännöstasoa).
  // Tarkistetaan erikseen ennen kuin niihin luotetaan - älä poista tätä
  // merkintää ennen tarkistusta.
  'zh-Hans': {
    'meta.desc': '今晚能在这里看到极光吗？极光预报、云量和天空暗度汇集在一张地图上。',   // TARKISTAMATON
    'app.loading': '正在加载极光和天气数据…',   // TARKISTAMATON
    'app.update': '有新版本可用 — 点击更新',   // TARKISTAMATON
    'map.aria': '极光地图',   // TARKISTAMATON
    'common.close': '关闭',   // TARKISTAMATON

    'btn.locate': '显示我的位置',   // TARKISTAMATON
    'btn.menu': '显示或隐藏地图工具',   // TARKISTAMATON
    'btn.clouds': '开启或关闭云层',   // TARKISTAMATON
    'btn.aurora': '开启或关闭极光预报',   // TARKISTAMATON
    'btn.mapStyle': '底图',   // TARKISTAMATON
    'btn.mapStyleCur': '底图：{name}',   // TARKISTAMATON
    'btn.cameras': '开启或关闭极光摄像头',   // TARKISTAMATON
    'btn.settings': '设置',   // TARKISTAMATON

    'menu.mapStyle': '选择底图',   // TARKISTAMATON
    'style.general': '标准地图',   // TARKISTAMATON
    'style.satellite': '卫星地图',   // TARKISTAMATON
    'menu.wind': '风的高度',   // TARKISTAMATON
    'wind.surface.aria': '地面风，{h}',   // TARKISTAMATON
    'wind.850.aria': '850 百帕风，约 {h}',   // TARKISTAMATON
    'wind.500.aria': '500 百帕风，约 {h}',   // TARKISTAMATON
    'wind.300.aria': '300 百帕风，约 {h}',   // TARKISTAMATON
    'wind.surface.name': '地面（{h}）', 'wind.850.name': '850 百帕（约 {h}）',   // TARKISTAMATON
    'wind.500.name': '500 百帕（约 {h}）', 'wind.300.name': '300 百帕（约 {h}）',   // TARKISTAMATON
    'wind.unavailable': '{model} 不提供此高度',   // TARKISTAMATON
    'wind.loading': '正在加载风数据：{level}…',   // TARKISTAMATON
    'wind.failed': '风数据加载失败。',   // TARKISTAMATON
    'menu.aurora': '极光',   // TARKISTAMATON
    'aurora.infoBtn': '极光图例和说明',   // TARKISTAMATON
    'aurora.infoBtnTitle': '说明',   // TARKISTAMATON
    'menu.cameras': '摄像头',   // TARKISTAMATON

    'settings.title': '设置',   // TARKISTAMATON
    'settings.language': '语言',   // TARKISTAMATON
    'settings.haptics': '振动反馈',   // TARKISTAMATON
    'settings.buttons': '显示的按钮',   // TARKISTAMATON
    'btnName.locate': '我的位置',   // TARKISTAMATON
    'btnName.aurora': '极光',   // TARKISTAMATON
    'btnName.mapStyle': '底图',   // TARKISTAMATON
    'btnName.cameras': '摄像头',   // TARKISTAMATON
    'settings.clock': '时间格式',   // TARKISTAMATON
    'settings.distance': '距离单位',   // TARKISTAMATON

    'cam.all': '所有摄像头',   // TARKISTAMATON
    'cam.dialog': '极光摄像头',   // TARKISTAMATON
    'cam.gridDialog': '所有极光摄像头',   // TARKISTAMATON
    'cam.youtube': '在 YouTube 上观看',   // TARKISTAMATON
    'cam.noPreview': '暂时无法预览 — 请使用上方的 YouTube 链接。',   // TARKISTAMATON
    'cam.credit': '缩略图和名称：YouTube。不会保存到我们的服务器。',   // TARKISTAMATON
    'cam.othersHeading': '无法预览：',   // TARKISTAMATON
    'cam.thumbAlt': '{name} — 缩略图',   // TARKISTAMATON
    'cam.notLive': '直播未进行',   // TARKISTAMATON
    'cam.static': '画面不变（静态图片？）',   // TARKISTAMATON
    'cam.stale': '未更新（{age}）',   // TARKISTAMATON
    'time.lt1min': '不到 1 分钟',   // TARKISTAMATON
    'time.min': '{n} 分钟',   // TARKISTAMATON
    'time.h': '{n} 小时',   // TARKISTAMATON

    'slider.aria': '预报时间（距现在的小时数）',   // TARKISTAMATON
    'time.now': '现在',   // TARKISTAMATON
    'time.nowAt': '现在 · {time}',   // TARKISTAMATON
    'offset.h': '{sign}{h} 小时', 'offset.m': '{sign}{m} 分钟', 'offset.hm': '{sign}{h} 小时 {m} 分钟',   // TARKISTAMATON
    'chip.aurora': '极光',   // TARKISTAMATON
    'chip.clouds': '云量',   // TARKISTAMATON

    'attr.suffix': ' · 极光：NOAA SWPC · 云和风：{src}',   // TARKISTAMATON
    'place.own': '我的位置',   // TARKISTAMATON

    'locate.insecure': '定位需要安全（https）连接。',   // TARKISTAMATON
    'locate.unsupported': '此浏览器不支持定位。',   // TARKISTAMATON
    'locate.working': '正在定位…',   // TARKISTAMATON
    'locate.err1': '定位权限已被阻止。iPhone：设置 → 隐私与安全性 → 定位服务 → Safari 网站（或 Brave）→“使用 App 期间”，然后在浏览器地址栏菜单中允许此网站使用位置。Android：地址栏中的锁形图标 → 权限 → 位置。',   // TARKISTAMATON
    'locate.err2': '暂时无法获取您的位置。请确认已开启定位服务后重试。',   // TARKISTAMATON
    'locate.err3': '定位时间过长。请重试（在室外 GPS 更快）或检查定位服务。',   // TARKISTAMATON

    'aurora.class.vlow': '很低',   // TARKISTAMATON
    'aurora.class.low': '低',   // TARKISTAMATON
    'aurora.class.mid': '中等',   // TARKISTAMATON
    'aurora.class.high': '良好',   // TARKISTAMATON
    'aurora.info.title': '地图上的极光',   // TARKISTAMATON
    'aurora.info.p1': '颜色表示 NOAA OVATION 模型给出的该网格上空可见极光的概率。低于 {min}% 不着色；以上分为 {n} 个等间距色阶。',   // TARKISTAMATON
    'aurora.info.p2': 'OVATION 是约 30–90 分钟的短期预报（NOAA SWPC，约每 5 分钟更新一次）。{updated}本应用不会进一步外推：移动时间轴时，极光仍显示此预报，云层则显示所选时间。',   // TARKISTAMATON
    'aurora.times': '预报至 {until}，更新于 {time}。',   // TARKISTAMATON

    'flag.clouds': '云量',   // TARKISTAMATON
    'flag.aurora': '极光',   // TARKISTAMATON
    'flag.auroraNow': '极光（当前）',   // TARKISTAMATON


    'chip.outsideArea': '超出范围',   // TARKISTAMATON
    'note.outsideArea': '该点位于 {model} 模型范围之外，无云量数据。',   // TARKISTAMATON
    'note.kpEstimate': '极光概率为基于 Kp 预报的估算（OVATION 数据不可用）。',   // TARKISTAMATON

    'clouds.loading': '正在加载云数据：{model}…',   // TARKISTAMATON
    'clouds.failed': '天气模型“{model}”加载失败。',   // TARKISTAMATON
    'err.maplib': '无法加载地图库（CDN 无法访问）。可见度指数仍可使用：请按右侧的定位按钮。',   // TARKISTAMATON
    'err.ovation': '无法获取极光数据（NOAA 无法访问）。请稍后再试。',   // TARKISTAMATON
    'err.cloudsFailed': '云层加载失败（{status}）— 单点天气仍可使用。正在后台重试。',   // TARKISTAMATON

    // Infoikkuna, säävalikko, aikajana, avaruussää (2026-10)
    'btn.weather': '天气：云层和风',   // TARKISTAMATON
    'btn.windToggle': '开启或关闭风',   // TARKISTAMATON
    'btn.info': '极光状况：详情',   // TARKISTAMATON
    'menu.weather': '天气',   // TARKISTAMATON
    'btnName.weather': '天气',   // TARKISTAMATON
    'btnName.info': '信息',   // TARKISTAMATON
    'settings.model': '天气模型',   // TARKISTAMATON
    'settings.updatedAt': '更新于 {time}',   // TARKISTAMATON
    'time.backNow': '返回现在',   // TARKISTAMATON
    'info.ownBtn': '我的位置',   // TARKISTAMATON
    'info.tabs': '视图',   // TARKISTAMATON
    'info.tab.now': '现在',   // TARKISTAMATON
    'info.tab.night': '今晚',   // TARKISTAMATON
    'info.tab.week': '7 天',   // TARKISTAMATON
    'info.soon': '即将推出',   // TARKISTAMATON
    'info.index': '可见度指数',   // TARKISTAMATON
    'info.loc.point': '所选地点 · {coords}',   // TARKISTAMATON
    'info.loc.own': '我的位置 · {coords}',   // TARKISTAMATON
    'info.locHelp': '无法定位。请点击地图选择地点。',   // TARKISTAMATON
    'info.notice': '地图显示 {time}。预报见“今晚”标签页。',   // TARKISTAMATON
    'info.dark.range': '天黑时段 {from}–{to}',   // TARKISTAMATON
    'info.dark.light': '天色尚亮',   // TARKISTAMATON
    'info.dark.none': '未来 24 小时内无黑夜',   // TARKISTAMATON
    'info.dark.all': '全天黑暗',   // TARKISTAMATON
    'info.verdict.noloc': '在地图上选择地点或允许定位，即可查看该处的情况。',   // TARKISTAMATON
    'info.verdict.bright': '天太亮：现在无法看到极光。',   // TARKISTAMATON
    'info.verdict.good': '机会很好：有极光活动，天空也足够晴朗。',   // TARKISTAMATON
    'info.verdict.mid': '机会一般：活动强度或云层限制了可见度。',   // TARKISTAMATON
    'info.verdict.cloudy': '云层遮挡：有极光活动，但云层挡住了视线。',   // TARKISTAMATON
    'info.verdict.weak': '机会较低：此处目前极光活动较弱。',   // TARKISTAMATON
    'info.src.ovation': '极光（NOAA OVATION）：{times}',   // TARKISTAMATON
    'info.src.clouds': '云层：{model}，当前时刻。',   // TARKISTAMATON
    'sw.title': '空间天气',   // TARKISTAMATON
    'sw.source': '来源：NOAA SWPC（DSCOVR/ACE、OVATION）',   // TARKISTAMATON
    'sw.kp': '当前 Kp',   // TARKISTAMATON
    'sw.speed': '速度',   // TARKISTAMATON
    'sw.density': '密度',   // TARKISTAMATON
    'sw.power': '功率',   // TARKISTAMATON
    'sw.north': '北半球',   // TARKISTAMATON
    'sw.bzSouth': '向南',   // TARKISTAMATON
    'sw.bzNorth': '向北',   // TARKISTAMATON
    'sw.bzSouthFor': '向南 {min} 分钟',   // TARKISTAMATON
    'sw.stale': '无最新数据（最近测量 {time}）。',   // TARKISTAMATON
    'sw.hint': 'Bz 已向南 {min} 分钟，一小时内活动可能增强。',   // TARKISTAMATON
  },

  // Espanja (2026-10). Epävarmat sävyt/termit merkitty "// TARKISTA",
  // lista MUISTIO-kielet.md:ssä.
  es: {
    'meta.desc': '¿Puedo ver la aurora boreal desde aquí esta noche? Previsión de auroras, nubosidad y oscuridad en un solo mapa.',
    'app.loading': 'Cargando datos de auroras y del tiempo…',
    'app.update': 'Nueva versión disponible — actualizar',
    'map.aria': 'Mapa de auroras',
    'common.close': 'Cerrar',

    'btn.locate': 'Mostrar mi ubicación',
    'btn.menu': 'Mostrar u ocultar los botones del mapa',
    'btn.clouds': 'Activar o desactivar la capa de nubes',
    'btn.aurora': 'Activar o desactivar la previsión de auroras',
    'btn.mapStyle': 'Mapa base',
    'btn.mapStyleCur': 'Mapa base: {name}',
    'btn.cameras': 'Activar o desactivar las cámaras de auroras',
    'btn.settings': 'Ajustes',

    'menu.mapStyle': 'Elegir mapa base',
    'style.general': 'Mapa general',
    'style.satellite': 'Mapa de satélite',
    'menu.wind': 'Altitud del viento',
    'wind.surface.aria': 'Viento en superficie, {h}',
    'wind.850.aria': 'Viento a 850 hPa, unos {h}',
    'wind.500.aria': 'Viento a 500 hPa, unos {h}',
    'wind.300.aria': 'Viento a 300 hPa, unos {h}',
    'wind.surface.name': 'superficie ({h})', 'wind.850.name': '850 hPa (~{h})',
    'wind.500.name': '500 hPa (~{h})', 'wind.300.name': '300 hPa (~{h})',
    'wind.unavailable': '{model} no ofrece esta altitud',
    'wind.loading': 'Cargando datos de viento: {level}…',
    'wind.failed': 'No se pudieron cargar los datos de viento.',
    'menu.aurora': 'Auroras',
    'aurora.infoBtn': 'Leyenda e información de auroras',
    'aurora.infoBtnTitle': 'Información',
    'menu.cameras': 'Cámaras',

    'settings.title': 'Ajustes',
    'settings.language': 'Idioma',
    'settings.haptics': 'Vibración',   // TARKISTA
    'settings.buttons': 'Botones visibles',
    'btnName.locate': 'Mi ubicación',
    'btnName.aurora': 'Auroras',
    'btnName.mapStyle': 'Mapa base',
    'btnName.cameras': 'Cámaras',
    'settings.clock': 'Formato de hora',
    'settings.distance': 'Distancias',

    'cam.all': 'Todas las cámaras',
    'cam.dialog': 'Cámara de auroras',
    'cam.gridDialog': 'Todas las cámaras de auroras',
    'cam.youtube': 'Ver en YouTube',
    'cam.noPreview': 'Vista previa no disponible en este momento: usa el enlace de YouTube de arriba.',
    'cam.credit': 'Miniatura y nombre: YouTube. No se guardan en nuestro servidor.',
    'cam.othersHeading': 'Vista previa no disponible:',
    'cam.thumbAlt': '{name} — miniatura',
    'cam.notLive': 'La emisión no está en directo',
    'cam.static': 'No cambia (¿imagen fija?)',
    'cam.stale': 'No se actualiza ({age})',
    'time.lt1min': 'menos de 1 min',
    'time.min': '{n} min',
    'time.h': '{n} h',

    'slider.aria': 'Hora de la previsión, horas desde ahora',
    'time.now': 'Ahora',
    'time.nowAt': 'Ahora · {time}',
    'offset.h': '{sign}{h} h', 'offset.m': '{sign}{m} min', 'offset.hm': '{sign}{h} h {m} min',
    'chip.aurora': 'Auroras',
    'chip.clouds': 'Nubosidad',

    'attr.suffix': ' · Auroras: NOAA SWPC · Nubes y viento: {src}',
    'place.own': 'Mi ubicación',

    'locate.insecure': 'La ubicación requiere una conexión segura (https).',
    'locate.unsupported': 'La ubicación no está disponible en este navegador.',
    'locate.working': 'Buscando tu ubicación…',
    'locate.err1': 'El permiso de ubicación está bloqueado. iPhone: Ajustes → Privacidad y seguridad → Localización → Sitios web de Safari (o Brave) → «Cuando se use la app»; después permite la ubicación para este sitio desde el menú de la barra de direcciones. Android: icono del candado en la barra de direcciones → Permisos → Ubicación.',   // TARKISTA
    'locate.err2': 'No se ha podido determinar tu ubicación. Comprueba que la localización está activada e inténtalo de nuevo.',
    'locate.err3': 'La búsqueda de ubicación tardó demasiado. Inténtalo de nuevo (el GPS funciona mejor al aire libre) o revisa la localización.',

    'aurora.class.vlow': 'Muy baja',
    'aurora.class.low': 'Baja',
    'aurora.class.mid': 'Moderada',
    'aurora.class.high': 'Buena',
    'aurora.info.title': 'Auroras en el mapa',
    'aurora.info.p1': 'El color indica la probabilidad, según el modelo OVATION de la NOAA, de que la aurora sea visible en el cielo sobre esa celda. Por debajo del {min} % no se colorea; por encima hay {n} niveles a intervalos iguales.',
    'aurora.info.p2': 'OVATION es una previsión a corto plazo de unos 30–90 minutos (NOAA SWPC, se actualiza cada 5 minutos aproximadamente). {updated} La aplicación no la extiende más allá: al mover la línea de tiempo, las auroras siguen mostrando esta previsión y las nubes, la hora seleccionada.',
    'aurora.times': 'Previsión hasta las {until}, actualizada a las {time}.',   // TARKISTA

    'flag.clouds': 'Nubes',
    'flag.aurora': 'Auroras',
    'flag.auroraNow': 'Auroras (ahora)',


    'chip.outsideArea': 'Fuera del área',
    'note.outsideArea': 'Este punto está fuera del área del modelo {model}, así que no hay datos de nubosidad.',
    'note.kpEstimate': 'La probabilidad de aurora es una estimación basada en la previsión del índice Kp (datos de OVATION no disponibles).',

    'clouds.loading': 'Cargando datos de nubes: {model}…',
    'clouds.failed': 'No se pudo cargar el modelo meteorológico «{model}».',
    'err.maplib': 'No se pudo cargar la biblioteca del mapa (CDN inaccesible). El índice de visibilidad sigue funcionando: pulsa el botón de ubicación de la derecha.',
    'err.ovation': 'No se pudieron cargar los datos de auroras (NOAA inaccesible). Inténtalo de nuevo en un momento.',
    'err.cloudsFailed': 'No se pudo cargar la capa de nubes ({status}): el tiempo en el punto sigue funcionando. Reintentando en segundo plano.',

    // Infoikkuna, säävalikko, aikajana, avaruussää (2026-10)
    'btn.weather': 'Tiempo: nubes y viento',   // TARKISTA
    'btn.windToggle': 'Activar o desactivar el viento',   // TARKISTA
    'btn.info': 'Condiciones de auroras: detalles',   // TARKISTA
    'menu.weather': 'Tiempo',   // TARKISTA
    'btnName.weather': 'Tiempo',   // TARKISTA
    'btnName.info': 'Info',   // TARKISTA
    'settings.model': 'Modelo meteorológico',   // TARKISTA
    'settings.updatedAt': 'Actualizado {time}',   // TARKISTA
    'time.backNow': 'Volver a ahora',   // TARKISTA
    'info.ownBtn': 'Mi ubicación',   // TARKISTA
    'info.tabs': 'Vista',   // TARKISTA
    'info.tab.now': 'Ahora',   // TARKISTA
    'info.tab.night': 'Esta noche',   // TARKISTA
    'info.tab.week': '7 días',   // TARKISTA
    'info.soon': 'Próximamente',   // TARKISTA
    'info.index': 'Índice de visibilidad',   // TARKISTA
    'info.loc.point': 'Punto seleccionado · {coords}',   // TARKISTA
    'info.loc.own': 'Mi ubicación · {coords}',   // TARKISTA
    'info.locHelp': 'La ubicación no está disponible. Elige un punto tocando el mapa.',   // TARKISTA
    'info.notice': 'El mapa muestra las {time}. La previsión está en la pestaña Esta noche.',   // TARKISTA
    'info.dark.range': 'Oscuro de {from} a {to}',   // TARKISTA
    'info.dark.light': 'Todavía hay luz',   // TARKISTA
    'info.dark.none': 'sin oscuridad en las próximas 24 horas',   // TARKISTA
    'info.dark.all': 'Oscuro todo el día',   // TARKISTA
    'info.verdict.noloc': 'Elige un punto en el mapa o permite la ubicación para ver las condiciones allí.',   // TARKISTA
    'info.verdict.bright': 'Demasiada luz: ahora no se pueden ver las auroras.',   // TARKISTA
    'info.verdict.good': 'Buenas probabilidades: hay actividad y el cielo está bastante despejado.',   // TARKISTA
    'info.verdict.mid': 'Probabilidades moderadas: la actividad o las nubes limitan la visibilidad.',   // TARKISTA
    'info.verdict.cloudy': 'Nubes en medio: hay actividad, pero las nubes tapan la vista.',   // TARKISTA
    'info.verdict.weak': 'Probabilidades bajas: la actividad auroral es baja aquí ahora.',   // TARKISTA
    'info.src.ovation': 'Auroras (NOAA OVATION): {times}',   // TARKISTA
    'info.src.clouds': 'Nubes: {model}, momento actual.',   // TARKISTA
    'sw.title': 'Clima espacial',   // TARKISTA
    'sw.source': 'Fuente: NOAA SWPC (DSCOVR/ACE, OVATION)',   // TARKISTA
    'sw.kp': 'Kp ahora',   // TARKISTA
    'sw.speed': 'Velocidad',   // TARKISTA
    'sw.density': 'Densidad',   // TARKISTA
    'sw.power': 'Potencia',   // TARKISTA
    'sw.north': 'norte',   // TARKISTA
    'sw.bzSouth': 'hacia el sur',   // TARKISTA
    'sw.bzNorth': 'hacia el norte',   // TARKISTA
    'sw.bzSouthFor': 'hacia el sur {min} min',   // TARKISTA
    'sw.stale': 'Sin datos recientes (última medición {time}).',   // TARKISTA
    'sw.hint': 'Bz hacia el sur desde hace {min} min, la actividad puede aumentar en menos de una hora.',   // TARKISTA
  },

  // Ranska (2026-10). Epävarmat sävyt/termit merkitty "// TARKISTA",
  // lista MUISTIO-kielet.md:ssä.
  fr: {
    'meta.desc': 'Puis-je voir des aurores boréales d\'ici ce soir ? Prévision des aurores, nébulosité et obscurité sur une seule carte.',
    'app.loading': 'Chargement des données d\'aurores et météo…',
    'app.update': 'Nouvelle version disponible — mettre à jour',
    'map.aria': 'Carte des aurores',
    'common.close': 'Fermer',

    'btn.locate': 'Afficher ma position',
    'btn.menu': 'Afficher ou masquer les boutons de la carte',
    'btn.clouds': 'Activer ou désactiver la couche nuageuse',
    'btn.aurora': 'Activer ou désactiver la prévision des aurores',
    'btn.mapStyle': 'Fond de carte',
    'btn.mapStyleCur': 'Fond de carte : {name}',
    'btn.cameras': 'Activer ou désactiver les caméras d\'aurores',
    'btn.settings': 'Réglages',

    'menu.mapStyle': 'Choisir le fond de carte',
    'style.general': 'Carte générale',
    'style.satellite': 'Carte satellite',
    'menu.wind': 'Altitude du vent',
    'wind.surface.aria': 'Vent en surface, {h}',
    'wind.850.aria': 'Vent à 850 hPa, environ {h}',
    'wind.500.aria': 'Vent à 500 hPa, environ {h}',
    'wind.300.aria': 'Vent à 300 hPa, environ {h}',
    'wind.surface.name': 'surface ({h})', 'wind.850.name': '850 hPa (~{h})',
    'wind.500.name': '500 hPa (~{h})', 'wind.300.name': '300 hPa (~{h})',
    'wind.unavailable': '{model} ne fournit pas cette altitude',
    'wind.loading': 'Chargement des données de vent : {level}…',
    'wind.failed': 'Échec du chargement des données de vent.',
    'menu.aurora': 'Aurores boréales',
    'aurora.infoBtn': 'Légende et informations sur les aurores',
    'aurora.infoBtnTitle': 'Infos',
    'menu.cameras': 'Caméras',

    'settings.title': 'Réglages',
    'settings.language': 'Langue',
    'settings.haptics': 'Retour haptique',   // TARKISTA
    'settings.buttons': 'Boutons visibles',
    'btnName.locate': 'Ma position',
    'btnName.aurora': 'Aurores boréales',
    'btnName.mapStyle': 'Fond de carte',
    'btnName.cameras': 'Caméras',
    'settings.clock': 'Format de l\'heure',
    'settings.distance': 'Distances',

    'cam.all': 'Toutes les caméras',
    'cam.dialog': 'Caméra d\'aurores',
    'cam.gridDialog': 'Toutes les caméras d\'aurores',
    'cam.youtube': 'Regarder sur YouTube',
    'cam.noPreview': 'Aperçu indisponible pour le moment — utilisez le lien YouTube ci-dessus.',
    'cam.credit': 'Miniature et nom : YouTube. Non enregistrés sur notre serveur.',
    'cam.othersHeading': 'Aperçu indisponible :',
    'cam.thumbAlt': '{name} — miniature',
    'cam.notLive': 'Le direct est interrompu',   // TARKISTA
    'cam.static': 'Ne change pas (image fixe ?)',
    'cam.stale': 'Pas de mise à jour ({age})',
    'time.lt1min': 'moins d\'1 min',
    'time.min': '{n} min',
    'time.h': '{n} h',

    'slider.aria': 'Heure de la prévision, heures à partir de maintenant',
    'time.now': 'Maintenant',
    'time.nowAt': 'Maintenant · {time}',
    'offset.h': '{sign}{h} h', 'offset.m': '{sign}{m} min', 'offset.hm': '{sign}{h} h {m} min',
    'chip.aurora': 'Aurores',
    'chip.clouds': 'Nébulosité',

    'attr.suffix': ' · Aurores : NOAA SWPC · Nuages et vent : {src}',
    'place.own': 'Ma position',

    'locate.insecure': 'La localisation nécessite une connexion sécurisée (https).',
    'locate.unsupported': 'La localisation n\'est pas disponible dans ce navigateur.',
    'locate.working': 'Localisation en cours…',
    'locate.err1': 'L\'autorisation de localisation est bloquée. iPhone : Réglages → Confidentialité et sécurité → Service de localisation → Sites web Safari (ou Brave) → « Lorsque l\'app est active », puis autorisez la localisation pour ce site depuis le menu de la barre d\'adresse. Android : icône du cadenas dans la barre d\'adresse → Autorisations → Position.',   // TARKISTA
    'locate.err2': 'Impossible de déterminer votre position pour le moment. Vérifiez que la localisation est activée et réessayez.',
    'locate.err3': 'La localisation a pris trop de temps. Réessayez (le GPS est plus rapide en extérieur) ou vérifiez la localisation.',

    'aurora.class.vlow': 'Très faible',
    'aurora.class.low': 'Faible',
    'aurora.class.mid': 'Modérée',
    'aurora.class.high': 'Bonne',
    'aurora.info.title': 'Aurores boréales sur la carte',
    'aurora.info.p1': 'La couleur indique la probabilité, selon le modèle OVATION de la NOAA, que des aurores soient visibles dans le ciel au-dessus de cette case. En dessous de {min} %, rien n\'est coloré ; au-dessus, {n} paliers réguliers.',
    'aurora.info.p2': 'OVATION est une prévision à court terme d\'environ 30 à 90 minutes (NOAA SWPC, mise à jour toutes les 5 minutes environ). {updated} L\'application ne la prolonge pas : lorsque vous déplacez la chronologie, les aurores affichent toujours cette prévision et les nuages l\'heure choisie.',
    'aurora.times': 'Prévision jusqu\'à {until}, mise à jour à {time}.',

    'flag.clouds': 'Nuages',
    'flag.aurora': 'Aurores',
    'flag.auroraNow': 'Aurores (maintenant)',


    'chip.outsideArea': 'Hors zone',
    'note.outsideArea': 'Ce point est en dehors de la zone du modèle {model} : aucune donnée de nébulosité.',
    'note.kpEstimate': 'La probabilité d\'aurores est une estimation fondée sur la prévision de l\'indice Kp (données OVATION indisponibles).',

    'clouds.loading': 'Chargement des données nuageuses : {model}…',
    'clouds.failed': 'Échec du chargement du modèle météo « {model} ».',
    'err.maplib': 'Impossible de charger la bibliothèque de carte (CDN inaccessible). L\'indice de visibilité fonctionne toujours : appuyez sur le bouton de position à droite.',
    'err.ovation': 'Impossible de charger les données d\'aurores (NOAA inaccessible). Réessayez dans un instant.',
    'err.cloudsFailed': 'Échec du chargement de la couche nuageuse ({status}) — la météo du point fonctionne toujours. Nouvel essai en arrière-plan.',

    // Infoikkuna, säävalikko, aikajana, avaruussää (2026-10)
    'btn.weather': 'Météo : nuages et vent',   // TARKISTA
    'btn.windToggle': 'Activer ou désactiver le vent',   // TARKISTA
    'btn.info': 'Conditions d’aurores : détails',   // TARKISTA
    'menu.weather': 'Météo',   // TARKISTA
    'btnName.weather': 'Météo',   // TARKISTA
    'btnName.info': 'Info',   // TARKISTA
    'settings.model': 'Modèle météo',   // TARKISTA
    'settings.updatedAt': 'Mis à jour {time}',   // TARKISTA
    'time.backNow': 'Revenir à maintenant',   // TARKISTA
    'info.ownBtn': 'Ma position',   // TARKISTA
    'info.tabs': 'Vue',   // TARKISTA
    'info.tab.now': 'Maintenant',   // TARKISTA
    'info.tab.night': 'Cette nuit',   // TARKISTA
    'info.tab.week': '7 jours',   // TARKISTA
    'info.soon': 'Bientôt',   // TARKISTA
    'info.index': 'Indice de visibilité',   // TARKISTA
    'info.loc.point': 'Point sélectionné · {coords}',   // TARKISTA
    'info.loc.own': 'Ma position · {coords}',   // TARKISTA
    'info.locHelp': 'La localisation n’est pas disponible. Choisissez un point en touchant la carte.',   // TARKISTA
    'info.notice': 'La carte montre {time}. La prévision se trouve dans l’onglet Cette nuit.',   // TARKISTA
    'info.dark.range': 'Nuit de {from} à {to}',   // TARKISTA
    'info.dark.light': 'Encore clair',   // TARKISTA
    'info.dark.none': 'pas d’obscurité dans les prochaines 24 heures',   // TARKISTA
    'info.dark.all': 'Nuit toute la journée',   // TARKISTA
    'info.verdict.noloc': 'Choisissez un point sur la carte ou autorisez la localisation pour voir les conditions sur place.',   // TARKISTA
    'info.verdict.bright': 'Trop clair : les aurores ne sont pas visibles en ce moment.',   // TARKISTA
    'info.verdict.good': 'Bonnes chances : il y a de l’activité et le ciel est assez dégagé.',   // TARKISTA
    'info.verdict.mid': 'Chances moyennes : l’activité ou les nuages limitent la visibilité.',   // TARKISTA
    'info.verdict.cloudy': 'Nuages gênants : il y a de l’activité, mais les nuages bouchent la vue.',   // TARKISTA
    'info.verdict.weak': 'Faibles chances : l’activité aurorale est faible ici en ce moment.',   // TARKISTA
    'info.src.ovation': 'Aurores (NOAA OVATION) : {times}',   // TARKISTA
    'info.src.clouds': 'Nuages : {model}, instant présent.',   // TARKISTA
    'sw.title': 'Météo spatiale',   // TARKISTA
    'sw.source': 'Source : NOAA SWPC (DSCOVR/ACE, OVATION)',   // TARKISTA
    'sw.kp': 'Kp actuel',   // TARKISTA
    'sw.speed': 'Vitesse',   // TARKISTA
    'sw.density': 'Densité',   // TARKISTA
    'sw.power': 'Puissance',   // TARKISTA
    'sw.north': 'nord',   // TARKISTA
    'sw.bzSouth': 'vers le sud',   // TARKISTA
    'sw.bzNorth': 'vers le nord',   // TARKISTA
    'sw.bzSouthFor': 'vers le sud {min} min',   // TARKISTA
    'sw.stale': 'Pas de données récentes (dernière mesure {time}).',   // TARKISTA
    'sw.hint': 'Bz vers le sud depuis {min} min, l’activité peut augmenter dans l’heure.',   // TARKISTA
  },
};

// Valittu kieli: tallennettu valinta, muuten käyttöjärjestelmän kieli
// (navigator.languages, ensimmäinen tuettu), muuten englanti.
const LANG_KEY = 'rv-lang';
function detectLang(){
  try{ const saved = localStorage.getItem(LANG_KEY); if(saved && LANG_META[saved]) return saved; }catch(e){}
  const prefs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ''];
  for(const raw of prefs){
    const l = String(raw).toLowerCase();
    if(l === 'fi' || l.startsWith('fi-')) return 'fi';
    if(l === 'en' || l.startsWith('en-')) return 'en';
    if(l === 'es' || l.startsWith('es-')) return 'es';
    if(l === 'fr' || l.startsWith('fr-')) return 'fr';
    // Kiina: vain yksinkertaistettu (zh-Hans, zh-CN, zh-SG, pelkkä zh).
    // Perinteinen (zh-Hant, zh-TW, zh-HK, zh-MO) ei ole tuettu -> jatketaan.
    if(l === 'zh' || l.startsWith('zh-hans') || l === 'zh-cn' || l === 'zh-sg' || l.startsWith('zh-cn-') || l.startsWith('zh-sg-')) return 'zh-Hans';
  }
  return LANG_FALLBACK;
}
let LANG = detectLang();
function saveLang(code){ try{ localStorage.setItem(LANG_KEY, code); }catch(e){} }
const langLocale = () => LANG_META[LANG].locale;

// Käännös: t('avain', {nimi: arvo}). Puuttuva -> en -> fi -> avain.
function t(key, vars){
  let s = (I18N[LANG] && I18N[LANG][key]) ?? I18N.en[key] ?? I18N.fi[key] ?? key;
  if(vars) s = s.replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : '');
  return s;
}
// Staattiset HTML-tekstit: data-i18n (teksti), data-i18n-aria, data-i18n-title.
function applyI18n(root){
  root = root || document;
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  root.querySelectorAll('[data-i18n-title]').forEach(el => el.setAttribute('title', t(el.dataset.i18nTitle)));
  document.documentElement.lang = LANG_META[LANG].htmlLang;
  const md = document.querySelector('meta[name="description"]');
  if(md) md.setAttribute('content', t('meta.desc'));
}
