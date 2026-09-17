import type { SampleMeta } from "../types.ts";

export const PASTE_PLACEHOLDER = `Paste a prompt, chat log, or context dump.

Tokens are chars ÷ 4 — approximate, not a tokenizer, not a billing meter.`;

function fillToChars(unit: string, chars: number): string {
  if (chars <= 0) return "";
  const block = unit.endsWith("\n") ? unit : `${unit}\n`;
  const times = Math.ceil(chars / block.length);
  return block.repeat(times).slice(0, chars);
}

function fewShotDump(chars: number): string {
  const intro =
    "You are a bounded ops assistant for SMF Works.\n\nUse the examples, then answer the latest ask.\n\n";
  const parts = [intro];
  let n = 1;
  let size = intro.length;
  while (size < chars) {
    const shot = `Example ${n}:\nUser: Summarize ticket ${n} and stay inside the gate.\nAssistant: Restate the ask. Propose three steps. Stop for a human on mail or money.\n\n`;
    parts.push(shot);
    size += shot.length;
    n += 1;
  }
  return parts.join("").slice(0, chars);
}

function sessionDump(chars: number): string {
  const rows = Array.from({ length: 24 }, (_, i) => ({
    id: i + 1,
    title: `row-${i + 1}`,
    notes: "unused debug field that should not be in the prompt",
  }));
  const json = JSON.stringify({ ok: true, count: rows.length, rows }, null, 2);
  const fence = `\n\`\`\`json\n${json}\n\`\`\`\n`;
  const intro = "System: You are a helpful assistant. Dump everything.\n\n";
  const turn =
    "User: Retry the last tool call and paste the full payload again.\nAssistant: Sure — here is the complete result, including fields nobody asked for.\n";
  const turns = fillToChars(turn, Math.max(0, chars - intro.length - fence.length));
  return `${intro}${turns}${fence}`.slice(0, chars);
}

function payloadDump(chars: number): string {
  const license = `MIT License

Copyright (c) 2026 Example Corp

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software.

`;
  const blob = `data:application/octet-stream;base64,${"A".repeat(120)}==\n`;
  const urls = Array.from(
    { length: 10 },
    (_, i) => `https://example.com/debug/trace/${i}/very/long/path/to/an/artifact.log`,
  ).join("\n");
  const rest = fillToChars(blob, Math.max(0, chars - license.length - urls.length - 2));
  return `${license}${rest}\n${urls}`.slice(0, chars);
}

export const SAMPLES: SampleMeta[] = [
  {
    id: "tight-brief",
    label: "Tight brief",
    blurb: "Bounded prompt · GREEN",
    expect: "GREEN",
    budgetId: "8k",
    text: `You are a bounded ops assistant for SMF Works.

Mission: triage inbound agent tasks and draft the next step.

Do:
- Restate the ask in one line.
- Propose a plan with 3–7 steps.
- Stop for a human on mail, money, or a public post.

Refuse:
- Do not send mail, move money, or publish without an explicit GO.
- Do not invent credentials or “I already did it.”

Success: a plan, a refuse, or a draft — never a silent side effect.`,
  },
  {
    id: "few-shot-echo",
    label: "Few-shot echo",
    blurb: "Repeated examples · YELLOW",
    expect: "YELLOW",
    budgetId: "8k",
    text: fewShotDump(24_000),
  },
  {
    id: "session-dump",
    label: "Session dump",
    blurb: "Chat log + JSON · RED",
    expect: "RED",
    budgetId: "8k",
    text: sessionDump(34_000),
  },
  {
    id: "payload-dump",
    label: "Payload dump",
    blurb: "Base64 + license · RED",
    expect: "RED",
    budgetId: "8k",
    text: payloadDump(36_000),
  },
];

export function sampleById(id: string | null | undefined): SampleMeta | undefined {
  if (!id) return undefined;
  return SAMPLES.find((item) => item.id === id);
}
