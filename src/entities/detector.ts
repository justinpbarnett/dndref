import { DEFAULT_MATCHING_MODE, type MatchingMode } from "./detection-mode";
import { DETECTION_TUNING } from "./detection-tuning";
import { exactDetection } from "./exact-detection";

import { Entity, EntityIndex, TranscriptMatcher } from "./index";

const articles = new Set<string>(DETECTION_TUNING.articles);
const compoundMarkers = new Set<string>(DETECTION_TUNING.compoundMarkers);
const ordinaryLeadingWords = new Set<string>(DETECTION_TUNING.ordinaryLeadingWords);

const letterCount = (value: string): number => value.replace(/[^a-z]/g, "").length;

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\u2019/g, "'")
    .split(/[^a-z']+/)
    .filter(Boolean);

function editDistance(left: string, right: string): number {
  if (left === right) return 0;
  const rows = left.length + 1;
  const cols = right.length + 1;
  const scores = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let row = 0; row < rows; row++) scores[row][0] = row;
  for (let col = 0; col < cols; col++) scores[0][col] = col;
  for (let row = 1; row < rows; row++) {
    for (let col = 1; col < cols; col++) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      scores[row][col] = Math.min(
        scores[row - 1][col] + 1,
        scores[row][col - 1] + 1,
        scores[row - 1][col - 1] + cost,
      );
      if (row > 1 && col > 1 && left[row - 1] === right[col - 2] && left[row - 2] === right[col - 1]) {
        scores[row][col] = Math.min(scores[row][col], scores[row - 2][col - 2] + 1);
      }
    }
  }
  return scores[left.length][right.length];
}

function wordClose(spoken: string, indexed: string): boolean {
  if (spoken === indexed) return true;
  if (spoken[0] !== indexed[0]) return false;
  const spokenLetters = letterCount(spoken);
  const indexedLetters = letterCount(indexed);
  if (indexedLetters < DETECTION_TUNING.minFuzzyChars || spokenLetters < DETECTION_TUNING.minWordChars) return false;
  const maxLetters = Math.max(spokenLetters, indexedLetters);
  const minLetters = Math.min(spokenLetters, indexedLetters);
  if (minLetters / maxLetters < DETECTION_TUNING.minLengthRatio) return false;
  const distance = editDistance(spoken, indexed);
  return distance > 0 && distance <= Math.floor(maxLetters * DETECTION_TUNING.maxEditRatio);
}

function phraseClose(spoken: string, indexed: string): boolean {
  if (spoken === indexed) return false;
  const spokenWords = spoken.split(" ");
  const indexedWords = indexed.split(" ");
  if (spokenWords.length !== indexedWords.length) return false;
  let edits = 0;
  for (let i = 0; i < spokenWords.length; i++) {
    if (spokenWords[i] === indexedWords[i]) continue;
    if (!wordClose(spokenWords[i], indexedWords[i])) return false;
    edits += editDistance(spokenWords[i], indexedWords[i]);
  }
  return edits > 0;
}

function leadingWord(name: string): string | null {
  const words = tokenize(name);
  if (words.some((word) => compoundMarkers.has(word))) return null;
  const content = words.filter((word) => !articles.has(word));
  if (content.length !== 2) return null;
  const [first, second] = content;
  if (ordinaryLeadingWords.has(first)) return null;
  if (letterCount(first) < DETECTION_TUNING.minStandaloneChars) return null;
  if (letterCount(second) > DETECTION_TUNING.maxCompanionChars) return null;
  if (letterCount(first) < letterCount(second) + DETECTION_TUNING.minStandaloneMargin) return null;
  return first;
}

type IndexedTerm = { norm: string; entity: Entity };

export class EntityDetector {
  private readonly matchTranscript: TranscriptMatcher;

  constructor(entities: EntityIndex, mode: MatchingMode = DEFAULT_MATCHING_MODE) {
    this.matchTranscript = mode === "exact" ? exactDetection(entities) : fuzzyDetection(entities);
  }

  detect(transcript: string): Entity[] {
    return this.matchTranscript(transcript);
  }
}

export function fuzzyDetection(entities: EntityIndex): TranscriptMatcher {
  const exact = new Map<string, Entity[]>();
  const fuzzyByWidth: IndexedTerm[][] = [];
  const standins: IndexedTerm[] = [];
  const seenFuzzy = new Set<string>();

  const claim = (norm: string, entity: Entity) => {
    if (!norm) return;
    const list = exact.get(norm);
    if (!list) exact.set(norm, [entity]);
    else if (!list.some((item) => item.id === entity.id)) list.push(entity);
  };

  const addFuzzy = (norm: string, entity: Entity) => {
    if (!norm) return;
    const key = `${entity.id}\0${norm}`;
    if (seenFuzzy.has(key)) return;
    seenFuzzy.add(key);
    const width = norm.split(" ").length;
    (fuzzyByWidth[width] ??= []).push({ norm, entity });
  };

  const addName = (name: string, entity: Entity) => {
    const norm = tokenize(name).join(" ");
    claim(norm, entity);
    addFuzzy(norm, entity);
    const parts = norm.split(" ");
    if (articles.has(parts[0]) && parts.length > 1) {
      const stripped = parts.slice(1).join(" ");
      claim(stripped, entity);
      addFuzzy(stripped, entity);
    }
    const leading = leadingWord(name);
    if (leading) standins.push({ norm: leading, entity });
  };

  for (const entity of entities) addName(entity.name, entity);
  for (const entity of entities) {
    for (const alias of entity.aliases) {
      const norm = tokenize(alias).join(" ");
      claim(norm, entity);
      addFuzzy(norm, entity);
    }
  }

  let longest = 1;
  for (const key of exact.keys()) longest = Math.max(longest, key.split(" ").length);

  return (transcript) => {
    const words = tokenize(transcript);
    const found = new Map<string, { entity: Entity; score: number }>();
    const record = (entity: Entity, score: number) => {
      const existing = found.get(entity.id);
      if (!existing || score < existing.score) found.set(entity.id, { entity, score });
    };

    const limit = Math.min(longest, words.length);
    for (let start = 0; start < words.length; start++) {
      for (let width = 1; width <= limit && start + width <= words.length; width++) {
        const key = words.slice(start, start + width).join(" ");
        if (letterCount(key) < DETECTION_TUNING.minWordChars) continue;
        for (const entity of exact.get(key) ?? []) record(entity, 0);
        if (width <= DETECTION_TUNING.maxFuzzyPhraseWords) {
          for (const term of fuzzyByWidth[width] ?? []) {
            if (phraseClose(key, term.norm)) record(term.entity, editDistance(key, term.norm));
          }
        }
        if (width === 1) {
          for (const standin of standins) {
            if (key === standin.norm) record(standin.entity, 0);
            else if (wordClose(key, standin.norm)) record(standin.entity, editDistance(key, standin.norm));
          }
        }
      }
    }

    return [...found.values()]
      .sort((a, b) => a.score - b.score || a.entity.name.localeCompare(b.entity.name))
      .map((hit) => hit.entity);
  };
}
