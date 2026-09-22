/**
 * Which game the table is playing.
 *
 * This file imports nothing, on purpose. `storage/settings` has to validate a
 * stored id, and `rulesets/index` has to build the providers that go with it.
 * Were both to live in one module, saving a setting would pull in every world
 * source. Everything about a ruleset other than its name lives in
 * `rulesets/index.ts`.
 */
export const RULESET_IDS = ["dnd", "mtg"] as const;

export type RulesetId = (typeof RULESET_IDS)[number];

export const DEFAULT_RULESET_ID: RulesetId = "dnd";

export const isRulesetId = (value: unknown): value is RulesetId =>
  typeof value === "string" && (RULESET_IDS as readonly string[]).includes(value);
