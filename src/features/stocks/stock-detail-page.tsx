import { format } from "date-fns";
import { ArrowLeft, Plus, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CurrencyType,
  useCreateStockPriceMutation,
  useGetStockListQuery,
  useGetStockPricesQuery,
} from "@/graphql/generated/graphql";
import { formatCurrency, formatDate } from "@/lib/format";

export function StockDetailPage() {
  const { stockId } = useParams<{ stockId: string }>();
  const navigate = useNavigate();

  const { data: stockListData, loading: stockLoading } = useGetStockListQuery();

  const decodedStockId = stockId ? decodeURIComponent(stockId) : undefined;
  const stock = stockListData?.stockRelay?.edges.find((e) => e.node.id === decodedStockId)?.node;

  const {
    data: priceData,
    loading: priceLoading,
    refetch,
    fetchMore,
  } = useGetStockPricesQuery({
    variables: { stockId: decodedStockId ?? "", first: 100, after: "" },
    skip: !decodedStockId,
  });

  useEffect(() => {
    const pageInfo = priceData?.stockPriceRelay.pageInfo;
    if (!decodedStockId || !pageInfo?.hasNextPage || !pageInfo.endCursor) return;

    void fetchMore({
      variables: { stockId: decodedStockId, first: 100, after: pageInfo.endCursor },
      updateQuery: (previous, { fetchMoreResult }) => ({
        stockPriceRelay: {
          ...fetchMoreResult.stockPriceRelay,
          edges: [...previous.stockPriceRelay.edges, ...fetchMoreResult.stockPriceRelay.edges],
        },
      }),
    });
  }, [decodedStockId, fetchMore, priceData?.stockPriceRelay.pageInfo]);

  const priceRecords = priceData?.stockPriceRelay?.edges ?? [];

  // Chart data — oldest first
  const chartData = [...priceRecords].reverse().map((e) => ({
    date: e.node.date,
    price: parseFloat(e.node.price),
  }));

  // Form state
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [price, setPrice] = useState<string>("");

  const [createPrice, { loading: creating }] = useCreateStockPriceMutation({
    onCompleted: () => {
      toast.success("가격 기록이 저장되었습니다.");
      setPrice("");
      void refetch();
    },
    onError: (e) => {
      toast.error(`오류: ${e.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decodedStockId || !price || !date) return;
    createPrice({
      variables: { stockId: decodedStockId, date, price },
    });
  };

  if (stockLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
        종목을 찾을 수 없습니다.
      </div>
    );
  }

  const isUsd = stock.currency === CurrencyType.Usd;
  const latestRecord = priceRecords[0]?.node;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/stocks")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {stock.ticker ?? stock.name}
            </h1>
            <Badge
              variant="outline"
              className={
                isUsd
                  ? "border-indigo-300 text-indigo-700 dark:text-indigo-400"
                  : "border-violet-300 text-violet-700 dark:text-violet-400"
              }
            >
              {stock.currency}
            </Badge>
          </div>
          {stock.ticker && <p className="text-muted-foreground mt-0.5 text-sm">{stock.name}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/30">
                <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">최근 가격</p>
                <p className="text-xl font-bold font-mono">
                  {latestRecord ? formatCurrency(latestRecord.price, stock.currency) : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-violet-100 p-2 dark:bg-violet-900/30">
                <TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">최근 기록일</p>
                <p className="text-xl font-bold">
                  {latestRecord ? formatDate(latestRecord.date) : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-teal-100 p-2 dark:bg-teal-900/30">
                <TrendingUp className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">기록 수</p>
                <p className="text-xl font-bold">{priceData?.stockPriceRelay?.totalCount ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>가격 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ left: 8 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    isUsd ? `$${v.toFixed(0)}` : `₩${(v / 1000).toFixed(0)}k`
                  }
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value.toString(), stock.currency),
                    "가격",
                  ]}
                  labelFormatter={(label: string) => label}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Add price record form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            가격 기록 추가
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="price-date">날짜</Label>
              <Input
                id="price-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price-value">가격 ({stock.currency})</Label>
              <Input
                id="price-value"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-36"
              />
            </div>
            <Button type="submit" disabled={creating || !price} className="gap-2">
              <Plus className="h-4 w-4" />
              {creating ? "저장 중..." : "저장"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Price history table */}
      <Card>
        <CardHeader>
          <CardTitle>가격 기록</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {priceLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={`skel-${i.toString()}`} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead className="text-right">가격</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-12">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      가격 기록이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  priceRecords.map((edge) => {
                    const rec = edge.node;
                    return (
                      <TableRow key={rec.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(rec.date)}
                        </TableCell>
                        <TableCell className="text-sm font-mono text-right">
                          {formatCurrency(rec.price, stock.currency)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
