export type Band = "GREEN" | "YELLOW" | "RED";

export type Severity = "error" | "warn" | "info";

export type PresetId = "8k" | "32k" | "128k" | "200k" | "custom";

export interface BudgetPreset {
  id: Exclude<PresetId, "custom">;
  label: string;
  tokens: number;
}

export interface Cut {
  id: string;
  title: string;
  detail: string;
  hint: string;
  tokens: number;
  severity: Severity;
}

export interface BudgetReport {
  schemaVersion: "context-budget/v1";
  id: string;
  empty: boolean;
  chars: number;
  tokens: number;
  budgetTokens: number;
  budgetLabel: string;
  pct: number;
  headroom: number;
  band: Band;
  cuts: Cut[];
  cutTokens: number;
  heuristic: true;
  measuredAt: string;
  summary: string;
}

export interface SampleMeta {
  id: string;
  label: string;
  blurb: string;
  expect: Band;
  budgetId: Exclude<PresetId, "custom">;
  text: string;
}

export const BAND_META: Record<
  Band,
  { label: string; sub: string; emoji: string; className: string }
> = {
  GREEN: {
    label: "GREEN",
    sub: "HEADROOM",
    emoji: "🟢",
    className: "is-green",
  },
  YELLOW: {
    label: "YELLOW",
    sub: "TIGHT",
    emoji: "🟡",
    className: "is-yellow",
  },
  RED: {
    label: "RED",
    sub: "OVER / CRITICAL",
    emoji: "🔴",
    className: "is-red",
  },
};

export const SCHEMA_VERSION = "context-budget/v1" as const;
