/* Artwork drawn for this project as inline SVG. App logos live in icons/ (see SOURCES.txt). */
(function () {
  'use strict';

  var count = 0;
  function uid() { return 'art' + (++count); }

  // Repeatable random numbers, so the landscape is the same on every visit.
  function seeded(seed) {
    return function () {
      seed = seed * 16807 % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }
  function n1(v) { return Math.round(v * 10) / 10; }

  // How much light is left at screen height y (1 = all): the sky gradients darken towards the top edge and
  // towards the viewer across the lake, and details drawn over them fade the same way.
  var SHADE = [[0, 0.58], [281, 1], [454, 1], [734, 0.48], [1080, 0.18]];
  function shade(y) {
    for (var i = 1; i < SHADE.length; i++) {
      if (y <= SHADE[i][0]) {
        var a = SHADE[i - 1], b = SHADE[i];
        return a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0]);
      }
    }
    return SHADE[SHADE.length - 1][1];
  }
  function xy(p) { return n1(p[0]) + ' ' + n1(p[1]); }
  function poly(pts) { return 'M' + pts.map(xy).join('L') + 'Z'; }

  // 24x24 stroke icons that take the surrounding text colour.
  function line(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  }

  var CLOUD = 'M17.5 19H7a5 5 0 1 1 1.1-9.88A6 6 0 0 1 19.4 11.2 4 4 0 0 1 17.5 19z';
  var SUN = '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.1M12 19.3v2.1M4.7 4.7l1.5 1.5' +
    'M17.8 17.8l1.5 1.5M2.6 12h2.1M19.3 12h2.1M4.7 19.3l1.5-1.5M17.8 6.2l1.5-1.5"/>';
  var MOON = '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5z"/>';

  function weather(cond, night) {
    var sky = night ? MOON : SUN;
    if (cond === 'clear') return line(sky);
    if (cond === 'partly') {
      return line('<g transform="translate(.5 .5) scale(.6)">' + sky + '</g>' +
        '<path transform="translate(2.5 3.5) scale(.86)" fill="currentColor" fill-opacity=".16" d="' + CLOUD + '"/>');
    }
    if (cond === 'cloudy') {
      return line('<path transform="translate(-1 -3) scale(.72)" opacity=".55" d="' + CLOUD + '"/>' +
        '<path transform="translate(.6 1)" d="' + CLOUD + '"/>');
    }
    var top = '<path transform="translate(0 -3.5)" d="' + CLOUD + '"/>';
    if (cond === 'rain') return line(top + '<path d="M8.5 18.6l-1.2 2.6M12.5 18.6l-1.2 2.6M16.5 18.6l-1.2 2.6"/>');
    if (cond === 'storm') return line(top + '<path d="M13 15.4l-2.6 3.5h3.2l-2.4 3.6"/>');
    if (cond === 'snow') {
      return line(top + '<g fill="currentColor" stroke="none"><circle cx="8" cy="19.6" r="1.05"/>' +
        '<circle cx="12" cy="21.4" r="1.05"/><circle cx="16" cy="19.6" r="1.05"/></g>');
    }
    return line(top + '<path d="M4.5 18.4h15M7 21.4h10"/>');
  }

  function sunIcon() { return line(SUN); }

  function gear() {
    var d = '', teeth = 8, w = Math.PI / 20, i, a;
    function p(r, ang) { return (12 + r * Math.cos(ang)).toFixed(2) + ' ' + (12 + r * Math.sin(ang)).toFixed(2); }
    for (i = 0; i < teeth; i++) {
      a = i * 2 * Math.PI / teeth;
      d += (i ? 'L' : 'M') + p(7.4, a - 1.7 * w) + 'L' + p(10, a - w) + 'L' + p(10, a + w) + 'L' + p(7.4, a + 1.7 * w);
    }
    return line('<path d="' + d + 'Z"/><circle cx="12" cy="12" r="3"/>');
  }

  function hdmi() {
    return line('<path d="M3.5 8.5h17v4.4l-2.4 2.9H5.9l-2.4-2.9z"/><path d="M7.2 11.6h9.6"/><path d="M9.5 15.8v3.7h5v-3.7"/>');
  }

  function bulb() {
    return line('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2v.5h5v-.5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>');
  }

  function scene() {
    return line('<rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M8 6v12M16 6v12"/>');
  }

  // Front view of a PS5-style console: white side panels, black core, blue light strips.
  function ps5(u) {
    return '<svg viewBox="0 0 200 240" aria-hidden="true"><defs>' +
      '<linearGradient id="' + u + 'l" x1="0" x2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cdd3dc"/></linearGradient>' +
      '<linearGradient id="' + u + 'r" x1="1" x2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c7cdd7"/></linearGradient>' +
      '<linearGradient id="' + u + 'c" x1="0" x2="1"><stop offset="0" stop-color="#07090d"/><stop offset=".5" stop-color="#1c212b"/><stop offset="1" stop-color="#07090d"/></linearGradient>' +
      '</defs>' +
      '<ellipse cx="100" cy="232" rx="64" ry="5" fill="#000" opacity=".5"/>' +
      '<rect x="79" y="16" width="42" height="212" rx="9" fill="url(#' + u + 'c)"/>' +
      '<path d="M80 6C58 8 44 22 42 48c-2 36 10 72 8 108-2 32-8 54 6 68 6 6 16 6 24 4z" fill="url(#' + u + 'l)"/>' +
      '<path d="M120 6c22 2 36 16 38 42 2 36-10 72-8 108 2 32 8 54-6 68-6 6-16 6-24 4z" fill="url(#' + u + 'r)"/>' +
      '<path d="M82 14v208M118 14v208" stroke="#4f9bff" stroke-width="2" opacity=".9"/>' +
      '</svg>';
  }

  // ---------- App icons: frosted glass that blooms into the brand's colours on focus ----------
  // Brand logo shapes come from glyphs.js; these two are our own.
  function dots() {
    var out = '', r, c;
    for (r = 0; r < 3; r++) {
      for (c = 0; c < 3; c++) {
        out += '<circle class="sig-dot" cx="' + (5 + c * 7) + '" cy="' + (5 + r * 7) + '" r="2.3" style="animation-delay:' +
          ((r + c) * 0.09).toFixed(2) + 's"/>';
      }
    }
    return out;
  }
  var OWN_GLYPHS = {
    // A TV with an antenna, broadcasting: the waves pulse while the icon has focus.
    iptv: { box: '0 0 24 24', stroke: true,
      shape: '<rect x="2.5" y="6.5" width="19" height="13" rx="2.6"/><path d="M8 2.6l4 3.9 4-3.9M8.5 22h7"/>' +
        '<circle cx="12" cy="13" r="1.1" fill="currentColor"/>' +
        '<path class="sig-wave" d="M9.7 10.9a3 3 0 0 0 0 4.2M14.3 10.9a3 3 0 0 1 0 4.2"/>' +
        '<path class="sig-wave sig-wave-2" d="M7.7 9.1a5.6 5.6 0 0 0 0 7.8M16.3 9.1a5.6 5.6 0 0 1 0 7.8"/>' },
    allapps: { box: '0 0 24 24', shape: dots() }
  };
  // Signature moves for whole logos; other logos carry their own sig-* shapes.
  var SIGNATURE = { netflix: 'tadum', youtube: 'press', spotify: 'eq', iptv: 'waves' };
  // The IPTV waves pulse on spans of their own, so the graphics chip fades them without redrawing the logo.
  var WAVES = '<span class="icon-glyph icon-wave">' + glyphSvg({ box: '0 0 24 24', stroke: true,
    shape: '<path d="M9.7 10.9a3 3 0 0 0 0 4.2M14.3 10.9a3 3 0 0 1 0 4.2"/>' }) + '</span>' +
    '<span class="icon-glyph icon-wave icon-wave-2">' + glyphSvg({ box: '0 0 24 24', stroke: true,
    shape: '<path d="M7.7 9.1a5.6 5.6 0 0 0 0 7.8M16.3 9.1a5.6 5.6 0 0 1 0 7.8"/>' }) + '</span>';

  function glyphSvg(g) {
    return '<svg viewBox="' + g.box + '" aria-hidden="true" ' + (g.stroke ?
      'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' : 'fill="currentColor"') +
      '>' + g.shape + '</svg>';
  }

  // A cap of snow for the top of a dock icon, in a 140x40 box where the icon's top edge sits at y 18:
  // fluffy clumps along the edge, thinner over the rounded corners, and a drip or two over the front.
  function snowCap(u, seed) {
    var rnd = seeded(seed), pts = [], d, i, x, n = 9;
    function edge(px) {
      var dx = px < 36 ? 36 - px : px > 104 ? px - 104 : 0;
      return 50 - Math.sqrt(Math.max(0, 1024 - dx * dx));
    }
    for (i = 0; i <= n; i++) {
      x = 127 - i * 114 / n;
      pts.push([x, edge(x) - (x < 30 || x > 110 ? 3 + rnd() * 3 : 8 + rnd() * 6)]);
    }
    d = 'M13 29Q19 19.6 36 19.6H104Q121 19.6 127 29L' + xy(pts[0]);
    for (i = 1; i < n; i++) d += 'Q' + xy(pts[i]) + ' ' + xy([(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]);
    d += 'L' + xy(pts[n]) + 'Z';
    for (i = 0; i < 1 + Math.floor(rnd() * 2); i++) {
      x = 44 + rnd() * 52;
      d += 'M' + n1(x - 3.2) + ' 19.2c0 4.8 1.2 7 3.2 7s3.2-2.2 3.2-7z';
    }
    return '<svg viewBox="0 0 140 40" aria-hidden="true"><defs><linearGradient id="' + u + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset=".2" stop-color="#ffffff"/><stop offset="1" stop-color="#d6e1ee"/></linearGradient></defs>' +
      '<path d="' + d + '" fill="#6f84a6" opacity=".35" transform="translate(0 1.8)"/><path d="' + d + '" fill="url(#' + u + ')"/></svg>';
  }

  // mode 'dock': resting on the lake, with a reflection, ripples and room for snow; 'grid': the All apps sheet;
  // 'launch': just the brand face, shown large while the app opens.
  var caps = 0;
  function appIcon(app, mode) {
    var g = app.glyph && ((window.HOME_GLYPHS || {})[app.glyph] || OWN_GLYPHS[app.glyph]), sig = SIGNATURE[app.glyph];
    // Apps without a drawn logo show the TV's own icon.
    var logo = g ? '<span class="icon-glyph' + (g.word ? ' is-word' : '') + '">' + glyphSvg(g) + '</span>' :
      '<img class="icon-img" src="' + app.icon + '" alt="">';
    var bg = typeof app.bg === 'string' ? app.bg : 'linear-gradient(150deg, ' + app.bg[0] + ', ' + app.bg[1] + ')';
    var brand = '<div class="icon-brand" style="background:' + bg + ';color:' + app.fg + '">' + logo +
      (sig === 'eq' ? '<span class="icon-eq"><i></i><i></i><i></i></span>' : '') + (sig === 'waves' ? WAVES : '') +
      '<i class="shine"></i></div>';
    if (mode === 'launch') return brand;
    var glass = '<div class="icon-glass"><i class="icon-pool"></i>' + logo + '</div>', face = glass + brand;
    var snow = mode === 'dock' ? '<span class="icon-snowcap" style="transition-delay:' + (caps % 4 * 0.6).toFixed(1) + 's">' +
      '<span class="cap-body">' + snowCap(uid(), 31 + caps++ * 7) + '</span></span><span class="snow-puff"><i></i><i></i><i></i></span>' : '';
    var lift = '<div class="icon-lift' + (sig ? ' sig-' + sig : '') + '">' + face + snow +
      (app.live ? '<span class="live"><i></i>Live</span>' : '') + '</div>';
    if (mode === 'grid') return lift;
    return '<i class="icon-water"></i><i class="icon-ripple"></i><i class="icon-ripple icon-ripple-2"></i>' +
      '<div class="icon-reflect">' + glass + '<i class="reflect-fade"></i></div>' + lift;
  }

  // Poster art for the demo "Continue watching" row.
  function poster(u, item) {
    var c = item.colors, m = '';
    if (item.motif === 'waves') {
      m = '<circle cx="300" cy="72" r="34" fill="#ffe3b3" opacity=".85"/>' +
        '<path d="M0 150C90 128 180 172 400 140V225H0Z" fill="' + c[2] + '" opacity=".55"/>' +
        '<path d="M0 182C120 160 240 202 400 172V225H0Z" fill="' + c[2] + '" opacity=".9"/>';
    } else if (item.motif === 'lights') {
      var dots = [[40, 40, 10], [90, 70, 6], [150, 30, 8], [210, 64, 12], [268, 36, 7], [320, 74, 9], [372, 40, 6],
        [60, 110, 7], [130, 96, 11], [250, 112, 8], [350, 120, 10], [190, 130, 6]];
      var hues = ['#fbbf24', '#f472b6', '#fb923c', '#facc15'];
      dots.forEach(function (d, i) {
        m += '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="' + d[2] + '" fill="' + hues[i % 4] + '" opacity=".75"/>';
      });
    } else if (item.motif === 'planet') {
      m = '<g fill="#fff" opacity=".7"><circle cx="40" cy="30" r="1.6"/><circle cx="120" cy="60" r="1.2"/>' +
        '<circle cx="200" cy="24" r="1.4"/><circle cx="360" cy="190" r="1.2"/><circle cx="80" cy="150" r="1.3"/></g>' +
        '<circle cx="290" cy="92" r="56" fill="' + c[2] + '"/>' +
        '<ellipse cx="290" cy="92" rx="98" ry="22" fill="none" stroke="#e0e7ff" stroke-opacity=".6" stroke-width="4" transform="rotate(-16 290 92)"/>';
    } else if (item.motif === 'steam') {
      m = '<circle cx="300" cy="118" r="58" fill="none" stroke="' + c[2] + '" stroke-width="12" opacity=".85"/>' +
        '<circle cx="300" cy="118" r="34" fill="' + c[2] + '" opacity=".35"/>' +
        '<path d="M282 42c-12 16 12 26 0 42M306 36c-12 16 12 26 0 42M330 42c-12 16 12 26 0 42" fill="none" ' +
        'stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/>';
    }
    return '<svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>' +
      '<linearGradient id="' + u + 'b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></linearGradient>' +
      '<linearGradient id="' + u + 's" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".62"/></linearGradient>' +
      '</defs><rect width="400" height="225" fill="url(#' + u + 'b)"/>' + m +
      '<rect width="400" height="225" fill="url(#' + u + 's)"/></svg>';
  }

  // Soft-edged cloud: overlapping puffs that fade out at the edges (no blur filter needed).
  function cloud(u) {
    return '<svg viewBox="0 0 320 150" aria-hidden="true"><defs><radialGradient id="' + u + '">' +
      '<stop offset="0" stop-color="currentColor" stop-opacity=".9"/><stop offset=".55" stop-color="currentColor" stop-opacity=".6"/>' +
      '<stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs>' +
      '<g fill="url(#' + u + ')"><circle cx="86" cy="92" r="56"/><circle cx="140" cy="70" r="66"/><circle cx="200" cy="76" r="60"/>' +
      '<circle cx="250" cy="98" r="46"/><ellipse cx="166" cy="110" rx="140" ry="38"/></g></svg>';
  }

  // ---------- Lakeside landscape ----------
  // Layers are 2080 px wide (80 px spare on each side for parallax) and use the screen's own y.
  // The lake starts at SHORE; each layer draws its own mirror image below that line.
  var SHORE = 612;

  function landSvg(top, height, inner) {
    return '<svg viewBox="0 ' + top + ' 2080 ' + height + '" width="2080" height="' + height +
      '" style="top:' + top + 'px" aria-hidden="true">' + inner + '</svg>';
  }

  function reflection(id, opacity) {
    return '<use href="#' + id + '" transform="translate(0 ' + 2 * SHORE + ') scale(1 -1)" opacity="' + opacity + '"/>';
  }

  // Closed shape from a skyline down to the shore.
  function outline(pts) {
    return 'M0 ' + SHORE + pts.map(function (p) { return 'L' + xy(p); }).join('') + 'L2080 ' + SHORE + 'Z';
  }

  // A straight slope broken into small random steps, for a rocky edge.
  function rough(a, b, rnd, jitter) {
    var pts = [a], steps = Math.max(2, Math.round(Math.abs(b[0] - a[0]) / 30)), i, t;
    for (i = 1; i < steps; i++) {
      t = i / steps;
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + (rnd() - 0.5) * jitter]);
    }
    pts.push(b);
    return pts;
  }

  function cross(a, b, y) {
    var t = (y - a[1]) / (b[1] - a[1]);
    return [a[0] + (b[0] - a[0]) * t, y];
  }

  // Snow from the summit down `depth` (0-1) of the way to the higher neighbouring valley.
  function snowcap(left, right, depth, rnd) {
    var peak = right[0], snowline = peak[1] + (Math.min(left[0][1], right[right.length - 1][1]) - peak[1]) * depth;
    var pts = [], i;
    for (i = left.length - 1; i > 0; i--) {
      pts.unshift(left[i]);
      if (left[i - 1][1] >= snowline) { pts.unshift(cross(left[i], left[i - 1], snowline)); break; }
    }
    for (i = 1; i < right.length; i++) {
      if (right[i][1] >= snowline) { pts.push(cross(right[i - 1], right[i], snowline)); break; }
      pts.push(right[i]);
    }
    var from = pts[pts.length - 1], to = pts[0], teeth = 6;
    for (i = 1; i < teeth; i++) {
      pts.push([from[0] + (to[0] - from[0]) * i / teeth, snowline + (i % 2 ? 6 + rnd() * 12 : -3 - rnd() * 5)]);
    }
    return poly(pts);
  }

  // Snow on every peak of a range that rises above `above` (screen y).
  function peakSnow(points, segs, depth, above, rnd) {
    var out = '', i, p;
    for (i = 1; i < points.length - 1; i++) {
      p = points[i];
      if (p[1] > points[i - 1][1] || p[1] > points[i + 1][1] || p[1] >= above) continue;
      out += snowcap(segs[i - 1], segs[i], depth, rnd);
    }
    return out;
  }

  // White fading to a cool shadow towards the shore, for snow lying on the ground.
  function snowFill(u, top, bottom) {
    return '<defs><linearGradient id="' + u + 's" gradientUnits="userSpaceOnUse" x1="0" y1="' + top + '" x2="0" y2="' + bottom + '">' +
      '<stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#e2e9f3"/><stop offset="1" stop-color="#b6c4d6"/>' +
      '</linearGradient></defs>';
  }

  // Snow layers stay faint on the left, where the focused title needs a dark backdrop. The fade is part
  // of the drawing, so it is worked out once instead of on every frame.
  function fadeLeft(u, top, height, inner) {
    return '<defs><linearGradient id="' + u + 'f" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1100" y2="0">' +
      '<stop offset=".38" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff"/></linearGradient>' +
      '<mask id="' + u + 'm" maskUnits="userSpaceOnUse" x="0" y="' + top + '" width="2080" height="' + height + '">' +
      '<rect x="0" y="' + top + '" width="2080" height="' + height + '" fill="url(#' + u + 'f)"/></mask></defs>' +
      '<g mask="url(#' + u + 'm)">' + inner + '</g>';
  }

  // Peaks stay low on the left, behind the focused title, and rise behind the cabin on the right.
  var FAR = [[0, 548], [130, 516], [260, 552], [430, 504], [570, 544], [770, 482], [905, 528], [1060, 462],
    [1140, 478], [1262, 372], [1352, 432], [1432, 410], [1560, 492], [1690, 448], [1780, 470], [1880, 428],
    [1990, 498], [2080, 474]];
  var DISTANT = [[0, 524], [240, 490], [420, 516], [610, 472], [780, 500], [950, 450], [1120, 484],
    [1300, 420], [1470, 450], [1620, 416], [1800, 446], [1960, 428], [2080, 450]];

  // The ranges' rocky outlines, shared by the land and its winter snow so the two line up.
  function farGeometry() {
    var rnd = seeded(11), segs = [], backSegs = [], i;
    for (i = 1; i < FAR.length; i++) segs.push(rough(FAR[i - 1], FAR[i], rnd, 8));
    for (i = 1; i < DISTANT.length; i++) backSegs.push(rough(DISTANT[i - 1], DISTANT[i], rnd, 5));
    function join(list) {
      var all = [];
      list.forEach(function (seg, k) { all = all.concat(k ? seg.slice(1) : seg); });
      return all;
    }
    return { segs: segs, all: join(segs), back: join(backSegs) };
  }

  // Each peak's shadowed east face.
  function farShade(geo) {
    var shade = '', i, p;
    for (i = 1; i < FAR.length - 1; i++) {
      p = FAR[i];
      if (p[1] > FAR[i - 1][1] || p[1] > FAR[i + 1][1]) continue;
      shade += poly(geo.segs[i].concat([[p[0] + (FAR[i + 1][0] - p[0]) * 0.3, SHORE]]));
    }
    return shade;
  }

  function farRange(u) {
    var geo = farGeometry();
    return landSvg(300, 624, '<g id="' + u + '">' +
      '<path fill="currentColor" opacity=".5" d="' + outline(geo.back) + '"/>' +
      '<path fill="currentColor" d="' + outline(geo.all) + '"/>' +
      '<path fill="#000" opacity=".16" d="' + farShade(geo) + '"/>' +
      '<path class="snowcap" fill="#fff" d="' + peakSnow(FAR, geo.segs, 0.34, 470, seeded(13)) + '"/></g>' + reflection(u, 0.2));
  }

  // Winter: snow reaches far down every peak, and the east faces stay in shadow.
  function farSnow(u) {
    var geo = farGeometry(), snow = peakSnow(FAR, geo.segs, 0.72, SHORE, seeded(17));
    return landSvg(300, 624, '<defs><clipPath id="' + u + 'c"><path d="' + snow + '"/></clipPath></defs>' +
      fadeLeft(u, 300, 624, '<g id="' + u + '"><path fill="#fff" d="' + snow + '"/>' +
      '<path fill="#000" opacity=".18" clip-path="url(#' + u + 'c)" d="' + farShade(geo) + '"/></g>' + reflection(u, 0.2)));
  }

  function hillY(x) { return 574 + 14 * Math.sin(x / 260 + 0.6) + 9 * Math.sin(x / 113 + 2.2) + 4 * Math.sin(x / 47); }

  function pine(x, b, h) {
    var w = h * 0.44, t = b - h;
    return 'M' + n1(x) + ' ' + n1(t) +
      'L' + n1(x + w * 0.26) + ' ' + n1(t + h * 0.36) + 'L' + n1(x + w * 0.13) + ' ' + n1(t + h * 0.36) +
      'L' + n1(x + w * 0.4) + ' ' + n1(t + h * 0.68) + 'L' + n1(x + w * 0.2) + ' ' + n1(t + h * 0.68) +
      'L' + n1(x + w * 0.5) + ' ' + n1(b) + 'L' + n1(x - w * 0.5) + ' ' + n1(b) +
      'L' + n1(x - w * 0.2) + ' ' + n1(t + h * 0.68) + 'L' + n1(x - w * 0.4) + ' ' + n1(t + h * 0.68) +
      'L' + n1(x - w * 0.13) + ' ' + n1(t + h * 0.36) + 'L' + n1(x - w * 0.26) + ' ' + n1(t + h * 0.36) + 'Z';
  }

  // Snow resting on a pine: draped over the tip, and lying flat on the ends of each tier of branches.
  function pineSnow(x, b, h) {
    var w = h * 0.44, t = b - h;
    function ledge(cx, cy, rx, ry) {
      return 'M' + n1(cx - rx) + ' ' + n1(cy) + 'a' + n1(rx) + ' ' + n1(ry) + ' 0 1 0 ' + n1(2 * rx) + ' 0' +
        'a' + n1(rx) + ' ' + n1(ry) + ' 0 1 0 ' + n1(-2 * rx) + ' 0z';
    }
    return 'M' + n1(x) + ' ' + n1(t) + 'L' + n1(x + w * 0.17) + ' ' + n1(t + h * 0.25) +
      'Q' + n1(x) + ' ' + n1(t + h * 0.2) + ' ' + n1(x - w * 0.17) + ' ' + n1(t + h * 0.25) + 'Z' +
      ledge(x - w * 0.24, t + h * 0.35, w * 0.15, h * 0.018) + ledge(x + w * 0.24, t + h * 0.35, w * 0.15, h * 0.018) +
      ledge(x - w * 0.37, t + h * 0.67, w * 0.16, h * 0.02) + ledge(x + w * 0.37, t + h * 0.67, w * 0.16, h * 0.02);
  }

  // Rolling hills topped with pines; smaller and sparser on the left, behind the title.
  function hillGeometry() {
    var rnd = seeded(5), pts = [], pines = [], x, right;
    for (x = 0; x <= 2080; x += 16) pts.push([x, hillY(x)]);
    for (x = 4; x < 2080; x += 6 + rnd() * 14) {
      right = x > 980;
      if (rnd() > (right ? 0.8 : 0.4)) continue;
      pines.push([x, hillY(x) + 4, (right ? 20 : 11) + rnd() * (right ? 34 : 14)]);
    }
    return { pts: pts, pines: pines };
  }

  function hillRange(u) {
    var geo = hillGeometry(), trees = geo.pines.map(function (p) { return pine(p[0], p[1], p[2]); }).join('');
    return landSvg(470, 284, '<g id="' + u + '" fill="currentColor"><path d="' + outline(geo.pts) + trees + '"/></g>' +
      reflection(u, 0.25));
  }

  // Winter: white slopes, the pines still dark with snow on their branches.
  function hillSnow(u) {
    var geo = hillGeometry(), trees = '', snow = '';
    geo.pines.forEach(function (p) { trees += pine(p[0], p[1], p[2]); snow += pineSnow(p[0], p[1], p[2]); });
    return landSvg(470, 284, snowFill(u, 540, 612) + fadeLeft(u, 470, 284, '<g id="' + u + '">' +
      '<path fill="url(#' + u + 's)" d="' + outline(geo.pts) + '"/><path fill="currentColor" d="' + trees + '"/>' +
      '<path fill="#fff" d="' + snow + '"/></g>' + reflection(u, 0.25)));
  }

  var CROWN = {
    spring: ['#f2b6c8', '#f8d4df', '#e795b2'],
    summer: ['#3f7e3b', '#5a9a48', '#2e6a35'],
    autumn: ['#d4612b', '#e7a035', '#b9472a', '#cd7b2e']
  };
  var BLOBS = [[0, 0, 1], [-0.62, 0.28, 0.7], [0.62, 0.22, 0.72], [-0.32, -0.46, 0.66], [0.36, -0.42, 0.62], [0, 0.5, 0.68]];

  // A broadleaf tree. The crown takes the season's colours; a shade copy darkens it towards night.
  function tree(x, base, h, r, season, rnd) {
    var top = base - h, trunk = 'M' + (x - 2.5) + ' ' + base + 'V' + (top + r) + 'h5V' + base + 'Z';
    if (season === 'winter') {
      return '<path fill="currentColor" d="' + trunk + '"/><path fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" d="M' + x + ' ' + (top + r * 1.3) + 'L' + (x - r * 0.8) + ' ' + (top + r * 0.2) +
        'M' + x + ' ' + (top + r * 1.1) + 'L' + (x + r * 0.75) + ' ' + top +
        'M' + x + ' ' + (top + r) + 'L' + (x - r * 0.1) + ' ' + (top - r * 0.1) +
        'M' + (x - r * 0.45) + ' ' + (top + r * 0.7) + 'L' + (x - r * 0.95) + ' ' + (top + r * 0.55) +
        'M' + (x + r * 0.4) + ' ' + (top + r * 0.6) + 'L' + (x + r * 0.9) + ' ' + (top + r * 0.45) + '"/>';
    }
    var cy = top + r, colours = CROWN[season], crown = '', shade = '';
    BLOBS.forEach(function (b) {
      var c = '<circle cx="' + n1(x + b[0] * r) + '" cy="' + n1(cy + b[1] * r) + '" r="' + n1(b[2] * r) + '"';
      crown += c + ' fill="' + colours[Math.floor(rnd() * colours.length)] + '"/>';
      shade += c + '/>';
    });
    return '<path fill="currentColor" d="' + trunk + '"/>' + crown + '<g class="crown-shade" fill="currentColor">' + shade + '</g>';
  }

  // The near shore: a cabin with a dock and a rowing boat, broadleaf trees and a stand of pines.
  // Cabin windows sit at x 1534 and 1590 (y 558) and the chimney top at (1598, 512); app.js lights them.
  var BANK = 'M0 612L0 606C220 603 420 607 600 609C700 610 780 611 860 612Z' +
    'M1170 612C1250 607 1330 597 1420 592C1520 588 1700 587 1810 589C1920 591 2010 595 2080 593L2080 612Z';
  var NEAR_PINES = [[1258, 600, 46], [1284, 598, 62], [1676, 590, 104], [1702, 591, 134], [1730, 591, 92], [1782, 592, 118],
    [1890, 593, 84], [1918, 593, 126], [1948, 594, 100], [2010, 595, 140], [2050, 595, 96]];

  // Everything standing on the bank, in the land colour.
  function shoreObjects(season) {
    var rnd = seeded(23), d = 'M1376 595h126v5h-126Z' + 'M1290 603h72l-9 9h-54Z', x;
    for (x = 1384; x < 1500; x += 28) d += 'M' + x + ' 598h4v16h-4Z';
    NEAR_PINES.forEach(function (p) { d += pine(p[0], p[1], p[2]); });
    d += 'M1592 512h12v28h-12Z' + 'M1510 552L1570 506L1630 552Z' + 'M1524 549h92v42h-92Z';
    return '<path fill="currentColor" d="' + d + '"/>' +
      '<path fill="#000" opacity=".35" d="M1534 558h18v14h-18ZM1590 558h18v14h-18ZM1563 565h14v26h-14Z"/>' +
      tree(1416, 593, 50, 20, season, rnd) + tree(1462, 592, 74, 30, season, rnd);
  }

  function shore(u, season) {
    return landSvg(440, 344, '<g id="' + u + '"><path fill="currentColor" d="' + BANK + '"/>' + shoreObjects(season) + '</g>' +
      reflection(u, 0.3));
  }

  // Winter: a white bank, and snow on the roof, chimney, dock, boat and pines.
  function shoreSnow(u, season) {
    var snow = 'M1505 554L1570 501L1635 554L1626 556L1570 512L1514 556Z' + 'M1590 508h16v5h-16Z' +
      'M1374 592.5h130v3h-130Z' + 'M1291 601.5h70l-1.5 2.5h-67Z';
    NEAR_PINES.forEach(function (p) { snow += pineSnow(p[0], p[1], p[2]); });
    return landSvg(440, 344, snowFill(u, 586, 612) + fadeLeft(u, 440, 344, '<g id="' + u + '">' +
      '<path fill="url(#' + u + 's)" d="' + BANK + '"/>' + shoreObjects(season) + '<path fill="#fff" d="' + snow + '"/></g>' +
      reflection(u, 0.3)));
  }

  // Faint horizontal streaks that make the lake read as water; app.js puts this image in the sky's background.
  function waterLines() {
    var rnd = seeded(31), rows = '', y, x, len, d;
    for (y = SHORE + 5; y < 1080; y += 3 + (y - SHORE) * 0.05) {
      d = '';
      for (x = rnd() * 220; x < 1920; x += len + 80 + rnd() * 300) {
        len = 30 + rnd() * 200;
        d += 'M' + n1(x) + ' ' + n1(y) + 'h' + n1(len);
      }
      rows += '<path d="' + d + '" stroke-opacity="' + (0.07 * shade(y)).toFixed(3) + '"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="' + (1080 - SHORE) + '" viewBox="0 ' + SHORE + ' 1920 ' +
      (1080 - SHORE) + '"><g stroke="#fff" stroke-width="1.2">' + rows + '</g></svg>';
  }

  // Warm light from the cabin's windows and door, broken up by the water (box starts at x 1500).
  function windowTrails() {
    var rnd = seeded(41), d = '';
    [[43, 7], [99, 7], [70, 3]].forEach(function (c) {
      for (var y = 4 + rnd() * 4; y < 116; y += 5 + rnd() * 7 + y * 0.04) {
        if (rnd() < 0.25) continue;
        var w = c[1] * (0.3 + rnd() * 0.9), x = c[0] + (rnd() - 0.5) * 6;
        d += '<path d="M' + n1(x - w) + ' ' + n1(y) + 'h' + n1(2 * w) + '" stroke-opacity="' + (0.6 * (1 - y / 116)).toFixed(2) + '"/>';
      }
    });
    return '<svg width="160" height="120" aria-hidden="true"><g stroke="#ffc56e" stroke-width="1.6" stroke-linecap="round">' + d + '</g></svg>';
  }

  // Broken path of light under the sun or moon: narrow at the shore, wider and dimmer towards the viewer.
  function glitter(seed) {
    var rnd = seeded(seed), d = '', i, y, spread, len;
    for (i = 0; i < 80; i++) {
      y = Math.pow(rnd(), 1.6) * 330;
      spread = 6 + y * 0.32;
      len = 5 + y * 0.12 + rnd() * 12;
      d += '<path d="M' + n1(130 + (rnd() - 0.5) * 2 * spread - len / 2) + ' ' + n1(y + 2) + 'h' + n1(len) +
        '" stroke-opacity="' + shade(614 + y).toFixed(2) + '"/>';
    }
    return '<svg width="260" height="340" aria-hidden="true"><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round">' + d + '</g></svg>';
  }

  // ---------- Sky and life ----------
  // The moon as it really looks tonight. phase: 0 new, 0.5 full. The lit side flips in the south.
  function moon(u, phase, south) {
    var k = Math.cos(2 * Math.PI * phase), waxing = phase < 0.5, crescent = k > 0;
    var limb = waxing ? 1 : 0, edge = waxing === crescent ? 0 : 1;
    var lit = 'M50 4A46 46 0 0 ' + limb + ' 50 96A' + n1(Math.abs(k) * 46) + ' 46 0 0 ' + edge + ' 50 4Z';
    return '<svg viewBox="0 0 100 100" aria-hidden="true"' + (south ? ' style="transform:scaleX(-1)"' : '') + '><defs>' +
      '<radialGradient id="' + u + 'g" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#fbfcff"/><stop offset="1" stop-color="#d3daee"/></radialGradient>' +
      '<clipPath id="' + u + 'c"><path d="' + lit + '"/></clipPath></defs>' +
      '<circle cx="50" cy="50" r="46" fill="#c8d2f0" fill-opacity=".08"/>' +
      '<path d="' + lit + '" fill="url(#' + u + 'g)"/>' +
      '<g clip-path="url(#' + u + 'c)" fill="#9aa5c4" fill-opacity=".32"><circle cx="36" cy="34" r="8"/><circle cx="60" cy="27" r="5"/>' +
      '<circle cx="63" cy="57" r="10"/><circle cx="39" cy="64" r="6"/><circle cx="71" cy="40" r="4"/><circle cx="50" cy="47" r="3"/></g></svg>';
  }

  function bird() {
    return '<svg viewBox="0 0 40 16" aria-hidden="true"><path d="M2 12Q11 2 20 10Q29 2 38 12" fill="none" ' +
      'stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function leaf(colour) {
    return '<svg viewBox="-11 -11 22 22" aria-hidden="true"><path d="M0-10C7-6 7 5 0 10C-7 5-7-6 0-10Z" fill="' + colour + '"/>' +
      '<path d="M0-8V9" stroke="#000" stroke-opacity=".25" stroke-width="1"/></svg>';
  }

  function petal(colour) {
    return '<svg viewBox="-8 -8 16 16" aria-hidden="true"><path d="M0-6C5-5 5 4 0 6C-5 4-5-5 0-6Z" fill="' + colour + '"/></svg>';
  }

  // A fresh, jagged lightning bolt each time (300x460 box).
  function bolt() {
    var x = 150, y = 0, d = 'M150 0', branch = '';
    while (y < 440) {
      y += 30 + Math.random() * 40;
      x += (Math.random() - 0.5) * 70;
      d += 'L' + n1(x) + ' ' + n1(y);
      if (!branch && y > 140 && Math.random() < 0.4) {
        branch = 'M' + n1(x) + ' ' + n1(y) + 'l' + n1((Math.random() - 0.5) * 120) + ' ' + n1(60 + Math.random() * 60) +
          'l' + n1((Math.random() - 0.5) * 40) + ' 40';
      }
    }
    return '<svg width="300" height="460" viewBox="0 0 300 460" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="' + d + branch + '" stroke="#b9c8ff" stroke-opacity=".35" stroke-width="9"/>' +
      '<path d="' + d + branch + '" stroke="#f4f7ff" stroke-width="2.6"/></svg>';
  }

  // Outline shapes that float up behind the PS5 while the TV switches input.
  function psShape(kind) {
    var shapes = ['<path d="M20 6L35 32H5Z"/>', '<circle cx="20" cy="20" r="14"/>', '<path d="M8 8L32 32M32 8L8 32"/>',
      '<rect x="7" y="7" width="26" height="26" rx="2"/>'];
    return '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' + shapes[kind] + '</svg>';
  }

  // Repeating tiles for rain and snow. Large tiles with scattered marks hide the repetition, and mixing sizes in
  // one tile means each needs a single moving layer; the layer slides by exactly one tile so the loop is seamless.
  // Each spec is [count, colour, stroke width] for rain and [count, min radius, max radius, alpha] for snow.
  function rainTile(size, specs) {
    var out = '', len = Math.round(size * 0.08);
    specs.forEach(function (spec) {
      var lines = '', i, x, y;
      for (i = 0; i < spec[0]; i++) {
        x = (4 + Math.random() * (size - 8)).toFixed(1);
        y = Math.random() * (size - len - 2);
        lines += '<line x1="' + x + '" y1="' + y.toFixed(1) + '" x2="' + x + '" y2="' + (y + len).toFixed(1) + '"/>';
      }
      out += '<g stroke="' + spec[1] + '" stroke-width="' + spec[2] + '" stroke-linecap="round">' + lines + '</g>';
    });
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '">' + out + '</svg>';
  }

  function snowTile(size, specs) {
    var out = '';
    specs.forEach(function (spec) {
      var flakes = '', i, r;
      for (i = 0; i < spec[0]; i++) {
        r = spec[1] + Math.random() * (spec[2] - spec[1]);
        flakes += '<circle cx="' + (r + Math.random() * (size - 2 * r)).toFixed(1) + '" cy="' + (r + Math.random() * (size - 2 * r)).toFixed(1) +
          '" r="' + r.toFixed(1) + '"/>';
      }
      out += '<g fill="rgba(255,255,255,' + spec[3] + ')">' + flakes + '</g>';
    });
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '">' + out + '</svg>';
  }

  window.HOME_ART = {
    uid: uid, weather: weather, sunIcon: sunIcon, gear: gear, hdmi: hdmi, bulb: bulb, scene: scene, ps5: ps5,
    appIcon: appIcon, poster: poster, cloud: cloud, farRange: farRange, farSnow: farSnow, hillRange: hillRange,
    hillSnow: hillSnow, shore: shore, shoreSnow: shoreSnow,
    waterLines: waterLines, windowTrails: windowTrails, glitter: glitter, moon: moon, bird: bird, leaf: leaf,
    petal: petal, bolt: bolt, psShape: psShape, rainTile: rainTile, snowTile: snowTile, shade: shade
  };
}());
