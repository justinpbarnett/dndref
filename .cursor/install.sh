#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export DEBIAN_FRONTEND=noninteractive

verify_sha256() {
  local sums="$1"
  local asset="$2"
  awk -v asset="$asset" '$2 == asset { print; found=1 } END { exit !found }' "$sums" | sha256sum -c -
}

if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(".")[0]')" != "22" ]]; then
  version=22.23.4
  asset="node-v${version}-linux-x64.tar.xz"
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/$asset" "https://nodejs.org/dist/v${version}/${asset}"
  curl -fsSL -o "$tmp/SHASUMS256.txt" "https://nodejs.org/dist/v${version}/SHASUMS256.txt"
  (cd "$tmp" && verify_sha256 SHASUMS256.txt "$asset")
  sudo tar -xJf "$tmp/$asset" -C /usr/local --strip-components=1 --no-same-owner
  rm -rf "$tmp"
  export PATH="/usr/local/bin:${PATH}"
  hash -r
fi

if ! node_version="$(node -v 2>&1)"; then
  echo "node 22 is not on PATH after install" >&2
  exit 1
fi
node_major="${node_version#v}"
node_major="${node_major%%.*}"
if [[ "$node_major" != "22" ]]; then
  echo "node ${node_version} at $(command -v node) is not major 22" >&2
  exit 1
fi

just_version=1.59.0
if ! command -v just >/dev/null 2>&1 || [[ "$(just --version)" != "just ${just_version}" ]]; then
  asset="just-${just_version}-x86_64-unknown-linux-musl.tar.gz"
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/$asset" "https://github.com/casey/just/releases/download/${just_version}/${asset}"
  curl -fsSL -o "$tmp/SHA256SUMS" "https://github.com/casey/just/releases/download/${just_version}/SHA256SUMS"
  (cd "$tmp" && verify_sha256 SHA256SUMS "$asset")
  tar -xzf "$tmp/$asset" -C "$tmp"
  sudo install -m 755 "$tmp/just" /usr/local/bin/just
  rm -rf "$tmp"
fi

npm ci

npx playwright install --with-deps chromium
