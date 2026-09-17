import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SAMPLES } from "../data/samples.ts";
import { analyzeContext } from "./budget.ts";
import { formatCompactStats, formatShareText, formatStampTime } from "./share.ts";

describe("formatCompactStats", () => {
  it("prints tokens, percent, and headroom", () => {
    const report = analyzeContext("a".repeat(8000), 8_000, "8k");
    assert.equal(formatCompactStats(report), "~2,000 tok · 25% of 8k · ~6,000 headroom");
  });

  it("prints over-budget as a deficit", () => {
    const report = analyzeContext("a".repeat(40_000), 8_000, "8k");
    assert.equal(formatCompactStats(report), "~10,000 tok · 125% of 8k · over by ~2,000");
  });
});

describe("formatShareText", () => {
  it("includes the band, disclaimer, and GitHub URL", () => {
    const sample = SAMPLES[0];
    const text = formatShareText(analyzeContext(sample.text, 8_000, "8k"));
    assert.match(text, /Context Budget/);
    assert.match(text, /Approximate · not a billing meter/);
    assert.match(text, /https:\/\/github.com\/smfworks\/context-budget/);
  });

  it("lists cuts for a noisy sample", () => {
    const sample = SAMPLES.find((item) => item.id === "session-dump");
    assert.ok(sample);
    const text = formatShareText(analyzeContext(sample.text, 8_000, "8k"));
    assert.match(text, /Cut:/);
    assert.match(text, /Chat transcript/);
  });
});

describe("formatStampTime", () => {
  it("prints a UTC stamp", () => {
    assert.equal(formatStampTime("2026-09-17T22:00:00Z"), "17 Sep 2026 · 22:00 UTC");
  });
});
