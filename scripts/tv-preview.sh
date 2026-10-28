#!/usr/bin/env bash
# Install Ambient Home, or Ambient Wallpaper (the living lakeside on its own), on the TV as an ordinary Developer Mode
# app. Nothing else on the TV changes: Home still opens LG Home (scripts/tv-home.sh takes over the Home button), and
# --remove takes the app off again.
#
#   scripts/tv-preview.sh                          build, install and open Ambient Home on the TV
#   scripts/tv-preview.sh --wallpaper              the same for Ambient Wallpaper
#   scripts/tv-preview.sh [--wallpaper] --build    only build the package, into build/tv
#   scripts/tv-preview.sh [--wallpaper] --remove   uninstall it from the TV
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
BIN="tools/node_modules/.bin"
APP_ID="com.local.ambienthome"
ACTION=install
for arg in "$@"; do
  case "$arg" in
    --wallpaper) APP_ID="com.local.ambientwallpaper" ;;
    --build) ACTION=build ;;
    --remove) ACTION=remove ;;
    *) echo "Unknown option: $arg (see the top of $0)" >&2; exit 1 ;;
  esac
done

if [ ! -x "$BIN/ares-package" ]; then
  echo "LG's webOS CLI is missing; see step 1 at the top of $0." >&2
  exit 1
fi

if [ "$ACTION" = remove ]; then
  "$BIN/ares-install" --device "$DEVICE" --remove "$APP_ID"
  exit 0
fi

mkdir -p build/tv
rm -f build/tv/${APP_ID}_*.ipk
# --no-minify keeps the files as written, so the TV runs exactly the reviewed code.
if [ "$APP_ID" = com.local.ambientwallpaper ]; then
  # The wallpaper needs only the scene, its own page and the settings in config.js (and config.local.js).
  stage=build/tv/wallpaper-app
  rm -rf "$stage"
  mkdir -p "$stage"
  cp prototype/wallpaper.html prototype/wallpaper.js prototype/wallpaper.css prototype/scene.js prototype/scene.css \
    prototype/art.js prototype/config.js prototype/wallpaper-icon.png prototype/wallpaper-largeIcon.png "$stage/"
  if [ -f prototype/config.local.js ]; then cp prototype/config.local.js "$stage/"; fi
  cp -R prototype/fonts "$stage/"
  cp prototype/wallpaper.appinfo.json "$stage/appinfo.json"
  "$BIN/ares-package" --no-minify -o build/tv "$stage"
else
  # Ambient Home comes with its own small service (home-service/), which Settings uses to switch the Home button.
  # The logo sources, the script that turns them into glyphs.js and the wallpaper's own files stay off the TV.
  stage=build/tv/home-app
  rm -rf "$stage" build/tv/home-service
  mkdir -p build/tv/home-service
  rsync -a --exclude='*.svg' --exclude='*.py' --exclude='wallpaper*' prototype/ "$stage/"
  cp home-service/*.js home-service/*.json build/tv/home-service/
  "$BIN/ares-package" --no-minify -o build/tv "$stage" build/tv/home-service
fi
# ares-package makes every file writable by anyone on the TV; give the package safe owners and modes.
python3 -I scripts/fix-ipk.py build/tv/${APP_ID}_*.ipk
[ "$ACTION" = build ] && exit 0

"$BIN/ares-install" --device "$DEVICE" build/tv/${APP_ID}_*.ipk
"$BIN/ares-launch" --device "$DEVICE" "$APP_ID"
