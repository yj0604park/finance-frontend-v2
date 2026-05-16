import { AlertTriangle, CheckCircle2, Link, Unlink } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StockCombobox } from "@/features/stocks/stock-combobox";
import {
  useCreateStockTransactionMutation,
  useGetAccountStockTransactionsQuery,
  useGetUnlinkedStockTransactionsQuery,
  useUpdateStockTransactionMutation,
} from "@/graphql/generated/graphql";
import type { StockOption } from "@/hooks/use-stock-options";
import { formatCurrency, formatDate } from "@/lib/format";
import { DateInput } from "./date-input";

interface StockTransactionFormProps {
  accountId: string;
  currency: string;
  defaultDate: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type Mode = "create" | "link";

export function StockTransactionForm({
  accountId,
  defaultDate,
  onSuccess,
  onCancel,
}: StockTransactionFormProps) {
  const [mode, setMode] = useState<Mode>("create");

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">주식 거래 입력</h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`rounded px-2 py-0.5 text-xs border ${
              mode === "create"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-input hover:bg-muted"
            }`}
          >
            새 거래 입력
          </button>
          <button
            type="button"
            onClick={() => setMode("link")}
            className={`rounded px-2 py-0.5 text-xs border ${
              mode === "link"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-input hover:bg-muted"
            }`}
          >
            기존 거래 연결
          </button>
        </div>
      </div>

      {mode === "create" ? (
        <CreateMode
          accountId={accountId}
          defaultDate={defaultDate}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      ) : (
        <LinkMode accountId={accountId} onSuccess={onSuccess} onCancel={onCancel} />
      )}
    </div>
  );
}

// ─── Create mode ─────────────────────────────────────────────────────────────

function CreateMode({
  accountId,
  defaultDate,
  onSuccess,
  onCancel,
}: {
  accountId: string;
  defaultDate: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(defaultDate);
  const [stock, setStock] = useState<StockOption | null>(null);
  // shares: + = buy, - = sell
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [createStockTransaction] = useCreateStockTransactionMutation();

  // Derive buy/sell from shares sign
  const sharesNum = parseFloat(shares);
  const isBuy = !isNaN(sharesNum) && sharesNum > 0;
  const isSell = !isNaN(sharesNum) && sharesNum < 0;

  // 3-field auto-calc: when exactly one of price/shares/amount is empty, fill it
  function recalculate() {
    const p = parseFloat(price);
    const s = parseFloat(shares);
    const a = parseFloat(amount);

    const priceEmpty = price === "";
    const sharesEmpty = shares === "";
    const amountEmpty = amount === "";

    const emptyCount = [priceEmpty, sharesEmpty, amountEmpty].filter(Boolean).length;
    if (emptyCount !== 1) return;

    if (priceEmpty && !isNaN(s) && !isNaN(a)) {
      const calcPrice = Math.abs(a / s);
      if (isFinite(calcPrice)) setPrice(String(Math.round(calcPrice * 100) / 100));
    } else if (sharesEmpty && !isNaN(p) && !isNaN(a) && p !== 0) {
      const calcShares = a / -p; // amount is negative for buy: shares = -amount/price
      setShares(String(Math.round(calcShares * 10000) / 10000));
    } else if (amountEmpty && !isNaN(p) && !isNaN(s)) {
      // buy: shares+, amount = -price*shares; sell: shares-, amount = price*|shares|
      const calcAmount = -(p * s);
      setAmount(String(Math.round(calcAmount * 100) / 100));
    }
  }

  // Amount sign warning: buy→amount negative, sell→amount positive
  const amountNum = parseFloat(amount);
  const showAmountWarn =
    !isNaN(sharesNum) &&
    !isNaN(amountNum) &&
    sharesNum !== 0 &&
    amountNum !== 0 &&
    Math.sign(sharesNum) === Math.sign(amountNum);

  async function handleSubmit() {
    if (!stock || !date || !shares || !price || !amount) {
      setError("종목, 날짜, 수량, 가격, 금액을 모두 입력하세요.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await createStockTransaction({
        variables: {
          accountId,
          stockId: stock.id,
          date,
          price,
          shares,
          amount,
          note: note || null,
        },
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">날짜</Label>
          <DateInput value={date} onChange={setDate} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">종목</Label>
          <StockCombobox value={stock?.id ?? null} onChange={setStock} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">수량 (+ 매수 / − 매도)</Label>
          <Input
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            onBlur={recalculate}
            placeholder="10 or -5"
            className="h-8 text-sm font-mono"
          />
          {isBuy && <p className="text-xs text-blue-600">매수</p>}
          {isSell && <p className="text-xs text-orange-500">매도</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">단가</Label>
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={recalculate}
            placeholder="150.00"
            className="h-8 text-sm font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">총액 (매수: 음수)</Label>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={recalculate}
            placeholder="-1500.00"
            className={`h-8 text-sm font-mono ${showAmountWarn ? "border-orange-400" : ""}`}
          />
          {showAmountWarn && (
            <p className="flex items-center gap-0.5 text-xs text-orange-500">
              <AlertTriangle className="h-3 w-3" />
              매수면 음수, 매도면 양수
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="text-xs" onClick={recalculate}>
          재계산
        </Button>
        <div className="flex-1">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="메모"
            className="h-8 text-xs"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          취소
        </Button>
        <Button type="button" size="sm" onClick={handleSubmit} disabled={submitting || !stock}>
          {submitting ? "제출 중..." : "제출"}
        </Button>
      </div>
    </div>
  );
}

// ─── Link mode ────────────────────────────────────────────────────────────────

function LinkMode({
  accountId,
  onSuccess,
  onCancel,
}: {
  accountId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [selectedStockTxId, setSelectedStockTxId] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");

  const { data: txData } = useGetUnlinkedStockTransactionsQuery({
    variables: { accountId, after: "" },
  });

  const [updateStockTransaction] = useUpdateStockTransactionMutation();

  const transactions = (txData?.transactionRelay?.edges ?? []).map((e) => e.node);

  // We'll use accountId's stock transactions to pick which StockTransaction to link
  const { data: stockTxData } = useGetAccountStockTransactionsQuery({
    variables: { accountId, first: 100, after: "" },
  });
  const stockTransactions = (stockTxData?.stockTransactionRelay?.edges ?? [])
    .map((e) => e.node)
    .filter((st) => !st.relatedTransaction);

  async function handleLink() {
    if (!selectedStockTxId || !selectedTxId) return;
    setLinking(true);
    setError("");
    try {
      await updateStockTransaction({
        variables: {
          id: selectedStockTxId,
          relatedTransactionId: selectedTxId,
        },
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        미연결 StockTransaction과 STOCK 유형 Transaction을 연결합니다.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">StockTransaction (미연결)</Label>
          <div className="max-h-48 overflow-y-auto rounded border divide-y text-xs">
            {stockTransactions.length === 0 ? (
              <div className="p-3 text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                미연결 없음
              </div>
            ) : (
              stockTransactions.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStockTxId(st.id)}
                  className={`w-full text-left px-2 py-1.5 hover:bg-muted ${
                    selectedStockTxId === st.id ? "bg-muted font-medium" : ""
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-muted-foreground">{st.stock.ticker}</span>
                    <span>{formatDate(st.date)}</span>
                    <Badge
                      variant={Number(st.shares) > 0 ? "secondary" : "outline"}
                      className="text-xs ml-auto"
                    >
                      {Number(st.shares) > 0 ? "매수" : "매도"} {Math.abs(Number(st.shares))}주
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">
                    {formatCurrency(st.amount, st.stock.currency)}
                    {st.note && <span className="ml-1">{st.note}</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">STOCK Transaction</Label>
          <div className="max-h-48 overflow-y-auto rounded border divide-y text-xs">
            {transactions.length === 0 ? (
              <div className="p-3 text-muted-foreground">STOCK 거래 없음</div>
            ) : (
              transactions.map((tx) => (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => setSelectedTxId(tx.id)}
                  className={`w-full text-left px-2 py-1.5 hover:bg-muted ${
                    selectedTxId === tx.id ? "bg-muted font-medium" : ""
                  }`}
                >
                  <div>{formatDate(tx.date)}</div>
                  <div className={Number(tx.amount) < 0 ? "text-red-500" : "text-green-600"}>
                    {formatCurrency(tx.amount, tx.account.currency)}
                    {tx.note && <span className="ml-1 text-muted-foreground">{tx.note}</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {selectedStockTxId && selectedTxId ? (
            <span className="flex items-center gap-1 text-primary">
              <Link className="h-3 w-3" /> 연결 준비 완료
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Unlink className="h-3 w-3" /> 양쪽 모두 선택하세요
            </span>
          )}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={linking}>
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleLink}
            disabled={linking || !selectedStockTxId || !selectedTxId}
          >
            {linking ? "연결 중..." : "연결"}
          </Button>
        </div>
      </div>
    </div>
  );
}
