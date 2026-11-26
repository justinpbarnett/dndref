#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export DEBIAN_FRONTEND=noninteractive

if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(".")[0]')" != "22" ]]; then
  version=22.23.4
  curl -fsSL "https://nodejs.org/dist/v${version}/node-v${version}-linux-x64.tar.xz" \
    | sudo tar -xJ -C /usr/local --strip-components=1 --no-same-owner
  hash -r
fi

just_version=1.59.0
if ! command -v just >/dev/null 2>&1 || [[ "$(just --version)" != "just ${just_version}" ]]; then
  asset="just-${just_version}-x86_64-unknown-linux-musl.tar.gz"
  tmp="$(mktemp -d)"
  curl -fsSL "https://github.com/casey/just/releases/download/${just_version}/${asset}" \
    | tar -xz -C "$tmp"
  sudo install -m 755 "$tmp/just" /usr/local/bin/just
  rm -rf "$tmp"
fi

npm ci

npx playwright install --with-deps chromium
