import { describe, expect, it } from "vitest";
import {
  chunk,
  formatAccounting,
  formatCurrency,
  getDisplayColor,
  getTotalBalance,
  toNumber,
} from "./format";

describe("formatCurrency", () => {
  it("formats positive USD", () => {
    expect(formatCurrency("1234.56", "USD")).toBe("$ 1,234.56");
  });

  it("formats negative USD with leading minus", () => {
    expect(formatCurrency("-99.5", "USD")).toBe("-$ 99.50");
  });

  it("formats positive KRW without decimals", () => {
    expect(formatCurrency("50000", "KRW")).toBe("₩ 50,000");
  });

  it("formats negative KRW", () => {
    expect(formatCurrency("-12345", "KRW")).toBe("-₩ 12,345");
  });

  it("returns zero string for null", () => {
    expect(formatCurrency(null, "USD")).toBe("$ 0.00");
    expect(formatCurrency(null, "KRW")).toBe("₩ 0");
  });

  it("returns zero string for empty string", () => {
    expect(formatCurrency("", "USD")).toBe("$ 0.00");
  });

  it("handles numeric input", () => {
    expect(formatCurrency(100, "USD")).toBe("$ 100.00");
  });
});

describe("formatAccounting", () => {
  it("returns em dash for zero", () => {
    expect(formatAccounting("0", "USD")).toBe("—");
  });

  it("wraps negatives in parens", () => {
    expect(formatAccounting("-50", "USD")).toBe("($ 50.00)");
  });

  it("formats positives normally", () => {
    expect(formatAccounting("200", "KRW")).toBe("₩ 200");
  });
});

describe("getDisplayColor", () => {
  it("returns red for negative", () => {
    expect(getDisplayColor("-100")).toBe("text-red-600");
  });

  it("returns muted for zero", () => {
    expect(getDisplayColor("0")).toBe("text-muted-foreground");
    expect(getDisplayColor(0)).toBe("text-muted-foreground");
  });

  it("returns foreground for positive", () => {
    expect(getDisplayColor("500")).toBe("text-foreground");
    expect(getDisplayColor(1)).toBe("text-foreground");
  });

  it("handles null as zero", () => {
    expect(getDisplayColor(null)).toBe("text-muted-foreground");
  });
});

describe("toNumber", () => {
  it("converts string to number", () => {
    expect(toNumber("3.14")).toBeCloseTo(3.14);
  });

  it("returns 0 for null/undefined", () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
  });

  it("returns 0 for invalid string", () => {
    expect(toNumber("abc")).toBe(0);
  });
});

describe("getTotalBalance", () => {
  const banks = [
    { node: { balance: [{ currency: "KRW", value: "10000" }, { currency: "USD", value: "50" }] } },
    { node: { balance: [{ currency: "KRW", value: "5000" }, { currency: "USD", value: "25.5" }] } },
  ];

  it("sums KRW across all banks", () => {
    expect(getTotalBalance(banks, "KRW")).toBe("15000");
  });

  it("sums USD across all banks", () => {
    expect(getTotalBalance(banks, "USD")).toBe("75.5");
  });

  it("returns 0 for unknown currency", () => {
    expect(getTotalBalance(banks, "EUR")).toBe("0");
  });
});

describe("chunk", () => {
  it("splits array into chunks of given size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns single chunk when size >= length", () => {
    expect(chunk([1, 2], 10)).toEqual([[1, 2]]);
  });

  it("returns empty array for empty input", () => {
    expect(chunk([], 3)).toEqual([]);
  });
});
