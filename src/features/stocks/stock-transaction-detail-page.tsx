import { useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  useGetStockTransactionQuery,
  useUpdateStockTransactionMutation,
} from "@/graphql/generated/graphql";
import { formatCurrency, formatDate } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ExternalLink, Unlink } from "lucide-react";

export function StockTransactionDetailPage() {
  const { stockTxId } = useParams<{ stockTxId: string }>();
  const navigate = useNavigate();

  const numericId = useMemo(() => {
    if (!stockTxId) return null;
    try {
      const decoded = atob(decodeURIComponent(stockTxId));
      const parts = decoded.split(":");
      if (parts.length >= 2 && parts[1]) return parts[1];
    } catch {
      // not base64
    }
    if (/^\d+$/.test(stockTxId)) return stockTxId;
    return null;
  }, [stockTxId]);

  const { data, loading, refetch } = useGetStockTransactionQuery({
    variables: { id: numericId ?? "" },
    skip: !numericId,
  });

  const [updateStockTransaction, { loading: unlinking }] = useUpdateStockTransactionMutation({
    onCompleted: () => refetch(),
  });

  const tx = data?.stockTransactionRelay?.edges?.[0]?.node;

  const sharesNum = tx ? Number(tx.shares) : 0;
  const isBuy = sharesNum < 0; // negative amount = buy (cash out)
  const currency = tx?.stock.currency ?? "USD";

  if (!numericId) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        거래를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {loading ? (
          <Skeleton className="h-8 w-56" />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {tx?.stock.ticker && (
                <span className="font-mono text-muted-foreground mr-2">{tx.stock.ticker}</span>
              )}
              {tx?.stock.name ?? "—"}
            </h1>
            <Badge variant={isBuy ? "default" : "outline"} className={isBuy ? "bg-blue-500/15 text-blue-700 border-blue-300" : "bg-orange-500/15 text-orange-700 border-orange-300"}>
              {isBuy ? "매수" : "매도"}
            </Badge>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <InfoCard label="날짜" loading={loading}>
          <p className="text-lg font-semibold">{formatDate(tx?.date)}</p>
        </InfoCard>

        <InfoCard label="계좌" loading={loading}>
          <p className="text-lg font-semibold">{tx?.account.name ?? "—"}</p>
          <p className="text-sm text-muted-foreground">{tx?.account.bank.name ?? ""}</p>
        </InfoCard>

        <InfoCard label="수량" loading={loading}>
          <p className={`text-lg font-semibold font-mono ${isBuy ? "text-blue-600" : "text-orange-500"}`}>
            {sharesNum > 0 ? "+" : ""}{tx?.shares ?? "—"}
          </p>
        </InfoCard>

        <InfoCard label="단가" loading={loading}>
          <p className="text-lg font-semibold font-mono">
            {tx ? formatCurrency(tx.price, currency) : "—"}
          </p>
        </InfoCard>

        <InfoCard label="총액" loading={loading}>
          <p className={`text-2xl font-bold font-mono ${Number(tx?.amount ?? 0) < 0 ? "text-red-600" : "text-green-600"}`}>
            {tx ? formatCurrency(tx.amount, currency) : "—"}
          </p>
        </InfoCard>

        <InfoCard label="잔고" loading={loading}>
          <p className="text-lg font-semibold font-mono text-muted-foreground">
            {tx?.balance ? formatCurrency(tx.balance, currency) : "—"}
          </p>
        </InfoCard>
      </div>

      {/* Note */}
      {(loading || tx?.note) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">메모</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-5 w-48" /> : (
              <p className="text-base">{tx?.note}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Related Transaction */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">연결된 거래</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : tx?.relatedTransaction ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">
                  {tx.relatedTransaction.retailer?.name ?? CATEGORY_LABELS[tx.relatedTransaction.type ?? ""] ?? tx.relatedTransaction.type}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(tx.relatedTransaction.date)} · {formatCurrency(tx.relatedTransaction.amount, tx.account.currency)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/transactions/${encodeURIComponent(tx.relatedTransaction.id)}`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    보기
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={unlinking}
                  onClick={() =>
                    void updateStockTransaction({
                      variables: { id: tx.id, relatedTransactionId: null },
                    })
                  }
                >
                  <Unlink className="h-3.5 w-3.5" />
                  연결 해제
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">연결된 거래가 없습니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({
  label,
  loading,
  children,
}: {
  label: string;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-7 w-28" /> : children}
      </CardContent>
    </Card>
  );
}
