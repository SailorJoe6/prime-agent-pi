#!/usr/bin/env bash
# Build a private fixture wheel; nothing in this directory ships with the app.
set -euo pipefail
umask 077

if [[ $# != 1 || $(uname -s) != Darwin || $(uname -m) != x86_64 ]]; then
    echo 'Usage on Intel macOS: prepare-intel-python-smoke.sh NEW_WORK_DIRECTORY' >&2
    exit 1
fi
mkdir -- "$1"
cd -- "$1"
work=$(pwd -P)
export HOME="$work/home" UV_CACHE_DIR="$work/uv-cache" UV_PYTHON_INSTALL_DIR="$work/python"
export CARGO_HOME="$work/cargo-home" CARGO_NET_RETRY=0
mkdir "$HOME" build-wheels wheel

fetch() {
    local url=$1 sha=$2 file=$3
    /usr/bin/curl --disable --fail --silent --show-error --location \
        --proto '=https' --proto-redir '=https' --max-time 90 "$url" -o "$file"
    printf '%s  %s\n' "$sha" "$file" | /usr/bin/shasum -a 256 -c -
}

fetch https://files.pythonhosted.org/packages/9d/af/182eb91b0df3fe75c4d9f26fe70684569566745f6ba7e5c9c73a862c5252/cryptography-50.0.2.tar.gz \
    7b46165bb56eb4704e2eaaf86f3c940d19154535d9b0ca7d6d590b04060e00d5 cryptography-50.0.2.tar.gz
fetch https://github.com/openssl/openssl/releases/download/openssl-3.5.9/openssl-3.5.9.tar.gz \
    603f5602e2eef00d77fbd429d34dcd5822bb301757a1bc9cdb24c670f1eb859a openssl-3.5.9.tar.gz
fetch https://static.rust-lang.org/dist/2026-09-03/rustc-1.98.1-x86_64-apple-darwin.tar.xz \
    641c301bd19c3cead114cbb61919c5ed2475ce53e2d011fe0c990e16c5a1b04b rustc-1.98.1-x86_64-apple-darwin.tar.xz
fetch https://static.rust-lang.org/dist/2026-09-03/cargo-1.98.1-x86_64-apple-darwin.tar.xz \
    74b1282253c31fb89926d51d57e47a06c6cd26c93657de72edf622a4ab66396f cargo-1.98.1-x86_64-apple-darwin.tar.xz
fetch https://static.rust-lang.org/dist/2026-09-03/rust-std-1.98.1-x86_64-apple-darwin.tar.xz \
    48b9835058a8baa4ff5e4387f3772c572a017a2b13393c46e151615c54e322e9 rust-std-1.98.1-x86_64-apple-darwin.tar.xz
fetch https://files.pythonhosted.org/packages/43/b6/79c881410a3b1c187f7eb3d407aecae646c6a4433d630d72200359015e83/maturin-1.14.1-py3-none-macosx_10_12_x86_64.whl \
    f3306078070c1508fd715b9116070cbcaff5959024272a9f1e6f5cb29768b86c build-wheels/maturin-1.14.1-py3-none-macosx_10_12_x86_64.whl
fetch https://files.pythonhosted.org/packages/70/d2/16d99a0c4948febc0ebd133a13b2f688ff7f8cb04da971e1128872ce0c03/cffi-2.1.1-cp311-cp311-macosx_10_15_x86_64.whl \
    c8d2c9fd1f2d16f780d15127abb050d13d1a76c03a4bd87d7e4980e45e511e12 build-wheels/cffi-2.1.1-cp311-cp311-macosx_10_15_x86_64.whl
fetch https://files.pythonhosted.org/packages/b6/ae/315bbeee126a769cbde43cf4908acb4b40408d8bf8bbf334dd7368d8dadf/pycparser-3.12-py3-none-any.whl \
    a076f3f489b39b43ed13563a1dafe42447445bec2e294154ec5c57fcdda4c85e build-wheels/pycparser-3.12-py3-none-any.whl
fetch https://files.pythonhosted.org/packages/ef/55/6dc6d6bb953bdfc52519a0059592c52b6e3b8ad51cf8256dffceb55b0610/setuptools-84.2.1-py3-none-any.whl \
    ca140b45d5325a9478f880e351484f62fef15f336462e449ca0c03c873d589c2 build-wheels/setuptools-84.2.1-py3-none-any.whl

for component in rustc cargo rust-std; do
    dist="$component-1.98.1-x86_64-apple-darwin"
    tar -xf "$dist.tar.xz"
    "./$dist/install.sh" --prefix="$work/rust" --disable-ldconfig
done
export PATH="$work/rust/bin:$PATH"
rustc -vV

# Build dependencies use a separate managed interpreter, venv and cache.
uv python install 3.11
uv venv --python 3.11 tool-venv
uv pip install --python tool-venv/bin/python --offline --no-index build-wheels/*.whl

export MACOSX_DEPLOYMENT_TARGET=15.0
export OPENSSL_DIR="$work/openssl" OPENSSL_STATIC=1
jobs=$(sysctl -n hw.logicalcpu)
tar -xf openssl-3.5.9.tar.gz
if ! (
    cd openssl-3.5.9
    ./Configure darwin64-x86_64-cc no-shared no-tests --prefix="$OPENSSL_DIR" &&
        make -j "$jobs" build_sw && make install_sw
) >openssl-build.log 2>&1; then
    tail -50 openssl-build.log >&2
    exit 1
fi

tar -xf cryptography-50.0.2.tar.gz
(
    cd cryptography-50.0.2
    cargo fetch --locked --target x86_64-apple-darwin
    "$work/tool-venv/bin/maturin" build --release --locked --offline \
        --target x86_64-apple-darwin --interpreter "$work/tool-venv/bin/python" --out "$work/wheel"
)
wheel="$work/wheel/cryptography-50.0.2-cp311-abi3-macosx_15_0_x86_64.whl"
sha=$(shasum -a 256 "$wheel")
sha=${sha%% *}
printf '%s  %s\n' "$sha" "$wheel" > wheel.sha256
printf 'Intel fixture wheel SHA-256: %s\n' "$sha"
# Use an absolute URL so this also works from the fixture's unrelated cwd.
"$work/tool-venv/bin/python" -c 'from pathlib import Path; import sys; print(f"cryptography @ {Path(sys.argv[1]).as_uri()}")' \
    "$wheel" > constraints.txt
