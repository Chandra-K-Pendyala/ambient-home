# Home Helper

Home Helper makes the remote's Home button open Ambient Home (`prototype/`), on an LG webOS TV with no root. It is the No-root Home Helper from Razdva122/clean-your-tv-lg-webos v1.4.0 (tag commit `b473fae`), reviewed line by line and built here from source. Upstream's prebuilt packages are never used. Upstream's code is MIT licensed: see `LICENSE`.

## Ways back to LG Home
- Hold Back for about a second: LG Home opens once.
- Press Home three times quickly: Helper lets go of the remote and Home opens LG Home until Helper is started again, from Ambient Home's Settings or with `scripts/tv-home.sh start`. Opening "Home Helper" in LG's app list shows those Settings.
- In Ambient Home: Settings > Home button opens > LG Home.
- From the Mac: `scripts/tv-home.sh lg`, or `scripts/tv-home.sh remove` to take Helper and Ambient Home off the TV.
- If Helper's controller stops answering for 2 seconds, or the TV drops remote events, the relay lets go of the remote and Helper stays off until it is started again.

## How it works
- `relay/relay.c` takes the remote's input device ("LGE M-RCU - Builtin [0]") for itself and passes every button except Home on to the TV through the second device ("[1]"). A Home press becomes a message to the controller. `relay/filter.c` decides what each button event does.
- `app/native.js` is the controller (Node). It starts the relay and opens the chosen home screen when Home is pressed. It also brings you back to it when you leave an app listed in `state/apps.json` for LG Home, and when the TV wakes up.
- The controller opens the chosen home screen: Ambient Home, unless Settings picked another of your own apps. The choice is saved with the on/off setting in `state/home-control.json` as `{enabled, launcher}` (`app/home-choice.js`). Settings requests may say which home screen asked (`from`); Helper answers that app.
- To know which app is on screen and whether the TV is on, the controller connects to the TV's own remote-control service (wss, port 3001, on the TV's network address) with its own key, `state/ssap-key.json`. That key may only read the app on screen, the running apps and the power state, and turn the TV off: the TV answers the power state only with `CONTROL_POWER`. It cannot open apps or press buttons.
- A webOS activity calls the service (`service/service.js`) every 10 seconds. Once per boot the service starts the controller, which stops at once if `state/blocked` exists. (webOS gives each service a private view of the files, so the service itself cannot see Helper's data folder.)
- Ambient Home's Settings reach Helper by opening it with a request (`homeRequest`), and Helper answers by opening Ambient Home with the answer (`homeReply`): webOS keeps each app's files and services to itself and denies calls between them, but lets them open each other. `app/home-bridge.js` handles the request inside Helper; a running controller gets it through `home-request.json` and answers in `home-response.json`. Choosing *This home screen* starts a stopped controller, which ends the stop from pressing Home three times.
- Nothing contacts the internet.

## Changes from upstream
- Opens Ambient Home (`com.local.ambienthome`), or another home screen app of yours picked in Settings (`app/home-choice.js`), instead of upstream's launcher (`com.gathin.tvhome`).
- Removed the test-only stall hooks: the relay's `S` command (which paused the relay while it still held the remote), the controller's `stall-worker` and `stall-controller` commands, and the `resume` program.
- No conversion for Node 0.12: the JavaScript runs as written on TVs with Node 10 or newer. Babel, core-js, safe-buffer and the ws 6 copy (`vendor/ws-legacy`) are gone. `app/vendor/ws` is ws 8.21.0, identical to the npm release.
- Removed the service's `listApps` method and `app-inventory.js`. Ambient Home gets the app list from the Mac with `scripts/tv-sync-apps.mjs`.
- Settings talk to Helper through launch parameters (`app/home-bridge.js`, called from `app/helper-entry.js`) instead of upstream's launcher service, which writes into Helper's data folder: webOS gives each service a private view of the files, in which that folder does not exist.
- Helper gets its own remote-control key with only the four permissions it asks for (`scripts/tv-helper-key.mjs`). Upstream copies its launcher's key, which has 28 permissions, onto the TV.
- Own version (0.8.0), vendor and icons. Upstream's Developer Mode renewal and updater are not included.
- `scripts/fix-ipk.py` gives both packages root-owned files (0644, programs 0755), like upstream's released package. Without it, LG's `ares-package` installs every file so that any process on the TV can change it.

## Build and test
- `scripts/tv-home.sh build` builds both packages into `build/tv`. It needs Zig 0.14.1 in `tools/venv`; the setup steps are at the top of the script.
- JavaScript tests: `for t in helper/tests/*.cjs; do node "$t"; done`
- C tests for the relay: `cc -std=c99 -Wall -Wextra -Werror helper/relay/filter.c helper/relay/test_filter.c -o /tmp/test-filter && /tmp/test-filter`, and the same for `test_startup.c` and `test_relay_startup.c` (the last one also needs `helper/relay/filter.c`).

## Folders
- `app/`: the native app `com.local.nativehome`: the controller, its policies, the Settings bridge, `detach.c` and `vendor/ws`.
- `service/`: the service `com.local.nativehome.service`.
- `relay/`: the remote relay and its C tests.
- `tests/`: upstream's JavaScript tests, with paths updated.

## Known limits
- Leaving an app with Back can briefly show LG Home before Ambient Home.
- After the TV restarts (not when it wakes from standby), LG Home shows for about half a minute: webOS runs Helper's start-up check about 30 seconds after the restart. Helper then opens Ambient Home.
- Developer Mode must stay on. Extend its session in LG's Developer Mode app before the timer runs out: when it runs out, the TV turns Developer Mode off and removes the apps installed with it, and Home goes back to LG Home.
