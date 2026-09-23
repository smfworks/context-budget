import type { Band, BudgetPreset, BudgetReport, PresetId } from "../types.ts";
import { SCHEMA_VERSION } from "../types.ts";
import { findCuts } from "./cuts.ts";
import { conservativeTrim } from "./trim.ts";
import { budgetIdFromSource, countWords, estimateTokens, formatCount, formatPct, formatTokensCompact } from "./tokens.ts";

export const BUDGET_PRESETS: readonly BudgetPreset[] = [
  { id: "8k", label: "8k", tokens: 8_000 },
  { id: "32k", label: "32k", tokens: 32_000 },
  { id: "128k", label: "128k", tokens: 128_000 },
  { id: "200k", label: "200k", tokens: 200_000 },
] as const;

export const DEFAULT_PRESET = BUDGET_PRESETS[2];

export const MIN_CUSTOM_BUDGET = 256;
export const MAX_CUSTOM_BUDGET = 2_000_000;

export function bandFromPct(pct: number): Band {
  if (pct >= 90) return "RED";
  if (pct >= 70) return "YELLOW";
  return "GREEN";
}

export function presetById(id: string | null | undefined): BudgetPreset | undefined {
  return BUDGET_PRESETS.find((item) => item.id === id);
}

export function parseBudgetInput(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase().replace(/,/g, "").replace(/\s*tokens?\s*/g, "");
  const match = trimmed.match(/^(\d+(?:\.\d+)?)([km])?$/);
  if (!match) return null;
  const magnitude = Number(match[1]);
  if (!Number.isFinite(magnitude)) return null;
  const mul = match[2] === "m" ? 1_000_000 : match[2] === "k" ? 1_000 : 1;
  const tokens = Math.round(magnitude * mul);
  if (tokens < MIN_CUSTOM_BUDGET || tokens > MAX_CUSTOM_BUDGET) return null;
  return tokens;
}

export function formatBudgetLabel(tokens: number, presetId: PresetId): string {
  const preset = presetById(presetId);
  if (preset && preset.tokens === tokens) return preset.label;
  return formatTokensCompact(tokens);
}

export function barWidthPct(pct: number): number {
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  return Math.min(100, pct);
}

export function analyzeContext(
  text: string,
  budgetTokens: number,
  presetId: PresetId,
  at: Date = new Date(),
): BudgetReport {
  const empty = text.trim().length === 0;
  const chars = empty ? 0 : text.length;
  const words = empty ? 0 : countWords(text);
  const tokens = empty ? 0 : estimateTokens(text);
  const safeBudget = Math.max(1, Math.round(budgetTokens));
  const pct = (tokens / safeBudget) * 100;
  const headroom = safeBudget - tokens;
  const band = bandFromPct(pct);
  const cuts = empty ? [] : findCuts(text);
  const cutTokens = cuts.reduce((sum, cut) => sum + cut.tokens, 0);
  const trimmed = empty ? null : conservativeTrim(text);
  const trimmedTokens = trimmed ? estimateTokens(trimmed) : null;
  const budgetLabel = formatBudgetLabel(safeBudget, presetId);
  const id = empty
    ? "CB-————"
    : budgetIdFromSource(`${presetId}:${safeBudget}\n${text}`);

  let summary: string;
  if (empty) {
    summary = "Paste a prompt, log, or dump. Approximate tokens · not a billing meter.";
  } else if (headroom < 0) {
    summary = `Over budget by ~${formatCount(Math.abs(headroom))} tok (${formatPct(pct)} of ${budgetLabel}).`;
  } else if (band === "RED") {
    summary = `Critical — ~${formatCount(headroom)} tok headroom (${formatPct(pct)} of ${budgetLabel}).`;
  } else if (band === "YELLOW") {
    summary = `Tight — ~${formatCount(headroom)} tok headroom (${formatPct(pct)} of ${budgetLabel}).`;
  } else {
    summary = `~${formatCount(tokens)} tok · ${formatPct(pct)} of ${budgetLabel} · ~${formatCount(headroom)} headroom.`;
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    empty,
    chars,
    words,
    tokens,
    budgetTokens: safeBudget,
    budgetLabel,
    pct,
    headroom,
    band,
    cuts,
    cutTokens,
    trimmed,
    trimmedTokens,
    heuristic: true,
    measuredAt: at.toISOString(),
    summary,
  };
}
