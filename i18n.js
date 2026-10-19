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
    'cam.photoBy': 'Kuva: {author} · YouTube',
    'cam.othersHeading': 'Esikatselu ei saatavilla:',
    'cam.thumbAlt': '{name} — pikkukuva',
    'cam.notLive': 'Lähetys ei käynnissä',
    'cam.playVideo': 'Toista livevideo',
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

    'flag.clouds': 'Pilvisyys',
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
    'settings.about': 'Tietoja ja lähteet',
    'settings.weatherSources': 'Säädata: ECMWF, DWD, Ilmatieteenlaitos · Revontulet: NOAA SWPC',
    'about.map': 'Kartta-aineisto',
    'about.tiles': 'Karttatiilet',
    'about.schema': 'Karttatiilien rakenne',
    'about.coast': 'Rantaviivat kaukaisilla zoomeilla',
    'about.terrain': 'Maaston varjostus',
    'about.sat': 'Satelliittikuva',
    'about.ecmwf': 'Pilvet ja tuuli (IFS)',
    'about.dwd': 'Pilvet ja tuuli (ICON-EU)',
    'about.fmi': 'Pilvet ja tuuli (HARMONIE)',
    'about.noaa': 'Revontuliennuste ja avaruussää',
    'about.youtube': 'Revontulikamerat (kuvat ja nimet)',
    'about.maplibre': 'Karttakirjasto',
    'about.icons': 'Kuvakkeet',
    'about.fonts': 'Fontit',
    'time.backNow': 'Palaa nykyhetkeen',
    'info.ownBtn': 'Oma sijainti',
    'info.pointBtn': 'Valittu piste',
    'info.locSeg': 'Sijainti',
    'info.locOff': 'Paikannus ei käytettävissä',
    'info.pickHint': 'Valitse piste napauttamalla karttaa.',
    'night.cls.great': 'erinomainen',
    'night.tip.chance': 'Näkyvyys {p}',
    'night.tip.clouds': 'Pilvisyys {c}',
    'night.ver': 'Testiversio',
    'night.src': 'Pilvisyys tunneittain, revontulet NOAA:n Kp-ennusteesta 3 tunnin jaksoina. Suuntaa-antava.',
    'night.best': 'Paras aika klo {times}',
    'night.none': 'Ei hyviä mahdollisuuksia tänä yönä',
    'night.loading': 'Ladataan pilviennustetta…',
    'night.noDark': 'Ei pimeää tänä yönä – aurinko ei laske tarpeeksi alas.',
    'night.cls.weak': 'heikko',
    'night.cls.good': 'hyvä',
    'night.now': 'nyt',
    'night.legend.clouds': 'Pilvisyys',
    'night.legend.aurora': 'Revontuliarvio',
    'night.col.time': 'Klo',
    'night.col.clouds': 'Pilvisyys',
    'night.col.aurora': 'Revontulet',
    'night.col.chance': 'Näkyvyys',
    'night.chartAria': 'Yön kaavio: näkyvyys, revontulet, pilvet ja kuu tunneittain',
    'night.chart.chance': 'NÄKYVYYS',
    'night.chart.aurora': 'REVONTULET',
    'night.chart.clouds': 'PILVISYYS',
    'night.chart.moon': 'KUU',
    'night.tap': 'Liu’uta sormea kaavion yli nähdäksesi tunnin arvot.',
    'night.tapTable': 'Paina riviä hetki ja liu’uta nähdäksesi tunnin arvot.',
    'night.fact.dark': 'Pimeää',
    'night.fact.moon': 'Kuu',
    'night.moonRise': 'nousee {t}',
    'night.moonSet': 'laskee {t}',
    'night.moonUp': 'taivaalla koko yön',
    'night.moonDown': 'ei taivaalla yöllä',
    'night.moon.new': 'Uusikuu',
    'night.moon.waxCres': 'Kasvava sirppi',
    'night.moon.firstQ': 'Kasvava puolikuu',
    'night.moon.waxGib': 'Kasvava',
    'night.moon.full': 'Täysikuu',
    'night.moon.waneGib': 'Vähenevä',
    'night.moon.lastQ': 'Vähenevä puolikuu',
    'night.moon.waneCres': 'Vähenevä sirppi',
    'info.tabs': 'Näkymä',
    'info.tab.now': 'Nyt',
    'info.tab.night': 'Tänä yönä',
    'info.tab.week': '7 vrk',
    'week.best': 'Paras yö: {date}',
    'week.bestSub': 'Näkyvyys {p} klo {times}',
    'week.none': 'Ei hyviä mahdollisuuksia lähipäivinä',
    'week.col.night': 'Yö',
    'week.col.vis': 'Näkyvyys',
    'week.col.clouds': 'Pilvet',
    'week.col.kp': 'Kp',
    'week.col.moon': 'Kuu',
    'week.approxSep': 'Suuntaa-antava · Kp 27 vrk:n ennusteesta',
    'week.otherModel': '{model}, valitun mallin ennuste ei ulotu näin pitkälle',
    'week.tap': 'Napauta yötä nähdäksesi tuntikaavion.',
    'week.src': 'Näkyvyys yön parhaana tuntina. Pilvisyys pimeän ajan keskiarvo, Kp yön suurin ennustettu arvo. Revontulet NOAA:n Kp-ennusteesta: kolme ensimmäistä yötä 3 tunnin jaksoina, sen jälkeen 27 vrk:n ennusteesta. Suuntaa-antava.',
    'week.approx': 'suuntaa-antava',
    'week.approxMax': 'Näkyvyys enintään {p} (suuntaa-antava)',
    'week.noDark': 'Ei pimeää',
    'week.fact.temp': 'Alin lämpötila',
    'week.fact.wind': 'Tuuli enint.',
    'week.at': 'klo {t}',
    'week.src27': 'Kp 27 vrk:n ennusteesta.',
    'week.srcModel': 'Pilvisyys osin mallista {model}.',
    'week.srcTemp': 'Lämpötila ja tuuli: ECMWF.',
    'week.kp27Err': '27 vrk:n Kp-ennustetta ei saatu – öiden 4–7 revontuliarvio puuttuu.',
    'info.index': 'Näkyvyysindeksi',
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
    'swc.name.kp': 'Kp-indeksi',
    'swc.name.bz': 'Bz',
    'swc.name.bt': 'Bt',
    'swc.name.speed': 'Aurinkotuulen nopeus',
    'swc.name.density': 'Aurinkotuulen tiheys',
    'swc.name.power': 'Pallonpuoliskon teho',
    'swc.desc.kp': 'Kp – maapallon magneettikentän häiriöisyys asteikolla 0–9, 3 tunnin jaksoina. Mitä suurempi arvo, sitä etelämpänä revontulia voi näkyä.',
    'swc.desc.bz': 'Bz – magneettikentän pohjois–eteläsuunta. Negatiivinen arvo suosii revontulia.',
    'swc.desc.bt': 'Bt – aurinkotuulen magneettikentän kokonaisvoimakkuus. Suuri Bt vahvistaa revontulia, kun Bz on negatiivinen.',
    'swc.desc.speed': 'Aurinkotuulen nopeus. Nopea tuuli (yli 500 km/s) voimistaa revontulia.',
    'swc.desc.density': 'Aurinkotuulen hiukkastiheys. Äkillinen nousu kertoo usein saapuvasta häiriöstä.',
    'swc.desc.power': 'Revontulten kokonaisteho pohjoisella pallonpuoliskolla (NOAA OVATION). Yli 50 GW tarkoittaa voimakasta aktiivisuutta.',
    'swc.open': 'avaa kaavio',
    'swc.range': 'Aikaväli',
    'swc.hours': '{n} h',
    'swc.days': '{n} vrk',
    'swc.hint': 'Liu’uta sormea kaavion yli nähdäksesi arvot.',
    'swc.arrived': 'Saapunut Maahan',
    'swc.kpPeriod': 'jakso {range}',
    'swc.name.clouds': 'Pilvisyys',
    'swc.desc.clouds': 'Pilvisyys – kuinka suuri osa taivaasta on pilvessä.',
    'swc.transitState': 'Matkalla Maahan',
    'swc.dataStart': 'Tiedot alkaen {time}',
    'swc.note.dim': 'Himmennetty osa on mitattu avaruudessa ja saapuu Maahan lähiminuutteina.',
    'swc.note.bt': '±Bt: kentän kokonaisvoimakkuus. Bz liikkuu aina tämän rajan sisällä.',
    'swc.now': 'Nyt',
    'swc.stale': 'Ei tuoretta dataa · viimeisin mittaus {time}',
    'swc.noData': 'Ei dataa tältä aikaväliltä',
    'swc.kp.observed': 'mitattu',
    'swc.kp.estimated': 'arvio',
    'swc.kp.predicted': 'ennuste',
    'swc.src.l1': 'Lähde: NOAA SWPC, reaaliaikainen aurinkotuuli L1-pisteestä (1 min).',
    'swc.arr.noaa': '{label}: NOAA:n laskema saapumisaika Maahan.',
    'swc.arr.calc': '{label}: arvio L1-pisteen etäisyydestä (1,5 milj. km) ja nykyisestä nopeudesta.',
    'swc.src.kp': 'Lähde: NOAA SWPC, planetaarinen Kp (mitattu ja ennuste).',
    'swc.src.power': 'Lähde: NOAA SWPC OVATION, 5 min välein. NOAA:n tiedostossa on vain kuluva UTC-vuorokausi.',
    'swc.chartAria': '{name}, kaavio',

    // Maanosat ja valtameret kartalla (2026-10, oma aineisto, ks. WORLD_LABEL_POINTS)
    'geo.europe': 'Eurooppa',
    'geo.asia': 'Aasia',
    'geo.africa': 'Afrikka',
    'geo.northAmerica': 'Pohjois-Amerikka',
    'geo.southAmerica': 'Etelä-Amerikka',
    'geo.oceania': 'Oseania',
    'geo.antarctica': 'Antarktis',
    'geo.atlantic': 'Atlantti',
    'geo.pacific': 'Tyyni valtameri',
    'geo.indian': 'Intian valtameri',
    'geo.arctic': 'Pohjoinen jäämeri',
    'geo.southern': 'Eteläinen jäämeri',
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
    'cam.photoBy': 'Image: {author} · YouTube',
    'cam.othersHeading': 'Preview not available:',
    'cam.thumbAlt': '{name} — thumbnail',
    'cam.notLive': 'Stream is offline',
    'cam.playVideo': 'Play live video',
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

    'flag.clouds': 'Cloud cover',
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
    'settings.model': 'Model',   // lyhyt: 360 px:n näytöllä tila ei riitä (2026-10)
    'settings.updatedAt': 'Updated {time}',
    'settings.about': 'About and sources',
    'settings.weatherSources': 'Weather data: ECMWF, DWD, Finnish Meteorological Institute · Aurora: NOAA SWPC',
    'about.map': 'Map data',
    'about.tiles': 'Map tiles',
    'about.schema': 'Map tile schema',
    'about.coast': 'Coastlines at far zoom levels',
    'about.terrain': 'Terrain shading',
    'about.sat': 'Satellite imagery',
    'about.ecmwf': 'Clouds and wind (IFS)',
    'about.dwd': 'Clouds and wind (ICON-EU)',
    'about.fmi': 'Clouds and wind (HARMONIE)',
    'about.noaa': 'Aurora forecast and space weather',
    'about.youtube': 'Aurora cameras (images and names)',
    'about.maplibre': 'Map library',
    'about.icons': 'Icons',
    'about.fonts': 'Fonts',
    'time.backNow': 'Back to now',
    'info.ownBtn': 'My location',
    'info.pointBtn': 'Selected point',
    'info.locSeg': 'Location',
    'info.locOff': 'Location not available',
    'info.pickHint': 'Pick a point by tapping the map.',
    'night.cls.great': 'excellent',
    'night.tip.chance': 'Visibility {p}',
    'night.tip.clouds': 'Cloud cover {c}',
    'night.ver': 'Test version',
    'night.src': 'Clouds hourly, aurora from the NOAA Kp forecast in 3-hour periods. Indicative only.',
    'night.best': 'Best time {times}',
    'night.none': 'No good chances tonight',
    'night.loading': 'Loading the cloud forecast…',
    'night.noDark': 'No darkness tonight – the sun does not set low enough.',
    'night.cls.weak': 'low',
    'night.cls.good': 'good',
    'night.now': 'now',
    'night.legend.clouds': 'Cloud cover',
    'night.legend.aurora': 'Aurora outlook',
    'night.col.time': 'Time',
    'night.col.clouds': 'Cloud cover',
    'night.col.aurora': 'Aurora',
    'night.col.chance': 'Visibility',
    'night.chartAria': 'Night chart: visibility, aurora, clouds and moon by hour',
    'night.chart.chance': 'VISIBILITY',
    'night.chart.aurora': 'AURORA',
    'night.chart.clouds': 'CLOUD COVER',
    'night.chart.moon': 'MOON',
    'night.tap': 'Slide your finger across the chart to see each hour’s values.',
    'night.tapTable': 'Press a row for a moment and slide to see each hour’s values.',
    'night.fact.dark': 'Dark',
    'night.fact.moon': 'Moon',
    'night.moonRise': 'rises {t}',
    'night.moonSet': 'sets {t}',
    'night.moonUp': 'up all night',
    'night.moonDown': 'not up tonight',
    'night.moon.new': 'New moon',
    'night.moon.waxCres': 'Waxing crescent',
    'night.moon.firstQ': 'First quarter',
    'night.moon.waxGib': 'Waxing gibbous',
    'night.moon.full': 'Full moon',
    'night.moon.waneGib': 'Waning gibbous',
    'night.moon.lastQ': 'Last quarter',
    'night.moon.waneCres': 'Waning crescent',
    'info.tabs': 'View',
    'info.tab.now': 'Now',
    'info.tab.night': 'Tonight',
    'info.tab.week': '7 days',
    'week.best': 'Best night: {date}',
    'week.bestSub': 'Visibility {p} at {times}',
    'week.none': 'No good chances in the coming days',
    'week.col.night': 'Night',
    'week.col.vis': 'Visibility',
    'week.col.clouds': 'Clouds',
    'week.col.kp': 'Kp',
    'week.col.moon': 'Moon',
    'week.approxSep': 'Indicative · Kp from the 27-day outlook',
    'week.otherModel': '{model}, the selected model’s forecast does not reach this far',
    'week.tap': 'Tap a night to see the hourly chart.',
    'week.src': 'Visibility at the night’s best hour. Clouds averaged over the dark hours, Kp the night’s highest forecast value. Aurora from the NOAA Kp forecast: the first three nights in 3-hour periods, after that from the 27-day outlook. Indicative only.',
    'week.approx': 'indicative',
    'week.approxMax': 'Visibility up to {p} (indicative)',
    'week.noDark': 'No darkness',
    'week.fact.temp': 'Lowest temperature',
    'week.fact.wind': 'Max wind',
    'week.at': 'at {t}',
    'week.src27': 'Kp from the 27-day outlook.',
    'week.srcModel': 'Clouds partly from {model}.',
    'week.srcTemp': 'Temperature and wind: ECMWF.',
    'week.kp27Err': 'The 27-day Kp outlook could not be loaded – no aurora estimate for nights 4–7.',
    'info.index': 'Visibility index',
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
    'swc.name.kp': 'Kp index',
    'swc.name.bz': 'Bz',
    'swc.name.bt': 'Bt',
    'swc.name.speed': 'Solar wind speed',
    'swc.name.density': 'Solar wind density',
    'swc.name.power': 'Hemispheric power',
    'swc.desc.kp': 'Kp – how disturbed Earth’s magnetic field is, on a 0–9 scale in 3-hour periods. The higher the value, the further south auroras can be seen.',
    'swc.desc.bz': 'Bz – the north–south direction of the magnetic field. A negative value favours auroras.',
    'swc.desc.bt': 'Bt – total strength of the solar wind’s magnetic field. A strong Bt boosts auroras when Bz is negative.',
    'swc.desc.speed': 'Solar wind speed. Fast wind (over 500 km/s) strengthens auroras.',
    'swc.desc.density': 'Solar wind particle density. A sudden rise often signals an arriving disturbance.',
    'swc.desc.power': 'Total auroral power over the northern hemisphere (NOAA OVATION). Over 50 GW means strong activity.',
    'swc.open': 'open chart',
    'swc.range': 'Time range',
    'swc.hours': '{n} h',
    'swc.days': '{n} days',
    'swc.hint': 'Slide your finger across the chart to see the values.',
    'swc.arrived': 'Reached Earth',
    'swc.kpPeriod': 'period {range}',
    'swc.name.clouds': 'Cloud cover',
    'swc.desc.clouds': 'Cloud cover – how much of the sky is covered by clouds.',
    'swc.transitState': 'On its way to Earth',
    'swc.dataStart': 'Data from {time}',
    'swc.note.dim': 'The shaded part has been measured in space and reaches Earth in the coming minutes.',
    'swc.note.bt': '±Bt: total field strength. Bz always stays within this limit.',
    'swc.now': 'Now',
    'swc.stale': 'No recent data · latest measurement {time}',
    'swc.noData': 'No data for this period',
    'swc.kp.observed': 'measured',
    'swc.kp.estimated': 'estimate',
    'swc.kp.predicted': 'forecast',
    'swc.src.l1': 'Source: NOAA SWPC, real-time solar wind at L1 (1 min).',
    'swc.arr.noaa': '{label}: arrival time at Earth computed by NOAA.',
    'swc.arr.calc': '{label}: estimated from the L1 distance (1.5 million km) and the current speed.',
    'swc.src.kp': 'Source: NOAA SWPC, planetary Kp (measured and forecast).',
    'swc.src.power': 'Source: NOAA SWPC OVATION, every 5 min. NOAA’s file only covers the current UTC day.',
    'swc.chartAria': '{name} chart',

    // Maanosat ja valtameret kartalla (2026-10, oma aineisto, ks. WORLD_LABEL_POINTS)
    'geo.europe': 'Europe',
    'geo.asia': 'Asia',
    'geo.africa': 'Africa',
    'geo.northAmerica': 'North America',
    'geo.southAmerica': 'South America',
    'geo.oceania': 'Oceania',
    'geo.antarctica': 'Antarctica',
    'geo.atlantic': 'Atlantic Ocean',
    'geo.pacific': 'Pacific Ocean',
    'geo.indian': 'Indian Ocean',
    'geo.arctic': 'Arctic Ocean',
    'geo.southern': 'Southern Ocean',
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
    'cam.photoBy': '图片：{author} · YouTube',   // TARKISTAMATON
    'cam.othersHeading': '无法预览：',   // TARKISTAMATON
    'cam.thumbAlt': '{name} — 缩略图',   // TARKISTAMATON
    'cam.notLive': '直播未进行',   // TARKISTAMATON
    'cam.playVideo': '播放直播视频',   // TARKISTAMATON
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
    'settings.about': '关于与数据来源',   // TARKISTAMATON
    'settings.weatherSources': '天气数据：ECMWF、DWD、芬兰气象研究所 · 极光：NOAA SWPC',   // TARKISTAMATON
    'about.map': '地图数据',   // TARKISTAMATON
    'about.tiles': '地图瓦片',   // TARKISTAMATON
    'about.schema': '地图瓦片架构',   // TARKISTAMATON
    'about.coast': '远距离缩放时的海岸线',   // TARKISTAMATON
    'about.terrain': '地形晕渲',   // TARKISTAMATON
    'about.sat': '卫星影像',   // TARKISTAMATON
    'about.ecmwf': '云和风（IFS）',   // TARKISTAMATON
    'about.dwd': '云和风（ICON-EU）',   // TARKISTAMATON
    'about.fmi': '云和风（HARMONIE）',   // TARKISTAMATON
    'about.noaa': '极光预报和空间天气',   // TARKISTAMATON
    'about.youtube': '极光摄像头（图像和名称）',   // TARKISTAMATON
    'about.maplibre': '地图库',   // TARKISTAMATON
    'about.icons': '图标',   // TARKISTAMATON
    'about.fonts': '字体',   // TARKISTAMATON
    'time.backNow': '返回现在',   // TARKISTAMATON
    'info.ownBtn': '我的位置',   // TARKISTAMATON
    'info.pointBtn': '所选地点',   // TARKISTAMATON
    'info.locSeg': '位置',   // TARKISTAMATON
    'info.locOff': '无法定位',   // TARKISTAMATON
    'info.pickHint': '点击地图选择地点。',   // TARKISTAMATON
    'night.cls.great': '极佳',   // TARKISTAMATON
    'night.tip.chance': '可见度 {p}',   // TARKISTAMATON
    'night.tip.clouds': '云量 {c}',   // TARKISTAMATON
    'night.ver': '测试版本',   // TARKISTAMATON
    'night.src': '云量按小时，极光来自 NOAA Kp 预报（每 3 小时）。仅供参考。',   // TARKISTAMATON
    'night.best': '最佳时间 {times}',   // TARKISTAMATON
    'night.none': '今晚机会不大',   // TARKISTAMATON
    'night.loading': '正在加载云量预报…',   // TARKISTAMATON
    'night.noDark': '今晚天不够黑——太阳下沉不够低。',   // TARKISTAMATON
    'night.cls.weak': '较低',   // TARKISTAMATON
    'night.cls.good': '良好',   // TARKISTAMATON
    'night.now': '现在',   // TARKISTAMATON
    'night.legend.clouds': '云量',   // TARKISTAMATON
    'night.legend.aurora': '极光估计',   // TARKISTAMATON
    'night.col.time': '时间',   // TARKISTAMATON
    'night.col.clouds': '云量',   // TARKISTAMATON
    'night.col.aurora': '极光',   // TARKISTAMATON
    'night.col.chance': '可见度',   // TARKISTAMATON
    'night.chartAria': '夜间图表：按小时显示可见度、极光、云和月亮',   // TARKISTAMATON
    'night.chart.chance': '可见度',   // TARKISTAMATON
    'night.chart.aurora': '极光',   // TARKISTAMATON
    'night.chart.clouds': '云量',   // TARKISTAMATON
    'night.chart.moon': '月亮',   // TARKISTAMATON
    'night.tap': '在图表上滑动手指，查看每小时的数值。',   // TARKISTAMATON
    'night.tapTable': '按住一行片刻并滑动，查看每小时的数值。',   // TARKISTAMATON
    'night.fact.dark': '黑夜',   // TARKISTAMATON
    'night.fact.moon': '月亮',   // TARKISTAMATON
    'night.moonRise': '{t} 升起',   // TARKISTAMATON
    'night.moonSet': '{t} 落下',   // TARKISTAMATON
    'night.moonUp': '整夜可见',   // TARKISTAMATON
    'night.moonDown': '今晚不升起',   // TARKISTAMATON
    'night.moon.new': '新月',   // TARKISTAMATON
    'night.moon.waxCres': '蛾眉月',   // TARKISTAMATON
    'night.moon.firstQ': '上弦月',   // TARKISTAMATON
    'night.moon.waxGib': '盈凸月',   // TARKISTAMATON
    'night.moon.full': '满月',   // TARKISTAMATON
    'night.moon.waneGib': '亏凸月',   // TARKISTAMATON
    'night.moon.lastQ': '下弦月',   // TARKISTAMATON
    'night.moon.waneCres': '残月',   // TARKISTAMATON
    'info.tabs': '视图',   // TARKISTAMATON
    'info.tab.now': '现在',   // TARKISTAMATON
    'info.tab.night': '今晚',   // TARKISTAMATON
    'info.tab.week': '7 天',   // TARKISTAMATON
    'week.best': '最佳夜晚：{date}',   // TARKISTAMATON
    'week.bestSub': '可见度 {p}，{times}',   // TARKISTAMATON
    'week.none': '未来几天机会不大',   // TARKISTAMATON
    'week.col.night': '夜晚',   // TARKISTAMATON
    'week.col.vis': '可见度',   // TARKISTAMATON
    'week.col.clouds': '云量',   // TARKISTAMATON
    'week.col.kp': 'Kp',   // TARKISTAMATON
    'week.col.moon': '月亮',   // TARKISTAMATON
    'week.approxSep': '仅供参考 · Kp 来自 27 天展望',   // TARKISTAMATON
    'week.otherModel': '{model}，所选模型的预报未覆盖这么远',   // TARKISTAMATON
    'week.tap': '点按夜晚查看逐小时图表。',   // TARKISTAMATON
    'week.src': '可见度取当晚最佳小时。云量为黑暗时段平均值，Kp 为当晚最高预报值。极光依据 NOAA Kp 预报：前三晚为 3 小时时段，之后来自 27 天展望。仅供参考。',   // TARKISTAMATON
    'week.approx': '仅供参考',   // TARKISTAMATON
    'week.approxMax': '可见度最高 {p}（仅供参考）',   // TARKISTAMATON
    'week.noDark': '无黑夜',   // TARKISTAMATON
    'week.fact.temp': '最低气温',   // TARKISTAMATON
    'week.fact.wind': '最大风速',   // TARKISTAMATON
    'week.at': '{t}',   // TARKISTAMATON
    'week.src27': 'Kp 来自 27 天展望。',   // TARKISTAMATON
    'week.srcModel': '云量部分来自 {model}。',   // TARKISTAMATON
    'week.srcTemp': '气温和风：ECMWF。',   // TARKISTAMATON
    'week.kp27Err': '无法获取 27 天 Kp 展望——第 4–7 晚缺少极光估计。',   // TARKISTAMATON
    'info.index': '可见度指数',   // TARKISTAMATON
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
    'swc.name.kp': 'Kp 指数',   // TARKISTAMATON
    'swc.name.bz': 'Bz',
    'swc.name.bt': 'Bt',
    'swc.name.speed': '太阳风速度',   // TARKISTAMATON
    'swc.name.density': '太阳风密度',   // TARKISTAMATON
    'swc.name.power': '半球功率',   // TARKISTAMATON
    'swc.desc.kp': 'Kp——地球磁场的扰动程度，0–9 级，每 3 小时一个值。数值越大，极光可见的位置越靠南。',   // TARKISTAMATON
    'swc.desc.bz': 'Bz——磁场的南北方向分量。负值有利于极光。',   // TARKISTAMATON
    'swc.desc.bt': 'Bt——太阳风磁场的总强度。当 Bz 为负时，较大的 Bt 会增强极光。',   // TARKISTAMATON
    'swc.desc.speed': '太阳风速度。高速太阳风（超过 500 km/s）会增强极光。',   // TARKISTAMATON
    'swc.desc.density': '太阳风粒子密度。突然升高通常预示着扰动即将到来。',   // TARKISTAMATON
    'swc.desc.power': '北半球极光总功率（NOAA OVATION）。超过 50 GW 表示活动强烈。',   // TARKISTAMATON
    'swc.open': '打开图表',   // TARKISTAMATON
    'swc.range': '时间范围',   // TARKISTAMATON
    'swc.hours': '{n} 小时',   // TARKISTAMATON
    'swc.days': '{n} 天',   // TARKISTAMATON
    'swc.hint': '在图表上滑动手指查看数值。',   // TARKISTAMATON
    'swc.arrived': '已到达地球',   // TARKISTAMATON
    'swc.kpPeriod': '时段 {range}',   // TARKISTAMATON
    'swc.name.clouds': '云量',   // TARKISTAMATON
    'swc.desc.clouds': '云量——天空被云覆盖的比例。',   // TARKISTAMATON
    'swc.transitState': '正在前往地球',   // TARKISTAMATON
    'swc.dataStart': '数据始于 {time}',   // TARKISTAMATON
    'swc.note.dim': '阴影部分已在太空中测得，将在接下来的几分钟内到达地球。',   // TARKISTAMATON
    'swc.note.bt': '±Bt：磁场总强度。Bz 始终在此范围内变化。',   // TARKISTAMATON
    'swc.now': '现在',   // TARKISTAMATON
    'swc.stale': '无最新数据 · 最近测量 {time}',   // TARKISTAMATON
    'swc.noData': '此时段无数据',   // TARKISTAMATON
    'swc.kp.observed': '实测',   // TARKISTAMATON
    'swc.kp.estimated': '估计',   // TARKISTAMATON
    'swc.kp.predicted': '预报',   // TARKISTAMATON
    'swc.src.l1': '来源：NOAA SWPC，L1 点实时太阳风（1 分钟）。',   // TARKISTAMATON
    'swc.arr.noaa': '{label}：NOAA 计算的到达地球时间。',   // TARKISTAMATON
    'swc.arr.calc': '{label}：根据 L1 点距离（150 万公里）和当前速度估算。',   // TARKISTAMATON
    'swc.src.kp': '来源：NOAA SWPC，行星 Kp（实测与预报）。',   // TARKISTAMATON
    'swc.src.power': '来源：NOAA SWPC OVATION，每 5 分钟。NOAA 文件仅包含当前 UTC 日。',   // TARKISTAMATON
    'swc.chartAria': '{name}图表',   // TARKISTAMATON

    // Maanosat ja valtameret kartalla (2026-10, oma aineisto, ks. WORLD_LABEL_POINTS)
    'geo.europe': '欧洲',   // TARKISTAMATON
    'geo.asia': '亚洲',   // TARKISTAMATON
    'geo.africa': '非洲',   // TARKISTAMATON
    'geo.northAmerica': '北美洲',   // TARKISTAMATON
    'geo.southAmerica': '南美洲',   // TARKISTAMATON
    'geo.oceania': '大洋洲',   // TARKISTAMATON
    'geo.antarctica': '南极洲',   // TARKISTAMATON
    'geo.atlantic': '大西洋',   // TARKISTAMATON
    'geo.pacific': '太平洋',   // TARKISTAMATON
    'geo.indian': '印度洋',   // TARKISTAMATON
    'geo.arctic': '北冰洋',   // TARKISTAMATON
    'geo.southern': '南大洋',   // TARKISTAMATON
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
    'cam.photoBy': 'Imagen: {author} · YouTube',
    'cam.othersHeading': 'Vista previa no disponible:',
    'cam.thumbAlt': '{name} — miniatura',
    'cam.notLive': 'La emisión no está en directo',
    'cam.playVideo': 'Reproducir vídeo en directo',   // TARKISTA
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

    'flag.clouds': 'Nubosidad',   // TARKISTA
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
    'settings.model': 'Modelo',   // TARKISTA (lyhyt: 360 px:n näytöllä tila ei riitä)
    'settings.updatedAt': 'Actualizado {time}',   // TARKISTA
    'settings.about': 'Acerca de y fuentes',   // TARKISTA
    'settings.weatherSources': 'Datos meteorológicos: ECMWF, DWD, Instituto Meteorológico de Finlandia · Auroras: NOAA SWPC',   // TARKISTA
    'about.map': 'Datos del mapa',   // TARKISTA
    'about.tiles': 'Teselas del mapa',   // TARKISTA
    'about.schema': 'Esquema de teselas',   // TARKISTA
    'about.coast': 'Costas con zoom lejano',   // TARKISTA
    'about.terrain': 'Sombreado del relieve',   // TARKISTA
    'about.sat': 'Imágenes de satélite',   // TARKISTA
    'about.ecmwf': 'Nubes y viento (IFS)',   // TARKISTA
    'about.dwd': 'Nubes y viento (ICON-EU)',   // TARKISTA
    'about.fmi': 'Nubes y viento (HARMONIE)',   // TARKISTA
    'about.noaa': 'Pronóstico de auroras y clima espacial',   // TARKISTA
    'about.youtube': 'Cámaras de auroras (imágenes y nombres)',   // TARKISTA
    'about.maplibre': 'Biblioteca de mapas',   // TARKISTA
    'about.icons': 'Iconos',   // TARKISTA
    'about.fonts': 'Fuentes tipográficas',   // TARKISTA
    'time.backNow': 'Volver a ahora',   // TARKISTA
    'info.ownBtn': 'Mi ubicación',   // TARKISTA
    'info.pointBtn': 'Punto elegido',   // TARKISTA
    'info.locSeg': 'Ubicación',   // TARKISTA
    'info.locOff': 'Ubicación no disponible',   // TARKISTA
    'info.pickHint': 'Elige un punto tocando el mapa.',   // TARKISTA
    'night.cls.great': 'excelente',   // TARKISTA
    'night.tip.chance': 'Visibilidad {p}',   // TARKISTA
    'night.tip.clouds': 'Nubosidad {c}',   // TARKISTA
    'night.ver': 'Versión de prueba',   // TARKISTA
    'night.src': 'Nubes por horas, auroras según el pronóstico Kp de NOAA en periodos de 3 horas. Orientativo.',   // TARKISTA
    'night.best': 'Mejor momento: {times}',   // TARKISTA
    'night.none': 'Sin buenas oportunidades esta noche',   // TARKISTA
    'night.loading': 'Cargando el pronóstico de nubes…',   // TARKISTA
    'night.noDark': 'Esta noche no oscurece: el sol no baja lo suficiente.',   // TARKISTA
    'night.cls.weak': 'baja',   // TARKISTA
    'night.cls.good': 'buena',   // TARKISTA
    'night.now': 'ahora',   // TARKISTA
    'night.legend.clouds': 'Nubosidad',   // TARKISTA
    'night.legend.aurora': 'Previsión de auroras',   // TARKISTA
    'night.col.time': 'Hora',   // TARKISTA
    'night.col.clouds': 'Nubosidad',   // TARKISTA
    'night.col.aurora': 'Auroras',   // TARKISTA
    'night.col.chance': 'Visib.',   // TARKISTA
    'night.chartAria': 'Gráfico de la noche: visibilidad, auroras, nubes y luna por horas',   // TARKISTA
    'night.chart.chance': 'VISIBILIDAD',   // TARKISTA
    'night.chart.aurora': 'AURORAS',   // TARKISTA
    'night.chart.clouds': 'NUBOSIDAD',   // TARKISTA
    'night.chart.moon': 'LUNA',   // TARKISTA
    'night.tap': 'Desliza el dedo por el gráfico para ver los valores de cada hora.',   // TARKISTA
    'night.tapTable': 'Mantén pulsada una fila y desliza para ver los valores de cada hora.',   // TARKISTA
    'night.fact.dark': 'Oscuridad',   // TARKISTA
    'night.fact.moon': 'Luna',   // TARKISTA
    'night.moonRise': 'sale {t}',   // TARKISTA
    'night.moonSet': 'se pone {t}',   // TARKISTA
    'night.moonUp': 'visible toda la noche',   // TARKISTA
    'night.moonDown': 'no sale esta noche',   // TARKISTA
    'night.moon.new': 'Luna nueva',   // TARKISTA
    'night.moon.waxCres': 'Creciente',   // TARKISTA
    'night.moon.firstQ': 'Cuarto creciente',   // TARKISTA
    'night.moon.waxGib': 'Gibosa creciente',   // TARKISTA
    'night.moon.full': 'Luna llena',   // TARKISTA
    'night.moon.waneGib': 'Gibosa menguante',   // TARKISTA
    'night.moon.lastQ': 'Cuarto menguante',   // TARKISTA
    'night.moon.waneCres': 'Menguante',   // TARKISTA
    'info.tabs': 'Vista',   // TARKISTA
    'info.tab.now': 'Ahora',   // TARKISTA
    'info.tab.night': 'Esta noche',   // TARKISTA
    'info.tab.week': '7 días',   // TARKISTA
    'week.best': 'Mejor noche: {date}',   // TARKISTA
    'week.bestSub': 'Visibilidad {p} a las {times}',   // TARKISTA
    'week.none': 'Sin buenas oportunidades en los próximos días',   // TARKISTA
    'week.col.night': 'Noche',   // TARKISTA
    'week.col.vis': 'Visibilidad',   // TARKISTA
    'week.col.clouds': 'Nubes',   // TARKISTA
    'week.col.kp': 'Kp',   // TARKISTA
    'week.col.moon': 'Luna',   // TARKISTA
    'week.approxSep': 'Orientativo · Kp de la previsión a 27 días',   // TARKISTA
    'week.otherModel': '{model}, la previsión del modelo elegido no llega tan lejos',   // TARKISTA
    'week.tap': 'Toca una noche para ver el gráfico por horas.',   // TARKISTA
    'week.src': 'Visibilidad en la mejor hora de la noche. Nubosidad media de las horas oscuras, Kp el valor previsto más alto de la noche. Auroras según la previsión Kp de NOAA: las tres primeras noches en periodos de 3 horas, después según la previsión a 27 días. Orientativo.',   // TARKISTA
    'week.approx': 'orientativo',   // TARKISTA
    'week.approxMax': 'Visibilidad hasta {p} (orientativo)',   // TARKISTA
    'week.noDark': 'Sin oscuridad',   // TARKISTA
    'week.fact.temp': 'Temperatura mínima',   // TARKISTA
    'week.fact.wind': 'Viento máx.',   // TARKISTA
    'week.at': 'a las {t}',   // TARKISTA
    'week.src27': 'Kp de la previsión a 27 días.',   // TARKISTA
    'week.srcModel': 'Nubosidad en parte de {model}.',   // TARKISTA
    'week.srcTemp': 'Temperatura y viento: ECMWF.',   // TARKISTA
    'week.kp27Err': 'No se pudo cargar la previsión Kp a 27 días: sin estimación de auroras para las noches 4–7.',   // TARKISTA
    'info.index': 'Índice de visibilidad',   // TARKISTA
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
    'swc.name.kp': 'Índice Kp',   // TARKISTA
    'swc.name.bz': 'Bz',
    'swc.name.bt': 'Bt',
    'swc.name.speed': 'Velocidad del viento solar',   // TARKISTA
    'swc.name.density': 'Densidad del viento solar',   // TARKISTA
    'swc.name.power': 'Potencia hemisférica',   // TARKISTA
    'swc.desc.kp': 'Kp: perturbación del campo magnético terrestre en una escala de 0 a 9, en periodos de 3 horas. Cuanto mayor es, más al sur pueden verse auroras.',   // TARKISTA
    'swc.desc.bz': 'Bz: dirección norte–sur del campo magnético. Un valor negativo favorece las auroras.',   // TARKISTA
    'swc.desc.bt': 'Bt: intensidad total del campo magnético del viento solar. Un Bt alto refuerza las auroras cuando Bz es negativo.',   // TARKISTA
    'swc.desc.speed': 'Velocidad del viento solar. Un viento rápido (más de 500 km/s) intensifica las auroras.',   // TARKISTA
    'swc.desc.density': 'Densidad de partículas del viento solar. Un aumento repentino suele anunciar la llegada de una perturbación.',   // TARKISTA
    'swc.desc.power': 'Potencia auroral total en el hemisferio norte (NOAA OVATION). Más de 50 GW indica actividad intensa.',   // TARKISTA
    'swc.open': 'abrir gráfico',   // TARKISTA
    'swc.range': 'Intervalo',   // TARKISTA
    'swc.hours': '{n} h',
    'swc.days': '{n} días',   // TARKISTA
    'swc.hint': 'Desliza el dedo por el gráfico para ver los valores.',   // TARKISTA
    'swc.arrived': 'Llegado a la Tierra',   // TARKISTA
    'swc.kpPeriod': 'periodo {range}',   // TARKISTA
    'swc.name.clouds': 'Nubosidad',   // TARKISTA
    'swc.desc.clouds': 'Nubosidad: qué parte del cielo está cubierta de nubes.',   // TARKISTA
    'swc.transitState': 'En camino a la Tierra',   // TARKISTA
    'swc.dataStart': 'Datos desde {time}',   // TARKISTA
    'swc.note.dim': 'La parte sombreada se ha medido en el espacio y llegará a la Tierra en los próximos minutos.',   // TARKISTA
    'swc.note.bt': '±Bt: intensidad total del campo. Bz siempre se mueve dentro de este límite.',   // TARKISTA
    'swc.now': 'Ahora',   // TARKISTA
    'swc.stale': 'Sin datos recientes · última medición {time}',   // TARKISTA
    'swc.noData': 'Sin datos para este periodo',   // TARKISTA
    'swc.kp.observed': 'medido',   // TARKISTA
    'swc.kp.estimated': 'estimado',   // TARKISTA
    'swc.kp.predicted': 'previsión',   // TARKISTA
    'swc.src.l1': 'Fuente: NOAA SWPC, viento solar en tiempo real en L1 (1 min).',   // TARKISTA
    'swc.arr.noaa': '{label}: hora de llegada a la Tierra calculada por NOAA.',   // TARKISTA
    'swc.arr.calc': '{label}: estimación a partir de la distancia de L1 (1,5 millones de km) y la velocidad actual.',   // TARKISTA
    'swc.src.kp': 'Fuente: NOAA SWPC, Kp planetario (medido y previsión).',   // TARKISTA
    'swc.src.power': 'Fuente: NOAA SWPC OVATION, cada 5 min. El archivo de NOAA solo cubre el día UTC actual.',   // TARKISTA
    'swc.chartAria': 'Gráfico: {name}',   // TARKISTA

    // Maanosat ja valtameret kartalla (2026-10, oma aineisto, ks. WORLD_LABEL_POINTS)
    'geo.europe': 'Europa',   // TARKISTA
    'geo.asia': 'Asia',   // TARKISTA
    'geo.africa': 'África',   // TARKISTA
    'geo.northAmerica': 'América del Norte',   // TARKISTA
    'geo.southAmerica': 'América del Sur',   // TARKISTA
    'geo.oceania': 'Oceanía',   // TARKISTA
    'geo.antarctica': 'Antártida',   // TARKISTA
    'geo.atlantic': 'Océano Atlántico',   // TARKISTA
    'geo.pacific': 'Océano Pacífico',   // TARKISTA
    'geo.indian': 'Océano Índico',   // TARKISTA
    'geo.arctic': 'Océano Ártico',   // TARKISTA
    'geo.southern': 'Océano Antártico',   // TARKISTA
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
    'cam.photoBy': 'Image : {author} · YouTube',
    'cam.othersHeading': 'Aperçu indisponible :',
    'cam.thumbAlt': '{name} — miniature',
    'cam.notLive': 'Le direct est interrompu',   // TARKISTA
    'cam.playVideo': 'Lire la vidéo en direct',   // TARKISTA
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

    'flag.clouds': 'Nébulosité',   // TARKISTA
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
    'settings.model': 'Modèle',   // TARKISTA (lyhyt: 360 px:n näytöllä tila ei riitä)
    'settings.updatedAt': 'Mis à jour {time}',   // TARKISTA
    'settings.about': 'À propos et sources',   // TARKISTA
    'settings.weatherSources': 'Données météo : ECMWF, DWD, Institut météorologique finlandais · Aurores : NOAA SWPC',   // TARKISTA
    'about.map': 'Données cartographiques',   // TARKISTA
    'about.tiles': 'Tuiles cartographiques',   // TARKISTA
    'about.schema': 'Schéma des tuiles',   // TARKISTA
    'about.coast': 'Côtes aux zooms éloignés',   // TARKISTA
    'about.terrain': 'Ombrage du relief',   // TARKISTA
    'about.sat': 'Imagerie satellite',   // TARKISTA
    'about.ecmwf': 'Nuages et vent (IFS)',   // TARKISTA
    'about.dwd': 'Nuages et vent (ICON-EU)',   // TARKISTA
    'about.fmi': 'Nuages et vent (HARMONIE)',   // TARKISTA
    'about.noaa': 'Prévision des aurores et météo spatiale',   // TARKISTA
    'about.youtube': 'Caméras d’aurores (images et noms)',   // TARKISTA
    'about.maplibre': 'Bibliothèque cartographique',   // TARKISTA
    'about.icons': 'Icônes',   // TARKISTA
    'about.fonts': 'Polices',   // TARKISTA
    'time.backNow': 'Revenir à maintenant',   // TARKISTA
    'info.ownBtn': 'Ma position',   // TARKISTA
    'info.pointBtn': 'Point choisi',   // TARKISTA
    'info.locSeg': 'Position',   // TARKISTA
    'info.locOff': 'Position non disponible',   // TARKISTA
    'info.pickHint': 'Choisissez un point en touchant la carte.',   // TARKISTA
    'night.cls.great': 'excellente',   // TARKISTA
    'night.tip.chance': 'Visibilité {p}',   // TARKISTA
    'night.tip.clouds': 'Nébulosité {c}',   // TARKISTA
    'night.ver': 'Version de test',   // TARKISTA
    'night.src': 'Nuages heure par heure, aurores selon la prévision Kp de la NOAA par périodes de 3 heures. Indicatif.',   // TARKISTA
    'night.best': 'Meilleur moment : {times}',   // TARKISTA
    'night.none': 'Pas de bonnes chances cette nuit',   // TARKISTA
    'night.loading': 'Chargement de la prévision nuageuse…',   // TARKISTA
    'night.noDark': 'Pas d’obscurité cette nuit : le soleil ne descend pas assez bas.',   // TARKISTA
    'night.cls.weak': 'faible',   // TARKISTA
    'night.cls.good': 'bonne',   // TARKISTA
    'night.now': 'maint.',   // TARKISTA
    'night.legend.clouds': 'Nébulosité',   // TARKISTA
    'night.legend.aurora': 'Prévision d’aurores',   // TARKISTA
    'night.col.time': 'Heure',   // TARKISTA
    'night.col.clouds': 'Nébulosité',   // TARKISTA
    'night.col.aurora': 'Aurores',   // TARKISTA
    'night.col.chance': 'Visib.',   // TARKISTA
    'night.chartAria': 'Graphique de la nuit : visibilité, aurores, nuages et lune par heure',   // TARKISTA
    'night.chart.chance': 'VISIBILITÉ',   // TARKISTA
    'night.chart.aurora': 'AURORES',   // TARKISTA
    'night.chart.clouds': 'NÉBULOSITÉ',   // TARKISTA
    'night.chart.moon': 'LUNE',   // TARKISTA
    'night.tap': 'Faites glisser le doigt sur le graphique pour voir les valeurs de chaque heure.',   // TARKISTA
    'night.tapTable': 'Appuyez un instant sur une ligne et glissez pour voir les valeurs de chaque heure.',   // TARKISTA
    'night.fact.dark': 'Obscurité',   // TARKISTA
    'night.fact.moon': 'Lune',   // TARKISTA
    'night.moonRise': 'se lève {t}',   // TARKISTA
    'night.moonSet': 'se couche {t}',   // TARKISTA
    'night.moonUp': 'visible toute la nuit',   // TARKISTA
    'night.moonDown': 'absente cette nuit',   // TARKISTA
    'night.moon.new': 'Nouvelle lune',   // TARKISTA
    'night.moon.waxCres': 'Premier croissant',   // TARKISTA
    'night.moon.firstQ': 'Premier quartier',   // TARKISTA
    'night.moon.waxGib': 'Gibbeuse croissante',   // TARKISTA
    'night.moon.full': 'Pleine lune',   // TARKISTA
    'night.moon.waneGib': 'Gibbeuse décroissante',   // TARKISTA
    'night.moon.lastQ': 'Dernier quartier',   // TARKISTA
    'night.moon.waneCres': 'Dernier croissant',   // TARKISTA
    'info.tabs': 'Vue',   // TARKISTA
    'info.tab.now': 'Maintenant',   // TARKISTA
    'info.tab.night': 'Cette nuit',   // TARKISTA
    'info.tab.week': '7 jours',   // TARKISTA
    'week.best': 'Meilleure nuit : {date}',   // TARKISTA
    'week.bestSub': 'Visibilité {p} à {times}',   // TARKISTA
    'week.none': 'Pas de bonnes chances dans les prochains jours',   // TARKISTA
    'week.col.night': 'Nuit',   // TARKISTA
    'week.col.vis': 'Visibilité',   // TARKISTA
    'week.col.clouds': 'Nuages',   // TARKISTA
    'week.col.kp': 'Kp',   // TARKISTA
    'week.col.moon': 'Lune',   // TARKISTA
    'week.approxSep': 'Indicatif · Kp de la prévision à 27 jours',   // TARKISTA
    'week.otherModel': '{model}, la prévision du modèle choisi ne va pas aussi loin',   // TARKISTA
    'week.tap': 'Touchez une nuit pour voir le graphique horaire.',   // TARKISTA
    'week.src': 'Visibilité à la meilleure heure de la nuit. Nébulosité moyenne des heures sombres, Kp la valeur prévue la plus élevée de la nuit. Aurores selon la prévision Kp de la NOAA : les trois premières nuits par périodes de 3 heures, ensuite selon la prévision à 27 jours. Indicatif.',   // TARKISTA
    'week.approx': 'indicatif',   // TARKISTA
    'week.approxMax': 'Visibilité jusqu’à {p} (indicatif)',   // TARKISTA
    'week.noDark': 'Pas d’obscurité',   // TARKISTA
    'week.fact.temp': 'Température minimale',   // TARKISTA
    'week.fact.wind': 'Vent max.',   // TARKISTA
    'week.at': 'à {t}',   // TARKISTA
    'week.src27': 'Kp de la prévision à 27 jours.',   // TARKISTA
    'week.srcModel': 'Nébulosité en partie de {model}.',   // TARKISTA
    'week.srcTemp': 'Température et vent : ECMWF.',   // TARKISTA
    'week.kp27Err': 'Prévision Kp à 27 jours indisponible – pas d’estimation d’aurores pour les nuits 4 à 7.',   // TARKISTA
    'info.index': 'Indice de visibilité',   // TARKISTA
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
    'swc.name.kp': 'Indice Kp',   // TARKISTA
    'swc.name.bz': 'Bz',
    'swc.name.bt': 'Bt',
    'swc.name.speed': 'Vitesse du vent solaire',   // TARKISTA
    'swc.name.density': 'Densité du vent solaire',   // TARKISTA
    'swc.name.power': 'Puissance hémisphérique',   // TARKISTA
    'swc.desc.kp': 'Kp : perturbation du champ magnétique terrestre sur une échelle de 0 à 9, par périodes de 3 heures. Plus la valeur est élevée, plus les aurores sont visibles au sud.',   // TARKISTA
    'swc.desc.bz': 'Bz : orientation nord–sud du champ magnétique. Une valeur négative favorise les aurores.',   // TARKISTA
    'swc.desc.bt': 'Bt : intensité totale du champ magnétique du vent solaire. Un Bt élevé renforce les aurores quand Bz est négatif.',   // TARKISTA
    'swc.desc.speed': 'Vitesse du vent solaire. Un vent rapide (plus de 500 km/s) renforce les aurores.',   // TARKISTA
    'swc.desc.density': 'Densité de particules du vent solaire. Une hausse soudaine annonce souvent l’arrivée d’une perturbation.',   // TARKISTA
    'swc.desc.power': 'Puissance aurorale totale sur l’hémisphère nord (NOAA OVATION). Plus de 50 GW indique une forte activité.',   // TARKISTA
    'swc.open': 'ouvrir le graphique',   // TARKISTA
    'swc.range': 'Période',   // TARKISTA
    'swc.hours': '{n} h',
    'swc.days': '{n} j',   // TARKISTA
    'swc.hint': 'Faites glisser le doigt sur le graphique pour voir les valeurs.',   // TARKISTA
    'swc.arrived': 'Arrivé sur Terre',   // TARKISTA
    'swc.kpPeriod': 'période {range}',   // TARKISTA
    'swc.name.clouds': 'Nébulosité',   // TARKISTA
    'swc.desc.clouds': 'Nébulosité : part du ciel couverte de nuages.',   // TARKISTA
    'swc.transitState': 'En route vers la Terre',   // TARKISTA
    'swc.dataStart': 'Données depuis {time}',   // TARKISTA
    'swc.note.dim': 'La partie grisée a été mesurée dans l’espace et atteindra la Terre dans les prochaines minutes.',   // TARKISTA
    'swc.note.bt': '±Bt : intensité totale du champ. Bz reste toujours à l’intérieur de cette limite.',   // TARKISTA
    'swc.now': 'Maintenant',   // TARKISTA
    'swc.stale': 'Pas de données récentes · dernière mesure {time}',   // TARKISTA
    'swc.noData': 'Aucune donnée pour cette période',   // TARKISTA
    'swc.kp.observed': 'mesuré',   // TARKISTA
    'swc.kp.estimated': 'estimé',   // TARKISTA
    'swc.kp.predicted': 'prévision',   // TARKISTA
    'swc.src.l1': 'Source : NOAA SWPC, vent solaire en temps réel au point L1 (1 min).',   // TARKISTA
    'swc.arr.noaa': '{label} : heure d’arrivée sur Terre calculée par la NOAA.',   // TARKISTA
    'swc.arr.calc': '{label} : estimation d’après la distance de L1 (1,5 million de km) et la vitesse actuelle.',   // TARKISTA
    'swc.src.kp': 'Source : NOAA SWPC, Kp planétaire (mesuré et prévision).',   // TARKISTA
    'swc.src.power': 'Source : NOAA SWPC OVATION, toutes les 5 min. Le fichier de la NOAA ne couvre que le jour UTC en cours.',   // TARKISTA
    'swc.chartAria': 'Graphique : {name}',   // TARKISTA

    // Maanosat ja valtameret kartalla (2026-10, oma aineisto, ks. WORLD_LABEL_POINTS)
    'geo.europe': 'Europe',   // TARKISTA
    'geo.asia': 'Asie',   // TARKISTA
    'geo.africa': 'Afrique',   // TARKISTA
    'geo.northAmerica': 'Amérique du Nord',   // TARKISTA
    'geo.southAmerica': 'Amérique du Sud',   // TARKISTA
    'geo.oceania': 'Océanie',   // TARKISTA
    'geo.antarctica': 'Antarctique',   // TARKISTA
    'geo.atlantic': 'Océan Atlantique',   // TARKISTA
    'geo.pacific': 'Océan Pacifique',   // TARKISTA
    'geo.indian': 'Océan Indien',   // TARKISTA
    'geo.arctic': 'Océan Arctique',   // TARKISTA
    'geo.southern': 'Océan Austral',   // TARKISTA
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
