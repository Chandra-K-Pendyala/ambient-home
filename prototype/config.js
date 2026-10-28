/* Prototype data. On the TV, the app list and inputs come from the TV itself during setup.
   Personal settings, such as your IPTV app's id, go in config.local.js (not in git), for example:
     HOME_CONFIG.apps.iptv.appId = 'your.iptv.app.id'; */
window.HOME_CONFIG = {
  // Minutes without a key press before the OLED-safe idle screen (changeable in Settings).
  idleMinutes: 1,
  // Seconds between moves of the idle clock, so no pixel stays lit in one place.
  idleMoveSeconds: 20,
  // 'north' or 'south': sets the seasons and which side of the moon is lit.
  hemisphere: 'north',

  // Set latitude and longitude for live weather, sunrise and sunset from Open-Meteo (free, no account).
  // Until then the demo values below are shown.
  weather: {
    latitude: null,
    longitude: null,
    unit: 'celsius',
    demo: { temperature: 14, high: 17, low: 9, condition: 'partly', sunrise: '06:30', sunset: '18:30' }
  },

  // Apps in the dock, left to right. An "All apps" icon is added at the end.
  dock: ['iptv', 'netflix', 'youtube', 'prime', 'disney', 'apple'],

  // appId: the app's id on the TV, used to open it there (apps without one can only be previewed).
  // glyph: the logo shape (glyphs.js or art.js); bg and fg: the brand colours an icon blooms into on focus
  // (bg may be a two-colour gradient); accent: the light the icon casts.
  apps: {
    iptv: { title: 'IPTV', subtitle: 'Live TV · STB Emulator', appId: '', glyph: 'iptv', bg: ['#0f4652', '#081a26'], fg: '#7fe7f5', accent: '#14b8c7', live: true },
    netflix: { title: 'Netflix', appId: 'netflix', glyph: 'netflix', bg: '#141414', fg: '#e50914', accent: '#e50914' },
    youtube: { title: 'YouTube', appId: 'youtube.leanback.v4', glyph: 'youtube', bg: '#ffffff', fg: '#ff0033', accent: '#ff0033' },
    prime: { title: 'Prime Video', appId: 'amazon', glyph: 'prime', bg: '#00a8e1', fg: '#ffffff', accent: '#00a8e1' },
    disney: { title: 'Disney+', appId: 'com.disney.disneyplus-prod', glyph: 'disney', bg: ['#0a1b54', '#1257c6'], fg: '#ffffff', accent: '#2f7cf0' },
    apple: { title: 'Apple TV', appId: 'com.apple.appletv', glyph: 'apple', bg: ['#2a2d33', '#0b0c0f'], fg: '#ffffff', accent: '#8e9aaf' },
    max: { title: 'Max', glyph: 'hbomax', bg: ['#2b1a8f', '#5b2bd1'], fg: '#ffffff', accent: '#5b2bd1' },
    spotify: { title: 'Spotify', appId: 'spotify-beehive', glyph: 'spotify', bg: '#121212', fg: '#1ed760', accent: '#1ed760' },
    twitch: { title: 'Twitch', glyph: 'twitch', bg: '#9146ff', fg: '#ffffff', accent: '#9146ff' },
    emby: { title: 'Emby', glyph: 'emby', bg: ['#26332a', '#121a14'], fg: '#52b54b', accent: '#52b54b' },
    browser: { title: 'Web Browser', appId: 'com.webos.app.browser', glyph: 'browser', bg: '#285bea', fg: '#ffffff', accent: '#285bea' }
  },

  // Quick inputs. "key" is the number button that switches to it from the home screen; appId is the TV's input app.
  inputs: [
    { id: 'hdmi1', appId: 'com.webos.app.hdmi1', title: 'PS5', subtitle: 'HDMI 1', key: '1', art: 'ps5', accent: '#2563eb' },
    { id: 'hdmi2', appId: 'com.webos.app.hdmi2', title: 'HDMI 2', subtitle: 'Unnamed device', key: '2', art: 'hdmi', accent: '#64748b' },
    { id: 'hdmi3', appId: 'com.webos.app.hdmi3', title: 'HDMI 3', subtitle: 'Unnamed device', key: '3', art: 'hdmi', accent: '#64748b' }
  ],

  // Demo rows. Real ones need a Plex, Emby or Jellyfin server and Home Assistant.
  media: {
    source: 'Media server',
    items: [
      { id: 'm1', title: 'The Long Coast', detail: 'S2 · E4 · 23 min left', progress: 0.62, colors: ['#0f4c5c', '#0b1b33', '#1d7a8c'], motif: 'waves' },
      { id: 'm2', title: 'Night Market', detail: 'Film · 1 h 2 min left', progress: 0.38, colors: ['#5b1d4a', '#140b24', '#f59e0b'], motif: 'lights' },
      { id: 'm3', title: 'Orbit Station', detail: 'S1 · E7 · 41 min left', progress: 0.18, colors: ['#1e1b4b', '#020617', '#6366f1'], motif: 'planet' },
      { id: 'm4', title: 'Kitchen Rules', detail: 'S5 · E2 · 12 min left', progress: 0.81, colors: ['#7c2d12', '#1c0a05', '#fb923c'], motif: 'steam' }
    ]
  },
  home: {
    source: 'Home Assistant',
    items: [
      { id: 'living', name: 'Living room', type: 'light', on: true, level: 80 },
      { id: 'lamp', name: 'Floor lamp', type: 'light', on: false, level: 35 },
      { id: 'hall', name: 'Hallway', type: 'light', on: false, level: 60 },
      { id: 'movie', name: 'Movie night', type: 'scene', detail: 'Dims the lights' }
    ]
  }
};
