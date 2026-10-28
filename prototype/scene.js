/* The living lakeside, shared by Ambient Home (index.html) and Ambient Wallpaper (wallpaper.html): a sky, land and
   lake that follow the time of day, the sun and moon, the weather and the season, with life of their own.
   Elements marked data-scene anywhere on the page (clock, date, weather, forecast) are kept up to date as well.
   Written in ES5 style for the TV's web engine. */
window.SCENE = (function () {
  'use strict';

  var C = window.HOME_CONFIG;
  var ART = window.HOME_ART;

  var PHASES = ['dawn', 'morning', 'day', 'golden', 'dusk', 'night'];
  var CONDITIONS = ['clear', 'partly', 'cloudy', 'rain', 'storm', 'snow', 'fog'];
  var SEASONS = ['spring', 'summer', 'autumn', 'winter'];
  var COND_LABEL = {
    clear: 'Clear', partly: 'Partly cloudy', cloudy: 'Cloudy', rain: 'Light rain',
    storm: 'Thunderstorm', snow: 'Snow', fog: 'Fog'
  };
  var PHASE_LABEL = { dawn: 'Dawn', morning: 'Morning', day: 'Midday', golden: 'Golden hour', dusk: 'Dusk', night: 'Night' };
  // Landscape colours per time of day: far mountains, pine hills, near shore. Farther layers sit closer to the sky.
  var LAND = {
    dawn: ['#564a72', '#241e36', '#14101f'], morning: ['#6588a8', '#223b50', '#111f2d'],
    day: ['#5c8ab2', '#1d3953', '#0e1f30'], golden: ['#835d7c', '#302237', '#1a1121'],
    dusk: ['#46345c', '#1e152d', '#100c1b'], night: ['#111930', '#090d1c', '#04060c']
  };
  var SNOWCAP = { dawn: 0.6, morning: 0.85, day: 0.9, golden: 0.65, dusk: 0.35, night: 0.16 };
  var CROWN_SHADE = { dawn: 0.45, morning: 0.2, day: 0.1, golden: 0.35, dusk: 0.62, night: 0.86 };
  // How bright snow lying on the land looks at each time of day.
  var LAND_SNOW = { dawn: 0.6, morning: 0.82, day: 0.88, golden: 0.62, dusk: 0.45, night: 0.3 };
  var BIRD_COLOR = { dawn: '#2a2238', morning: '#1f3347', day: '#1d2a3a', golden: '#2a1c26' };
  // Bad weather greys out the sky and, more lightly, the landscape: colour and strength of each part of the veil.
  var VEIL = {
    cloudy: { sky: ['#3a4250', 0.42], land: ['#2b313d', 0.22] }, rain: { sky: ['#343b48', 0.56], land: ['#262c38', 0.38] },
    storm: { sky: ['#2a303b', 0.7], land: ['#1c212b', 0.5] }, snow: { sky: ['#4a5262', 0.36], land: ['#d5dce6', 0.18] },
    fog: { sky: ['#5a6272', 0.3], land: ['#c3cad6', 0.34] }
  };
  var LEAF_COLORS = {
    autumn: ['#d9622b', '#e8a33a', '#b84a2a', '#cf7a2c', '#f0c048'],
    spring: ['#f7c6d4', '#fbe0e8', '#f2a7bf']
  };
  var LAYERS = ['stars', 'sun', 'moon', 'clouds', 'fogFar', 'fogNear', 'glitter', 'shimmer', 'ripples',
    'cabinLight', 'smoke', 'fireflies', 'veil', 'leaves', 'rain', 'snow', 'snowNear', 'farSnow', 'midSnow', 'nearSnow'];
  var PARALLAX = 110;   // pixels a layer at depth 1 shifts between the two ends of a pan
  // The week shown until a location is set: conditions, and highs and lows around the demo day's.
  var DEMO_WEEK = [['partly', 0, 0], ['clear', 2, 1], ['rain', -3, -1], ['cloudy', -4, -2], ['clear', -1, -1], ['storm', 1, 2], ['partly', -2, 0]];

  var stage = null, hooks = {};
  var demo = C.weather.demo;
  var state = {
    weather: demo, sunrise: toMinutes(demo.sunrise), sunset: toMinutes(demo.sunset), moon: null, forecast: null,
    phase: null, cond: null, season: null, sim: null, preview: null, condOverride: null, seasonOverride: null
  };
  var recolorTimer = null, lapse = null, lastMinute = -1, lastDay = '';

  // ---------- Helpers ----------
  function byId(id) { return document.getElementById(id); }
  function each(nodes, fn) { Array.prototype.forEach.call(nodes, fn); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function rand(min, max) { return min + Math.random() * (max - min); }
  function px(v) { return Math.round(v) + 'px'; }
  function toMinutes(hhmm) { var p = String(hhmm).split(':'); return +p[0] * 60 + +p[1]; }
  function fmtTime(m) {
    var h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60);
    return (h % 12 || 12) + ':' + (mm < 10 ? '0' : '') + mm + ' ' + (h < 12 ? 'AM' : 'PM');
  }
  // The page asks the scene to rest (behind an idle screen, for example): no life events, no quality checks.
  function paused() { return !!(hooks.paused && hooks.paused()); }
  function show(name, fn) { each(document.querySelectorAll('[data-scene="' + name + '"]'), fn); }
  function showText(name, text) { show(name, function (e) { e.textContent = text; }); }
  function showHtml(name, html) { show(name, function (e) { e.innerHTML = html; }); }

  // ---------- Building the scene ----------
  var MARKUP =
    '<div id="wallpaper" class="fill" aria-hidden="true">' +
      '<div class="sky fill" data-phase="dawn"></div><div class="sky fill" data-phase="morning"></div>' +
      '<div class="sky fill" data-phase="day"></div><div class="sky fill" data-phase="golden"></div>' +
      '<div class="sky fill" data-phase="dusk"></div><div class="sky fill" data-phase="night"></div>' +
      '<div id="stars" class="stars fill"></div>' +
      '<div id="shooting" class="shooting"><i></i></div>' +
      '<div id="celestial" class="celestial" data-depth="0.04">' +
        '<div id="sun" class="sun"></div>' +
        '<div id="moon" class="moon"><div id="moonGlow" class="moon-glow"></div><div id="moonDisc" class="moon-disc"></div></div>' +
      '</div>' +
      '<div id="bolt" class="bolt"></div>' +
      '<div id="clouds" class="clouds fill" data-depth="0.08"></div>' +
      '<div id="birds" class="birds"></div>' +
      '<div id="farLayer" class="layer" data-depth="0.16"></div>' +
      '<div id="fogFar" class="fog-band fog-far"></div>' +
      '<div id="midLayer" class="layer" data-depth="0.3"></div>' +
      '<div id="nearLayer" class="layer" data-depth="0.5">' +
        '<div id="shore"></div><div id="nearSnow" class="land-snow"></div><div id="cabinLight" class="cabin-light"></div>' +
        '<div id="smoke" class="smoke"></div><div id="fireflies" class="fireflies"></div>' +
      '</div>' +
      '<div id="shimmer" class="shimmer fill"></div>' +
      '<div id="glitter" class="glitter"><div id="glitterA" class="glitter-a"></div><div id="glitterB" class="glitter-b"></div></div>' +
      '<div id="ripples" class="ripples fill"></div>' +
      '<div id="fogNear" class="fog-band fog-near"></div>' +
      '<div id="veil" class="veil fill"></div>' +
      '<div id="leaves" class="leaves fill"></div>' +
      '<div id="rain" class="rain fill"><div id="rain1" class="rain-layer"></div></div>' +
      '<div id="snow" class="snow fill"><div class="snow-sway fill"><div id="snow1" class="snow-layer"></div></div></div>' +
      '<div id="snowNear" class="snow-near fill"></div>' +
      '<div id="flash" class="flash fill"></div>' +
    '</div>';

  function setTile(id, svg, size) {
    var e = byId(id);
    e.style.backgroundImage = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
    e.style.backgroundSize = size + 'px ' + size + 'px';
  }

  function build() {
    stage.insertAdjacentHTML('afterbegin', MARKUP);
    var html = '', i, s, spot, twinkle, dur;
    for (i = 0; i < 80; i++) {
      s = Math.random() < 0.15 ? 3 : Math.random() < 0.5 ? 2 : 1.5;
      twinkle = Math.random() < 0.15;
      html += '<i class="star' + (twinkle ? ' twinkle' : '') + '" style="left:' + px(rand(0, 1920)) + ';top:' + px(rand(0, 600)) +
        ';width:' + s + 'px;height:' + s + 'px;opacity:' + rand(0.35, 0.95).toFixed(2) +
        (twinkle ? ';animation-duration:' + rand(3, 7).toFixed(1) + 's;animation-delay:-' + rand(0, 5).toFixed(1) + 's' : '') +
        '"></i>';
    }
    byId('stars').innerHTML = html;

    // Clouds keep mostly to the upper sky, away from the app rows.
    html = '';
    for (i = 0; i < 5; i++) {
      dur = rand(170, 310);
      html += '<div class="cloud" style="top:' + px(rand(20, 320)) + ';width:' + px(rand(340, 600)) +
        ';opacity:' + rand(0.5, 0.9).toFixed(2) + ';animation-duration:' + Math.round(dur) +
        's;animation-delay:-' + Math.round(rand(0, dur)) + 's">' + ART.cloud(ART.uid()) + '</div>';
    }
    byId('clouds').innerHTML = html;

    byId('farLayer').innerHTML = ART.farRange(ART.uid()) + '<div id="farSnow" class="land-snow">' + ART.farSnow(ART.uid()) + '</div>';
    byId('midLayer').innerHTML = ART.hillRange(ART.uid()) + '<div id="midSnow" class="land-snow">' + ART.hillSnow(ART.uid()) + '</div>';
    byId('wallpaper').style.setProperty('--water', 'url("data:image/svg+xml,' + encodeURIComponent(ART.waterLines()) + '")');
    byId('glitterA').innerHTML = ART.glitter(3);
    byId('glitterB').innerHTML = ART.glitter(17);

    // The lake shows between the rows: under the shoreline, and to the right of the inputs.
    function lakeSpot(i, split) {
      return i < split ? [rand(640, 1860), rand(618, 656)] : [rand(1250, 1860), rand(830, 1010)];
    }
    html = '';
    for (i = 0; i < 6; i++) {
      spot = lakeSpot(i, 4);
      html += '<i class="shim" style="left:' + px(spot[0]) + ';top:' + px(spot[1]) + ';width:' + px(rand(60, 260)) +
        ';background:rgba(255,255,255,' + (0.14 * ART.shade(spot[1])).toFixed(3) + ')' +
        ';animation-duration:' + rand(12, 22).toFixed(1) + 's;animation-delay:-' + rand(0, 12).toFixed(1) + 's"></i>';
    }
    byId('shimmer').innerHTML = html;

    html = '';
    for (i = 0; i < 10; i++) {
      spot = lakeSpot(i, 6);
      html += '<i class="ripple" style="left:' + px(spot[0]) + ';top:' + px(spot[1]) +
        ';border-color:rgba(220,230,245,' + (0.55 * ART.shade(spot[1])).toFixed(2) + ');animation-duration:' + rand(1.4, 2.4).toFixed(2) +
        's;animation-delay:-' + rand(0, 2).toFixed(2) + 's"></i>';
    }
    byId('ripples').innerHTML = html;

    // Fireflies along the shore (layer coordinates, like the cabin).
    html = '';
    for (i = 0; i < 10; i++) {
      html += '<i class="ff" style="left:' + px(rand(1150, 2050)) + ';top:' + px(i < 7 ? rand(480, 595) : rand(618, 660)) +
        ';animation-duration:' + rand(7, 13).toFixed(1) + 's;animation-delay:-' + rand(0, 8).toFixed(1) + 's"></i>';
    }
    byId('fireflies').innerHTML = html;

    html = '';
    for (i = 0; i < 6; i++) html += '<i class="puff" style="animation-delay:-' + (i * 1.33).toFixed(2) + 's"></i>';
    byId('smoke').innerHTML = html;

    byId('cabinLight').innerHTML = '<i class="cabin-glow"></i>' +
      '<i class="cabin-win" style="left:1534px;top:558px;width:18px;height:14px"></i>' +
      '<i class="cabin-win" style="left:1590px;top:558px;width:18px;height:14px"></i>' +
      '<i class="cabin-win cabin-door" style="left:1563px;top:565px;width:14px;height:26px"></i>' +
      '<div class="cabin-trail">' + ART.windowTrails() + '</div>';

    setTile('rain1', ART.rainTile(420, [[14, 'rgba(205,220,240,0.34)', 1.6], [12, 'rgba(205,220,240,0.2)', 1.2]]), 420);
    setTile('snow1', ART.snowTile(480, [[20, 1.4, 3.4, 0.8], [24, 0.8, 2.2, 0.55]]), 480);
    html = '';
    for (i = 0; i < 14; i++) {
      s = Math.round(rand(8, 18));
      dur = rand(6, 11);
      html += '<i class="flake" style="left:' + px(rand(0, 1920)) + ';width:' + s + 'px;height:' + s + 'px;opacity:' +
        rand(0.55, 0.95).toFixed(2) + ';animation-duration:' + dur.toFixed(1) + 's;animation-delay:-' + rand(0, dur).toFixed(1) + 's"></i>';
    }
    byId('snowNear').innerHTML = html;
    LAYERS.forEach(function (id) { byId(id).style.display = 'none'; });
  }

  // The shore's trees and falling leaves change with the season.
  function buildSeason(season) {
    byId('shore').innerHTML = ART.shore(ART.uid(), season);
    byId('nearSnow').innerHTML = ART.shoreSnow(ART.uid(), season);
    var colours = LEAF_COLORS[season], html = '', i, dur;
    if (colours) {
      for (i = 0; i < 8; i++) {
        dur = rand(14, 26);
        html += '<div class="leaf" style="left:' + px(rand(200, 2100)) + ';animation-duration:' + dur.toFixed(1) +
          's;animation-delay:-' + rand(0, dur).toFixed(1) + 's">' + ART[season === 'spring' ? 'petal' : 'leaf'](colours[i % colours.length]) + '</div>';
      }
    }
    byId('leaves').innerHTML = html;
  }

  // ---------- Time, sun and moon ----------
  function realMinutes() { var d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; }
  function clockMinutes() { return state.sim != null ? state.sim : realMinutes(); }

  // Phases follow today's sunrise and sunset (demo times until a location is set).
  function phaseAt(t) {
    var rise = state.sunrise, set = state.sunset;
    if (t < rise - 45 || t >= set + 70) return 'night';
    if (t < rise + 40) return 'dawn';
    if (t < Math.max(rise + 40, Math.min(rise + 220, set - 200))) return 'morning';
    if (t < set - 100) return 'day';
    if (t < set - 5) return 'golden';
    return 'dusk';
  }

  function previewTime(phase) {
    var rise = state.sunrise, set = state.sunset;
    return { dawn: rise + 35, morning: rise + 130, day: Math.round((rise + set) / 2), golden: set - 45, dusk: set + 25, night: 22 * 60 + 30 }[phase];
  }

  function seasonFor(d) {
    var m = (d.getMonth() + (C.hemisphere === 'south' ? 6 : 0)) % 12;
    return m < 2 || m === 11 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn';
  }

  // Moon age from a known new moon (6 Jan 2000, 18:14 UTC) and the mean synodic month.
  function moonInfo(d) {
    var month = 29.530588853, age = ((d.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000) % month;
    if (age < 0) age += month;
    var phase = age / month;
    var names = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
    return { phase: phase, light: (1 - Math.cos(2 * Math.PI * phase)) / 2, name: names[Math.floor(phase * 8 + 0.5) % 8] };
  }

  function arc(p, x0, x1, low, high) {
    var c = Math.max(0, Math.min(1, p));
    return [x0 + p * (x1 - x0), low - Math.sin(c * Math.PI) * (low - high)];
  }

  // Sun from sunrise to sunset and moon through the night, each along an arc over the lake.
  function placeSky(t, phase) {
    var rise = state.sunrise, set = state.sunset;
    var sun = arc((t - rise) / (set - rise), 760, 1740, 610, 120);
    var moon = arc(((t - set) % 1440 + 1440) % 1440 / (rise + 1440 - set), 700, 1700, 600, 150);
    var glow = phase === 'night' ? moon : sun;
    byId('sun').style.transform = 'translate(' + px(sun[0] - 180) + ',' + px(sun[1] - 180) + ')';
    byId('moon').style.transform = 'translate(' + px(moon[0] - 130) + ',' + px(moon[1] - 130) + ')';
    byId('glitter').style.transform = 'translateX(' + px(glow[0] - 130) + ')';
    byId('glitter').style.color = phase === 'night' ? '#dfe6ff' : phase === 'day' || phase === 'morning' ? '#f4f8ff' : '#ffd9a0';
  }

  function renderMoon(d) {
    state.moon = moonInfo(d);
    byId('moonDisc').innerHTML = ART.moon(ART.uid(), state.moon.phase, C.hemisphere === 'south');
    byId('moonGlow').style.opacity = (0.25 + 0.75 * state.moon.light).toFixed(2);
  }

  function tick(force) {
    var t = clockMinutes(), m = Math.floor(t);
    if (m === lastMinute && !force) return;
    lastMinute = m;
    var d = new Date(), h = Math.floor(m / 60) % 24, mm = m % 60;
    var time = (h % 12 || 12) + ':' + (mm < 10 ? '0' : '') + mm, ampm = h < 12 ? 'AM' : 'PM';
    var day = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    showText('time', time);
    showText('ampm', ampm);
    showText('clock', time + ' ' + ampm);
    showText('greeting', h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Good night');
    if (day !== lastDay) {
      lastDay = day;
      showText('date', day);
      renderMoon(d);
      renderForecast();
    }
    applyWallpaper(t);
  }

  // ---------- Wallpaper state ----------
  function layerOpacity(phase, cond, season) {
    var night = phase === 'night', dusk = phase === 'dusk', low = phase === 'dawn' || phase === 'golden';
    var cold = state.weather.temperature <= (C.weather.unit === 'fahrenheit' ? 59 : 15);
    var o = {
      stars: night ? 1 : dusk ? 0.35 : 0, sun: night || dusk ? 0 : 1, moon: night ? 1 : 0, clouds: 0.45,
      glitter: night ? 0.75 : low ? 1 : dusk ? 0 : 0.35, shimmer: night ? 0.45 : 1,
      cabinLight: night || dusk ? 1 : phase === 'golden' ? 0.4 : 0,
      smoke: season === 'winter' || cold ? (night ? 0.45 : 1) : 0,
      leaves: LEAF_COLORS[season] ? (night ? 0.4 : 1) : 0,
      fireflies: season === 'summer' && (night || dusk) ? 1 : 0
    };
    if (cond === 'clear') o.clouds = 0.18;
    if (cond === 'partly') o.clouds = 0.6;
    if (cond === 'cloudy') { o.clouds = 0.9; o.sun *= 0.25; o.moon *= 0.3; o.stars *= 0.2; o.glitter *= 0.2; }
    if (cond === 'rain' || cond === 'storm') {
      o.clouds = 0.95; o.rain = 1; o.ripples = 1;
      o.sun = 0; o.moon = 0; o.stars = 0; o.glitter = 0; o.leaves = 0; o.fireflies = 0;
    }
    if (cond === 'snow') { o.clouds = 0.8; o.snow = 1; o.sun *= 0.2; o.moon *= 0.3; o.stars *= 0.2; o.glitter = 0; o.leaves = 0; o.fireflies = 0; }
    if (cond === 'fog') { o.clouds = 0.4; o.fogFar = 1; o.fogNear = 1; o.sun *= 0.35; o.moon *= 0.4; o.stars *= 0.1; o.glitter *= 0.3; o.fireflies *= 0.5; }
    o.veil = VEIL[cond] ? 1 : 0;
    // Snow lies on the land all winter, and settles whenever it snows.
    o.farSnow = o.midSnow = o.nearSnow = season === 'winter' || cond === 'snow' ? LAND_SNOW[phase] : 0;
    if (cond === 'snow') o.snowNear = 1;
    return o;
  }

  // Layers fade with opacity; once hidden they leave the page, so their animations stop costing anything.
  function setLayer(id, value) {
    var e = byId(id);
    clearTimeout(e._hide);
    if (value > 0) {
      if (e.style.display === 'none') {
        e.style.opacity = 0;
        e.style.display = '';
        void e.offsetWidth;
      }
      e.style.opacity = value;
    } else if (e.style.display !== 'none') {
      e.style.opacity = 0;
      e._hide = setTimeout(function () { e.style.display = 'none'; }, 2600);
    }
  }

  // Each layer is redrawn when it changes colour, so they change one after another rather than all in one frame
  // (all at once on the first draw, before anything is on screen).
  function recolor(phase, cond, allAtOnce) {
    var steps = [
      function () {
        byId('farLayer').style.color = LAND[phase][0];
        each(document.querySelectorAll('.snowcap'), function (s) { s.style.opacity = SNOWCAP[phase]; });
      },
      function () { byId('midLayer').style.color = LAND[phase][1]; },
      function () {
        byId('nearLayer').style.color = LAND[phase][2];
        each(document.querySelectorAll('.crown-shade'), function (s) { s.style.opacity = CROWN_SHADE[phase]; });
      },
      function () { byId('clouds').style.color = cloudColor(phase, cond); }
    ];
    clearTimeout(recolorTimer);
    if (allAtOnce) { steps.forEach(function (step) { step(); }); return; }
    (function next(i) {
      steps[i]();
      if (i + 1 < steps.length) recolorTimer = setTimeout(function () { next(i + 1); }, 140);
    }(0));
  }

  // The veil fades out towards the viewer, like the lake's own shading.
  function veilGradient(v) {
    return 'linear-gradient(180deg, ' + rgba(v.sky[0], v.sky[1]) + ' 0%, ' + rgba(v.sky[0], v.sky[1] * 0.85) + ' 40%, ' +
      rgba(v.land[0], v.land[1]) + ' 58%, ' + rgba(v.land[0], v.land[1] * 0.65) + ' 76%, ' + rgba(v.land[0], v.land[1] * 0.3) + ' 100%)';
  }

  function cloudColor(phase, cond) {
    if (cond === 'storm') return phase === 'night' ? '#1b202c' : '#4a5160';
    if (phase === 'night') return cond === 'rain' ? '#252c3b' : '#353e53';
    if (cond === 'rain') return phase === 'dusk' ? '#4d4a63' : '#8e97a7';
    if (cond === 'cloudy' || cond === 'fog') return phase === 'dusk' ? '#6d6585' : '#c3c9d4';
    if (cond === 'snow') return '#dfe5ee';
    return { dawn: '#f3cdd0', morning: '#ffffff', day: '#ffffff', golden: '#ffe1c4', dusk: '#9a86b0' }[phase];
  }

  function applyWallpaper(t) {
    if (t == null) t = clockMinutes();
    var phase = phaseAt(t), cond = state.condOverride || state.weather.condition;
    var season = state.seasonOverride || seasonFor(new Date());
    placeSky(t, phase);
    if (phase === state.phase && cond === state.cond && season === state.season) return;
    var was = { phase: state.phase, cond: state.cond, season: state.season };
    if (season !== state.season) buildSeason(season);
    state.phase = phase;
    state.cond = cond;
    state.season = season;
    each(document.querySelectorAll('.sky'), function (s) { s.classList.toggle('is-on', s.getAttribute('data-phase') === phase); });
    var o = layerOpacity(phase, cond, season);
    LAYERS.forEach(function (id) { setLayer(id, o[id] || 0); });
    if (VEIL[cond]) byId('veil').style.backgroundImage = veilGradient(VEIL[cond]);
    // Recolouring the landscape redraws it, so it happens in a single step: halfway through the sky's fade when the
    // time of day changes, straight away otherwise.
    clearTimeout(recolorTimer);
    if (was.phase && was.phase !== phase && season === was.season) {
      recolorTimer = setTimeout(function () { recolor(phase, cond); }, 1100);
    } else {
      recolor(phase, cond, !was.phase);
    }
    byId('rain').classList.toggle('is-heavy', cond === 'storm');
    stage.classList.toggle('is-snowing', cond === 'snow');
    renderWeather();
    renderMood();
    checkSmoothness();
    // A new scene shows its life straight away instead of waiting for the next random moment.
    if (cond === 'storm' && was.cond !== 'storm') setTimeout(strike, 1500);
    if (phase === 'night' && was.phase !== 'night') setTimeout(shootIfReady, 2500);
    if (birdWeather()) setTimeout(flyIfReady, 1800);
    else birdsAway();
  }

  // ---------- Weather and forecast ----------
  function renderWeather() {
    var w = state.weather, cond = state.cond, icon = ART.weather(cond, state.phase === 'night');
    var temp = Math.round(w.temperature) + '°';
    showHtml('weather-icon', icon);
    showText('weather-temp', temp);
    showText('weather-desc', COND_LABEL[cond]);
    showText('weather-range', 'H ' + Math.round(w.high) + '°  ·  L ' + Math.round(w.low) + '°');
    showText('weather-line', temp + '  ' + COND_LABEL[cond]);
  }

  // One line under the date: tonight's moon after dark, otherwise the sun's next moment.
  function renderMood() {
    var p = state.phase, night = p === 'night' || p === 'dusk', icon, text;
    if (state.cond === 'storm' || state.cond === 'snow') {
      icon = ART.weather(state.cond, night);
      text = state.cond === 'storm' ? 'Thunderstorms around' : 'Snow falling';
    } else if (night) {
      icon = ART.moon(ART.uid(), state.moon.phase, C.hemisphere === 'south');
      text = state.moon.name + ' tonight';
    } else {
      icon = ART.sunIcon();
      text = p === 'dawn' ? 'Sunrise ' + fmtTime(state.sunrise) :
        p === 'golden' ? 'Golden hour · sunset ' + fmtTime(state.sunset) : 'Sunset ' + fmtTime(state.sunset);
    }
    showHtml('mood', '<span class="mood-icon">' + icon + '</span>' + esc(text));
    showText('mood-text', text);
  }

  // Seven days from today: Open-Meteo's forecast once a location is set, a made-up week until then.
  function week() {
    if (state.forecast) return state.forecast;
    var today = new Date(), days = [];
    DEMO_WEEK.forEach(function (d, i) {
      days.push({ date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + i), condition: d[0],
        high: demo.high + d[1], low: demo.low + d[2], rain: d[0] === 'rain' || d[0] === 'storm' ? 70 : d[0] === 'cloudy' ? 20 : 0 });
    });
    return days;
  }

  function dayName(d, i) { return i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' }); }

  // data-days sets how many days a forecast shows; data-from="tomorrow" leaves today out (the main widget shows it).
  // data-style="week" adds each day's condition, chance of rain and a bar placing its range within the week's.
  function renderForecast() {
    var all = week();
    show('forecast', function (e) {
      var from = e.getAttribute('data-from') === 'tomorrow' ? 1 : 0, n = +e.getAttribute('data-days') || 4;
      var days = all.slice(from, from + n), full = e.getAttribute('data-style') === 'week';
      var lo = Math.min.apply(null, days.map(function (d) { return d.low; }));
      var hi = Math.max.apply(null, days.map(function (d) { return d.high; }));
      e.innerHTML = days.map(function (d, i) {
        var width = Math.max(6, (d.high - d.low) / Math.max(1, hi - lo) * 100);
        var left = Math.min(100 - width, (d.low - lo) / Math.max(1, hi - lo) * 100);
        // The bar's colours span the whole week, so each day shows its own slice of the gradient.
        var bar = full ? '<div class="fc-bar"><i style="left:' + left.toFixed(1) + '%;width:' + width.toFixed(1) + '%;background-size:' +
          (10000 / width).toFixed(1) + '% 100%;background-position:' + (width < 100 ? left / (100 - width) * 100 : 0).toFixed(1) + '% 0"></i></div>' : '';
        return '<div class="fc-day' + (i + from === 0 ? ' is-today' : '') + '">' +
          '<div class="fc-name">' + esc(dayName(d.date, i + from)) + '</div>' +
          '<div class="fc-icon">' + ART.weather(d.condition, false) + '</div>' +
          (full ? '<div class="fc-desc">' + esc(COND_LABEL[d.condition]) + '</div>' : '') +
          '<div class="fc-temps"><span class="fc-hi">' + Math.round(d.high) + '°</span><span class="fc-lo">' + Math.round(d.low) + '°</span></div>' +
          bar + (full ? '<div class="fc-rain">' + (d.rain >= 20 ? Math.round(d.rain) + '% rain' : '') + '</div>' : '') +
          '</div>';
      }).join('');
    });
  }

  // Open-Meteo weather codes: https://open-meteo.com/en/docs (WMO codes).
  function conditionFor(code) {
    if (code === 0) return 'clear';
    if (code <= 2) return 'partly';
    if (code === 3) return 'cloudy';
    if (code === 45 || code === 48) return 'fog';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if (code >= 95) return 'storm';
    return 'rain';
  }

  function dayOf(iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }

  function loadWeather() {
    var w = C.weather;
    if (w.latitude == null || w.longitude == null || !window.fetch) return;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + w.latitude + '&longitude=' + w.longitude +
      '&current=temperature_2m,weather_code' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset' +
      '&forecast_days=7&timezone=auto' + (w.unit === 'fahrenheit' ? '&temperature_unit=fahrenheit' : '');
    fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var daily = j.daily;
      state.weather = {
        temperature: j.current.temperature_2m, condition: conditionFor(j.current.weather_code),
        high: daily.temperature_2m_max[0], low: daily.temperature_2m_min[0]
      };
      state.forecast = daily.time.map(function (iso, i) {
        return { date: dayOf(iso), condition: conditionFor(daily.weather_code[i]), high: daily.temperature_2m_max[i],
          low: daily.temperature_2m_min[i], rain: daily.precipitation_probability_max[i] || 0 };
      });
      state.sunrise = toMinutes(daily.sunrise[0].slice(11, 16));
      state.sunset = toMinutes(daily.sunset[0].slice(11, 16));
      renderForecast();
      // The scene redraws itself only for a new condition (redrawing the landscape is the costly part on a TV);
      // the temperatures and the sunrise and sunset times update either way.
      tick(true);
      renderWeather();
      renderMood();
    }).catch(function () { /* keep the last weather */ });
  }

  // ---------- Life in the scene ----------
  // Prototype pacing is quick so these show up while you look around; the TV build can space them out.
  function every(first, min, max, fn) {
    function run() {
      if (!paused()) fn();
      setTimeout(run, rand(min, max) * 1000);
    }
    setTimeout(run, first * 1000);
  }

  function birdWeather() {
    return !!BIRD_COLOR[state.phase] && (state.cond === 'clear' || state.cond === 'partly' || state.cond === 'cloudy');
  }

  function flyIfReady() {
    var flock = byId('birds'), html = '', n = 3 + Math.floor(Math.random() * 4), i;
    var spots = [[0, 0], [-46, -18], [-44, 22], [-92, -30], [-96, 34], [-140, 6]];
    if (flock.classList.contains('is-flying') || !birdWeather()) return;
    for (i = 0; i < n; i++) {
      html += '<i class="bird" style="left:' + px(spots[i][0] + rand(0, 10)) + ';top:' + px(spots[i][1]) +
        ';animation-delay:-' + rand(0, 0.5).toFixed(2) + 's">' + ART.bird() + '</i>';
    }
    flock.innerHTML = '<div class="flock-bob">' + html + '</div>';
    flock.style.top = px(rand(330, 400));
    flock.style.color = BIRD_COLOR[state.phase];
    flock.className = 'birds';
    void flock.offsetWidth;
    flock.className = 'birds is-flying' + (Math.random() < 0.6 ? '' : ' is-rtl');
  }

  // A flock already in the air fades out when night falls or the weather turns.
  function birdsAway() {
    var flock = byId('birds');
    if (!flock.classList.contains('is-flying') || flock.classList.contains('is-leaving')) return;
    flock.classList.add('is-leaving');
    setTimeout(function () { flock.className = 'birds'; }, 1200);
  }

  function shootIfReady() {
    if (state.phase !== 'night' || (state.cond !== 'clear' && state.cond !== 'partly')) return;
    var s = byId('shooting');
    s.style.left = px(rand(500, 1600));
    s.style.top = px(rand(40, 240));
    s.style.transform = 'rotate(' + rand(148, 168).toFixed(1) + 'deg)';
    s.classList.remove('is-on');
    void s.offsetWidth;
    s.classList.add('is-on');
  }

  function strike() {
    if (state.cond !== 'storm') return;
    var bolt = byId('bolt'), flash = byId('flash');
    bolt.innerHTML = ART.bolt();
    bolt.style.left = px(rand(700, 1700));
    bolt.classList.remove('is-on');
    flash.classList.remove('is-on');
    void bolt.offsetWidth;
    bolt.classList.add('is-on');
    flash.classList.add('is-on');
  }

  // The landscape pans a little: n runs from -1 (left) to 1 (right), and nearer layers move further.
  function pan(n) {
    each(document.querySelectorAll('[data-depth]'), function (layer) {
      layer.style.transform = 'translateX(' + (-n * PARALLAX * layer.getAttribute('data-depth')).toFixed(1) + 'px)';
    });
  }

  // ---------- Automatic quality ----------
  // Once a new scene has settled, sample the frame rate. If the TV is struggling, try hiding the next most costly
  // extras (classes q1 to q3 in scene.css) and keep that step only if it clearly helps.
  var quality = 0, autoQuality = true, checkTimer = null;

  function setQuality(q) {
    quality = Math.max(0, Math.min(3, q));
    for (var i = 1; i <= 3; i++) stage.classList.toggle('q' + i, i <= quality);
  }

  function sampleFps(ms, done) {
    var frames = 0, start = 0;
    function frame(now) {
      if (start) frames++; else start = now;
      if (now - start < ms) requestAnimationFrame(frame); else done(frames * 1000 / (now - start));
    }
    requestAnimationFrame(frame);
  }

  function checkSmoothness() {
    clearTimeout(checkTimer);
    if (!autoQuality || quality >= 3) return;
    checkTimer = setTimeout(function () {
      if (paused() || lapse || document.hidden) return;
      sampleFps(3000, function (before) {
        if (before >= 45) return;
        setQuality(quality + 1);
        checkTimer = setTimeout(function () {
          sampleFps(3000, function (after) {
            if (after < before + 4) setQuality(quality - 1);
            else checkSmoothness();
          });
        }, 2500);
      });
    }, 8000);
  }

  // Frame-rate meter for checking smoothness on the TV; it only runs while it is shown.
  var fpsOn = false;
  function toggleFps(box) {
    var frames = 0, slowest = 0, last = 0, started = 0;
    fpsOn = !fpsOn;
    box.classList.toggle('is-on', fpsOn);
    box.textContent = 'Measuring…';
    function frame(now) {
      if (!fpsOn) return;
      if (started) {
        frames++;
        slowest = Math.max(slowest, now - last);
      } else {
        started = now;
      }
      last = now;
      if (now - started >= 1000) {
        box.textContent = Math.round(frames * 1000 / (now - started)) + ' fps · slowest frame ' + Math.round(slowest) + ' ms';
        frames = 0;
        slowest = 0;
        started = now;
      }
      requestAnimationFrame(frame);
    }
    if (fpsOn) requestAnimationFrame(frame);
  }

  // ---------- Preview controls ----------
  // Each returns a short message for the page to show.
  function cycleTime() {
    stopLapse();
    var list = [null].concat(PHASES);
    state.preview = list[(list.indexOf(state.preview) + 1) % list.length];
    state.sim = state.preview ? previewTime(state.preview) : null;
    tick(true);
    return state.preview ? 'Preview: ' + PHASE_LABEL[state.preview] + ' · ' + fmtTime(state.sim) : 'Time: now';
  }

  function cycleWeather() {
    var list = [null].concat(CONDITIONS);
    state.condOverride = list[(list.indexOf(state.condOverride) + 1) % list.length];
    applyWallpaper();
    return 'Weather: ' + (state.condOverride ? COND_LABEL[state.condOverride] : 'live');
  }

  function cycleSeason() {
    var list = [null].concat(SEASONS);
    state.seasonOverride = list[(list.indexOf(state.seasonOverride) + 1) % list.length];
    applyWallpaper();
    return 'Season: ' + cap(state.seasonOverride || seasonFor(new Date()) + ' (today)');
  }

  // A whole day in about 36 seconds: 4 simulated minutes every 100 ms.
  function toggleLapse() {
    if (lapse) {
      stopLapse();
      state.sim = state.preview ? previewTime(state.preview) : null;
      tick(true);
      return 'Time-lapse off';
    }
    state.sim = clockMinutes();
    stage.classList.add('is-lapse');
    lapse = setInterval(function () { state.sim = (state.sim + 4) % 1440; tick(); }, 100);
    return 'Time-lapse: a day in about 36 seconds · press D to stop';
  }

  function stopLapse() {
    if (!lapse) return;
    clearInterval(lapse);
    lapse = null;
    stage.classList.remove('is-lapse');
  }

  // Jump straight to a scene: { time: 'night', weather: 'snow', season: 'winter' }, null for live.
  function preview(o) {
    stopLapse();
    if ('time' in o) { state.preview = o.time; state.sim = o.time ? previewTime(o.time) : null; }
    if ('weather' in o) state.condOverride = o.weather;
    if ('season' in o) state.seasonOverride = o.season;
    tick(true);
  }

  // ---------- Start ----------
  // options.paused: a function that returns true while the scene should rest.
  function mount(el, options) {
    stage = el;
    hooks = options || {};
    build();
    tick(true);
    setInterval(tick, 1000);
    loadWeather();
    setInterval(loadWeather, 30 * 60000);
    byId('birds').addEventListener('animationend', function (ev) {
      if (ev.target === ev.currentTarget) ev.currentTarget.className = 'birds';
    });
    checkSmoothness();
    every(5, 30, 70, flyIfReady);
    every(8, 10, 24, shootIfReady);
    every(4, 6, 13, strike);
  }

  return {
    state: state, mount: mount, pan: pan, preview: preview, toggleFps: toggleFps,
    cycleTime: cycleTime, cycleWeather: cycleWeather, cycleSeason: cycleSeason, toggleLapse: toggleLapse,
    lapsing: function () { return !!lapse; },
    quality: function (q) { if (q != null) setQuality(q); return quality; },
    auto: function (on) { autoQuality = !!on; if (!on) clearTimeout(checkTimer); }
  };
}());
