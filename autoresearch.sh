#!/usr/bin/env bash
set -euo pipefail

npx prettier@3 --write --print-width 120 \
  "app/**/*.{ts,tsx,js,jsx,json,md,css}" \
  "src/**/*.{ts,tsx,js,jsx,json,md,css}" \
  "e2e/**/*.{ts,tsx,js,jsx,json,md,css}" \
  "*.{json,md,css}"

printf 'METRIC loc='
{
  git ls-files ':!:package-lock.json'
  git ls-files --others --exclude-standard ':!:package-lock.json'
} | grep -E '\.(ts|tsx|js|jsx|json|md|css)$' | sort -u | xargs wc -l | tail -1 | awk '{print $1}'

just check
npx eslint src app e2e
npm test
