#!/usr/bin/env node
// Prepare Home Helper's two settings files in build/helper-setup/ (git-ignored); scripts/tv-home.sh install copies
// them into Helper's data folder on the TV:
//   ssap-key.json  Helper's own key for LG's remote-control service. It may see which app is on screen and whether
//                  the TV is on (Helper uses this to bring you back to Ambient Home), and turn the TV off, which the
//                  TV requires for reading the power state. It cannot open apps or press buttons. The first run shows
//                  a prompt on the TV; the key is also kept in .lgtv-key.json so a reinstall needs no new prompt.
//   apps.json      the TV's apps, from prototype/tv-apps.js: leaving one of them for LG Home returns to Ambient Home.
//
//   node scripts/tv-helper-key.mjs <TV IP>
import { mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadKeys, saveKey, connect } from './ssap.mjs';

// The same permissions Helper asks for in helper/app/screen-watch.js. The TV answers the power state only with
// CONTROL_POWER as well ("401 insufficient permissions" without it).
const PERMISSIONS = ['READ_APP_STATUS', 'READ_RUNNING_APPS', 'READ_POWER_STATE', 'CONTROL_POWER'];

const host = process.argv[2] || process.env.TV_HOST;
if (!host) {
  console.error('usage: node scripts/tv-helper-key.mjs <TV IP>');
  process.exit(1);
}

let synced;
try {
  const text = readFileSync(join(ROOT, 'prototype/tv-apps.js'), 'utf8');
  synced = JSON.parse(text.slice(text.indexOf('{')).trim().replace(/;$/, ''));
} catch {
  console.error(`Fetch the TV's apps first: node scripts/tv-sync-apps.mjs ${host}`);
  process.exit(1);
}

const name = 'helper@' + host;
const tv = connect(host, PERMISSIONS);
await tv.open();
const keys = loadKeys();
if (!keys[name]) console.log('Accept the prompt on the TV (it asks to let Home Helper see which app is on screen and whether the TV is on)...');
const key = await tv.register(keys[name]);
saveKey(name, key);
// Helper follows both; check this key can read them before it goes to the TV.
try {
  const screen = await tv.call('ssap://com.webos.applicationManager/getForegroundAppInfo');
  const power = await tv.call('ssap://com.webos.service.tvpower/power/getPowerState');
  console.log(`The key works: on screen now ${screen.appId || '(nothing)'}, TV ${power.state || 'state unknown'}`);
} catch (e) {
  console.error(`The TV refused Helper's key: ${e.message}`);
  process.exit(1);
} finally {
  tv.close();
}

const skip = ['com.local.ambienthome', 'com.local.nativehome', 'com.webos.app.home'];
const ids = synced.apps.map((a) => a.id).filter((id) => !skip.includes(id));
const dir = join(ROOT, 'build/helper-setup');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'ssap-key.json'), JSON.stringify({ key }), { mode: 0o600 });
chmodSync(join(dir, 'ssap-key.json'), 0o600);
writeFileSync(join(dir, 'apps.json'), JSON.stringify(ids));
console.log(`Prepared Helper's key and its list of ${ids.length} apps in build/helper-setup/`);
