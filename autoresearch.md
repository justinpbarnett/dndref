# Autoresearch: formatted LOC via real refactoring

Goal: reduce maintainable, formatted source LOC while preserving behavior.

Rules:

- Do **not** count wins from manually condensing nicely formatted code onto fewer lines.
- Before measuring LOC and before pass/fail, format touched source with Prettier or an equivalent formatter.
- Prefer DRY/refactoring wins: remove duplication, collapse redundant abstractions, simplify data flow, delete dead code, merge equivalent helpers, and improve module boundaries.
- Do not cheat the benchmark: no deleting tests or functionality, no excluding real source files from the metric, no formatting-only LOC tricks.
- Correctness gates remain mandatory: TypeScript, scoped ESLint, and Vitest.
- Keep only changes that reduce formatted LOC and pass gates. Discard changes that only reduce raw LOC through formatting.

Formatted LOC metric:

```sh
npx prettier@3 --write --print-width 120 "app/**/*.{ts,tsx,js,jsx,json,md,css}" "src/**/*.{ts,tsx,js,jsx,json,md,css}" "e2e/**/*.{ts,tsx,js,jsx,json,md,css}" "*.{json,md,css}" && \
printf 'METRIC loc=' && \
{ git ls-files ':!:package-lock.json'; git ls-files --others --exclude-standard ':!:package-lock.json'; } | \
  grep -E '\\.(ts|tsx|js|jsx|json|md|css)$' | sort -u | xargs wc -l | tail -1 | awk '{print $1}' && \
just check && npx eslint src app e2e && npm test
```
