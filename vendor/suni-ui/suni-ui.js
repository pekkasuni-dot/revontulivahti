/* suni-ui 0.1.1 - GENEROITU (scripts/build.mjs), älä muokkaa: muuta src/:ssä */
/* SUNI-UI JS: tavallinen skripti (ei moduuli), asettaa window.SuniUI. Toimii sellaisenaan revontulessa (<script src>)
   ja Vitessä (import './vendor/suni-ui/suni-ui.js'). Ei riippuvuuksia; puhtaat funktiot testataan Nodessa. */
(function(root){
  'use strict';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* Alaikkunan geometria (revontuli päätös 8): --sp = 0 puolikas ... 1 täysi korkeudesta h. */
  function sheetProgress(h, halfH, fullH){
    return clamp((h - halfH) / Math.max(1, fullH - halfH), 0, 1);
  }
  /* Kolmen koon ikkuna (täysi / puolikas / kiinni): lähtötila, siirtymä dy px (+ alas), nopeus v px/ms. */
  const SHEET = {flick: 0.5, moveMin: 40, dragStart: 10, closeFrac: 0.25};
  function snapTarget(start, dy, v, o){
    o = Object.assign({}, SHEET, o);
    const down = v > o.flick || dy > o.moveMin, up = v < -o.flick || dy < -o.moveMin;
    if(start === 'full') return down ? 'half' : 'full';
    if(start === 'half') return down ? 'closed' : up ? 'full' : 'half';
    return up ? 'full' : 'closed';
  }
  /* Täysi/kiinni-ikkuna: sulkeutuu nopeasta vedosta alas tai yli neljänneksen korkeudesta. */
  function fullDragCloses(dy, v, fullH, o){
    o = Object.assign({}, SHEET, o);
    return v > o.flick || dy > fullH * o.closeFrac;
  }

  /* Välilehtien liukuva alleviivaus. */
  function placeTabInd(ind, sel, animate){
    if(!ind || !sel || !sel.offsetWidth) return;
    ind.classList.toggle('no-anim', !animate);
    ind.style.width = sel.offsetWidth + 'px';
    ind.style.transform = 'translateX(' + sel.offsetLeft + 'px)';
    if(!animate) void ind.offsetWidth;
  }

  /* Haptiikka (päätös 25): vain Capacitor-sovelluksessa, selaimessa ei värinää. isEnabled = käyttäjän asetus. */
  function createHaptics(opts){
    opts = opts || {};
    const cap = root.Capacitor;
    const plugin = cap && cap.isNativePlatform && cap.isNativePlatform() && cap.registerPlugin ? cap.registerPlugin('Haptics') : null;
    const isEnabled = opts.isEnabled || (() => true), tickMinMs = opts.tickMinMs || 25;
    return {
      supported: !!plugin, started: false, last: 0,
      call(fn, arg){
        if(!plugin || !isEnabled()) return;
        try{ const r = plugin[fn](arg); if(r && r.catch) r.catch(() => {}); }catch(e){}
      },
      start(){ if(!this.started){ this.started = true; this.call('selectionStart'); } },
      tick(){ const now = Date.now(); if(now - this.last < tickMinMs) return; this.last = now; this.start(); this.call('selectionChanged'); },
      end(){ if(this.started){ this.started = false; this.call('selectionEnd'); } },
      impact(){ this.call('impact', {style: 'LIGHT'}); },
      selection(){ this.call('selectionStart'); this.call('selectionChanged'); this.call('selectionEnd'); this.started = false; },
    };
  }
  /* Yksi dokumentin click-käsittelijä: kaikki kytkimet (valinta muuttui) ja paneelin lasinapit (kevyt isku). */
  function installHaptics(h, opts){
    opts = opts || {};
    const impactSel = opts.impactSel || '.gbtn-sm';
    root.document.addEventListener('click', e => {
      const sw = e.target.closest('[role="switch"]');
      if(sw && sw.getAttribute('aria-disabled') !== 'true' && !sw.disabled){ h.selection(); return; }
      if(e.target.closest(impactSel)) h.impact();
    });
  }

  /* Painallus (päätös 27 v2): .gb-press pointerdownista pointerupiin, kiilto seuraa sormea. onPress(el) = esim. linssi. */
  function installPress(opts){
    opts = opts || {};
    const sel = opts.sel || '.gbtn, .gbtn-sm', doc = root.document;
    let pressed = null;
    const xy = (el, e) => {
      const r = el.getBoundingClientRect();
      if(!r.width) return;
      el.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      el.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    };
    const release = () => {
      if(!pressed) return;
      pressed.classList.remove('gb-press', 'gb-lensing');
      if(opts.onRelease) opts.onRelease(pressed);
      pressed = null;
    };
    doc.addEventListener('pointerdown', e => {
      const el = e.target.closest(sel);
      if(!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
      release();
      pressed = el; xy(el, e);
      el.classList.add('gb-press');
      if(opts.onPress) opts.onPress(el, e);
    }, true);
    doc.addEventListener('pointermove', e => { if(pressed) xy(pressed, e); }, {capture: true, passive: true});
    for(const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) doc.addEventListener(ev, release, true);
    root.addEventListener('blur', release);
    return {release, get pressed(){ return pressed; }};
  }

  root.SuniUI = {VERSION: '0.1.1', SHEET, sheetProgress, snapTarget, fullDragCloses, placeTabInd,
    createHaptics, installHaptics, installPress};
})(typeof window !== 'undefined' ? window : globalThis);
