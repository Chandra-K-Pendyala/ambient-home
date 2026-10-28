#!/usr/bin/env bash
# Install the prototype on the TV as an ordinary Developer Mode app ("Ambient Home" in the app list).
# Nothing else on the TV changes: Home still opens LG Home, and --remove takes the app off again.
#
#   scripts/tv-preview.sh            build, install and open it on the TV
#   scripts/tv-preview.sh --build    only build the package, into build/tv
#   scripts/tv-preview.sh --remove   uninstall it from the TV
#
# One-time setup (Mac and TV on the same network):
#   1. LG's webOS CLI, inside this project:
#        npm install --prefix tools @webos-tools/cli@3.2.6 --ignore-scripts --no-save --no-package-lock
#   2. On the TV, open the Developer Mode app, turn on Dev Mode (the TV restarts), then turn on Key Server.
#   3. Register the TV, using the IP address the Developer Mode app shows:
#        tools/node_modules/.bin/ares-setup-device -a lgtv -i "host=TV_IP" -i "port=9922" -i "username=prisoner"
#   4. Fetch the TV's key, typing the passphrase the Developer Mode app shows when asked:
#        tools/node_modules/.bin/ares-novacom --device lgtv --getkey
# TV_DEVICE picks another device name than "lgtv".
set -euo pipefail
cd "$(dirname "$0")/.."

DEVICE="${TV_DEVICE:-lgtv}"
APP_ID="com.local.ambienthome"
BIN="tools/node_modules/.bin"

if [ ! -x "$BIN/ares-package" ]; then
  echo "LG's webOS CLI is missing; see step 1 at the top of $0." >&2
  exit 1
fi

if [ "${1:-}" = "--remove" ]; then
  "$BIN/ares-install" --device "$DEVICE" --remove "$APP_ID"
  exit 0
fi

# The app comes with its own small service (home-service/), which Settings uses to switch the Home button.
# --no-minify keeps the files as written, so the TV runs exactly the reviewed code.
# The logo source files and the script that turns them into glyphs.js are not needed on the TV.
rm -rf build/tv
mkdir -p build/tv/home-service
cp home-service/*.js home-service/*.json build/tv/home-service/
"$BIN/ares-package" --no-minify -e "*.svg" -e "*.py" -o build/tv prototype build/tv/home-service
# ares-package makes every file writable by anyone on the TV; give the package safe owners and modes.
python3 -I scripts/fix-ipk.py build/tv/com.local.ambienthome_*.ipk
[ "${1:-}" = "--build" ] && exit 0

"$BIN/ares-install" --device "$DEVICE" build/tv/com.local.ambienthome_*.ipk
"$BIN/ares-launch" --device "$DEVICE" "$APP_ID"
