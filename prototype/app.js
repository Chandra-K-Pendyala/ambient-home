/* Ambient home screen prototype: a living lakeside wallpaper, remote navigation, panels and idle screen.
   Written in ES5 style so the same code can later run on the TV's web engine. */
(function () {
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
  var PARALLAX = 110;   // pixels a layer at depth 1 would shift as focus crosses the screen
  var KEYS = { 37: 'left', 38: 'up', 39: 'right', 40: 'down', 13: 'ok', 27: 'back', 8: 'back', 461: 'back' };

  var stage = byId('stage');
  var ui = byId('ui');
  var demo = C.weather.demo;
  var state = {
    weather: demo, sunrise: toMinutes(demo.sunrise), sunset: toMinutes(demo.sunset), moon: null,
    phase: null, cond: null, season: null, sim: null, preview: null,
    condOverride: null, seasonOverride: null, idleMinutes: C.idleMinutes
  };
  var scope = ui, current = null, page = 'a', stack = [], memory = {};
  var idleOn = false, idleTimer = null, idleMover = null, sleepTimer = null, recolorTimer = null, toastTimer = null, helpTimer = null, lapse = null, launchTimer = null;
  var lastWheel = 0, lastMinute = -1, lastDay = '', lastActivity = 0;

  // ---------- Helpers ----------
  function byId(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function setData(e, data) { Object.keys(data).forEach(function (k) { if (data[k] != null) e.dataset[k] = data[k]; }); }
  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function each(nodes, fn) { Array.prototype.forEach.call(nodes, fn); }
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

  // The TV canvas is always 1920x1080; in a browser it is scaled to fit the window.
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
  }

  // ---------- Building the screen ----------
  var SHINE = '<span class="shine-clip"><i class="shine"></i></span>';
  var ALL_APPS = { glyph: 'allapps', bg: ['#33405a', '#161c29'], fg: '#e2e8f4', accent: '#64748b' };

  // mode: 'dock' on the home screen, 'grid' in the All apps sheet.
  function iconTile(app, data, mode) {
    var t = el('div', 'app-icon' + (mode === 'grid' ? ' in-grid' : ''));
    setData(t, data);
    t.style.setProperty('--glow', rgba(app.accent, 0.55));
    t.innerHTML = ART.appIcon(app, mode);
    return t;
  }

  function appTile(id, row, mode) {
    var app = C.apps[id];
    return iconTile(app, { row: row, action: 'app', id: id, title: app.title, subtitle: app.subtitle || 'App', accent: app.accent }, mode);
  }

  function allAppsTile() {
    return iconTile(ALL_APPS, { row: 1, action: 'allapps', title: 'All apps', subtitle: Object.keys(C.apps).length + ' apps on this TV',
      accent: ALL_APPS.accent }, 'dock');
  }

  function inputTile(inp) {
    var ps5 = inp.art === 'ps5', t = el('div', 'input-tile' + (ps5 ? ' input-ps5' : ''));
    setData(t, { row: 2, action: 'input', id: inp.id, title: inp.title, subtitle: inp.subtitle + ' · press ' + inp.key + ' on the remote', accent: inp.accent });
    t.innerHTML = (ps5 ? '<i class="ps5-glow"></i>' : '') +
      '<div class="input-art">' + ART[inp.art](ART.uid()) + '</div>' +
      '<div class="input-text"><div class="input-name">' + esc(inp.title) + '</div><div class="input-sub">' + esc(inp.subtitle) + '</div></div>' +
      '<div class="input-key">' + esc(inp.key) + '</div>' + SHINE;
    return t;
  }

  function mediaCard(item) {
    var t = el('div', 'media-card');
    setData(t, { row: 3, action: 'media', id: item.id, accent: item.colors[2] });
    t.innerHTML = '<div class="media-face">' + ART.poster(ART.uid(), item) + '<i class="shine"></i></div>' +
      '<div class="media-info"><div class="media-title">' + esc(item.title) + '</div>' +
      '<div class="media-detail">' + esc(item.detail) + '</div>' +
      '<div class="media-progress"><span style="width:' + Math.round(item.progress * 100) + '%"></span></div></div>';
    return t;
  }

  function homeTile(item) {
    var t = el('div', 'home-tile' + (item.type === 'scene' ? ' home-scene' : ''));
    setData(t, { row: 4, action: 'home', id: item.id, accent: item.type === 'scene' ? '#6366f1' : '#f5b942' });
    renderHomeTile(t, item);
    return t;
  }

  function renderHomeTile(t, item) {
    t.classList.toggle('is-on', item.type === 'light' && item.on);
    var status = item.type === 'scene' ? item.detail : item.on ? 'On · ' + item.level + '%' : 'Off';
    t.innerHTML = '<div class="home-icon">' + (item.type === 'scene' ? ART.scene() : ART.bulb()) + '</div>' +
      '<div class="home-name">' + esc(item.name) + '</div><div class="home-state">' + esc(status) + '</div>' + SHINE;
  }

  function buildRows() {
    var apps = byId('appsTrack'), inputs = byId('inputsTrack'), media = byId('mediaTrack'), home = byId('homeTrack');
    C.dock.forEach(function (id) { apps.appendChild(appTile(id, 1, 'dock')); });
    apps.appendChild(allAppsTile());
    C.inputs.forEach(function (inp) { inputs.appendChild(inputTile(inp)); });
    C.media.items.forEach(function (item) { media.appendChild(mediaCard(item)); });
    C.home.items.forEach(function (item) { home.appendChild(homeTile(item)); });
    byId('mediaChip').textContent = C.media.source + ' · demo';
    byId('homeChip').textContent = C.home.source + ' · demo';
    byId('settingsButton').innerHTML = ART.gear();
  }

  function buildAllApps() {
    var grid = byId('allAppsGrid');
    Object.keys(C.apps).forEach(function (id) {
      var item = el('div', 'grid-item');
      item.appendChild(appTile(id, 0, 'grid'));
      item.appendChild(el('div', 'grid-name', esc(C.apps[id].title)));
      grid.appendChild(item);
    });
  }

  // Grid rows follow the real layout, so Up and Down match what is on screen.
  function assignGridRows(grid) {
    var tops = [];
    each(grid.querySelectorAll('.app-icon'), function (t) {
      var top = t.parentNode.offsetTop, row = tops.indexOf(top);
      if (row < 0) { tops.push(top); row = tops.length - 1; }
      t.dataset.row = row;
    });
  }

  function setTile(id, svg, size) {
    var e = byId(id);
    e.style.backgroundImage = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
    e.style.backgroundSize = size + 'px ' + size + 'px';
  }

  function buildWallpaper() {
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

  function buildLaunchFx() {
    var html = '<i class="ps-band"></i>', i, size, dur;
    for (i = 0; i < 18; i++) {
      size = Math.round(rand(28, 84));
      dur = rand(9, 17);
      html += '<i class="ps-shape" style="left:' + rand(2, 96).toFixed(1) + '%;width:' + size + 'px;height:' + size +
        'px;animation-duration:' + dur.toFixed(1) + 's;animation-delay:-' + rand(0, dur).toFixed(1) + 's">' + ART.psShape(i % 4) + '</i>';
    }
    byId('launchFx').innerHTML = html;
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
    byId('time').textContent = time;
    byId('ampm').textContent = ampm;
    byId('greeting').textContent = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Good night';
    byId('idleTime').textContent = time + ' ' + ampm;
    if (day !== lastDay) {
      lastDay = day;
      byId('date').textContent = day;
      byId('idleDate').textContent = day;
      renderMoon(d);
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

  function renderWeather() {
    var w = state.weather, cond = state.cond, icon = ART.weather(cond, state.phase === 'night');
    var temp = Math.round(w.temperature) + '°';
    byId('weatherIcon').innerHTML = icon;
    byId('idleIcon').innerHTML = icon;
    byId('weatherTemp').textContent = temp;
    byId('weatherDesc').textContent = COND_LABEL[cond];
    byId('weatherRange').textContent = 'H ' + Math.round(w.high) + '°  ·  L ' + Math.round(w.low) + '°';
    byId('idleWeather').textContent = temp + '  ' + COND_LABEL[cond];
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
    byId('mood').innerHTML = '<span class="mood-icon">' + icon + '</span>' + esc(text);
    byId('idleMood').textContent = text;
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

  function loadWeather() {
    var w = C.weather;
    if (w.latitude == null || w.longitude == null || !window.fetch) return;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + w.latitude + '&longitude=' + w.longitude +
      '&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset' +
      '&forecast_days=1&timezone=auto' + (w.unit === 'fahrenheit' ? '&temperature_unit=fahrenheit' : '');
    fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      state.weather = {
        temperature: j.current.temperature_2m, condition: conditionFor(j.current.weather_code),
        high: j.daily.temperature_2m_max[0], low: j.daily.temperature_2m_min[0]
      };
      state.sunrise = toMinutes(j.daily.sunrise[0].slice(11, 16));
      state.sunset = toMinutes(j.daily.sunset[0].slice(11, 16));
      state.cond = null;
      tick(true);
    }).catch(function () { /* keep the demo weather */ });
  }

  // ---------- Life in the scene ----------
  // Prototype pacing is quick so these show up while you look around; the TV build can space them out.
  function every(first, min, max, fn) {
    function run() {
      if (!idleOn) fn();
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

  // ---------- Focus and navigation ----------
  function focusables(root) { return Array.prototype.slice.call(root.querySelectorAll('[data-row]')); }

  function rowsIn(root) {
    var map = {};
    focusables(root).forEach(function (e) { var r = +e.dataset.row; (map[r] = map[r] || []).push(e); });
    return map;
  }

  function centerX(e) { var b = e.getBoundingClientRect(); return b.left + b.width / 2; }
  function memoryKey(row) { return scope.id + ':' + row; }

  function move(dir) {
    if (!current) return;
    var map = rowsIn(scope), row = +current.dataset.row, list = map[row], i = list.indexOf(current);
    if (dir === 'left' || dir === 'right') {
      var next = list[i + (dir === 'left' ? -1 : 1)];
      if (next) setFocus(next);
      return;
    }
    var keys = Object.keys(map).map(Number).sort(function (a, b) { return a - b; });
    var target = map[keys[keys.indexOf(row) + (dir === 'up' ? -1 : 1)]];
    if (!target) return;
    // On the home screen each row remembers its last item; grids line up by column instead.
    var remembered = scope === ui && memory[memoryKey(+target[0].dataset.row)];
    if (remembered && target.indexOf(remembered) >= 0) { setFocus(remembered); return; }
    var x = centerX(current), best = target[0], bestDistance = Infinity;
    target.forEach(function (e) {
      var d = Math.abs(centerX(e) - x);
      if (d < bestDistance) { bestDistance = d; best = e; }
    });
    setFocus(best);
  }

  function setFocus(e) {
    if (!e) return;
    if (current && current !== e) current.classList.remove('is-focused');
    current = e;
    e.classList.add('is-focused');
    memory[memoryKey(+e.dataset.row)] = e;
    if (scope !== ui) return;
    showPage(+e.dataset.row >= 3 ? 'b' : 'a');
    if (page === 'a') updateTitle(e);
    keepInView(e);
    parallax(e);
  }

  function showPage(p) {
    if (p === page) return;
    page = p;
    byId('pageA').classList.toggle('is-active', p === 'a');
    byId('pageB').classList.toggle('is-active', p === 'b');
    stage.classList.toggle('on-page-b', p === 'b');
  }

  function updateTitle(e) {
    var title = byId('focusTitle'), sub = byId('focusSubtitle'), box = byId('focusBox');
    if (title.textContent === e.dataset.title && sub.textContent === e.dataset.subtitle) return;
    title.textContent = e.dataset.title || '';
    sub.textContent = e.dataset.subtitle || '';
    box.classList.remove('swap');
    void box.offsetWidth;
    box.classList.add('swap');
  }

  function keepInView(e) {
    var track = e.parentNode;
    if (!track.classList.contains('track')) return;
    var view = track.parentNode.clientWidth, left = e.offsetLeft, right = left + e.offsetWidth, x = track._x || 0;
    if (right + x > view - 40) x = view - 40 - right;
    if (left + x < 0) x = -left;
    track._x = Math.min(0, x);
    track.style.transform = 'translateX(' + track._x + 'px)';
  }

  // The landscape pans a little towards whatever has focus; nearer layers move further.
  function parallax(e) {
    var n = focusX(e) / 1920 * 2 - 1;
    each(document.querySelectorAll('[data-depth]'), function (layer) {
      layer.style.transform = 'translateX(' + (-n * PARALLAX * layer.getAttribute('data-depth')).toFixed(1) + 'px)';
    });
  }

  // Where the item will sit once its row has scrolled (rows animate, so measure the target, not the moment).
  function focusX(e) {
    var track = e.parentNode;
    if (track.classList.contains('track')) return track.parentNode.offsetLeft + (track._x || 0) + e.offsetLeft + e.offsetWidth / 2;
    var s = stage.getBoundingClientRect(), b = e.getBoundingClientRect();
    return (b.left + b.width / 2 - s.left) / s.width * 1920;
  }

  // ---------- Actions ----------
  function activate(e) {
    if (!e) return;
    var action = e.dataset.action, id = e.dataset.id;
    if (action === 'app') launchApp(id);
    else if (action === 'input') switchInput(find(C.inputs, id));
    else if (action === 'allapps') { assignGridRows(byId('allAppsGrid')); openOverlay(byId('allApps')); }
    else if (action === 'settings') openSettings();
    else if (action === 'media') resumeMedia(find(C.media.items, id));
    else if (action === 'home') toggleHome(find(C.home.items, id), e);
    else if (action === 'seg') selectOption(e);
    else if (action === 'lghome') openLgHome();
    else if (action === 'weatherloc') toast('Your weather location is set during install.');
    else if (action === 'close') closeOverlay();
  }

  // ---------- Opening apps and inputs on the TV ----------
  // On the TV, PalmServiceBridge reaches webOS system services; each bridge is kept until it replies.
  var bridges = [];
  function onTv() { return typeof window.PalmServiceBridge === 'function'; }

  function callLuna(uri, params, done) {
    try {
      var bridge = new window.PalmServiceBridge();
      bridges.push(bridge);
      bridge.onservicecallback = function (text) {
        var result;
        try { result = JSON.parse(text); } catch (e) { result = { returnValue: false }; }
        bridges.splice(bridges.indexOf(bridge), 1);
        if (done) done(result);
      };
      bridge.call(uri, JSON.stringify(params || {}));
    } catch (e) {
      if (done) done({ returnValue: false, errorText: String(e) });
    }
  }

  // Inputs on webOS are apps too (com.webos.app.hdmi1 and so on).
  function openOnTv(appId, title) {
    if (!appId) {
      closeOverlay();
      toast(title + ' is not linked to an app on this TV yet');
      return;
    }
    callLuna('luna://com.webos.applicationManager/launch', { id: appId }, function (result) {
      if (result.returnValue !== false) return;
      closeOverlay();
      toast('Could not open ' + title);
    });
  }

  function launchApp(id) {
    var app = C.apps[id];
    openLaunch({ accent: app.accent, art: ART.appIcon(app, 'launch'), kind: 'is-app', title: app.title, sub: 'Opening…',
      note: onTv() ? '' : 'Prototype: on the TV, ' + app.title + ' opens here. Press Back to return.' });
    if (onTv()) openOnTv(app.appId, app.title);
  }

  function switchInput(inp) {
    var ps5 = inp.art === 'ps5';
    openLaunch({ accent: inp.accent, art: ART[inp.art](ART.uid()), kind: ps5 ? 'is-console' : 'is-icon', ps5: ps5,
      title: inp.title, sub: 'Switching to ' + inp.subtitle + '…',
      note: onTv() ? '' : 'Prototype: on the TV this switches to ' + inp.subtitle + '. Press Back to return.' });
    if (onTv()) openOnTv(inp.appId, inp.title);
  }

  function resumeMedia(item) {
    openLaunch({ accent: item.colors[2], art: ART.poster(ART.uid(), item), title: item.title, sub: 'Resuming · ' + item.detail,
      note: 'Prototype: on the TV this resumes in your media app.' });
  }

  function openLaunch(o) {
    var launch = byId('launch'), art = byId('launchArt');
    clearTimeout(launchTimer);
    launch.classList.toggle('is-ps5', !!o.ps5);
    launch.style.setProperty('--launch', rgba(o.accent, 0.55));
    art.className = 'launch-art' + (o.kind ? ' ' + o.kind : '');
    art.innerHTML = o.art;
    byId('launchTitle').textContent = o.title;
    byId('launchSub').textContent = o.sub;
    byId('launchNote').textContent = o.note;
    openOverlay(launch);
  }

  function toggleHome(item, tile) {
    if (item.type === 'scene') {
      C.home.items.forEach(function (x) {
        if (x.type !== 'light') return;
        x.on = x.id === 'lamp';
        if (x.on) x.level = 20;
      });
      each(byId('homeTrack').children, function (t) { renderHomeTile(t, find(C.home.items, t.dataset.id)); });
      toast('Movie night: lights dimmed');
      return;
    }
    item.on = !item.on;
    renderHomeTile(tile, item);
    toast(item.name + (item.on ? ' on' : ' off'));
  }

  function selectOption(e) {
    each(e.parentNode.children, function (o) { o.classList.toggle('is-selected', o === e); });
    if (e.dataset.group === 'home') {
      if (onTv()) setHomeButton(e.dataset.value === 'ours');
      else toast(e.dataset.value === 'lg' ? 'Home button now opens LG Home. Switch back here any time.' : 'Home button opens this home screen.');
    } else {
      state.idleMinutes = +e.dataset.value;
      toast(state.idleMinutes ? 'Idle screen after ' + state.idleMinutes + ' min' : 'Idle screen off');
      resetIdle();
    }
  }

  // ---------- Home button (Home Helper) ----------
  // Settings asks this app's own service (home-service/) where the Home button goes. The service passes the choice to
  // Home Helper (helper/), which watches the remote; pressing Home three times stops Helper until it is started again.
  var HOME_SERVICE = 'luna://com.local.ambienthome.service/';
  var helper = null;

  function homeNote(text) { byId('homeNote').textContent = text; }

  function showHomeChoice(value) {
    each(document.querySelectorAll('[data-group="home"]'), function (o) { o.classList.toggle('is-selected', o.dataset.value === value); });
  }

  function openSettings() {
    if (idleOn) exitIdle();
    var top = stack[stack.length - 1];
    if (!top || top.ov.id !== 'settings') openOverlay(byId('settings'));
    if (onTv()) refreshHome();
  }

  function refreshHome() {
    homeNote('Checking the Home button…');
    callLuna(HOME_SERVICE + 'helperStatus', {}, function (s) {
      helper = s.returnValue ? s : null;
      if (!helper || !helper.installed || !helper.running) {
        showHomeChoice('lg');
        homeNote(!helper ? 'Could not reach Home Helper, so Home opens LG Home.' :
          !helper.installed ? 'Home Helper is not installed, so Home opens LG Home.' :
          helper.blocked ? 'Home was pressed three times, so it opens LG Home. Choose This home screen to turn it back on.' :
          'Home Helper is off, so Home opens LG Home. Choose This home screen to turn it on.');
        return;
      }
      callLuna(HOME_SERVICE + 'homeStatus', {}, function (r) {
        if (r.returnValue !== true || typeof r.enabled !== 'boolean') {
          homeNote('Home Helper did not answer. The Home button may still work.');
          return;
        }
        showHomeChoice(r.enabled ? 'ours' : 'lg');
        homeNote(r.enabled ? 'Home, and leaving an app, bring you here.' : 'Home opens LG Home.');
      });
    });
  }

  function setHomeButton(ours) {
    if (helper && helper.running) {
      homeNote('Changing the Home button…');
      callLuna(HOME_SERVICE + 'setHomeControl', { enabled: ours }, function (r) {
        if (r.returnValue !== true) toast('The Home button did not change. Try again.');
        refreshHome();
      });
    } else if (ours && helper && helper.installed) {
      // Starting Helper ends the stop from pressing Home three times. It keeps the last choice, so set it afterwards.
      homeNote('Starting Home Helper…');
      callLuna('luna://com.webos.applicationManager/launch', { id: 'com.local.nativehome', params: { nativeHomeStart: true } }, function (r) {
        if (r.returnValue === false) {
          toast('Could not start Home Helper');
          refreshHome();
          return;
        }
        waitForHelper(10, function (ok) {
          if (ok) setHomeButton(true);
          else {
            toast('Home Helper did not start');
            refreshHome();
          }
        });
      });
    } else refreshHome();
  }

  function waitForHelper(tries, done) {
    callLuna(HOME_SERVICE + 'helperStatus', {}, function (s) {
      if (s.returnValue && s.running) {
        helper = s;
        done(true);
      } else if (tries > 1) setTimeout(function () { waitForHelper(tries - 1, done); }, 1000);
      else done(false);
    });
  }

  // Through Helper when it runs, so it does not bring you straight back here.
  function openLgHome() {
    if (!onTv()) {
      toast('On the TV this opens LG Home once and keeps your choice.');
      return;
    }
    var running = helper && helper.running;
    callLuna(running ? HOME_SERVICE + 'openLGHome' : 'luna://com.webos.applicationManager/launch', running ? {} : { id: 'com.webos.app.home' }, function (r) {
      if (r.returnValue === false) toast('Could not open LG Home');
      else closeOverlay();
    });
  }

  // Opening "Home Helper" in LG's app list starts this app with showHelper: show the Home settings.
  function wantsHelper(raw) {
    try {
      if (raw && raw.params) raw = raw.params;
      var params = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return !!(params && params.showHelper === true);
    } catch (e) {
      return false;
    }
  }

  // ---------- Overlays ----------
  function openOverlay(ov) {
    stack.push({ ov: ov, scope: scope, focus: current });
    ov.classList.add('is-open');
    if (current) current.classList.remove('is-focused');
    scope = ov;
    current = null;
    var first = ov.querySelector('.is-selected[data-row]') || ov.querySelector('[data-row]');
    if (first) setFocus(first);
  }

  function closeOverlay() {
    var top = stack.pop();
    if (!top) return;
    top.ov.classList.remove('is-open');
    // The PS5 shapes keep animating while hidden, so switch them off once the fade-out ends.
    if (top.ov.id === 'launch') launchTimer = setTimeout(function () { top.ov.classList.remove('is-ps5'); }, 400);
    if (current) current.classList.remove('is-focused');
    scope = top.scope;
    current = null;
    setFocus(top.focus || byId('appsTrack').firstChild);
  }

  // ---------- OLED-safe idle screen ----------
  function resetIdle() {
    clearTimeout(idleTimer);
    if (state.idleMinutes > 0) idleTimer = setTimeout(enterIdle, state.idleMinutes * 60000);
  }

  function enterIdle() {
    if (idleOn) return;
    if (lapse) { resetIdle(); return; }
    idleOn = true;
    byId('idle').classList.add('is-on');
    moveIdle();
    idleMover = setInterval(moveIdle, C.idleMoveSeconds * 1000);
    // Once the black screen has faded in, stop drawing the scene and the rows behind it.
    sleepTimer = setTimeout(function () { stage.classList.add('is-sleeping'); }, 1300);
  }

  function exitIdle() {
    idleOn = false;
    clearTimeout(sleepTimer);
    stage.classList.remove('is-sleeping');
    byId('idle').classList.remove('is-on');
    clearInterval(idleMover);
    resetIdle();
  }

  function moveIdle() {
    var b = byId('idleBlock');
    var x = 140 + Math.random() * (1920 - 280 - b.offsetWidth), y = 140 + Math.random() * (1080 - 280 - b.offsetHeight);
    b.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
  }

  // Small static elements still shift a few pixels every few minutes.
  function pixelShift() {
    ui.style.transform = 'translate(' + Math.round(Math.random() * 8 - 4) + 'px,' + Math.round(Math.random() * 8 - 4) + 'px)';
  }

  // ---------- Messages and preview controls ----------
  function toast(message) {
    var t = byId('toast');
    t.textContent = message;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2600);
  }

  function toggleHelp(show) {
    var help = byId('help');
    if (show == null) show = help.classList.contains('is-faded');
    help.classList.toggle('is-faded', !show);
    clearTimeout(helpTimer);
    if (show) helpTimer = setTimeout(function () { help.classList.add('is-faded'); }, 12000);
  }

  // ---------- Automatic quality ----------
  // Once a new scene has settled, sample the frame rate. If the TV is struggling, try hiding the next most costly
  // extras (classes q1 to q3 in style.css) and keep that step only if it clearly helps.
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
      if (idleOn || lapse || document.hidden) return;
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
  function toggleFps() {
    var box = byId('fps'), frames = 0, slowest = 0, last = 0, started = 0;
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

  function cyclePreviewTime() {
    stopLapse();
    var list = [null].concat(PHASES);
    state.preview = list[(list.indexOf(state.preview) + 1) % list.length];
    state.sim = state.preview ? previewTime(state.preview) : null;
    tick(true);
    toast(state.preview ? 'Preview: ' + PHASE_LABEL[state.preview] + ' · ' + fmtTime(state.sim) : 'Time: now');
  }

  function cycleCondition() {
    var list = [null].concat(CONDITIONS);
    state.condOverride = list[(list.indexOf(state.condOverride) + 1) % list.length];
    applyWallpaper();
    toast('Weather: ' + (state.condOverride ? COND_LABEL[state.condOverride] : 'live'));
  }

  function cycleSeason() {
    var list = [null].concat(SEASONS);
    state.seasonOverride = list[(list.indexOf(state.seasonOverride) + 1) % list.length];
    applyWallpaper();
    toast('Season: ' + cap(state.seasonOverride || seasonFor(new Date()) + ' (today)'));
  }

  // A whole day in about 36 seconds: 4 simulated minutes every 100 ms.
  function toggleLapse() {
    if (lapse) {
      stopLapse();
      state.sim = state.preview ? previewTime(state.preview) : null;
      tick(true);
      toast('Time-lapse off');
      return;
    }
    state.sim = clockMinutes();
    stage.classList.add('is-lapse');
    lapse = setInterval(function () { state.sim = (state.sim + 4) % 1440; tick(); }, 100);
    toast('Time-lapse: a day in about 36 seconds · press D to stop');
  }

  function stopLapse() {
    if (!lapse) return;
    clearInterval(lapse);
    lapse = null;
    stage.classList.remove('is-lapse');
  }

  // ---------- Input: remote keys, Magic Remote pointer and wheel ----------
  function onKey(ev) {
    if (idleOn) { ev.preventDefault(); exitIdle(); return; }
    resetIdle();
    var code = ev.keyCode;
    // Preview controls: letter keys in a browser; on the LG remote the coloured buttons (red, green, yellow,
    // blue) or, for remotes without them, the number keys 6 to 9.
    if (code === 84 || code === 403 || code === 54) { cyclePreviewTime(); return; }
    if (code === 87 || code === 404 || code === 55) { cycleCondition(); return; }
    if (code === 83 || code === 405 || code === 56) { cycleSeason(); return; }
    if (code === 68 || code === 406 || code === 57) { toggleLapse(); return; }
    if (code === 48 || code === 96) { toggleFps(); return; }
    if (code === 73) { enterIdle(); return; }
    if (code === 72) { toggleHelp(); return; }
    if (!stack.length && ((code >= 49 && code <= 57) || (code >= 97 && code <= 105))) {
      var digit = String(code >= 97 ? code - 96 : code - 48), inp = null;
      C.inputs.forEach(function (x) { if (x.key === digit) inp = x; });
      if (inp) switchInput(inp);
      return;
    }
    var key = KEYS[code];
    if (!key) return;
    ev.preventDefault();
    if (key === 'ok' && ev.repeat) return;
    if (stack.length && !current) {
      if (key === 'ok' || key === 'back') closeOverlay();
      return;
    }
    if (key === 'back') {
      if (stack.length) closeOverlay();
      else if (page === 'b') setFocus(memory['ui:1'] || byId('appsTrack').firstChild);
      return;
    }
    if (key === 'ok') { activate(current); return; }
    move(key);
  }

  function targetOf(ev) { return ev.target && ev.target.closest ? ev.target.closest('[data-row]') : null; }

  function onPointerMove(ev) {
    if (idleOn) {
      if (Math.abs(ev.movementX || 0) + Math.abs(ev.movementY || 0) > 4) exitIdle();
      return;
    }
    var now = Date.now();
    if (now - lastActivity > 1000) { lastActivity = now; resetIdle(); }
    var t = targetOf(ev);
    if (t && t !== current && scope.contains(t)) setFocus(t);
  }

  function onClick(ev) {
    if (idleOn) { exitIdle(); return; }
    if (stack.length && !current) { closeOverlay(); return; }
    var t = targetOf(ev);
    if (t && scope.contains(t)) { setFocus(t); activate(t); }
    else if (stack.length && ev.target.classList.contains('sheet')) closeOverlay();
  }

  function onWheel(ev) {
    var now = Date.now();
    if (now - lastWheel < 280) return;
    lastWheel = now;
    if (idleOn) { exitIdle(); return; }
    resetIdle();
    move(ev.deltaY > 0 ? 'down' : 'up');
  }

  // Test hook for measuring on the TV through the inspector, for example
  // homeDebug.auto(false); homeDebug.quality(0); homeDebug.scene({ time: 'night', weather: 'snow', season: 'winter' }).
  window.homeDebug = {
    scene: function (o) {
      stopLapse();
      if ('time' in o) { state.preview = o.time; state.sim = o.time ? previewTime(o.time) : null; }
      if ('weather' in o) state.condOverride = o.weather;
      if ('season' in o) state.seasonOverride = o.season;
      tick(true);
    },
    quality: function (q) { if (q != null) setQuality(q); return quality; },
    auto: function (on) { autoQuality = !!on; if (!on) clearTimeout(checkTimer); },
    idle: function (minutes) { state.idleMinutes = minutes; resetIdle(); }
  };

  // ---------- This TV's apps and inputs ----------
  // scripts/tv-sync-apps.mjs fetches them into tv-apps.js; without that file the demo lists in config.js stay.
  // Apps in config.js are matched by their appId on the TV and keep their drawn logo; any other app shows the TV's
  // own icon.

  function copy(base, extra) {
    var out = {}, k;
    for (k in base) out[k] = base[k];
    for (k in extra) out[k] = extra[k];
    return out;
  }

  function useTvApps(tv) {
    var apps = {}, drawn = {}, inputIds = tv.inputs.map(function (d) { return d.appId; });
    Object.keys(C.apps).forEach(function (key) { if (C.apps[key].appId) drawn[C.apps[key].appId] = key; });
    tv.apps.forEach(function (a) {
      if (a.id === 'com.local.ambienthome' || inputIds.indexOf(a.id) >= 0) return;
      var key = drawn[a.id], color = /^#[0-9a-f]{6}$/i.test(a.color) ? a.color : '#64748b';
      if (key && C.apps[key]) {
        apps[key] = copy(C.apps[key], { appId: a.id, subtitle: key === 'iptv' ? 'Live TV · ' + a.title : C.apps[key].subtitle });
      } else {
        apps[a.id] = { title: a.title, appId: a.id, icon: a.icon, accent: color, bg: color, fg: '#ffffff' };
      }
    });
    C.apps = apps;
    C.dock = C.dock.filter(function (key) { return apps[key]; });
    C.inputs = tv.inputs.map(function (d, i) {
      var n = (/hdmi(\d)/.exec(d.appId) || [])[1] || String(i + 1), ps5 = /ps5|playstation/i.test(d.label);
      var named = !ps5 && d.label && !/^hdmi\s*\d$/i.test(d.label);
      return {
        id: 'hdmi' + n, appId: d.appId, key: n, title: ps5 ? 'PS5' : named ? d.label : 'HDMI ' + n,
        subtitle: ps5 || named ? 'HDMI ' + n : 'Unnamed device', art: ps5 ? 'ps5' : 'hdmi', accent: ps5 ? '#2563eb' : '#64748b'
      };
    });
  }

  // ---------- Start ----------
  if (window.TV_APPS) useTvApps(window.TV_APPS);
  if (/Web0S|webOS/i.test(navigator.userAgent)) document.body.classList.add('on-tv');
  fit();
  window.addEventListener('resize', fit);
  buildWallpaper();
  buildRows();
  buildAllApps();
  buildLaunchFx();
  tick(true);
  setInterval(tick, 1000);
  setFocus(byId('appsTrack').firstChild);
  moveIdle();
  resetIdle();
  toggleHelp(true);
  loadWeather();
  setInterval(pixelShift, 180000);
  byId('birds').addEventListener('animationend', function (ev) {
    if (ev.target === ev.currentTarget) ev.currentTarget.className = 'birds';
  });
  checkSmoothness();
  every(5, 30, 70, flyIfReady);
  every(8, 10, 24, shootIfReady);
  every(4, 6, 13, strike);
  document.addEventListener('keydown', onKey);
  if (window.PalmSystem && wantsHelper(window.PalmSystem.launchParams)) openSettings();
  document.addEventListener('webOSRelaunch', function (ev) { if (wantsHelper(ev.detail)) openSettings(); });
  // When an app takes over the screen, put the home screen back so it is ready when you return.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && stack.length && stack[stack.length - 1].ov.id === 'launch') closeOverlay();
  });
  stage.addEventListener('mousemove', onPointerMove);
  stage.addEventListener('click', onClick);
  stage.addEventListener('wheel', onWheel, { passive: true });
}());
