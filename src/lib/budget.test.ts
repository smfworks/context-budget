import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SAMPLES, sampleById } from "../data/samples.ts";
import {
  analyzeContext,
  bandFromPct,
  barWidthPct,
  BUDGET_PRESETS,
  parseBudgetInput,
} from "./budget.ts";
import { estimateTokens } from "./tokens.ts";

describe("bandFromPct", () => {
  it("uses 70 / 90 cutoffs", () => {
    assert.equal(bandFromPct(0), "GREEN");
    assert.equal(bandFromPct(69.9), "GREEN");
    assert.equal(bandFromPct(70), "YELLOW");
    assert.equal(bandFromPct(89.9), "YELLOW");
    assert.equal(bandFromPct(90), "RED");
    assert.equal(bandFromPct(140), "RED");
  });
});

describe("parseBudgetInput", () => {
  it("accepts presets and custom magnitudes", () => {
    assert.equal(parseBudgetInput("8k"), 8_000);
    assert.equal(parseBudgetInput("32k"), 32_000);
    assert.equal(parseBudgetInput("128000"), 128_000);
    assert.equal(parseBudgetInput("200k"), 200_000);
    assert.equal(parseBudgetInput("64k"), 64_000);
    assert.equal(parseBudgetInput("1.5k"), 1_500);
    assert.equal(parseBudgetInput("2m"), 2_000_000);
  });

  it("rejects junk and out-of-range values", () => {
    assert.equal(parseBudgetInput(""), null);
    assert.equal(parseBudgetInput("abc"), null);
    assert.equal(parseBudgetInput("99"), null);
    assert.equal(parseBudgetInput("9m"), null);
  });
});

describe("analyzeContext", () => {
  it("reports live tokens, percent, and headroom", () => {
    const text = "a".repeat(8000);
    const report = analyzeContext(text, 8_000, "8k", new Date("2026-09-17T22:00:00Z"));
    assert.equal(report.tokens, 2000);
    assert.equal(report.chars, 8000);
    assert.equal(report.words, 1);
    assert.equal(report.pct, 25);
    assert.equal(report.headroom, 6000);
    assert.equal(report.band, "GREEN");
    assert.equal(report.heuristic, true);
    assert.match(report.summary, /2,000 tok/);
  });

  it("caps the bar at 100 while pct can exceed it", () => {
    const text = "a".repeat(40_000);
    const report = analyzeContext(text, 8_000, "8k");
    assert.equal(report.tokens, 10_000);
    assert.equal(report.pct, 125);
    assert.equal(report.headroom, -2_000);
    assert.equal(report.band, "RED");
    assert.equal(barWidthPct(report.pct), 100);
    assert.match(report.summary, /Over budget/);
  });

  it("is empty-safe", () => {
    const report = analyzeContext("   ", 8_000, "8k");
    assert.equal(report.empty, true);
    assert.equal(report.tokens, 0);
    assert.equal(report.words, 0);
    assert.equal(report.pct, 0);
    assert.equal(report.cuts.length, 0);
    assert.equal(report.trimmed, null);
  });

  it("ships the four public budgets", () => {
    assert.deepEqual(
      BUDGET_PRESETS.map((item) => [item.id, item.tokens]),
      [
        ["8k", 8_000],
        ["32k", 32_000],
        ["128k", 128_000],
        ["200k", 200_000],
      ],
    );
  });
});

describe("samples", () => {
  it("lands each sample on the advertised band against 8k", () => {
    for (const sample of SAMPLES) {
      const report = analyzeContext(sample.text, 8_000, sample.budgetId);
      assert.equal(report.band, sample.expect, `${sample.id} expected ${sample.expect}, got ${report.band} (${report.pct}%)`);
      assert.equal(report.empty, false);
      assert.equal(estimateTokens(sample.text), report.tokens);
    }
  });

  it("ships a conservative trim on noisy samples", () => {
    const sample = SAMPLES.find((item) => item.id === "session-dump");
    assert.ok(sample);
    const report = analyzeContext(sample.text, 8_000, "8k");
    assert.ok(report.trimmed);
    assert.ok(report.trimmedTokens != null && report.trimmedTokens < report.tokens);
  });

  it("exposes four samples by id", () => {
    assert.equal(SAMPLES.length, 4);
    assert.ok(sampleById("tight-brief"));
    assert.ok(sampleById("few-shot-echo"));
    assert.ok(sampleById("session-dump"));
    assert.ok(sampleById("payload-dump"));
  });
});
