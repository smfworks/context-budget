/** Rough context estimate used across the app. Label it approximate. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.round(text.length / 4);
}

export function formatCount(n: number): string {
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(Math.round(n));
  return `${sign}${abs.toLocaleString("en-US")}`;
}

/** Compact token label: 412 · 6.4k · 128k · 1.2M */
export function formatTokensCompact(n: number): string {
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const value = abs / 1_000_000;
    const digits = value >= 10 ? 0 : 1;
    return `${sign}${trimDecimal(value.toFixed(digits))}M`;
  }
  if (abs >= 10_000) {
    const value = abs / 1_000;
    const digits = value >= 100 ? 0 : 1;
    return `${sign}${trimDecimal(value.toFixed(digits))}k`;
  }
  return `${sign}${Math.round(abs).toLocaleString("en-US")}`;
}

export function formatPct(pct: number): string {
  if (!Number.isFinite(pct)) return "—";
  const rounded = Math.round(pct * 10) / 10;
  if (Number.isInteger(rounded)) return `${rounded}%`;
  return `${rounded.toFixed(1)}%`;
}

function trimDecimal(value: string): string {
  return value.replace(/\.0$/, "");
}

export function budgetIdFromSource(source: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `CB-${(hash >>> 0).toString(16).toUpperCase().padStart(4, "0").slice(-4)}`;
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "context-budget";
}
