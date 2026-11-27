import { DETECTION_TUNING } from "./detection-tuning";

const DIACRITIC = /\p{Diacritic}/u;

type Mapped = { text: string; endAt: number[] };

function mapFolded(text: string): Mapped {
  const chars: string[] = [];
  const endAt: number[] = [];
  for (let index = 0; index < text.length; ) {
    const raw = String.fromCodePoint(text.codePointAt(index) ?? 0);
    const next = index + raw.length;
    for (const ch of raw.toLowerCase().normalize("NFD")) {
      if (DIACRITIC.test(ch) || ch === "'" || ch === "\u2019") continue;
      chars.push(ch);
      endAt.push(next);
    }
    index = next;
  }
  return { text: chars.join(""), endAt };
}

const folded = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/['\u2019]/g, "");

function applyBonus(mapped: Mapped): Mapped {
  const pattern = new RegExp(DETECTION_TUNING.bonusSuffix, "gi");
  let text = "";
  const endAt: number[] = [];
  let cursor = 0;
  for (const match of mapped.text.matchAll(pattern)) {
    const start = match.index ?? 0;
    text += mapped.text.slice(cursor, start);
    endAt.push(...mapped.endAt.slice(cursor, start));
    text += " ";
    endAt.push(mapped.endAt[start] ?? 0);
    cursor = start + match[0].length;
  }
  text += mapped.text.slice(cursor);
  endAt.push(...mapped.endAt.slice(cursor));
  return { text, endAt };
}

function wordsOf(mapped: Mapped, pattern: RegExp): { words: string[]; ends: number[] } {
  const words: string[] = [];
  const ends: number[] = [];
  for (const match of mapped.text.matchAll(pattern)) {
    const start = match.index ?? 0;
    words.push(match[0]);
    ends.push(mapped.endAt[start + match[0].length - 1] ?? mapped.text.length);
  }
  return { words, ends };
}

function sameWords(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((word, index) => word === right[index]);
}

const sameFold = (left: string, right: string): boolean =>
  left.replace(/\u03c2/g, "\u03c3") === right.replace(/\u03c2/g, "\u03c3");

const unmatched = (text: string, words: string[]): number[] => words.map(() => text.length);

export function alignSpokenEnds(text: string, words: string[]): number[] {
  const base = folded(text);
  const mapped = mapFolded(text);
  if (!sameFold(mapped.text, base)) return unmatched(text, words);
  const withBonus = applyBonus(mapped);
  const canonical = base.replace(new RegExp(DETECTION_TUNING.bonusSuffix, "gi"), " ");
  if (!sameFold(withBonus.text, canonical)) return unmatched(text, words);
  const aligned = wordsOf(withBonus, /[a-z]+/g);
  return sameWords(aligned.words, words) ? aligned.ends : unmatched(text, words);
}

export function alignExactEnds(text: string, words: string[]): number[] {
  const mapped = mapFolded(text);
  if (!sameFold(mapped.text, folded(text))) return unmatched(text, words);
  const aligned = wordsOf(mapped, /[a-z0-9]+/g);
  return sameWords(aligned.words, words) ? aligned.ends : unmatched(text, words);
}
