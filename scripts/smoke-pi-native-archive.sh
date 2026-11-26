#!/usr/bin/env bash
set -euo pipefail
artifacts=$(cd "$1" && pwd)
platform=$2
receipt="$artifacts/pi-native-$platform.json"
archive=$(node -p 'require(process.argv[1]).file' "$receipt")
version=$(node -p 'const r = require(process.argv[1]); r.publicVersion + (r.previewSequence ? "-preview." + r.previewSequence : "")' "$receipt")
(cd "$artifacts" && shasum -a 256 -c SHA256SUMS)

probe=$(cat <<'PROBE'
set -eu
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
mkdir "$scratch/home" "$scratch/bin"
tar -xzf "$1" -C "$scratch"
test -f "$scratch/LICENSE"
test -f "$scratch/prime-agent-runtime/pyproject.toml"
run() {
  env -i HOME="$scratch/home" TMPDIR="$scratch" PATH="$scratch/bin" \
    PI_OFFLINE=1 DO_NOT_TRACK=1 PRIME_AGENT_INSTALL_UV=0 "$scratch/prime-agent" "$@"
}
actual_version=$(run --version)
test "$actual_version" = "$2"
run --help > /dev/null
PROBE
)

if [[ "$platform" == *musl* ]]; then
  docker run --rm --init -v "$artifacts:/archives:ro" alpine:3.21 sh -eu -c \
    'apk add --no-cache libstdc++ >/dev/null; exec timeout 60 sh -c "$@"' \
    sh "$probe" sh "/archives/$archive" "$version"
else
  /bin/sh -c "$probe" sh "$artifacts/$archive" "$version"
fi
