#!/bin/sh
# Rooted TVs only. scripts/tv-home.sh install copies this to /var/lib/webosbrew/init.d/50-ambient-home, which the
# Homebrew Channel runs as root at every boot, and runs it once with --now (repairs only, no Helper start).
# 1. LG's devmode.conf runs chmod -R 777 /media/developer at every boot. Home Helper refuses to start with a
#    world-writable data folder, so put back the modes scripts/fix-ipk.py gives the packages, and the jailer group
#    (5000) that lets Helper and Ambient Home's service share Helper's data folder.
# 2. Ambient Home's service runs in a jail that sees only its own folder; bind Helper's folder in, so Settings can
#    tell whether Helper is installed and running and switch the Home button.
# 3. At boot, start Helper if Home is set to Ambient Home and Home was not pressed three times.
A=/media/developer/apps/usr/palm
HELPER=$A/applications/com.local.nativehome
STATE=$HELPER/state

for d in $A/applications/com.local.ambienthome $A/services/com.local.ambienthome.service \
         $HELPER $A/services/com.local.nativehome.service; do
  [ -d "$d" ] || continue
  find "$d" -name state -prune -o -type d -exec chmod 755 {} + -o -type f -exec chmod 644 {} +
  find "$d" -name state -prune -o -type f -print | while read -r f; do
    [ "$(head -c 4 "$f" | tail -c 3)" = ELF ] && chmod 755 "$f"
  done
done
for s in $STATE $A/services/com.local.nativehome.service/state; do
  [ -d "$s" ] || continue
  chmod 770 "$s"
  chgrp -R 5000 "$s"
  find "$s" -type f -exec chmod 660 {} +
done
[ -f $STATE/ssap-key.json ] && chmod 640 $STATE/ssap-key.json
for f in $STATE/apps.json $STATE/controller.pid $STATE/controller.log $STATE/blocked \
         $A/services/com.local.nativehome.service/state/startup-state.json; do
  [ -f "$f" ] && chmod 644 "$f"
done

J=/var/palm/jail/com.local.ambienthome.service$HELPER
if [ -d "$HELPER" ] && ! grep -qs " $J " /proc/mounts; then
  mkdir -p "$J" && mount --bind "$HELPER" "$J"
fi

[ "$1" = --now ] && exit 0

running() {
  pid=$(cat $STATE/controller.pid 2>/dev/null)
  case "$pid" in ''|*[!0-9]*) return 1 ;; esac
  case "$(tr '\0' ' ' < /proc/$pid/cmdline 2>/dev/null)" in
    'com.local.nativehome '*|*/com.local.nativehome/native.js*) return 0 ;;
  esac
  return 1
}
# Helper's own start with the TV may have run before the repairs above; give it time, then start it if it did not.
(
  sleep 30
  [ -d "$HELPER" ] && [ ! -e $STATE/blocked ] && grep -qs '"enabled":true' $STATE/home-control.json || exit 0
  running || luna-send -n 1 -w 10000 luna://com.webos.applicationManager/launch \
    '{"id":"com.local.nativehome","params":{"nativeHomeStart":true}}' >/dev/null 2>&1
) </dev/null >/dev/null 2>&1 &
exit 0
