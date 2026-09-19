import { findCuts, isLogLine, trailingLogRange } from "./cuts.ts";
import { estimateTokens } from "./tokens.ts";

const TURN_RE = /^(?:user|assistant|human|system|ai|tool|model)\s*[:\]>]/i;
const EXAMPLE_RE = /^(?:example(?:\s+\d+)?|few[-\s]?shot|shot\s+\d+)\s*:/i;
const BASE64_LINE_RE = /^(?:data:[^;]+;base64,)?[A-Za-z0-9+/]{80,}={0,2}$/;
const BASE64_TOKEN_RE = /(?:data:[^;]+;base64,)?[A-Za-z0-9+/]{80,}={0,2}/g;
const BOILER_RE =
  /(?:copyright\s+\(c\)|all rights reserved|mit license|apache license|gnu general public license|licen[cs]ed under|permission is hereby granted)/i;

function splitLines(text: string): string[] {
  if (!text) return [];
  return text.split(/\r?\n/);
}

function collapseBlankRuns(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n");
}

function looksLikeJson(body: string): boolean {
  const trimmed = body.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

export function stubGiantFences(text: string): string {
  return text.replace(/```([\w-]*)\n([\s\S]*?)```/g, (full, lang: string, body: string) => {
    const bodyLines = splitLines(body.endsWith("\n") ? body.slice(0, -1) : body).length;
    const json = (lang ?? "").toLowerCase() === "json" || looksLikeJson(body);
    const giant = (json && body.length >= 400) || body.length >= 800 || bodyLines >= 12;
    if (!giant) return full;
    const name = lang || (json ? "json" : "code");
    const tok = estimateTokens(body);
    return `\`\`\`${lang}\n[omitted ${bodyLines} line${bodyLines === 1 ? "" : "s"} of ${name} · ~${tok} tok]\n\`\`\``;
  });
}

export function stubTrailingLogs(text: string): string {
  const range = trailingLogRange(text);
  if (!range) return text;
  const lines = splitLines(text);
  const kept = lines.slice(0, range.startLine).join("\n").replace(/\s+$/, "");
  const body = lines.slice(range.startLine).join("\n");
  const stub = `[truncated ${range.logCount} log line${range.logCount === 1 ? "" : "s"} · ~${estimateTokens(body)} tok]`;
  return kept ? `${kept}\n\n${stub}` : stub;
}

export function collapseDupLines(text: string): string {
  const lines = splitLines(text);
  const out: string[] = [];
  for (const line of lines) {
    if (line.length > 0 && out.length > 0 && line === out[out.length - 1]) continue;
    out.push(line);
  }
  return out.join("\n");
}

export function collapseDupBlocks(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const paragraph of paragraphs) {
    const key = paragraph.trim();
    if (key.length >= 80) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    kept.push(paragraph);
  }
  return kept.join("\n\n");
}

export function stubBase64(text: string): string {
  const lines = splitLines(text).map((line) => {
    if (BASE64_LINE_RE.test(line.trim())) return "[omitted base64]";
    return line.replace(BASE64_TOKEN_RE, "[omitted base64]");
  });
  return lines.join("\n");
}

export function keepLastChatTurns(text: string, keep = 4): string {
  const lines = splitLines(text);
  const turns: number[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (TURN_RE.test(lines[i].trim())) turns.push(i);
  }
  if (turns.length < 6) return text;
  const keepFrom = turns[Math.max(0, turns.length - keep)] ?? 0;
  if (keepFrom <= 0) return text;
  const dropped = lines.slice(0, keepFrom).join("\n");
  const rest = lines.slice(keepFrom).join("\n");
  const stub = `[truncated ${turns.length - keep} earlier turns · ~${estimateTokens(dropped)} tok]`;
  return `${stub}\n\n${rest}`;
}

export function keepFirstExamples(text: string, keep = 2): string {
  const lines = splitLines(text);
  const headings: number[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (EXAMPLE_RE.test(lines[i].trim())) headings.push(i);
  }
  if (headings.length < 3) return text;
  const cutFrom = headings[keep] ?? lines.length;
  const kept = lines.slice(0, cutFrom).join("\n").replace(/\s+$/, "");
  const dropped = lines.slice(cutFrom).join("\n");
  const stub = `[truncated ${headings.length - keep} extra examples · ~${estimateTokens(dropped)} tok]`;
  return `${kept}\n\n${stub}`;
}

export function stubBoilerplate(text: string): string {
  const paragraphs = text.split(/(\n{2,})/);
  let hits = 0;
  const next = paragraphs.map((part, index) => {
    if (index % 2 === 1) return part;
    if (!BOILER_RE.test(part)) return part;
    hits += 1;
    return "[license omitted]";
  });
  return hits ? next.join("") : text;
}

function applyKnownCuts(text: string, ids: Set<string>): string {
  let next = text;
  if (ids.has("json-blob") || ids.has("code-fence")) next = stubGiantFences(next);
  if (ids.has("trailing-logs")) next = stubTrailingLogs(next);
  if (ids.has("base64")) next = stubBase64(next);
  if (ids.has("dup-lines")) next = collapseDupLines(next);
  if (ids.has("dup-blocks")) next = collapseDupBlocks(next);
  if (ids.has("few-shot")) next = keepFirstExamples(next);
  if (ids.has("chat-log")) next = keepLastChatTurns(next);
  if (ids.has("boilerplate")) next = stubBoilerplate(next);
  if (ids.has("blank-runs")) next = collapseBlankRuns(next);
  return collapseBlankRuns(next).replace(/\s+$/g, "");
}

/** Mechanical, conservative draft. Never invents new instructions. */
export function conservativeTrim(text: string): string | null {
  if (!text.trim()) return null;
  const cuts = findCuts(text);
  if (!cuts.length) return null;
  const next = applyKnownCuts(text, new Set(cuts.map((cut) => cut.id)));
  if (!next || next.trim() === text.trim()) return null;
  if (estimateTokens(next) >= estimateTokens(text)) return null;
  return `${next}\n`;
}

export { isLogLine };
