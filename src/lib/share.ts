import type { BudgetReport } from "../types.ts";
import { BAND_META } from "../types.ts";
import { formatCount, formatPct, formatTokensCompact } from "./tokens.ts";

const SHARE_URL = "https://github.com/smfworks/context-budget";

export function formatStampTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  return `${dd} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} · ${hh}:${mm} UTC`;
}

export function formatCompactStats(report: BudgetReport): string {
  const head =
    report.headroom < 0
      ? `over by ~${formatCount(Math.abs(report.headroom))}`
      : `~${formatCount(report.headroom)} headroom`;
  return `~${formatCount(report.tokens)} tok · ${formatPct(report.pct)} of ${report.budgetLabel} · ${formatCount(report.chars)} chars · ${formatCount(report.words)} words · ${head}`;
}

export function formatShareText(report: BudgetReport): string {
  const meta = BAND_META[report.band];
  const lines = [
    `${meta.emoji} Context Budget · ${formatPct(report.pct)} of ${report.budgetLabel}`,
    `~${formatCount(report.tokens)} tok · ${formatCompactStats(report).split(" · ").slice(2).join(" · ")}`,
    "",
  ];

  if (report.empty) {
    lines.push("Paste a prompt, log, or dump.");
  } else if (!report.cuts.length) {
    lines.push("No obvious cuts. Tight writing — still approximate.");
  } else {
    lines.push("Cut:");
    for (const item of report.cuts.slice(0, 6)) {
      const mark = item.severity === "error" ? "✕" : item.severity === "warn" ? "!" : "·";
      lines.push(`${mark} ${item.title} — ${item.hint} (~${formatTokensCompact(item.tokens)})`);
    }
  }

  if (report.trimmed && report.trimmedTokens != null) {
    lines.push(
      "",
      `Conservative trim available · ~${formatCount(report.trimmedTokens)} tok (was ~${formatCount(report.tokens)}).`,
    );
  }

  lines.push("", "Approximate · not a billing meter", "Context Budget · SMF Works", SHARE_URL);
  return lines.join("\n");
}

export function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
