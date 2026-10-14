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
    'btn.wind': 'Tuuli: korkeuden valinta',
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
    'btnName.clouds': 'Pilvet',
    'btnName.aurora': 'Revontulet',
    'btnName.mapStyle': 'Karttapohja',
    'btnName.wind': 'Tuuli',
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

    'sheet.toggle': 'Laajenna tai pienennä tietopaneeli',
    'sheet.close': 'Pienennä paneeli',
    'play.start': 'Käynnistä aikakaruselli',
    'play.stop': 'Pysäytä aikakaruselli',
    'slider.aria': 'Ennusteen ajankohta, tunteja tästä hetkestä',
    'time.now': 'Nyt',
    'time.nowAt': 'Nyt · {time}',
    'offset.h': '{sign}{h} h', 'offset.m': '{sign}{m} min', 'offset.hm': '{sign}{h} h {m} min',
    'sheet.model': 'Säämalli',
    'sheet.kp': 'Kp nyt',
    'gauge.label': 'näkyvyys',
    'chip.aurora': 'Revontulet',
    'chip.clouds': 'Pilvisyys',
    'chip.dark': 'Pimeys',

    'attr.suffix': ' · Revontulet: NOAA SWPC · Pilvet & tuuli: {src}',
    'place.selected': 'Valittu piste',
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

    'verdict.pick.title': 'Valitse piste kartalta',
    'verdict.pick.text': 'Napauta karttaa tai käytä paikannusta, niin lasken revontulien näkyvyyden juuri siihen pisteeseen.',
    'verdict.bright.title': 'Liian valoisaa',
    'verdict.bright.text': 'Aurinko on liian korkealla — revontulet eivät erotu taivaalta tähän aikaan.',
    'verdict.good.title': 'Hyvät mahdollisuudet',
    'verdict.good.text': 'Revontuliaktiivisuus riittää ja taivas on riittävän selkeä. Kannattaa katsoa pohjoiselle taivaalle.',
    'verdict.mid.title': 'Kohtalaiset mahdollisuudet',
    'verdict.mid.text': 'Näkyminen on mahdollista, mutta joko aktiivisuus tai sää rajoittaa. Seuraa tilannetta.',
    'verdict.cloudy.title': 'Pilvet peittävät',
    'verdict.cloudy.text': 'Aktiivisuutta olisi, mutta pilvikansi estää näkymän tästä pisteestä.',
    'verdict.weak.title': 'Heikot mahdollisuudet',
    'verdict.weak.text': 'Revontuliaktiivisuus on tällä hetkellä vähäistä tällä leveysasteella.',

    'note.now': 'Revontulet ja pilvet: nykytilanne',
    'chip.outsideArea': 'Alueen ulkopuolella',
    'note.outsideArea': 'Piste on {model}-mallin alueen ulkopuolella, joten pilvisyyttä ei ole saatavilla.',
    'note.ovationNow': 'Revontulet (NOAA OVATION): {times} Pilvet: ennuste valitulle hetkelle.',
    'note.kpEstimate': 'Revontulitodennäköisyys on Kp-ennusteeseen perustuva arvio (OVATION-data ei saatavilla).',
    'note.summer': 'Kesäyö on tällä leveysasteella liian valoisa revontulille — kausi alkaa taas elo–syyskuussa.',

    'clouds.loading': 'Haetaan pilvidataa: {model}…',
    'clouds.failed': 'Pilvimallin "{model}" lataus epäonnistui.',
    'err.maplib': 'Karttakirjaston lataus estyi (CDN ei tavoitettavissa). Näkyvyysindeksi toimii silti: paina paikannusta oikeasta reunasta.',
    'err.ovation': 'Revontulidatan haku epäonnistui (NOAA ei tavoitettavissa). Yritä hetken päästä uudelleen.',
    'err.cloudsStale': 'Tuore pilvihaku epäonnistui ({status}) — näytetään {age} vanha pilvitilanne. Haen tuoretta taustalla.',
    'err.cloudsFailed': 'Pilvikerroksen haku epäonnistui ({status}) — pistekohtainen sää toimii silti. Yritän uudelleen taustalla.',
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
    'btn.wind': 'Wind: choose altitude',
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
    'btnName.clouds': 'Clouds',
    'btnName.aurora': 'Northern lights',
    'btnName.mapStyle': 'Base map',
    'btnName.wind': 'Wind',
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

    'sheet.toggle': 'Expand or collapse the info panel',
    'sheet.close': 'Collapse panel',
    'play.start': 'Play timeline',
    'play.stop': 'Stop timeline',
    'slider.aria': 'Forecast time, hours from now',
    'time.now': 'Now',
    'time.nowAt': 'Now · {time}',
    'offset.h': '{sign}{h} h', 'offset.m': '{sign}{m} min', 'offset.hm': '{sign}{h} h {m} min',
    'sheet.model': 'Weather model',
    'sheet.kp': 'Kp now',
    'gauge.label': 'visibility',
    'chip.aurora': 'Aurora',
    'chip.clouds': 'Cloud cover',
    'chip.dark': 'Darkness',

    'attr.suffix': ' · Aurora: NOAA SWPC · Clouds & wind: {src}',
    'place.selected': 'Selected point',
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

    'verdict.pick.title': 'Pick a point on the map',
    'verdict.pick.text': 'Tap the map or use your location, and I will calculate how visible the northern lights are at that exact point.',
    'verdict.bright.title': 'Too bright',
    'verdict.bright.text': 'The sun is too high — the northern lights cannot be seen in the sky at this time.',
    'verdict.good.title': 'Good chances',
    'verdict.good.text': 'Aurora activity is strong enough and the sky is clear enough. Look towards the northern sky.',
    'verdict.mid.title': 'Moderate chances',
    'verdict.mid.text': 'The northern lights may be visible, but either activity or the weather is limiting. Keep an eye on the situation.',
    'verdict.cloudy.title': 'Clouds in the way',
    'verdict.cloudy.text': 'There would be activity, but cloud cover blocks the view from this point.',
    'verdict.weak.title': 'Low chances',
    'verdict.weak.text': 'Aurora activity at this latitude is low at the moment.',

    'note.now': 'Northern lights and clouds: current situation',
    'chip.outsideArea': 'Outside area',
    'note.outsideArea': 'This point is outside the {model} model area, so no cloud cover is available.',
    'note.ovationNow': 'Northern lights (NOAA OVATION): {times} Clouds: forecast for the selected time.',
    'note.kpEstimate': 'Aurora probability is an estimate based on the Kp forecast (OVATION data not available).',
    'note.summer': 'Summer nights here are too bright for the northern lights — the season returns in August–September.',

    'clouds.loading': 'Loading cloud data: {model}…',
    'clouds.failed': 'Weather model "{model}" failed to load.',
    'err.maplib': 'The map library could not be loaded (CDN unreachable). The visibility index still works: press the location button on the right.',
    'err.ovation': 'Aurora data could not be loaded (NOAA unreachable). Please try again shortly.',
    'err.cloudsStale': 'Fresh cloud data failed to load ({status}) — showing cloud data from {age} ago. Retrying in the background.',
    'err.cloudsFailed': 'Cloud layer failed to load ({status}) — point weather still works. Retrying in the background.',
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
    'btn.wind': '风：选择高度',   // TARKISTAMATON
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
    'btnName.clouds': '云层',   // TARKISTAMATON
    'btnName.aurora': '极光',   // TARKISTAMATON
    'btnName.mapStyle': '底图',   // TARKISTAMATON
    'btnName.wind': '风',   // TARKISTAMATON
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

    'sheet.toggle': '展开或收起信息面板',   // TARKISTAMATON
    'sheet.close': '收起面板',   // TARKISTAMATON
    'play.start': '播放时间轴',   // TARKISTAMATON
    'play.stop': '停止播放',   // TARKISTAMATON
    'slider.aria': '预报时间（距现在的小时数）',   // TARKISTAMATON
    'time.now': '现在',   // TARKISTAMATON
    'time.nowAt': '现在 · {time}',   // TARKISTAMATON
    'offset.h': '{sign}{h} 小时', 'offset.m': '{sign}{m} 分钟', 'offset.hm': '{sign}{h} 小时 {m} 分钟',   // TARKISTAMATON
    'sheet.model': '天气模型',   // TARKISTAMATON
    'sheet.kp': '当前 Kp',   // TARKISTAMATON
    'gauge.label': '可见度',   // TARKISTAMATON
    'chip.aurora': '极光',   // TARKISTAMATON
    'chip.clouds': '云量',   // TARKISTAMATON
    'chip.dark': '暗度',   // TARKISTAMATON

    'attr.suffix': ' · 极光：NOAA SWPC · 云和风：{src}',   // TARKISTAMATON
    'place.selected': '所选地点',   // TARKISTAMATON
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

    'verdict.pick.title': '在地图上选择一个地点',   // TARKISTAMATON
    'verdict.pick.text': '点击地图或使用定位，我将计算该地点的极光可见度。',   // TARKISTAMATON
    'verdict.bright.title': '天太亮',   // TARKISTAMATON
    'verdict.bright.text': '太阳高度过高 — 此时天空中无法看到极光。',   // TARKISTAMATON
    'verdict.good.title': '机会很好',   // TARKISTAMATON
    'verdict.good.text': '极光活动足够强，天空也足够晴朗。请朝北方天空观看。',   // TARKISTAMATON
    'verdict.mid.title': '机会一般',   // TARKISTAMATON
    'verdict.mid.text': '有可能看到极光，但活动强度或天气有所限制。请留意情况变化。',   // TARKISTAMATON
    'verdict.cloudy.title': '被云遮挡',   // TARKISTAMATON
    'verdict.cloudy.text': '虽有极光活动，但云层遮挡了此地的视线。',   // TARKISTAMATON
    'verdict.weak.title': '机会较低',   // TARKISTAMATON
    'verdict.weak.text': '目前该纬度的极光活动较弱。',   // TARKISTAMATON

    'note.now': '极光和云层：当前实况',   // TARKISTAMATON
    'chip.outsideArea': '超出范围',   // TARKISTAMATON
    'note.outsideArea': '该点位于 {model} 模型范围之外，无云量数据。',   // TARKISTAMATON
    'note.ovationNow': '极光（NOAA OVATION）：{times}云层：所选时间的预报。',   // TARKISTAMATON
    'note.kpEstimate': '极光概率为基于 Kp 预报的估算（OVATION 数据不可用）。',   // TARKISTAMATON
    'note.summer': '该纬度的夏夜太亮，无法看到极光 — 极光季将于八月至九月再次开始。',   // TARKISTAMATON

    'clouds.loading': '正在加载云数据：{model}…',   // TARKISTAMATON
    'clouds.failed': '天气模型“{model}”加载失败。',   // TARKISTAMATON
    'err.maplib': '无法加载地图库（CDN 无法访问）。可见度指数仍可使用：请按右侧的定位按钮。',   // TARKISTAMATON
    'err.ovation': '无法获取极光数据（NOAA 无法访问）。请稍后再试。',   // TARKISTAMATON
    'err.cloudsStale': '最新云数据加载失败（{status}）— 显示 {age} 前的云况。正在后台重试。',   // TARKISTAMATON
    'err.cloudsFailed': '云层加载失败（{status}）— 单点天气仍可使用。正在后台重试。',   // TARKISTAMATON
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
    'btn.wind': 'Viento: elegir altitud',
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
    'btnName.clouds': 'Nubes',
    'btnName.aurora': 'Auroras',
    'btnName.mapStyle': 'Mapa base',
    'btnName.wind': 'Viento',
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

    'sheet.toggle': 'Ampliar o reducir el panel de información',
    'sheet.close': 'Reducir el panel',
    'play.start': 'Reproducir la línea de tiempo',
    'play.stop': 'Detener la línea de tiempo',
    'slider.aria': 'Hora de la previsión, horas desde ahora',
    'time.now': 'Ahora',
    'time.nowAt': 'Ahora · {time}',
    'offset.h': '{sign}{h} h', 'offset.m': '{sign}{m} min', 'offset.hm': '{sign}{h} h {m} min',
    'sheet.model': 'Modelo meteorológico',
    'sheet.kp': 'Kp ahora',
    'gauge.label': 'visibilidad',
    'chip.aurora': 'Auroras',
    'chip.clouds': 'Nubosidad',
    'chip.dark': 'Oscuridad',

    'attr.suffix': ' · Auroras: NOAA SWPC · Nubes y viento: {src}',
    'place.selected': 'Punto seleccionado',
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

    'verdict.pick.title': 'Elige un punto en el mapa',
    'verdict.pick.text': 'Toca el mapa o usa tu ubicación y calcularé lo visible que es la aurora en ese punto exacto.',
    'verdict.bright.title': 'Demasiada luz',
    'verdict.bright.text': 'El sol está demasiado alto: a esta hora la aurora no se ve en el cielo.',
    'verdict.good.title': 'Buenas probabilidades',
    'verdict.good.text': 'La actividad auroral es suficiente y el cielo está bastante despejado. Mira hacia el norte.',
    'verdict.mid.title': 'Probabilidades moderadas',
    'verdict.mid.text': 'La aurora puede verse, pero la actividad o el tiempo la limitan. Sigue atento a la situación.',
    'verdict.cloudy.title': 'Las nubes lo impiden',
    'verdict.cloudy.text': 'Habría actividad, pero las nubes tapan la vista desde este punto.',
    'verdict.weak.title': 'Pocas probabilidades',
    'verdict.weak.text': 'La actividad auroral en esta latitud es baja en este momento.',

    'note.now': 'Auroras y nubes: situación actual',
    'chip.outsideArea': 'Fuera del área',
    'note.outsideArea': 'Este punto está fuera del área del modelo {model}, así que no hay datos de nubosidad.',
    'note.ovationNow': 'Auroras (NOAA OVATION): {times} Nubes: previsión para la hora seleccionada.',
    'note.kpEstimate': 'La probabilidad de aurora es una estimación basada en la previsión del índice Kp (datos de OVATION no disponibles).',
    'note.summer': 'Aquí las noches de verano son demasiado claras para ver auroras: la temporada vuelve en agosto–septiembre.',

    'clouds.loading': 'Cargando datos de nubes: {model}…',
    'clouds.failed': 'No se pudo cargar el modelo meteorológico «{model}».',
    'err.maplib': 'No se pudo cargar la biblioteca del mapa (CDN inaccesible). El índice de visibilidad sigue funcionando: pulsa el botón de ubicación de la derecha.',
    'err.ovation': 'No se pudieron cargar los datos de auroras (NOAA inaccesible). Inténtalo de nuevo en un momento.',
    'err.cloudsStale': 'No se pudieron cargar datos de nubes recientes ({status}): se muestran los de hace {age}. Reintentando en segundo plano.',
    'err.cloudsFailed': 'No se pudo cargar la capa de nubes ({status}): el tiempo en el punto sigue funcionando. Reintentando en segundo plano.',
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
    'btn.wind': 'Vent : choisir l\'altitude',
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
    'btnName.clouds': 'Nuages',
    'btnName.aurora': 'Aurores boréales',
    'btnName.mapStyle': 'Fond de carte',
    'btnName.wind': 'Vent',
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

    'sheet.toggle': 'Agrandir ou réduire le panneau d\'informations',
    'sheet.close': 'Réduire le panneau',
    'play.start': 'Lire la chronologie',   // TARKISTA
    'play.stop': 'Arrêter la chronologie',   // TARKISTA
    'slider.aria': 'Heure de la prévision, heures à partir de maintenant',
    'time.now': 'Maintenant',
    'time.nowAt': 'Maintenant · {time}',
    'offset.h': '{sign}{h} h', 'offset.m': '{sign}{m} min', 'offset.hm': '{sign}{h} h {m} min',
    'sheet.model': 'Modèle météo',
    'sheet.kp': 'Kp actuel',
    'gauge.label': 'visibilité',
    'chip.aurora': 'Aurores',
    'chip.clouds': 'Nébulosité',
    'chip.dark': 'Obscurité',

    'attr.suffix': ' · Aurores : NOAA SWPC · Nuages et vent : {src}',
    'place.selected': 'Point sélectionné',
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

    'verdict.pick.title': 'Choisissez un point sur la carte',
    'verdict.pick.text': 'Touchez la carte ou utilisez votre position, et je calculerai la visibilité des aurores boréales à cet endroit précis.',
    'verdict.bright.title': 'Trop clair',
    'verdict.bright.text': 'Le soleil est trop haut : les aurores ne sont pas visibles dans le ciel à cette heure.',
    'verdict.good.title': 'Bonnes chances',
    'verdict.good.text': 'L\'activité aurorale est assez forte et le ciel assez dégagé. Regardez vers le nord.',
    'verdict.mid.title': 'Chances moyennes',
    'verdict.mid.text': 'Les aurores peuvent être visibles, mais l\'activité ou la météo les limite. Surveillez l\'évolution.',
    'verdict.cloudy.title': 'Nuages gênants',   // TARKISTA
    'verdict.cloudy.text': 'Il y aurait de l\'activité, mais les nuages masquent la vue depuis ce point.',
    'verdict.weak.title': 'Faibles chances',
    'verdict.weak.text': 'L\'activité aurorale à cette latitude est faible en ce moment.',

    'note.now': 'Aurores et nuages : situation actuelle',
    'chip.outsideArea': 'Hors zone',
    'note.outsideArea': 'Ce point est en dehors de la zone du modèle {model} : aucune donnée de nébulosité.',
    'note.ovationNow': 'Aurores (NOAA OVATION) : {times} Nuages : prévision pour l\'heure choisie.',
    'note.kpEstimate': 'La probabilité d\'aurores est une estimation fondée sur la prévision de l\'indice Kp (données OVATION indisponibles).',
    'note.summer': 'Ici, les nuits d\'été sont trop claires pour les aurores — la saison reprend en août–septembre.',

    'clouds.loading': 'Chargement des données nuageuses : {model}…',
    'clouds.failed': 'Échec du chargement du modèle météo « {model} ».',
    'err.maplib': 'Impossible de charger la bibliothèque de carte (CDN inaccessible). L\'indice de visibilité fonctionne toujours : appuyez sur le bouton de position à droite.',
    'err.ovation': 'Impossible de charger les données d\'aurores (NOAA inaccessible). Réessayez dans un instant.',
    'err.cloudsStale': 'Échec du chargement des données nuageuses récentes ({status}) — affichage des nuages d\'il y a {age}. Nouvel essai en arrière-plan.',
    'err.cloudsFailed': 'Échec du chargement de la couche nuageuse ({status}) — la météo du point fonctionne toujours. Nouvel essai en arrière-plan.',
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
