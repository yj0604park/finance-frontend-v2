import { differenceInDays, parseISO } from "date-fns";
import { AlertTriangle, CheckCircle2, ClipboardPaste, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionCategory, useCreateTransactionFullMutation } from "@/graphql/generated/graphql";
import { CATEGORY_LABELS } from "@/lib/constants";
import { AmountInput } from "./amount-input";
import { DateInput } from "./date-input";
import { RetailerCombobox } from "./retailer-combobox";

const MONTH_MAP: Record<string, string> = {
  January: "01",
  February: "02",
  March: "03",
  April: "04",
  May: "05",
  June: "06",
  July: "07",
  August: "08",
  September: "09",
  October: "10",
  November: "11",
  December: "12",
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

function isDateLine(s: string) {
  return (
    s === "Pending" || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s) || /^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(s)
  );
}

function isAmountLine(s: string) {
  // handles "−$15.00negative …", "$2,500.00", "-$15.00"
  return /^[−-]?\$[\d,]+(\.\d+)?/.test(s);
}

function toISODate(s: string, fallback: string): string {
  if (s === "Pending") return fallback;
  const mmdd = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmdd) return `${mmdd[3]}-${mmdd[1].padStart(2, "0")}-${mmdd[2].padStart(2, "0")}`;
  const mdy = s.match(/^([A-Za-z]+) (\d{1,2}), (\d{4})$/);
  if (mdy && MONTH_MAP[mdy[1]]) return `${mdy[3]}-${MONTH_MAP[mdy[1]]}-${mdy[2].padStart(2, "0")}`;
  return fallback;
}

function parseAmount(s: string): string {
  // U+2212 minus or ASCII hyphen
  const isNeg = s.startsWith("−") || s.startsWith("-");
  const match = s.match(/([\d,]+\.?\d*)/);
  if (!match) return "";
  const num = parseFloat(match[1].replace(/,/g, ""));
  return isNeg ? String(-num) : String(num);
}

function parseStatementText(
  text: string,
  defaultDate: string,
): Pick<TransactionRow, "date" | "note" | "amount">[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const results: Pick<TransactionRow, "date" | "note" | "amount">[] = [];
  let i = 0;

  while (i < lines.length) {
    if (!isDateLine(lines[i])) {
      i++;
      continue;
    }

    const date = toISODate(lines[i], defaultDate);
    i++;

    // Collect chunk until amount or next date
    const chunk: string[] = [];
    while (i < lines.length && !isAmountLine(lines[i]) && !isDateLine(lines[i])) {
      chunk.push(lines[i]);
      i++;
    }
    if (i >= lines.length || !isAmountLine(lines[i])) continue;

    const amount = parseAmount(lines[i]);
    i++; // skip amount
    // skip balance line ("—" or amount-like)
    if (i < lines.length && (lines[i] === "—" || isAmountLine(lines[i]))) i++;

    // Description is chunk[0]; it often repeats at chunk[1] — dedupe
    const desc = chunk[0] ?? "";
    if (!amount) continue;
    results.push({ date, note: desc, amount });
  }

  return results;
}

interface BulkTransactionFormProps {
  accountId: string;
  currency: string;
  defaultDate: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface TransactionRow {
  id: string;
  date: string;
  amount: string;
  type: TransactionCategory | "";
  retailerId: string | null;
  retailerName: string;
  retailerCategory: string;
  note: string;
  isInternal: boolean;
  typeManuallySet: boolean;
  status: "pending" | "success" | "error";
  errorMessage: string;
}

const EXPENSE_TYPES = new Set<TransactionCategory>([
  TransactionCategory.EatOut,
  TransactionCategory.Grocery,
  TransactionCategory.Clothing,
  TransactionCategory.Transportation,
  TransactionCategory.Medical,
  TransactionCategory.Leisure,
  TransactionCategory.Service,
  TransactionCategory.Membership,
  TransactionCategory.Housing,
  TransactionCategory.DailyNecessity,
]);

const RETAILER_NOT_REQUIRED_TYPES = new Set<TransactionCategory>([
  TransactionCategory.Transfer,
  TransactionCategory.Cash,
  TransactionCategory.Income,
  TransactionCategory.Stock,
]);

function makeRow(date: string): TransactionRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date,
    amount: "",
    type: "",
    retailerId: null,
    retailerName: "",
    retailerCategory: "",
    note: "",
    isInternal: false,
    typeManuallySet: false,
    status: "pending",
    errorMessage: "",
  };
}

function staleness(dateStr: string): { days: number; level: "none" | "warn" | "danger" } | null {
  try {
    const d = parseISO(dateStr);
    const days = differenceInDays(new Date(), d);
    if (days > 90) return { days, level: "danger" };
    if (days > 30) return { days, level: "warn" };
    return null;
  } catch {
    return null;
  }
}

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value: value as TransactionCategory,
  label,
}));

export function BulkTransactionForm({
  accountId,
  defaultDate,
  onSuccess,
  onCancel,
}: BulkTransactionFormProps) {
  const [rows, setRows] = useState<TransactionRow[]>([makeRow(defaultDate)]);
  const [submitting, setSubmitting] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [flipSign, setFlipSign] = useState(false);

  const [createTransaction] = useCreateTransactionFullMutation();

  const updateRow = useCallback((id: string, patch: Partial<TransactionRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  function applyPaste() {
    const parsed = parseStatementText(pasteText, defaultDate);
    if (parsed.length === 0) return;
    const newRows = parsed.map((p) => {
      const amount = flipSign && p.amount ? String(-parseFloat(p.amount)) : p.amount;
      return { ...makeRow(p.date), note: p.note, amount };
    });
    setRows((prev) => {
      const hasEmpty = prev.length === 1 && !prev[0].amount && !prev[0].note;
      return hasEmpty ? newRows : [...prev, ...newRows];
    });
    setPasteText("");
    setShowPaste(false);
  }

  const addRow = useCallback(() => {
    const lastDate = rows.length > 0 ? rows[rows.length - 1].date : defaultDate;
    setRows((prev) => [...prev, makeRow(lastDate)]);
  }, [defaultDate, rows]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "+" && e.key !== "=") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      addRow();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addRow]);

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function handleRetailerChange(
    rowId: string,
    retailer: { id: string; name: string; category: string } | null,
    currentTypeManuallySet: boolean,
  ) {
    if (!retailer) {
      updateRow(rowId, { retailerId: null, retailerName: "", retailerCategory: "" });
      return;
    }
    const patch: Partial<TransactionRow> = {
      retailerId: retailer.id,
      retailerName: retailer.name,
      retailerCategory: retailer.category,
    };
    if (!currentTypeManuallySet && retailer.category) {
      patch.type = retailer.category as TransactionCategory;
    }
    updateRow(rowId, patch);
  }

  function handleInternalChange(rowId: string, checked: boolean) {
    if (checked) {
      updateRow(rowId, {
        isInternal: true,
        type: TransactionCategory.Transfer,
        retailerId: null,
        retailerName: "",
        retailerCategory: "",
        typeManuallySet: false,
      });
    } else {
      updateRow(rowId, {
        isInternal: false,
        type: "",
        typeManuallySet: false,
      });
    }
  }

  async function handleSubmit() {
    const pending = rows.filter((r) => r.status !== "success");

    // Mark all invalid rows first, then bail if any found
    const invalidIds = new Set(pending.filter((r) => !r.amount || !r.date).map((r) => r.id));
    if (invalidIds.size > 0) {
      setRows((prev) =>
        prev.map((r) =>
          invalidIds.has(r.id)
            ? { ...r, status: "error", errorMessage: "날짜와 금액을 입력하세요." }
            : r,
        ),
      );
      return;
    }

    setSubmitting(true);

    const results = await Promise.allSettled(
      pending.map(async (row) => {
        const result = await createTransaction({
          variables: {
            amount: row.amount,
            date: row.date,
            accountId,
            type: row.type ? (row.type as TransactionCategory) : null,
            retailerId: row.retailerId ?? null,
            isInternal: row.isInternal,
            note: row.note || null,
          },
        });
        return { rowId: row.id, result };
      }),
    );

    setRows((prev) => {
      const next = [...prev];
      results.forEach((settled, i) => {
        const rowId = pending[i].id;
        const idx = next.findIndex((r) => r.id === rowId);
        if (idx === -1) return;
        if (settled.status === "fulfilled") {
          next[idx] = { ...next[idx], status: "success", errorMessage: "" };
        } else {
          const msg =
            settled.reason instanceof Error ? settled.reason.message : "오류가 발생했습니다.";
          next[idx] = { ...next[idx], status: "error", errorMessage: msg };
        }
      });
      return next;
    });

    setSubmitting(false);

    const allSucceeded = results.every((r) => r.status === "fulfilled");
    if (allSucceeded) {
      onSuccess();
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">거래 일괄 입력</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPaste((v) => !v)}
          className="gap-1.5 text-xs"
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          붙여넣기로 입력
        </Button>
      </div>
      {showPaste && (
        <div className="mb-3 rounded-md border bg-muted/30 p-3">
          <p className="mb-1.5 text-xs text-muted-foreground">
            은행 내역 페이지에서 거래 목록을 복사해서 붙여넣으세요.
          </p>
          <textarea
            className="h-32 w-full rounded-md border bg-background px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="거래 내역 텍스트 붙여넣기..."
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <div className="mt-2 flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={flipSign}
                onChange={(e) => setFlipSign(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              신용카드 내역 (금액 부호 반전)
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPaste(false);
                  setPasteText("");
                }}
              >
                취소
              </Button>
              <Button type="button" size="sm" onClick={applyPaste} disabled={!pasteText.trim()}>
                적용
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-2 font-medium">날짜</th>
              <th className="pb-2 pr-2 font-medium">금액</th>
              <th className="pb-2 pr-2 font-medium">내부이체</th>
              <th className="pb-2 pr-2 font-medium">가맹점</th>
              <th className="pb-2 pr-2 font-medium">유형</th>
              <th className="pb-2 pr-2 font-medium">메모</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const stale = staleness(row.date);
              const amountNum = parseFloat(row.amount);
              const showExpenseWarn =
                row.type &&
                EXPENSE_TYPES.has(row.type as TransactionCategory) &&
                !isNaN(amountNum) &&
                amountNum > 0;
              const showIncomeWarn =
                row.type === TransactionCategory.Income && !isNaN(amountNum) && amountNum < 0;
              const showRetailerWarn =
                !row.retailerId &&
                !row.isInternal &&
                row.type !== "" &&
                !RETAILER_NOT_REQUIRED_TYPES.has(row.type as TransactionCategory);
              const showStockWarn = row.type === TransactionCategory.Stock;

              return (
                <tr
                  key={row.id}
                  className={`border-b last:border-0 ${row.status === "success" ? "opacity-50" : ""}`}
                >
                  <td className="py-2 pr-2 align-top">
                    <DateInput
                      value={row.date}
                      onChange={(d) => updateRow(row.id, { date: d })}
                      disabled={row.status === "success"}
                    />
                    {stale && (
                      <p
                        className={`mt-0.5 text-xs ${stale.level === "danger" ? "text-red-600" : "text-orange-500"}`}
                      >
                        {stale.days}일 전
                      </p>
                    )}
                  </td>
                  <td className="py-2 pr-2 align-top">
                    <AmountInput
                      value={row.amount}
                      onChange={(v) => updateRow(row.id, { amount: v })}
                      disabled={row.status === "success"}
                    />
                    {showExpenseWarn && (
                      <p className="mt-0.5 flex items-center gap-0.5 text-xs text-orange-500">
                        <AlertTriangle className="h-3 w-3" />
                        지출인데 양수
                      </p>
                    )}
                    {showIncomeWarn && (
                      <p className="mt-0.5 flex items-center gap-0.5 text-xs text-orange-500">
                        <AlertTriangle className="h-3 w-3" />
                        수입인데 음수
                      </p>
                    )}
                  </td>
                  <td className="py-2 pr-2 align-top">
                    <div className="flex h-8 items-center">
                      <input
                        type="checkbox"
                        checked={row.isInternal}
                        onChange={(e) => handleInternalChange(row.id, e.target.checked)}
                        className="h-4 w-4 cursor-pointer rounded border-input"
                        disabled={row.status === "success"}
                      />
                    </div>
                  </td>
                  <td className="py-2 pr-2 align-top">
                    <RetailerCombobox
                      value={row.retailerId}
                      onChange={(r) => handleRetailerChange(row.id, r, row.typeManuallySet)}
                      disabled={row.isInternal || row.status === "success"}
                    />
                    {showRetailerWarn && (
                      <p className="mt-0.5 text-xs text-muted-foreground">가맹점 미선택</p>
                    )}
                  </td>
                  <td className="py-2 pr-2 align-top">
                    <Select
                      value={row.type || ""}
                      onValueChange={(v) =>
                        updateRow(row.id, {
                          type: v as TransactionCategory,
                          typeManuallySet: true,
                        })
                      }
                      disabled={row.isInternal || row.status === "success"}
                    >
                      <SelectTrigger size="sm" className="w-32">
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showStockWarn && (
                      <p className="mt-0.5 flex items-center gap-0.5 text-xs text-muted-foreground">
                        <AlertTriangle className="h-3 w-3" />
                        주식 거래 폼에서 입력하면 자동 연결됩니다
                      </p>
                    )}
                  </td>
                  <td className="py-2 pr-2 align-top">
                    <Input
                      value={row.note}
                      onChange={(e) => updateRow(row.id, { note: e.target.value })}
                      className="h-8 w-32 text-xs"
                      placeholder="메모"
                      disabled={row.status === "success"}
                    />
                  </td>
                  <td className="py-2 align-top">
                    {row.status === "success" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="rounded p-1 text-muted-foreground hover:text-destructive"
                        tabIndex={-1}
                        disabled={submitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    {row.status === "error" && (
                      <p className="mt-0.5 text-xs text-red-600">{row.errorMessage}</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={submitting}>
          + 행 추가
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={submitting}
          >
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || rows.every((r) => r.status === "success")}
          >
            {submitting ? "제출 중..." : "제출"}
          </Button>
        </div>
      </div>
    </div>
  );
}
