import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  budgetIdFromSource,
  countWords,
  estimateTokens,
  formatCount,
  formatPct,
  formatTokensCompact,
  slugify,
} from "./tokens.ts";

describe("countWords", () => {
  it("counts whitespace-separated tokens", () => {
    assert.equal(countWords(""), 0);
    assert.equal(countWords("  paste   less  "), 2);
    assert.equal(countWords("one\ntwo\nthree"), 3);
  });
});

describe("estimateTokens", () => {
  it("is chars / 4, rounded", () => {
    assert.equal(estimateTokens(""), 0);
    assert.equal(estimateTokens("abcd"), 1);
    assert.equal(estimateTokens("abcde"), 1);
    assert.equal(estimateTokens("abcdef"), 2);
    assert.equal(estimateTokens("a".repeat(8000)), 2000);
  });
});

describe("formatters", () => {
  it("formats counts with grouping", () => {
    assert.equal(formatCount(6412), "6,412");
    assert.equal(formatCount(-80), "−80");
  });

  it("compacts large token counts", () => {
    assert.equal(formatTokensCompact(412), "412");
    assert.equal(formatTokensCompact(8000), "8,000");
    assert.equal(formatTokensCompact(10_000), "10k");
    assert.equal(formatTokensCompact(32_000), "32k");
    assert.equal(formatTokensCompact(128_000), "128k");
    assert.equal(formatTokensCompact(1_200_000), "1.2M");
  });

  it("formats percents without noisy decimals", () => {
    assert.equal(formatPct(80), "80%");
    assert.equal(formatPct(80.04), "80%");
    assert.equal(formatPct(12.5), "12.5%");
  });
});

describe("budgetIdFromSource", () => {
  it("is deterministic and CB-prefixed", () => {
    const a = budgetIdFromSource("hello");
    const b = budgetIdFromSource("hello");
    assert.equal(a, b);
    assert.match(a, /^CB-[0-9A-F]{4}$/);
    assert.notEqual(budgetIdFromSource("hello"), budgetIdFromSource("hello!"));
  });
});

describe("slugify", () => {
  it("kebabs a label", () => {
    assert.equal(slugify("Context Budget 8k"), "context-budget-8k");
  });
});
