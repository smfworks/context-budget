import type { Cut, Severity } from "../types.ts";

const MIN_CUT_TOKENS = 8;
const MAX_CUTS = 6;

function tokensFromChars(chars: number): number {
  if (chars <= 0) return 0;
  return Math.round(chars / 4);
}

const TURN_RE = /^(?:user|assistant|human|system|ai|tool|model)\s*[:\]>]/i;
const EXAMPLE_RE = /^(?:example(?:\s+\d+)?|few[-\s]?shot|shot\s+\d+)\s*:/i;
const STACK_RE = /^\s*(?:at\s+\S+|file\s+".+",\s+line\s+\d+|traceback\s*\(most recent)/i;
const LOG_PATTERNS: RegExp[] = [
  /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/,
  /^\[\d{2}:\d{2}(:\d{2})?(?:\.\d+)?\]/,
  /^\d{2}:\d{2}:\d{2}(?:\.\d+)?\b/,
  /^\[?(INFO|DEBUG|WARN|WARNING|ERROR|FATAL|TRACE|LOG)\]?(?:[:\s]|$)/i,
  /^(INFO|DEBUG|WARN|WARNING|ERROR|FATAL|TRACE)\s+\S/,
  /^npm (ERR!|WARN)/,
  /^console\.(log|info|debug|warn|error)\b/,
  /^(stdout|stderr)\s*\|/,
];
const LOG_MIN_LINES = 6;
const URL_RE = /https?:\/\/[^\s)]+/gi;
const BASE64_LINE_RE = /^(?:data:[^;]+;base64,)?[A-Za-z0-9+/]{80,}={0,2}$/;
const BASE64_TOKEN_RE = /(?:data:[^;]+;base64,)?[A-Za-z0-9+/]{80,}={0,2}/g;
const BOILER_RE =
  /(?:copyright\s+\(c\)|all rights reserved|mit license|apache license|gnu general public license|licen[cs]ed under)/i;

function severityFromTokens(tokens: number): Severity {
  if (tokens >= 2_000) return "error";
  if (tokens >= 400) return "warn";
  return "info";
}

function cut(
  id: string,
  title: string,
  tokens: number,
  detail: string,
  hint: string,
): Cut | null {
  if (tokens < MIN_CUT_TOKENS) return null;
  return { id, title, tokens, detail, hint, severity: severityFromTokens(tokens) };
}

function splitLines(text: string): string[] {
  if (!text) return [];
  return text.split(/\r?\n/);
}

export function isLogLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (STACK_RE.test(trimmed)) return true;
  return LOG_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function trailingLogRange(text: string): { startLine: number; logCount: number } | null {
  const lines = splitLines(text);
  if (lines.length === 0) return null;
  let end = lines.length - 1;
  while (end >= 0 && lines[end].trim() === "") end -= 1;
  if (end < 0) return null;

  let cursor = end;
  let logCount = 0;
  while (cursor >= 0) {
    const line = lines[cursor];
    if (line.trim() === "") {
      cursor -= 1;
      continue;
    }
    if (!isLogLine(line)) break;
    logCount += 1;
    cursor -= 1;
  }
  if (logCount < LOG_MIN_LINES) return null;

  let startLine = cursor + 1;
  while (startLine <= end && lines[startLine].trim() === "") startLine += 1;

  const keepFloor = Math.max(8, Math.floor(lines.length * 0.15));
  if (startLine === 0 && lines.length > keepFloor) {
    startLine = lines.length - keepFloor;
  }
  return { startLine, logCount };
}

function dupLines(text: string): Cut | null {
  const lines = splitLines(text);
  let extraChars = 0;
  let extras = 0;
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.length > 0 && line === lines[i - 1]) {
      extras += 1;
      extraChars += line.length + 1;
    }
  }
  if (extras < 3) return null;
  return cut(
    "dup-lines",
    "Repeated lines",
    tokensFromChars(extraChars),
    `${extras} consecutive duplicate line${extras === 1 ? "" : "s"}.`,
    "Collapse consecutive copies. Keep one.",
  );
}

function dupBlocks(text: string): Cut | null {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 80);
  const counts = new Map<string, number>();
  for (const paragraph of paragraphs) {
    counts.set(paragraph, (counts.get(paragraph) ?? 0) + 1);
  }
  let saved = 0;
  let copies = 0;
  for (const [paragraph, count] of counts) {
    if (count < 2) continue;
    copies += count - 1;
    saved += tokensFromChars(paragraph.length) * (count - 1);
  }
  if (copies < 1 || saved < MIN_CUT_TOKENS) return null;
  return cut(
    "dup-blocks",
    "Duplicate blocks",
    saved,
    `${copies} repeated paragraph${copies === 1 ? "" : "s"}.`,
    "Keep one copy of each block. Point at the rest.",
  );
}

function base64Cuts(text: string): Cut | null {
  let chars = 0;
  let hits = 0;
  for (const line of splitLines(text)) {
    const trimmed = line.trim();
    if (BASE64_LINE_RE.test(trimmed)) {
      hits += 1;
      chars += trimmed.length;
    }
  }
  if (!hits) {
    const tokens = text.match(BASE64_TOKEN_RE) ?? [];
    for (const token of tokens) {
      hits += 1;
      chars += token.length;
    }
  }
  if (!hits) return null;
  return cut(
    "base64",
    "Binary / base64",
    tokensFromChars(chars),
    `${hits} high-entropy blob${hits === 1 ? "" : "s"}.`,
    "Drop encoded payloads. Link a file instead of inlining bytes.",
  );
}

function fenceCuts(text: string): Cut[] {
  const cuts: Cut[] = [];
  const fenceRe = /```([\w-]+)?\n([\s\S]*?)```/g;
  let jsonChars = 0;
  let jsonBlocks = 0;
  let codeChars = 0;
  let codeBlocks = 0;
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(text)) !== null) {
    const lang = (match[1] ?? "").toLowerCase();
    const body = match[2] ?? "";
    if (body.length < 400) continue;
    if (lang === "json" || looksLikeJson(body)) {
      jsonBlocks += 1;
      jsonChars += body.length;
    } else if (body.length >= 800) {
      codeBlocks += 1;
      codeChars += body.length;
    }
  }
  const jsonCut = cut(
    "json-blob",
    "JSON dump",
    tokensFromChars(jsonChars),
    `${jsonBlocks} large JSON block${jsonBlocks === 1 ? "" : "s"}.`,
    "Summarize the payload. Keep keys, drop the full dump.",
  );
  if (jsonCut && jsonBlocks) cuts.push(jsonCut);
  const codeCut = cut(
    "code-fence",
    "Oversized code",
    tokensFromChars(codeChars),
    `${codeBlocks} large fenced block${codeBlocks === 1 ? "" : "s"}.`,
    "Cite a path or the failing slice — not the whole file.",
  );
  if (codeCut && codeBlocks) cuts.push(codeCut);
  return cuts;
}

function looksLikeJson(body: string): boolean {
  const trimmed = body.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return false;
  if (trimmed.length < 400) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

function looseJson(text: string): Cut | null {
  const trimmed = text.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return null;
  if (trimmed.length < 400) return null;
  try {
    JSON.parse(trimmed);
  } catch {
    return null;
  }
  return cut(
    "json-blob",
    "JSON dump",
    tokensFromChars(trimmed.length),
    "The paste is a large JSON document.",
    "Summarize the payload. Keep keys, drop the full dump.",
  );
}

function chatLog(text: string): Cut | null {
  const lines = splitLines(text);
  const turns: number[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (TURN_RE.test(lines[i].trim())) turns.push(i);
  }
  if (turns.length < 6) return null;
  const keepFrom = turns[Math.max(0, turns.length - 4)] ?? 0;
  const dropped = lines.slice(0, keepFrom).join("\n");
  return cut(
    "chat-log",
    "Chat transcript",
    tokensFromChars(dropped.length),
    `${turns.length} speaker turns. Older history dominates.`,
    "Keep the last few turns plus a one-line recap.",
  );
}

function fewShot(text: string): Cut | null {
  const lines = splitLines(text);
  const headings: number[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (EXAMPLE_RE.test(lines[i].trim())) headings.push(i);
  }
  if (headings.length < 3) return null;
  const first = headings[0] ?? 0;
  const keepEnd = headings[1] ?? lines.length;
  const kept = lines.slice(first, keepEnd).join("\n");
  const extras = Math.max(0, text.length - kept.length);
  return cut(
    "few-shot",
    "Few-shot pile-up",
    tokensFromChars(extras),
    `${headings.length} example blocks.`,
    "Two sharp examples beat a dozen copies.",
  );
}

function boilerplate(text: string): Cut | null {
  if (!BOILER_RE.test(text)) return null;
  const paragraphs = text.split(/\n{2,}/);
  let chars = 0;
  let hits = 0;
  for (const paragraph of paragraphs) {
    if (!BOILER_RE.test(paragraph) && !/permission is hereby granted/i.test(paragraph)) continue;
    hits += 1;
    chars += paragraph.length;
  }
  if (!hits) chars = Math.min(text.length, 1_200);
  return cut(
    "boilerplate",
    "License / boilerplate",
    tokensFromChars(chars),
    "Legal or license text is sitting in the window.",
    "Link the license. Don’t paste it into the prompt.",
  );
}

function urlDump(text: string): Cut | null {
  const urls = text.match(URL_RE) ?? [];
  if (urls.length < 8) return null;
  const chars = urls.reduce((sum, url) => sum + url.length, 0);
  return cut(
    "url-dump",
    "URL dump",
    tokensFromChars(chars),
    `${urls.length} URLs inline.`,
    "Keep the one or two that matter. Cite the rest.",
  );
}

function stackTrace(text: string): Cut | null {
  const frames = splitLines(text).filter((line) => STACK_RE.test(line));
  if (frames.length < 6) return null;
  const chars = frames.reduce((sum, line) => sum + line.length + 1, 0);
  return cut(
    "stack-trace",
    "Stack trace",
    tokensFromChars(chars),
    `${frames.length} stack frames.`,
    "Keep the error + top frames. Drop vendor noise.",
  );
}

function trailingLogs(text: string): Cut | null {
  const range = trailingLogRange(text);
  if (!range) return null;
  const lines = splitLines(text);
  const body = lines.slice(range.startLine).join("\n");
  return cut(
    "trailing-logs",
    "Trailing logs",
    tokensFromChars(body.length),
    `${range.logCount} log-looking lines at the end.`,
    "Drop the suffix (build output, stack traces, timestamps). Keep the prose above.",
  );
}

function blankRuns(text: string): Cut | null {
  const matches = text.match(/\n{4,}/g) ?? [];
  if (!matches.length) return null;
  const extra = matches.reduce((sum, run) => sum + Math.max(0, run.length - 2), 0);
  return cut(
    "blank-runs",
    "Whitespace runs",
    tokensFromChars(extra),
    "Long blank stretches with no content.",
    "Collapse empty lines. They still cost context.",
  );
}

export function findCuts(text: string): Cut[] {
  if (!text.trim()) return [];
  const found: Cut[] = [];
  const push = (item: Cut | null) => {
    if (item) found.push(item);
  };

  push(dupLines(text));
  push(dupBlocks(text));
  push(base64Cuts(text));
  push(chatLog(text));
  push(fewShot(text));
  push(boilerplate(text));
  push(urlDump(text));
  push(stackTrace(text));
  push(trailingLogs(text));
  push(blankRuns(text));

  const fences = fenceCuts(text);
  found.push(...fences);
  if (!fences.some((item) => item.id === "json-blob")) {
    push(looseJson(text));
  }

  const byId = new Map<string, Cut>();
  for (const item of found) {
    const prev = byId.get(item.id);
    if (!prev || item.tokens > prev.tokens) byId.set(item.id, item);
  }

  return [...byId.values()].sort((a, b) => b.tokens - a.tokens).slice(0, MAX_CUTS);
}
