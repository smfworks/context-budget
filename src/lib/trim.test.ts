import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SAMPLES } from "../data/samples.ts";
import { findCuts, isLogLine } from "./cuts.ts";
import { conservativeTrim, collapseDupBlocks, stubGiantFences, stubTrailingLogs } from "./trim.ts";
import { estimateTokens } from "./tokens.ts";

describe("isLogLine", () => {
  it("flags timestamps, levels, stacks, and npm noise", () => {
    assert.equal(isLogLine("2026-09-17 12:01:03 INFO agent.runtime: step=1"), true);
    assert.equal(isLogLine("[12:01:03] DEBUG boot"), true);
    assert.equal(isLogLine("ERROR exploded"), true);
    assert.equal(isLogLine("    at Module._compile (node:internal/modules/cjs/loader:1521:14)"), true);
    assert.equal(isLogLine("npm ERR! code ELIFECYCLE"), true);
    assert.equal(isLogLine("console.log(\"dump\")"), true);
    assert.equal(isLogLine("You are a bounded ops assistant."), false);
  });
});

describe("conservativeTrim", () => {
  it("returns null when there is nothing to cut", () => {
    const sample = SAMPLES.find((item) => item.id === "tight-brief");
    assert.ok(sample);
    assert.equal(conservativeTrim(sample.text), null);
  });

  it("keeps the first duplicate paragraph", () => {
    const block =
      "You are a bounded ops assistant. Restate the ask. Propose a plan. Stop for a human on mail or money.";
    const other = "Middle paragraph stays because it is not a copy of the policy block.";
    const text = `${block}\n\n${other}\n\n${block}\n`;
    const trimmed = collapseDupBlocks(text);
    assert.equal([...trimmed.matchAll(/bounded ops assistant/g)].length, 1);
    assert.match(trimmed, /Middle paragraph stays/);
  });

  it("collapses a giant fence to a stub without removing the markers", () => {
    const body = Array.from({ length: 24 }, (_, i) => `line-${i}-${"pad".repeat(20)}`).join("\n");
    const text = `Keep me.\n\n\`\`\`text\n${body}\n\`\`\`\n\nAlso keep me.\n`;
    const trimmed = stubGiantFences(text);
    assert.match(trimmed, /Keep me/);
    assert.match(trimmed, /Also keep me/);
    assert.match(trimmed, /```text\n\[omitted 24 lines of text/);
    assert.ok(estimateTokens(trimmed) < estimateTokens(text));
  });

  it("replaces trailing logs with a truncation stub", () => {
    const prose = "The ask is to ship the card, not the build log.\n";
    const logs = Array.from(
      { length: 8 },
      (_, i) => `2026-09-17 13:0${i}:00 INFO build: step=${i}`,
    ).join("\n");
    const trimmed = stubTrailingLogs(`${prose}\n${logs}\n`);
    assert.match(trimmed, /ship the card/);
    assert.match(trimmed, /truncated 8 log lines/);
    assert.doesNotMatch(trimmed, /INFO build: step=7/);
  });

  it("does not invent new prose on a noisy sample", () => {
    const sample = SAMPLES.find((item) => item.id === "session-dump");
    assert.ok(sample);
    const trimmed = conservativeTrim(sample.text);
    assert.ok(trimmed);
    assert.ok(estimateTokens(trimmed) < estimateTokens(sample.text));
    assert.doesNotMatch(trimmed, /TODO|rewrite as a helpful assistant/i);
    assert.match(trimmed, /truncated|omitted/i);
  });
});

describe("trailing logs on the transcript sample", () => {
  it("flags trailing-logs on the session dump", () => {
    const sample = SAMPLES.find((item) => item.id === "session-dump");
    assert.ok(sample);
    assert.ok(findCuts(sample.text).some((item) => item.id === "trailing-logs"));
  });
});
