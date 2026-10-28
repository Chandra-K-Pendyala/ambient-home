#!/usr/bin/env bash
# Make the remote's Home button open Ambient Home. Home Helper (helper/, reviewed from upstream v1.4.0) does that
# without root, and is built here from source: never from upstream's prebuilt packages. The ways back to LG Home:
#   remote          hold Back for about a second: LG Home opens once
#                   press Home three times quickly: Home opens LG Home until you turn Ambient Home back on
#   Ambient Home    Settings > Home button opens > LG Home
#   this Mac        scripts/tv-home.sh lg, or scripts/tv-home.sh remove to take everything off the TV
#
#   scripts/tv-home.sh build     build both packages into build/tv; nothing on the TV changes
#   TV_HOST=<TV IP> scripts/tv-home.sh install
#                                build, then install Ambient Home and Home Helper and give Helper its settings.
#                                The Home button still opens LG Home until you run start.
#   scripts/tv-home.sh start     Home opens Ambient Home; from now on Helper starts by itself when the TV starts
#   scripts/tv-home.sh lg        Home opens LG Home again, until start
#   scripts/tv-home.sh status    is Helper running?
#   scripts/tv-home.sh remove    stop Helper and its start with the TV, and uninstall both apps
#
# One-time setup: steps 1-4 at the top of scripts/tv-preview.sh, then
#   5. Zig 0.14.1, which compiles Helper's two small C programs, inside this project:
#        python3 -m venv tools/venv && tools/venv/bin/pip install ziglang==0.14.1
#   6. The TV's app list: node scripts/tv-sync-apps.mjs <TV IP>
# TV_DEVICE picks another device name than "lgtv".
set -euo pipefail
cd "$(dirname "$0")/.."

DEVICE="${TV_DEVICE:-lgtv}"
APP_ID="com.local.ambienthome"
HELPER="com.local.nativehome"
BIN="tools/node_modules/.bin"
STATE="/media/developer/apps/usr/palm/applications/$HELPER/state"

if [ ! -x "$BIN/ares-package" ]; then
  echo "LG's webOS CLI is missing; see step 1 at the top of scripts/tv-preview.sh." >&2
  exit 1
fi

zig() { tools/venv/bin/python -I -m ziglang "$@"; }

# Runs a command in the TV's Developer Mode shell; prints its output without the CLI's [Info] lines.
tv() { "$BIN/ares-novacom" --device "$DEVICE" --run "$1" 2>&1 | tr -d '\r' | grep -v '^\[Info\]' || true; }

installed() { "$BIN/ares-install" --device "$DEVICE" --list 2>/dev/null | grep -qx "$1"; }

# The controller's process ID is in controller.pid. Like Helper's own status check, count it only if that process is
# the controller (named com.local.nativehome, or node running native.js): never a stale ID, nor the relay.
RUNNING="pid=\$(cat $STATE/controller.pid 2>/dev/null); case \"\$pid\" in ''|*[!0-9]*) false;; *) case \"\$(tr '\\0' ' ' < /proc/\$pid/cmdline 2>/dev/null)\" in '$HELPER '*|*/$HELPER/native.js*) true;; *) false;; esac;; esac"
running() { [ "$(tv "if $RUNNING; then echo RUNNING; fi")" = RUNNING ]; }

build() {
  if ! zig version >/dev/null 2>&1; then
    echo "Zig is missing; see step 5 at the top of $0." >&2
    exit 1
  fi
  scripts/tv-preview.sh --build
  local app=build/tv/helper-app svc=build/tv/helper-service
  mkdir -p "$app/state" "$svc/state"
  # Helper's JavaScript runs unchanged on TVs with Node 10 or newer (upstream converts it for Node 0.12 TVs).
  cp helper/app/*.js helper/app/*.json helper/app/*.png "$app/"
  cp -R helper/app/vendor "$app/"
  cp helper/service/*.js helper/service/*.json helper/app/state-permissions.js "$svc/"
  touch "$app/state/.keep" "$svc/state/.keep"
  zig cc -target arm-linux-musleabi -Os -static -s helper/app/detach.c -o "$app/detach"
  zig cc -target arm-linux-musleabi -Os -static -s helper/relay/relay.c helper/relay/filter.c -o "$app/relay"
  "$BIN/ares-package" --no-minify -o build/tv "$app" "$svc"
  python3 -I scripts/fix-ipk.py build/tv/${HELPER}_*.ipk
}

# Copies a file into Helper's data folder: decoded, mode set and checked, content checked, then moved into place,
# so a failed copy leaves the old file. The command contains the file (the pairing key), so its output is never
# printed. From upstream's scripts/configure-tv.sh (MIT).
push() {
  local payload digest reply command
  payload=$(base64 < "$1" | tr -d '\n')
  digest=$(shasum -a 256 "$1" | cut -d ' ' -f 1)
  command="umask 077
  tmp=\$(mktemp '$STATE/.upload.XXXXXX') || exit 0
  trap 'rm -f \"\$tmp\"' EXIT
  if printf '%s' '$payload' | base64 -d > \"\$tmp\" &&
     chmod '$3' \"\$tmp\" &&
     [ \"\$(stat -c %a \"\$tmp\")\" = '$3' ] &&
     [ \"\$(sha256sum \"\$tmp\" | cut -d ' ' -f 1)\" = '$digest' ] &&
     mv -f \"\$tmp\" '$STATE/$2'; then
    printf '%s\\n' COPY_OK
  fi
  exit 0"
  if ! reply=$("$BIN/ares-novacom" --device "$DEVICE" --run "$command" 2>&1); then
    echo "Copying $2 to the TV failed (connection or command error)." >&2
    return 1
  fi
  if ! printf '%s\n' "$reply" | tr -d '\r' | grep -qx COPY_OK; then
    echo "Copying $2 to the TV failed (content or permissions not verified)." >&2
    return 1
  fi
}

# Asks Helper to stop (it lets go of the remote and stays off until start), then waits up to 15 seconds.
stop_helper() {
  tv "if $RUNNING; then printf '{\"cmd\":\"stop\"}' > $STATE/control.json; n=0; while $RUNNING; do n=\$((n+1)); [ \$n -le 15 ] || break; sleep 1; done; fi" >/dev/null
  if running; then
    echo "Helper did not stop. Press Home three times on the remote, or restart the TV, then run this again." >&2
    exit 1
  fi
}

case "${1:-}" in
  build)
    build
    ;;
  install)
    : "${TV_HOST:?Set TV_HOST to the TV IP address: TV_HOST=<TV IP> $0 install}"
    build
    node scripts/tv-helper-key.mjs "$TV_HOST"
    # A Helper that is already installed must let go of the remote before it is replaced.
    if installed "$HELPER"; then stop_helper; fi
    "$BIN/ares-install" --device "$DEVICE" build/tv/${APP_ID}_*.ipk
    "$BIN/ares-install" --device "$DEVICE" build/tv/${HELPER}_*.ipk
    push build/helper-setup/ssap-key.json ssap-key.json 640
    push build/helper-setup/apps.json apps.json 644
    echo "Installed. The Home button still opens LG Home; $0 start switches it to Ambient Home."
    ;;
  start)
    if ! installed "$HELPER"; then
      echo "Home Helper is not installed: TV_HOST=<TV IP> $0 install" >&2
      exit 1
    fi
    if running; then
      echo "Helper is already running. If Home opens LG Home, pick Settings > Home button opens > This home screen in Ambient Home."
      exit 0
    fi
    # Helper reads this choice when it starts; it is the same one Ambient Home's Settings changes.
    tv "printf '{\"enabled\":true}' > $STATE/home-control.json.tmp && chmod 660 $STATE/home-control.json.tmp && mv -f $STATE/home-control.json.tmp $STATE/home-control.json" >/dev/null
    "$BIN/ares-launch" --device "$DEVICE" "$HELPER" --params '{"nativeHomeStart":true}' >/dev/null
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      if running; then
        echo "Done: Home opens Ambient Home. Hold Back for LG Home once; press Home three times to turn this off."
        exit 0
      fi
      sleep 1
    done
    echo "Helper did not start; see $0 status." >&2
    exit 1
    ;;
  lg)
    if installed "$HELPER" && running; then stop_helper; fi
    echo "Home opens LG Home. Turn Ambient Home back on with $0 start, or in Ambient Home's Settings."
    ;;
  status)
    if ! installed "$HELPER"; then
      echo "Home Helper is not installed; Home opens LG Home."
      exit 0
    fi
    if running; then
      choice=$(tv "cat $STATE/home-control.json 2>/dev/null")
      case "$choice" in
        *'"enabled":false'*) echo "Helper is running; Home opens LG Home (chosen in Ambient Home's Settings)." ;;
        *) echo "Helper is running; Home opens Ambient Home." ;;
      esac
    elif [ "$(tv "[ -e $STATE/blocked ] && echo BLOCKED")" = BLOCKED ]; then
      echo "Helper is stopped (Home pressed three times, or $0 lg); Home opens LG Home until $0 start."
    else
      echo "Helper is not running; Home opens LG Home. $0 start turns Ambient Home on."
    fi
    ;;
  remove)
    if installed "$HELPER"; then
      # Cancel Helper's start with the TV first, then stop it, then uninstall.
      tv "luna-send-pub -n 1 luna://$HELPER.service/disable '{}'" >/dev/null
      stop_helper
      "$BIN/ares-install" --device "$DEVICE" --remove "$HELPER"
    fi
    if installed "$APP_ID"; then "$BIN/ares-install" --device "$DEVICE" --remove "$APP_ID"; fi
    rm -rf build/helper-setup
    echo "Removed. The TV is back to LG's own Home. The pairing keys stay in .lgtv-key.json; delete that file to remove them from this Mac."
    ;;
  *)
    sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
