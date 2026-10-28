/* Ambient Wallpaper: the living lakeside (scene.js) on its own, with the clock, the weather and the next days'
   forecast. It is a TV app of its own, needs nothing else installed, and runs in any browser too.
   OK (Enter) hides or shows the clock; the preview keys work as on Ambient Home. Written in ES5 for the TV. */
(function () {
  'use strict';

  var stage = document.getElementById('stage');
  var info = document.getElementById('info');
  var toastTimer = null, helpTimer = null, side = 1;

  function byId(id) { return document.getElementById(id); }

  // The TV canvas is always 1920x1080; in a browser it is scaled to fit the window.
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
  }

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

  // Every few minutes the clock shifts a few pixels and the landscape pans towards the other side, so nothing on
  // screen stays lit in one place.
  function drift() {
    info.style.transform = 'translate(' + Math.round(Math.random() * 16 - 8) + 'px,' + Math.round(Math.random() * 12 - 6) + 'px)';
    side = -side;
    SCENE.pan(side * (0.4 + Math.random() * 0.5));
  }

  // Preview controls: letter keys in a browser; on the LG remote the coloured buttons or the number keys 6 to 9.
  function onKey(ev) {
    var code = ev.keyCode;
    if (code === 84 || code === 403 || code === 54) { toast(SCENE.cycleTime()); return; }
    if (code === 87 || code === 404 || code === 55) { toast(SCENE.cycleWeather()); return; }
    if (code === 83 || code === 405 || code === 56) { toast(SCENE.cycleSeason()); return; }
    if (code === 68 || code === 406 || code === 57) { toast(SCENE.toggleLapse()); return; }
    if (code === 48 || code === 96) { SCENE.toggleFps(byId('fps')); return; }
    if (code === 72) { toggleHelp(); return; }
    if (code === 13 && !ev.repeat) info.classList.toggle('is-hidden');
  }

  if (/Web0S|webOS/i.test(navigator.userAgent)) document.body.classList.add('on-tv');
  fit();
  window.addEventListener('resize', fit);
  SCENE.mount(stage);
  stage.classList.add('is-drifting');
  setTimeout(drift, 4000);
  setInterval(drift, 180000);
  toggleHelp(true);
  document.addEventListener('keydown', onKey);
  stage.addEventListener('click', function () { info.classList.toggle('is-hidden'); });
  // A double click in a browser fills the screen.
  document.addEventListener('dblclick', function () {
    var root = document.documentElement;
    if (root.requestFullscreen) root.requestFullscreen();
  });

  // Test hook, as on Ambient Home: wallpaperDebug.scene({ time: 'night', weather: 'clear', season: 'summer' }).
  window.wallpaperDebug = { scene: SCENE.preview, quality: SCENE.quality, auto: SCENE.auto };
}());
