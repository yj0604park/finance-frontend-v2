import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, parseISO, subMonths } from "date-fns";
import { Decimal } from "decimal.js";
import { useAllTransactions } from "@/hook/useAllTransactions";
import { formatCurrency, getDisplayColor, toNumber } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, ShoppingBag, TrendingDown, TrendingUp } from "lucide-react";

const RETAILER_TYPE_LABELS: Record<string, string> = {
  RESTAURANT: "음식점",
  STORE: "가게/쇼핑",
  SERVICE: "서비스",
  BANK: "은행/금융",
  INCOME: "수입",
  PERSON: "개인",
  ETC: "기타",
};

export function RetailerDetailPage() {
  const { retailerId } = useParams<{ retailerId: string }>();
  const navigate = useNavigate();

  const defaultEndDate = format(new Date(), "yyyy-MM-dd");
  const defaultStartDate = format(subMonths(new Date(), 12), "yyyy-MM-dd");

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const { edges: allTransactions, loading: txLoading } = useAllTransactions({
    accountId: null,
    dateGte: startDate,
    dateLte: endDate,
    skip: !retailerId,
  });

  const transactions = useMemo(
    () => allTransactions.filter((e) => e.node.retailer?.id === retailerId),
    [allTransactions, retailerId],
  );

  const retailerInfo = useMemo(() => {
    const first = transactions[0]?.node.retailer;
    if (!first) return null;
    return { name: first.name, type: first.type, category: first.category };
  }, [transactions]);

  const { totalSpending, totalIncome, chartData, currency } = useMemo(() => {
    let spending = new Decimal(0);
    let income = new Decimal(0);
    let detectedCurrency = "USD";

    const byMonth: Record<string, { month: string; spending: number; income: number }> = {};

    for (const edge of transactions) {
      const tx = edge.node;
      detectedCurrency = tx.account.currency;
      const amount = new Decimal(tx.amount);
      const month = format(parseISO(tx.date), "yyyy-MM");

      if (!byMonth[month]) {
        byMonth[month] = { month, spending: 0, income: 0 };
      }

      if (amount.isNegative()) {
        spending = spending.plus(amount.abs());
        byMonth[month].spending += toNumber(amount.abs().toString());
      } else {
        income = income.plus(amount);
        byMonth[month].income += toNumber(amount.toString());
      }
    }

    const chart = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalSpending: spending,
      totalIncome: income,
      chartData: chart,
      currency: detectedCurrency,
    };
  }, [transactions]);

  if (!retailerId) {
    return <div>잘못된 접근입니다.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/retailers")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          {txLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {retailerInfo?.name ?? "가맹점 상세"}
                </h1>
                {retailerInfo?.type && (
                  <Badge variant="outline">{RETAILER_TYPE_LABELS[retailerInfo.type] ?? retailerInfo.type}</Badge>
                )}
                {retailerInfo?.category && (
                  <Badge variant="secondary">{CATEGORY_LABELS[retailerInfo.category] ?? retailerInfo.category}</Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-0.5 text-sm">
                가맹점별 거래 내역
              </p>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/30">
                <ShoppingBag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">거래 횟수</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">총 지출</p>
                <p className="text-2xl font-bold text-red-600">
                  {totalSpending.isZero()
                    ? "—"
                    : formatCurrency(totalSpending.toString(), currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/30">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">총 수입</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {totalIncome.isZero()
                    ? "—"
                    : formatCurrency(totalIncome.toString(), currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <span className="text-sm font-medium text-muted-foreground">기간</span>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
            <span className="text-muted-foreground text-sm">~</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
        </CardContent>
      </Card>

      {/* Monthly chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>월별 거래 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: number) =>
                    currency === "USD"
                      ? `$${(v / 1000).toFixed(0)}k`
                      : `₩${(v / 10000).toFixed(0)}만`
                  }
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value.toString(), currency),
                    name === "spending" ? "지출" : "수입",
                  ]}
                  labelFormatter={(label: string) => `${label}월`}
                />
                <Bar dataKey="spending" fill="#6366f1" radius={[4, 4, 0, 0]} name="spending" />
                <Bar dataKey="income" fill="#14b8a6" radius={[4, 4, 0, 0]} name="income" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Transaction Table */}
      <Card>
        <CardHeader>
          <CardTitle>거래 내역</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {txLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={`skel-${i.toString()}`} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>계좌</TableHead>
                  <TableHead>분류</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>메모</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-12"
                    >
                      이 기간에 거래가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((edge) => {
                    const tx = edge.node;
                    const curr = tx.account.currency;
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(parseISO(tx.date), "yyyy-MM-dd")}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{tx.account.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {tx.account.bank.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_LABELS[tx.type] ?? tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono text-sm ${getDisplayColor(tx.amount)}`}
                        >
                          {formatCurrency(tx.amount, curr)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-40 truncate">
                          {tx.note ?? ""}
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
