import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SAMPLES } from "../data/samples.ts";
import { findCuts } from "./cuts.ts";

function ids(text: string): string[] {
  return findCuts(text).map((item) => item.id);
}

describe("findCuts", () => {
  it("returns nothing for a tight brief", () => {
    const sample = SAMPLES.find((item) => item.id === "tight-brief");
    assert.ok(sample);
    assert.equal(findCuts(sample.text).length, 0);
  });

  it("flags consecutive duplicate lines", () => {
    const line = "Keep one copy of this policy line.";
    const text = Array.from({ length: 8 }, () => line).join("\n");
    const cuts = findCuts(text);
    assert.ok(cuts.some((item) => item.id === "dup-lines"));
    assert.ok(cuts[0].tokens >= 8);
  });

  it("flags repeated paragraphs", () => {
    const block =
      "You are a bounded ops assistant. Restate the ask. Propose a plan. Stop for a human on mail or money.";
    const text = `${block}\n\n${block}\n\n${block}`;
    assert.ok(ids(text).includes("dup-blocks"));
  });

  it("flags base64 blobs", () => {
    const blob = "A".repeat(120);
    assert.ok(ids(`payload\n${blob}\n`).includes("base64"));
  });

  it("flags a JSON document", () => {
    const json = JSON.stringify({ rows: Array.from({ length: 40 }, (_, i) => ({ i, v: "pad-value" })) });
    assert.ok(ids(json).includes("json-blob"));
  });

  it("flags chat transcripts", () => {
    const turns = Array.from(
      { length: 8 },
      (_, i) => `User: please retry ${i}\nAssistant: dumping the whole payload for ${i} again.`,
    ).join("\n");
    assert.ok(ids(turns).includes("chat-log"));
  });

  it("flags few-shot piles", () => {
    const shots = Array.from(
      { length: 5 },
      (_, i) =>
        `Example ${i + 1}:\nUser: ticket ${i + 1}\nAssistant: Restate the ask. Propose three steps. Stop for a human.`,
    ).join("\n\n");
    assert.ok(ids(shots).includes("few-shot"));
  });

  it("flags trailing log suffixes", () => {
    const prose = "Ship the card. Approximate tokenizer.\n";
    const logs = Array.from(
      { length: 8 },
      (_, i) => `2026-09-17 12:0${i % 10}:00 DEBUG agent: line=${i} npm run build`,
    ).join("\n");
    assert.ok(ids(`${prose}\n${logs}\n`).includes("trailing-logs"));
  });

  it("flags license boilerplate", () => {
    const license = `MIT License

Copyright (c) 2026 Example Corp

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software.`;
    assert.ok(ids(license).includes("boilerplate"));
  });

  it("flags URL dumps", () => {
    const urls = Array.from({ length: 10 }, (_, i) => `https://example.com/item/${i}/debug.log`).join("\n");
    assert.ok(ids(urls).includes("url-dump"));
  });

  it("caps the list at six, largest first", () => {
    const sample = SAMPLES.find((item) => item.id === "payload-dump");
    assert.ok(sample);
    const cuts = findCuts(sample.text);
    assert.ok(cuts.length <= 6);
    for (let i = 1; i < cuts.length; i += 1) {
      assert.ok(cuts[i - 1].tokens >= cuts[i].tokens);
    }
  });

  it("hits the advertised heuristics on the noisy samples", () => {
    const few = SAMPLES.find((item) => item.id === "few-shot-echo");
    const session = SAMPLES.find((item) => item.id === "session-dump");
    const payload = SAMPLES.find((item) => item.id === "payload-dump");
    assert.ok(few && session && payload);
    const fewIds = ids(few.text);
    assert.ok(fewIds.includes("few-shot") || fewIds.includes("dup-blocks"), fewIds.join(","));
    const sessionIds = ids(session.text);
    assert.ok(sessionIds.includes("chat-log"), sessionIds.join(","));
    assert.ok(sessionIds.includes("json-blob"), sessionIds.join(","));
    assert.ok(sessionIds.includes("trailing-logs"), sessionIds.join(","));
    const payloadIds = ids(payload.text);
    assert.ok(payloadIds.includes("base64"), payloadIds.join(","));
    assert.ok(payloadIds.includes("boilerplate"), payloadIds.join(","));
  });
});
