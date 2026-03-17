import { useState, useCallback } from "react";
import {
  TransactionCategory,
  useCreateTransactionFullMutation,
} from "@/graphql/generated/graphql";
import { CATEGORY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AmountInput } from "./amount-input";
import { RetailerCombobox } from "./retailer-combobox";
import { CheckCircle2, Trash2, AlertTriangle } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

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
    id: crypto.randomUUID(),
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

function addDays(dateStr: string, delta: number): string {
  try {
    const d = parseISO(dateStr);
    d.setDate(d.getDate() + delta);
    return d.toISOString().slice(0, 10);
  } catch {
    return dateStr;
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

  const [createTransaction] = useCreateTransactionFullMutation();

  const updateRow = useCallback((id: string, patch: Partial<TransactionRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }, []);

  function addRow() {
    const lastDate = rows.length > 0 ? rows[rows.length - 1].date : defaultDate;
    setRows((prev) => [...prev, makeRow(lastDate)]);
  }

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
          const msg = settled.reason instanceof Error ? settled.reason.message : "오류가 발생했습니다.";
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
      <h2 className="mb-3 text-base font-semibold">거래 일괄 입력</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-2 font-medium">날짜</th>
              <th className="pb-2 pr-2 font-medium">금액</th>
              <th className="pb-2 pr-2 font-medium">유형</th>
              <th className="pb-2 pr-2 font-medium">가맹점</th>
              <th className="pb-2 pr-2 font-medium">메모</th>
              <th className="pb-2 pr-2 font-medium">내부이체</th>
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
                row.type === TransactionCategory.Income &&
                !isNaN(amountNum) &&
                amountNum < 0;
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
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="rounded border px-1 py-0.5 text-xs hover:bg-muted"
                        onClick={() => updateRow(row.id, { date: addDays(row.date, -1) })}
                        tabIndex={-1}
                      >
                        &#9664;
                      </button>
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => updateRow(row.id, { date: e.target.value })}
                        className="h-8 rounded border border-input bg-background px-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        disabled={row.status === "success"}
                      />
                      <button
                        type="button"
                        className="rounded border px-1 py-0.5 text-xs hover:bg-muted"
                        onClick={() => updateRow(row.id, { date: addDays(row.date, 1) })}
                        tabIndex={-1}
                      >
                        &#9654;
                      </button>
                    </div>
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
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
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
                    <Input
                      value={row.note}
                      onChange={(e) => updateRow(row.id, { note: e.target.value })}
                      className="h-8 w-32 text-xs"
                      placeholder="메모"
                      disabled={row.status === "success"}
                    />
                  </td>
                  <td className="py-2 pr-2 align-top">
                    <input
                      type="checkbox"
                      checked={row.isInternal}
                      onChange={(e) => handleInternalChange(row.id, e.target.checked)}
                      className="h-4 w-4 cursor-pointer rounded border-input"
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
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
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
