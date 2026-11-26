import { DEFAULT_MATCHING_MODE, type MatchingMode } from "./detection-mode";
import { DETECTION_TUNING, genuineOrdinaryAlias, isOrdinarySpeech } from "./detection-tuning";
import { exactDetection } from "./exact-detection";

import { Entity, EntityIndex, TranscriptMatcher } from "./index";

const articles = new Set<string>(DETECTION_TUNING.articles);
const compoundMarkers = new Set<string>(DETECTION_TUNING.compoundMarkers);
const ordinaryLeadingWords = new Set<string>(DETECTION_TUNING.ordinaryLeadingWords);
const ordinaryAliasWords = new Set<string>(DETECTION_TUNING.ordinaryAliasWords);

const letterCount = (value: string): number => value.replace(/[^a-z]/g, "").length;

const bonusSuffix = (): RegExp => new RegExp(DETECTION_TUNING.bonusSuffix, "gi");

function spokenWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/['\u2019]/g, "")
    .replace(bonusSuffix(), " ")
    .split(/[^a-z]+/)
    .filter(Boolean);
}

function spokenKeys(name: string): string[] {
  const keys = new Set<string>();
  const stripped = name.replace(bonusSuffix(), " ");
  const add = (text: string) => {
    const norm = spokenWords(text).join(" ");
    if (norm) keys.add(norm);
  };
  add(stripped.replace(/\([^)]*\)/g, " "));
  for (const match of stripped.matchAll(/\(([^)]*)\)/g)) {
    for (const part of match[1].split("/")) add(part);
  }
  if (!stripped.includes("(") && stripped.includes("/")) {
    for (const part of stripped.split("/")) add(part);
  }
  return [...keys];
}

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
  if (spoken === `${indexed}s` || indexed === `${spoken}s`) return false;
  if (spoken[0] !== indexed[0]) return false;
  const spokenLetters = letterCount(spoken);
  const indexedLetters = letterCount(indexed);
  if (spokenLetters < DETECTION_TUNING.minWordChars) return false;
  const maxLetters = Math.max(spokenLetters, indexedLetters);
  const minLetters = Math.min(spokenLetters, indexedLetters);
  if (minLetters / maxLetters < DETECTION_TUNING.minLengthRatio) return false;
  if (indexedLetters < DETECTION_TUNING.minFuzzyChars) {
    if (indexedLetters < DETECTION_TUNING.minWordChars) return false;
    if (isOrdinarySpeech(spoken) || isOrdinarySpeech(indexed)) return false;
    const distance = editDistance(spoken, indexed);
    return distance > 0 && distance <= DETECTION_TUNING.shortNameMaxEdits;
  }
  const distance = editDistance(spoken, indexed);
  return distance > 0 && distance <= Math.floor(maxLetters * DETECTION_TUNING.maxEditRatio);
}

function phraseClose(spoken: string, indexed: string): boolean {
  if (spoken === indexed) return false;
  const spokenWordsOfPhrase = spoken.split(" ");
  const indexedWords = indexed.split(" ");
  if (spokenWordsOfPhrase.length !== indexedWords.length) return false;
  let edits = 0;
  for (let i = 0; i < spokenWordsOfPhrase.length; i++) {
    if (spokenWordsOfPhrase[i] === indexedWords[i]) continue;
    if (!wordClose(spokenWordsOfPhrase[i], indexedWords[i])) return false;
    edits += editDistance(spokenWordsOfPhrase[i], indexedWords[i]);
  }
  return edits > 0;
}

function leadingWord(name: string): string | null {
  const words = spokenWords(name.replace(/\([^)]*\)/g, " "));
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

function dragonColor(name: string): string | null {
  const match = new RegExp(`^${DETECTION_TUNING.unqualifiedDragonAge} ([a-z]+) dragon$`, "i").exec(name.trim());
  return match ? match[1].toLowerCase() : null;
}

function ordinaryAlias(norm: string): boolean {
  const content = norm.split(" ").filter((word) => !articles.has(word));
  return content.length === 1 && ordinaryAliasWords.has(content[0]);
}

type IndexedTerm = { norm: string; entity: Entity };
type Hit = { entity: Entity; score: number };

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

  const claimName = (norm: string, entity: Entity) => {
    claim(norm, entity);
    addFuzzy(norm, entity);
    const parts = norm.split(" ");
    if (articles.has(parts[0]) && parts.length > 1) {
      const stripped = parts.slice(1).join(" ");
      claim(stripped, entity);
      addFuzzy(stripped, entity);
    }
  };

  for (const entity of entities) {
    for (const key of spokenKeys(entity.name)) claimName(key, entity);
    const color = dragonColor(entity.name);
    if (color) claimName(`${color} dragon`, entity);
    const leading = leadingWord(entity.name);
    if (leading) standins.push({ norm: leading, entity });
  }
  for (const entity of entities) {
    for (const alias of entity.aliases) {
      for (const key of spokenKeys(alias)) {
        if (ordinaryAlias(key)) continue;
        claim(key, entity);
        addFuzzy(key, entity);
      }
      const genuine = genuineOrdinaryAlias(alias, entity.name);
      if (genuine) claim(genuine, entity);
    }
  }

  let longest = 1;
  for (const key of exact.keys()) longest = Math.max(longest, key.split(" ").length);

  return (transcript) => {
    const words = spokenWords(transcript);
    const found = new Map<string, Hit>();
    const record = (entity: Entity, score: number) => {
      const existing = found.get(entity.id);
      if (!existing || score < existing.score) found.set(entity.id, { entity, score });
    };

    const hitsAt = (key: string, width: number): Hit[] => {
      const hits: Hit[] = [];
      const exactHits = exact.get(key) ?? [];
      if (exactHits.length > 0) {
        for (const entity of exactHits) hits.push({ entity, score: 0 });
      } else if (width <= DETECTION_TUNING.maxFuzzyPhraseWords) {
        for (const term of fuzzyByWidth[width] ?? []) {
          if (phraseClose(key, term.norm)) hits.push({ entity: term.entity, score: editDistance(key, term.norm) });
        }
      }
      if (width === 1) {
        for (const standin of standins) {
          if (key === standin.norm) hits.push({ entity: standin.entity, score: 0 });
          else if (wordClose(key, standin.norm)) {
            hits.push({ entity: standin.entity, score: editDistance(key, standin.norm) });
          }
        }
      }
      return hits;
    };

    for (let index = 0; index < words.length; ) {
      const room = Math.min(longest, words.length - index);
      let consumed = 0;
      for (let width = room; width >= 1; width--) {
        const key = words.slice(index, index + width).join(" ");
        if (letterCount(key) < DETECTION_TUNING.minWordChars) continue;
        const hits = hitsAt(key, width);
        if (hits.length === 0) continue;
        for (const hit of hits) record(hit.entity, hit.score);
        consumed = width;
        break;
      }
      index += consumed || 1;
    }

    return [...found.values()]
      .sort((a, b) => a.score - b.score || a.entity.name.localeCompare(b.entity.name))
      .map((hit) => hit.entity);
  };
}
