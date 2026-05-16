import { format, parseISO, subMonths } from "date-fns";
import { Decimal } from "decimal.js";
import { ShoppingBag, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import { TransactionTable } from "@/components/shared/transaction-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAllTransactions } from "@/hook/useAllTransactions";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, toNumber } from "@/lib/format";

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

  const headerBadges = [
    ...(retailerInfo?.type
      ? [
          {
            label: RETAILER_TYPE_LABELS[retailerInfo.type] ?? retailerInfo.type,
            variant: "outline" as const,
          },
        ]
      : []),
    ...(retailerInfo?.category
      ? [
          {
            label: CATEGORY_LABELS[retailerInfo.category] ?? retailerInfo.category,
            variant: "secondary" as const,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        onBack={() => navigate("/retailers")}
        title={retailerInfo?.name ?? "가맹점 상세"}
        loading={txLoading}
        badges={headerBadges}
        subtitle="가맹점별 거래 내역"
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          icon={ShoppingBag}
          label="거래 횟수"
          value={transactions.length}
          iconBg="bg-indigo-100 dark:bg-indigo-900/30"
          iconColor="text-indigo-600 dark:text-indigo-400"
        />
        <StatsCard
          icon={TrendingDown}
          label="총 지출"
          value={totalSpending.isZero() ? "—" : formatCurrency(totalSpending.toString(), currency)}
          iconBg="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-500"
          valueColor="text-red-600"
        />
        <StatsCard
          icon={TrendingUp}
          label="총 수입"
          value={totalIncome.isZero() ? "—" : formatCurrency(totalIncome.toString(), currency)}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600"
          valueColor="text-emerald-600"
        />
      </div>

      {/* Filters */}
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartChange={setStartDate}
        onEndChange={setEndDate}
      />

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
        <TransactionTable
          transactions={transactions}
          loading={txLoading}
          columns={{
            account: true,
            retailer: false,
            category: true,
            note: true,
            flags: false,
          }}
          onRowClick={(id) => navigate(`/transactions/${encodeURIComponent(id)}`)}
          skeletonRows={6}
        />
      </Card>
    </div>
  );
}
