# Shared by tv-preview.sh and tv-home.sh (sourced, from the project folder): LG's CLI, the TV, and the two setups
# that need something different from a Mac with a Developer Mode TV:
#   Windows      run the scripts in Git Bash. There is no rsync, python3 may be only the Microsoft Store's stub,
#                and there is no shasum; the helpers below fall back to what Git Bash and Python for Windows have.
#   rooted TV    a TV with the Homebrew Channel, registered as root on port 22 (see the README). LG's ares-install
#                cannot install there: it uploads, then fails with "Unable to exec". tv_install uploads with ssh and
#                installs with webOS's own installer instead; everything else goes through LG's CLI as usual.
DEVICE="${TV_DEVICE:-lgtv}"
BIN="tools/node_modules/.bin"

if [ ! -x "$BIN/ares-package" ]; then
  echo "LG's webOS CLI is missing; see step 1 at the top of scripts/tv-preview.sh." >&2
  exit 1
fi

# Python 3: python3 on macOS and Linux, python on Windows.
if python3 -c '' >/dev/null 2>&1; then PYTHON=python3; else PYTHON=python; fi

# copy_tree SRC DEST [PATTERN...]: copies SRC's contents into DEST, leaving out files named like PATTERN.
copy_tree() {
  local src=$1 dst=$2 pattern
  shift 2
  if command -v rsync >/dev/null 2>&1; then
    local excludes=()
    for pattern in "$@"; do excludes+=("--exclude=$pattern"); done
    rsync -a "${excludes[@]}" "$src/" "$dst/"
  else
    mkdir -p "$dst"
    cp -R "$src/." "$dst/"
    for pattern in "$@"; do find "$dst" -name "$pattern" -exec rm -rf {} +; done
  fi
}

sha256() {
  if command -v shasum >/dev/null 2>&1; then shasum -a 256 "$1"; else sha256sum "$1"; fi | cut -d ' ' -f 1
}

# The TV as registered with ares-setup-device: user@host:port. ROOT is set for a rooted TV.
TV_LOGIN=$("$BIN/ares-setup-device" --list 2>/dev/null | tr -d '\r' | awk -v d="$DEVICE" '$1 == d { print $2 }')
ROOT=
case "$TV_LOGIN" in root@*) ROOT=1 ;; esac

# Runs a command on a rooted TV with ssh, using the key from the README (TV_SSH_KEY picks another). --tty gives it a
# terminal: without one, luna-send there sometimes prints nothing and does not notice its call has ended.
tv_ssh() {
  local login=${TV_LOGIN%:*} port=${TV_LOGIN##*:} key=${TV_SSH_KEY:-$HOME/.ssh/lgtv_ed25519} opts=(-o BatchMode=yes)
  if [ "${1:-}" = --tty ]; then opts+=(-tt); shift; fi
  if [ -f "$key" ]; then opts+=(-i "$key"); fi
  ssh -p "$port" "${opts[@]}" "$login" "$@"
}

# tv_install PACKAGE.ipk: installs a package on the TV, replacing an older version.
tv_install() {
  if [ -z "$ROOT" ]; then
    "$BIN/ares-install" --device "$DEVICE" "$1"
    return
  fi
  local id tmp out= line pid
  id=$(basename "$1")
  id=${id%%_*}
  tmp=/media/developer/temp/$id.ipk
  echo "Installing $1 (rooted TV; the TV can take a few minutes)"
  tv_ssh "mkdir -p /media/developer/temp && cat > $tmp" < "$1"
  # luna-send keeps listening after the installer's last update, so read its updates as they come and stop at
  # "installed" or an error.
  exec 3< <(tv_ssh --tty "luna-send -w 300000 -n 40 luna://com.webos.appInstallService/dev/install '{\"id\":\"$id\",\"ipkUrl\":\"$tmp\",\"subscribe\":true}'" 2>&1)
  pid=$!
  while IFS= read -r line <&3; do
    out+="${line%$'\r'}"$'\n'
    case "$line" in *'"state":"installed"'*|*'"state": "installed"'*|*errorText*) break ;; esac
  done
  exec 3<&-
  kill "$pid" 2>/dev/null || true
  tv_ssh "rm -f $tmp"
  case "$out" in
    *'"state":"installed"'*|*'"state": "installed"'*) ;;
    *)
      printf '%s\n' "$out" | tail -5 >&2
      echo "Installing $id failed." >&2
      return 1
      ;;
  esac
}
