import { Decimal } from "decimal.js";

/**
 * Format a numeric value as a currency string.
 */
export function formatCurrency(amount: string | number | null | undefined, currency: string): string {
  const sign = currency === "USD" ? "$" : "₩";
  const digits = currency === "USD" ? 2 : 0;

  if (amount == null || amount === "") {
    return `${sign} 0${digits > 0 ? `.${  "0".repeat(digits)}` : ""}`;
  }

  const decimal = new Decimal(amount);

  const formatted = decimal
    .abs()
    .toNumber()
    .toLocaleString("ko-KR", { minimumFractionDigits: digits });

  if (decimal.isNegative()) {
    return `-${sign} ${formatted}`;
  }
  return `${sign} ${formatted}`;
}

/**
 * Format as accounting style: negatives in parentheses, zero as em dash.
 */
export function formatAccounting(amount: string | number | null | undefined, currency: string): string {
  const decimal = new Decimal(amount ?? 0);
  if (decimal.isZero()) return "—";

  const formatted = formatCurrency(decimal.abs().toString(), currency);
  return decimal.isNegative() ? `(${formatted})` : formatted;
}

/**
 * Format as accounting style in USD.
 */
export function formatAccountingUSD(amount: string | number | null | undefined): string {
  return formatAccounting(amount, "USD");
}

/**
 * Get a Tailwind color class based on value sign.
 */
export function getDisplayColor(value: string | number | null | undefined): string {
  const decimal = new Decimal(value ?? 0);
  if (decimal.isNegative()) return "text-red-600";
  if (decimal.isZero()) return "text-muted-foreground";
  return "text-foreground";
}

/**
 * Sum bank balances for a specific currency.
 */
export function getTotalBalance(
  bankList: ReadonlyArray<{
    node: { balance: ReadonlyArray<{ currency: string; value: string }> };
  }>,
  currency: string,
): string {
  let sum = new Decimal(0);
  for (const bank of bankList) {
    for (const b of bank.node.balance) {
      if (b.currency === currency) {
        sum = sum.plus(new Decimal(b.value));
      }
    }
  }
  return sum.toString();
}

/**
 * Safely convert a value to a number.
 */
export function toNumber(value: string | number | null | undefined): number {
  try {
    return new Decimal(value ?? 0).toNumber();
  } catch {
    return 0;
  }
}

// ─── Date formatting ──────────────────────────────────────────────────────────
//
// Rule: whenever you display a date string (YYYY-MM-DD) from the backend,
// use formatDate(). It omits the year when it's the current year so the UI
// stays compact while still being unambiguous for older data.
//
// ✓  {formatDate(tx.date)}
// ✓  {formatDate(account.lastTransaction)}
// ✗  {tx.date}  ← raw string, always shows full year even when redundant

/**
 * Format a `YYYY-MM-DD` date string for display.
 * - Same year as today  →  `MM-DD`          e.g. "05-10"
 * - Different year      →  `YYYY-MM-DD`     e.g. "2024-01-01"
 * - null / undefined    →  `"—"`
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const currentYear = new Date().getFullYear();
  const year = Number(dateStr.slice(0, 4));
  return year === currentYear ? dateStr.slice(5) : dateStr;
}

/**
 * Split an array into chunks.
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}
