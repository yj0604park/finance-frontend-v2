import { useMemo, useState } from "react";
import { addMonths, format, getDaysInMonth, parseISO } from "date-fns";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useAllTransactions } from "@/hook/useAllTransactions";
import { formatCurrency, toNumber } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransactionCategory } from "@/graphql/generated/graphql";
import { Decimal } from "decimal.js";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { ErrorAlert } from "@/components/shared/error-alert";
import { TransactionTable } from "@/components/shared/transaction-table";

const CHART_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
  "#06b6d4", "#a855f7",
];

function monthToRange(ym: string): { start: string; end: string } {
  const date = parseISO(`${ym}-01`);
  const days = getDaysInMonth(date);
  return { start: `${ym}-01`, end: `${ym}-${String(days).padStart(2, "0")}` };
}

export function CategoryPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [currency, setCurrency] = useState<string>("USD");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { start: startDate, end: endDate } = monthToRange(month);

  function shiftMonth(delta: number) {
    try {
      setMonth(format(addMonths(parseISO(`${month}-01`), delta), "yyyy-MM"));
    } catch { /* invalid */ }
  }

  const { edges: transactionEdges, loading, error } = useAllTransactions({
    accountId: null,
    dateGte: startDate || null,
    dateLte: endDate || null,
  });

  const filteredTransactions = useMemo(
    () =>
      transactionEdges.filter(
        (e) =>
          e.node.account.currency === currency &&
          !e.node.isInternal &&
          e.node.type !== TransactionCategory.Stock,
      ),
    [transactionEdges, currency],
  );

  const { spendingByCategory, incomeByCategory } = useMemo(() => {
    const spending: Record<string, Decimal> = {};
    const income: Record<string, Decimal> = {};

    for (const edge of filteredTransactions) {
      const tx = edge.node;
      const amount = new Decimal(tx.amount);
      const category = tx.type;

      if (amount.isNegative()) {
        spending[category] = (spending[category] ?? new Decimal(0)).plus(amount.abs());
      } else {
        income[category] = (income[category] ?? new Decimal(0)).plus(amount);
      }
    }

    const spendingByCategory = Object.entries(spending)
      .map(([type, total]) => ({ type, total, label: CATEGORY_LABELS[type] ?? type }))
      .sort((a, b) => b.total.comparedTo(a.total));

    const incomeByCategory = Object.entries(income)
      .map(([type, total]) => ({ type, total, label: CATEGORY_LABELS[type] ?? type }))
      .sort((a, b) => b.total.comparedTo(a.total));

    return { spendingByCategory, incomeByCategory };
  }, [filteredTransactions]);

  const totalSpending = spendingByCategory.reduce(
    (acc, item) => acc.plus(item.total),
    new Decimal(0),
  );

  const chartData = spendingByCategory.map((item) => ({
    name: item.label,
    value: toNumber(item.total.toString()),
  }));

  const displayedTransactions = useMemo(() => {
    const base = selectedCategory
      ? filteredTransactions.filter((e) => e.node.type === selectedCategory)
      : filteredTransactions;
    return [...base].sort((a, b) => b.node.date.localeCompare(a.node.date));
  }, [filteredTransactions, selectedCategory]);

  if (error) {
    return <ErrorAlert error={error} prefix="Failed to load data" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Categories</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-6">
          <div className="w-28">
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="KRW">KRW</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => shiftMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-36"
            />
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => shiftMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : (
        <>
          {/* Chart + Spending Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>카테고리별 지출</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-muted-foreground">
                    지출 데이터 없음
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={2}
                        dataKey="value"
                        onClick={(_, index) => {
                          const cat = spendingByCategory[index]?.type ?? null;
                          setSelectedCategory((prev) => (prev === cat ? null : cat));
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        {chartData.map((_, index) => (
                          <Cell
                            key={`cell-${index.toString()}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            opacity={
                              selectedCategory && selectedCategory !== spendingByCategory[index]?.type
                                ? 0.4
                                : 1
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value.toString(), currency)}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  지출 상세
                  <Badge variant="outline" className="ml-2 font-normal">
                    합계 {formatCurrency(totalSpending.toString(), currency)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>카테고리</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {spendingByCategory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                          데이터 없음
                        </TableCell>
                      </TableRow>
                    ) : (
                      spendingByCategory.map((item, idx) => {
                        const pct = totalSpending.isZero()
                          ? 0
                          : item.total.div(totalSpending).times(100).toNumber();
                        const isSelected = selectedCategory === item.type;
                        return (
                          <TableRow
                            key={item.type}
                            className={`cursor-pointer transition-colors ${isSelected ? "bg-accent" : "hover:bg-muted/50"}`}
                            onClick={() =>
                              setSelectedCategory((prev) => (prev === item.type ? null : item.type))
                            }
                          >
                            <TableCell className="flex items-center gap-2">
                              <span
                                className="inline-block h-3 w-3 shrink-0 rounded-full"
                                style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                              />
                              {item.label}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatCurrency(item.total.toString(), currency)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-sm">
                              {pct.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Income Table */}
          {incomeByCategory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>카테고리별 수입</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>카테고리</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeByCategory.map((item) => (
                      <TableRow key={item.type}>
                        <TableCell>{item.label}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(item.total.toString(), currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Transaction List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                거래 내역
                <Badge variant="outline" className="ml-2 font-normal">
                  {displayedTransactions.length}건
                </Badge>
                {selectedCategory && (
                  <Badge variant="secondary" className="ml-2">
                    {CATEGORY_LABELS[selectedCategory] ?? selectedCategory}
                  </Badge>
                )}
              </CardTitle>
              {selectedCategory && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSelectedCategory(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <TransactionTable
              transactions={displayedTransactions}
              loading={loading}
              currency={currency}
              columns={{
                retailer: true,
                account: true,
                accountMobileHidden: true,
                category: true,
                categoryMobileHidden: true,
                note: true,
                noteMobileHidden: true,
                flags: false,
              }}
              onRowClick={(id) => navigate(`/transactions/${encodeURIComponent(id)}`)}
              emptyMessage="거래 내역 없음"
            />
          </Card>
        </>
      )}
    </div>
  );
}
