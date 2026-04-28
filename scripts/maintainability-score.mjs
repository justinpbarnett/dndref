#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SOURCE_ROOTS = ['app/', 'src/', 'scripts/', 'workers/'];
const IGNORE_PATTERNS = [
  /(^|\/)node_modules\//,
  /(^|\/)dist\//,
  /(^|\/)coverage\//,
  /(^|\/)test-results\//,
  /(^|\/)\.expo\//,
  /(^|\/)\.git\//,
  /(^|\/)\.sandcastle\//,
  /^scripts\/maintainability-score\.mjs$/,
  /\.test\.[tj]sx?$/,
  /\.spec\.[tj]sx?$/,
];

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

function listedFiles(args) {
  try {
    return git(args).split('\0').filter(Boolean);
  } catch {
    return [];
  }
}

function sourceFiles() {
  const files = new Set([
    ...listedFiles(['ls-files', '-z', ...SOURCE_ROOTS]),
    ...listedFiles(['ls-files', '--others', '--exclude-standard', '-z', ...SOURCE_ROOTS]),
  ]);
  return [...files]
    .filter((file) => SOURCE_EXTENSIONS.has(path.extname(file)))
    .filter((file) => !IGNORE_PATTERNS.some((pattern) => pattern.test(file)))
    .sort();
}

function read(file) {
  return readFileSync(file, 'utf8');
}

function normalizeCodeLine(line) {
  return line
    .replace(/\/\/.*$/, '')
    .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""')
    .replace(/\b\d+(?:\.\d+)?\b/g, '0')
    .replace(/\s+/g, ' ')
    .trim();
}

function functionBlocks(text) {
  const lines = text.split(/\r?\n/);
  const starts = [];
  const startPattern = /\b(function|async function|const|let|var|export function|export default function|private|public|protected)\b.*(?:=>|\{|function\b)|^\s*(?:async\s+)?[A-Za-z_$][\w$]*\s*\([^)]*\)\s*\{/;

  lines.forEach((line, index) => {
    if (startPattern.test(line) && !/^\s*(if|for|while|switch|catch)\b/.test(line)) starts.push(index);
  });

  return starts.map((start, index) => ({
    start,
    end: starts[index + 1] ?? lines.length,
    text: lines.slice(start, starts[index + 1] ?? lines.length).join('\n'),
  }));
}

function complexityOf(block) {
  const matches = block.match(/\b(if|else\s+if|for|while|case|catch|switch|&&|\|\||\?)\b/g);
  return 1 + (matches?.length ?? 0);
}

function importSpecifiers(text) {
  const specs = [];
  const patterns = [
    /import\s+(?:[^'"()]+?\s+from\s+)?['"]([^'"]+)['"]/g,
    /export\s+[^'"()]+?\s+from\s+['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) specs.push(match[1]);
  }
  return specs;
}

function resolveRelativeImport(fromFile, specifier, knownFiles) {
  if (!specifier.startsWith('.')) return null;
  const base = path.normalize(path.join(path.dirname(fromFile), specifier));
  const candidates = [
    base,
    ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].map((ext) => `${base}${ext}`),
    ...['.ts', '.tsx', '.js', '.jsx'].map((ext) => path.join(base, `index${ext}`)),
  ];
  return candidates.find((candidate) => knownFiles.has(candidate)) ?? null;
}

function countImportCycles(files, contents) {
  const knownFiles = new Set(files);
  const graph = new Map(files.map((file) => [file, []]));
  for (const file of files) {
    graph.set(file, importSpecifiers(contents.get(file))
      .map((specifier) => resolveRelativeImport(file, specifier, knownFiles))
      .filter(Boolean));
  }

  const cycles = new Set();
  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  function visit(file) {
    if (visiting.has(file)) {
      cycles.add(stack.slice(stack.indexOf(file)).sort().join(' -> '));
      return;
    }
    if (visited.has(file)) return;
    visiting.add(file);
    stack.push(file);
    for (const next of graph.get(file) ?? []) visit(next);
    stack.pop();
    visiting.delete(file);
    visited.add(file);
  }

  for (const file of files) visit(file);
  return cycles.size;
}

function duplicateBlocks(files, contents) {
  const owners = new Map();
  const windowSize = 8;
  for (const file of files) {
    const normalized = contents.get(file)
      .split(/\r?\n/)
      .map(normalizeCodeLine)
      .filter((line) => line.length > 2 && line !== '{' && line !== '}' && line !== ');');
    for (let index = 0; index <= normalized.length - windowSize; index += 1) {
      const block = normalized.slice(index, index + windowSize).join('\n');
      if (block.length < 160) continue;
      if (!owners.has(block)) owners.set(block, new Set());
      owners.get(block).add(file);
    }
  }
  return [...owners.values()].filter((filesWithBlock) => filesWithBlock.size > 1).length;
}

function architectureViolations(files, contents) {
  let violations = 0;
  for (const file of files) {
    const text = contents.get(file);
    if (/AsyncStorage/.test(text) && !['src/context/data-sources.tsx', 'src/context/ui-settings.tsx'].includes(file)) violations += 1;
    if (/localStorage/.test(text) && file !== 'src/context/ui-settings.tsx') violations += 1;
    if (/(#[0-9a-fA-F]{3,8}\b|rgba?\()/.test(text) && file !== 'src/theme.ts') violations += 1;
    if (/proxy\.dndref\.com/.test(text) && file !== 'src/proxy.ts') violations += 1;
  }
  return violations;
}

function churnByFile() {
  const churn = new Map();
  let output = '';
  try {
    output = git(['log', '--since=90.days', '--numstat', '--', ...SOURCE_ROOTS]);
  } catch {
    return churn;
  }
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^(\d+)\s+(\d+)\s+(.+)$/);
    if (!match) continue;
    const [, added, deleted, file] = match;
    churn.set(file, (churn.get(file) ?? 0) + Number(added) + Number(deleted));
  }
  return churn;
}

const files = sourceFiles();
const contents = new Map(files.map((file) => [file, read(file)]));
const churn = churnByFile();

let totalLoc = 0;
let filesOver300 = 0;
let functionsOver75 = 0;
let complexFunctionsOver15 = 0;
let maxComplexity = 0;
let hotspotComplexity = 0;

for (const file of files) {
  const lines = contents.get(file).split(/\r?\n/);
  const loc = lines.filter((line) => normalizeCodeLine(line)).length;
  totalLoc += loc;
  if (lines.length > 300) filesOver300 += 1;

  let fileComplexity = 0;
  for (const block of functionBlocks(contents.get(file))) {
    const size = block.end - block.start;
    const complexity = complexityOf(block.text);
    fileComplexity += complexity;
    maxComplexity = Math.max(maxComplexity, complexity);
    if (size > 75) functionsOver75 += 1;
    if (complexity > 15) complexFunctionsOver15 += 1;
  }
  hotspotComplexity += Math.round(((churn.get(file) ?? 0) * fileComplexity) / 25);
}

const importCycles = countImportCycles(files, contents);
const duplicateBlockCount = duplicateBlocks(files, contents);
const architectureViolationCount = architectureViolations(files, contents);

const maintainabilityDebt =
  1000 * importCycles +
  500 * architectureViolationCount +
  30 * duplicateBlockCount +
  20 * complexFunctionsOver15 +
  10 * functionsOver75 +
  5 * filesOver300 +
  hotspotComplexity;

console.log(`METRIC maintainability_debt=${maintainabilityDebt}`);
console.log(`METRIC import_cycles=${importCycles}`);
console.log(`METRIC architecture_violations=${architectureViolationCount}`);
console.log(`METRIC duplicate_blocks=${duplicateBlockCount}`);
console.log(`METRIC complex_functions_over_15=${complexFunctionsOver15}`);
console.log(`METRIC functions_over_75=${functionsOver75}`);
console.log(`METRIC files_over_300=${filesOver300}`);
console.log(`METRIC max_complexity=${maxComplexity}`);
console.log(`METRIC hotspot_complexity=${hotspotComplexity}`);
console.log(`METRIC source_loc=${totalLoc}`);
console.log(`METRIC source_files=${files.length}`);
