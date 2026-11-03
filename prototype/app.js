/* Ambient Home: the home screen on top of the living lakeside (scene.js): app and input rows, panels, settings,
   the Home button and the idle screen. Written in ES5 style for the TV's web engine. */
(function () {
  'use strict';

  var C = window.HOME_CONFIG;
  var ART = window.HOME_ART;

  var KEYS = { 37: 'left', 38: 'up', 39: 'right', 40: 'down', 13: 'ok', 27: 'back', 8: 'back', 461: 'back' };

  var stage = byId('stage');
  var ui = byId('ui');
  var idleMinutes = savedIdleMinutes();
  var scope = ui, current = null, page = 'a', stack = [], memory = {};
  var idleOn = false, idleTimer = null, idleMover = null, sleepTimer = null, toastTimer = null, helpTimer = null, launchTimer = null;
  var lastWheel = 0, lastActivity = 0;

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
  function rand(min, max) { return min + Math.random() * (max - min); }

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
  function parallax(e) { SCENE.pan(focusX(e) / 1920 * 2 - 1); }

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
    else if (action === 'forecast') openOverlay(byId('forecast'));
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
      if (onTv()) setHomeButton(e.dataset.value);
      else toast(e.dataset.value === 'lg' ? 'Home button now opens LG Home. Switch back here any time.' :
        e.dataset.value === 'ours' ? 'Home button opens this home screen.' : 'Home button now opens ' + homeName(e.dataset.value) + '.');
    } else {
      idleMinutes = +e.dataset.value;
      try { localStorage.setItem('idleMinutes', idleMinutes); } catch (err) { /* not saved; this visit still uses it */ }
      toast(idleMinutes ? 'Idle screen after ' + idleMinutes + ' min' : 'Idle screen off');
      resetIdle();
    }
  }

  // ---------- Home button (Home Helper) ----------
  // Home Helper (helper/) watches the remote and opens this app when Home is pressed; pressing Home three times stops
  // it until it is started again. webOS keeps each app's files and services to itself, so Settings asks Helper by
  // opening it with a request ({ homeRequest }), and Helper answers by opening this app with the answer ({ homeReply }).
  // Home can also open another home screen of yours (config otherHomes), offered here between this one and LG Home.
  var HELPER_APP = 'com.local.nativehome', SELF = 'com.local.ambienthome';
  var helper = null, helperAsk = null;
  var otherHomes = (C.otherHomes || []).filter(function (h) {
    return h && /^com\.local\.[a-z0-9]{1,40}$/.test(h.id) && h.id !== SELF && h.id !== HELPER_APP && h.name;
  });

  function homeName(id) {
    var h = otherHomes.filter(function (x) { return x.id === id; })[0];
    return h ? h.name : id;
  }

  function buildHomeChoices() {
    var lg = document.querySelector('[data-group="home"][data-value="lg"]');
    otherHomes.forEach(function (h) {
      var o = el('div', 'seg-option');
      o.setAttribute('data-row', '0');
      o.setAttribute('data-action', 'seg');
      o.setAttribute('data-group', 'home');
      o.setAttribute('data-value', h.id);
      o.textContent = h.name;
      lg.parentNode.insertBefore(o, lg);
    });
  }

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

  function requestId() {
    var bytes = new Uint8Array(16), id = '', i;
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    for (i = 0; i < 16; i++) id += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    return id;
  }

  // One request at a time. done(answer) gets Helper's answer { returnValue, running, blocked, enabled, launcher }, or
  // { missing: true } when Helper could not be opened, or { timeout: true } when it did not answer in time.
  // choice: { enabled, launcher } for setHomeControl; launcher is the home screen Home opens.
  function askHelper(method, choice, done) {
    var id = requestId(), request = { id: id, method: method, from: SELF };
    if (choice) {
      request.enabled = choice.enabled;
      if (choice.launcher) request.launcher = choice.launcher;
    }
    // Starting Helper takes a few seconds; its answer comes once it runs.
    helperAsk = { id: id, done: done, timer: setTimeout(function () { helperAnswer({ id: id, timeout: true }); }, method === 'setHomeControl' ? 15000 : 8000) };
    callLuna('luna://com.webos.applicationManager/launch', { id: HELPER_APP, params: { homeRequest: request } }, function (r) {
      if (r.returnValue === false) helperAnswer({ id: id, missing: true });
    });
  }

  function helperAnswer(answer) {
    if (!helperAsk || !answer || answer.id !== helperAsk.id) return;
    var ask = helperAsk;
    helperAsk = null;
    clearTimeout(ask.timer);
    ask.done(answer);
  }

  function refreshHome() {
    if (helperAsk) return;
    homeNote('Checking the Home button…');
    askHelper('homeStatus', null, showHelperState);
  }

  function showHelperState(a) {
    if (a.timeout) {
      helper = null;
      homeNote('Home Helper did not answer. The Home button may still work.');
      return;
    }
    helper = a.returnValue === true ? a : null;
    if (helper && helper.running) {
      var home = !helper.enabled ? 'lg' : !helper.launcher || helper.launcher === SELF ? 'ours' : helper.launcher;
      showHomeChoice(home);
      homeNote(home === 'ours' ? 'Home, and leaving an app, bring you here.' : home === 'lg' ? 'Home opens LG Home.' :
        'Home, and leaving an app, open ' + homeName(home) + '.');
      return;
    }
    showHomeChoice('lg');
    homeNote(a.missing ? 'Home Helper is not installed, so Home opens LG Home.' :
      !helper ? 'Home Helper could not check the Home button, so Home may open LG Home.' :
      helper.blocked ? 'Home was pressed three times, so it opens LG Home. Choose This home screen to turn it back on.' :
      'Home Helper is off, so Home opens LG Home. Choose This home screen to turn it on.');
  }

  // value: 'ours', 'lg' or another home screen's app id. Choosing a home screen also starts Helper when it is stopped,
  // which ends the stop from pressing Home three times. LG Home keeps the chosen home screen for next time.
  function setHomeButton(value) {
    if (helperAsk) {
      toast('Still waiting for Home Helper. Try again in a moment.');
      return;
    }
    var on = value !== 'lg';
    homeNote(on && !(helper && helper.running) ? 'Starting Home Helper…' : 'Changing the Home button…');
    askHelper('setHomeControl', { enabled: on, launcher: on ? (value === 'ours' ? SELF : value) : null }, function (a) {
      showHelperState(a);
      if (a.returnValue === true) {
        toast(!(a.running && a.enabled) ? 'Home opens LG Home.' : !a.launcher || a.launcher === SELF ? 'Home opens this home screen.' :
          'Home opens ' + homeName(a.launcher) + '.');
      } else if (!a.missing && !a.timeout) toast('The Home button did not change. Try again.');
    });
  }

  // Through Helper when it runs, so it does not bring you straight back here. Helper does not answer this request:
  // opening this app with the answer would leave LG Home at once.
  function openLgHome() {
    if (!onTv()) {
      toast('On the TV this opens LG Home once and keeps your choice.');
      return;
    }
    var viaHelper = helper && helper.running;
    callLuna('luna://com.webos.applicationManager/launch', viaHelper ?
      { id: HELPER_APP, params: { homeRequest: { id: requestId(), method: 'openLGHome' } } } : { id: 'com.webos.app.home' }, function (r) {
      if (r.returnValue === false) toast('Could not open LG Home');
      else closeOverlay();
    });
  }

  // Launch parameters, as an object. webOS adds keys of its own (displayAffinity).
  function paramsOf(raw) {
    try {
      var params = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return params && typeof params === 'object' ? params : {};
    } catch (e) {
      return {};
    }
  }

  // Helper opens this app whenever Home is pressed, also when it is already on screen. Show the home screen itself,
  // so Home always does something you can see: wake the idle screen and close any open sheet.
  function comeHome() {
    if (idleOn) exitIdle();
    else resetIdle();
    while (stack.length) closeOverlay();
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
  // The choice in Settings is kept, so it survives webOS restarting the app or the TV.
  function savedIdleMinutes() {
    var saved = null;
    try { saved = localStorage.getItem('idleMinutes'); } catch (err) { /* storage off: use the default */ }
    return saved !== null && /^(0|1|5|10)$/.test(saved) ? +saved : C.idleMinutes;
  }

  function resetIdle() {
    clearTimeout(idleTimer);
    if (idleMinutes > 0) idleTimer = setTimeout(enterIdle, idleMinutes * 60000);
  }

  function enterIdle() {
    if (idleOn) return;
    if (SCENE.lapsing()) { resetIdle(); return; }
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

  // ---------- Input: remote keys, Magic Remote pointer and wheel ----------
  function onKey(ev) {
    if (idleOn) { ev.preventDefault(); exitIdle(); return; }
    resetIdle();
    var code = ev.keyCode;
    // Preview controls: letter keys in a browser; on the LG remote the coloured buttons (red, green, yellow,
    // blue) or, for remotes without them, the number keys 6 to 9.
    if (code === 84 || code === 403 || code === 54) { toast(SCENE.cycleTime()); return; }
    if (code === 87 || code === 404 || code === 55) { toast(SCENE.cycleWeather()); return; }
    if (code === 83 || code === 405 || code === 56) { toast(SCENE.cycleSeason()); return; }
    if (code === 68 || code === 406 || code === 57) { toast(SCENE.toggleLapse()); return; }
    if (code === 48 || code === 96) { SCENE.toggleFps(byId('fps')); return; }
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
    scene: SCENE.preview,
    quality: SCENE.quality,
    auto: SCENE.auto,
    idle: function (minutes) { idleMinutes = minutes; resetIdle(); }
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
  // The living lakeside rests while the idle screen is up, and while another app is on screen.
  SCENE.mount(stage, { paused: function () { return idleOn || document.hidden; } });
  byId('wallpaper').appendChild(el('div', 'dim fill'));
  buildRows();
  buildAllApps();
  buildLaunchFx();
  buildHomeChoices();
  setFocus(byId('appsTrack').firstChild);
  each(document.querySelectorAll('[data-group="idle"]'), function (o) { o.classList.toggle('is-selected', +o.dataset.value === idleMinutes); });
  moveIdle();
  resetIdle();
  toggleHelp(true);
  setInterval(pixelShift, 180000);
  document.addEventListener('keydown', onKey);
  // Opening "Home Helper" in LG's app list starts this app with showHelper: show the Home settings.
  if (window.PalmSystem && paramsOf(window.PalmSystem.launchParams).showHelper === true) openSettings();
  document.addEventListener('webOSRelaunch', function (ev) {
    var params = paramsOf(ev.detail);
    if (params.homeReply) helperAnswer(params.homeReply);
    else if (params.showHelper === true) openSettings();
    else comeHome();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      // webOS freezes this page while another app is on screen, and a frozen idle countdown fires the moment the page
      // is back: the idle screen came up right after Home. Count only while the home screen is on screen.
      clearTimeout(idleTimer);
      // When an app takes over the screen, put the home screen back so it is ready when you return.
      if (stack.length && stack[stack.length - 1].ov.id === 'launch') closeOverlay();
    } else if (idleOn) exitIdle();
    else resetIdle();
  });
  stage.addEventListener('mousemove', onPointerMove);
  stage.addEventListener('click', onClick);
  stage.addEventListener('wheel', onWheel, { passive: true });
}());
