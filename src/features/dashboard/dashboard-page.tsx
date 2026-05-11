import { useGetBankListQuery, useGetAmountSnapshotsQuery, useGetLastTransactionDateQuery } from "@/graphql/generated/graphql";
import { formatCurrency, formatDate, getTotalBalance } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BalanceChart } from "./balance-chart";
import { BankCard } from "./bank-card";
import { Landmark, CalendarDays, Building2 } from "lucide-react";

export function DashboardPage() {
  const { data, loading, error } = useGetBankListQuery();
  const { data: snapshotData, loading: snapshotLoading } = useGetAmountSnapshotsQuery({
    variables: { startDate: null },
  });
  const { data: lastTxData } = useGetLastTransactionDateQuery();

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
        Failed to load dashboard data: {error.message}
      </div>
    );
  }

  const banks = data?.bankRelay?.edges ?? [];
  const krwTotal = banks.length > 0 ? getTotalBalance(banks, "KRW") : "0";
  const usdTotal = banks.length > 0 ? getTotalBalance(banks, "USD") : "0";
  const lastTxDate = lastTxData?.transactionRelay?.edges[0]?.node?.date;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
        {lastTxDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            마지막 거래: {formatDate(lastTxDate)}
          </div>
        )}
      </div>

      {/* Balance Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <BalanceSummaryCard
          title="총 잔액 (KRW)"
          amount={krwTotal}
          currency="KRW"
          loading={loading}
          color="indigo"
        />
        <BalanceSummaryCard
          title="총 잔액 (USD)"
          amount={usdTotal}
          currency="USD"
          loading={loading}
          color="teal"
        />
      </div>

      {/* Balance Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <BalanceChart
          title="KRW 잔액 추이"
          data={snapshotData?.krwSnapshot?.edges ?? []}
          loading={snapshotLoading}
          currency="KRW"
        />
        <BalanceChart
          title="USD 잔액 추이"
          data={snapshotData?.usdSnapshot?.edges ?? []}
          loading={snapshotLoading}
          currency="USD"
        />
      </div>

      {/* Bank List */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">은행 계좌</h2>
        </div>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={`skel-${i.toString()}`} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {banks.map((bank, idx) => (
              <BankCard key={bank.node.id} bank={bank.node} colorIdx={idx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BalanceSummaryCard({
  title,
  amount,
  currency,
  loading,
  color,
}: {
  title: string;
  amount: string;
  currency: string;
  loading: boolean;
  color: "indigo" | "teal";
}) {
  const styles = {
    indigo: {
      bg: "bg-gradient-to-br from-indigo-500 to-violet-600",
      icon: "text-indigo-100",
      badge: "bg-white/20 text-white border-0",
    },
    teal: {
      bg: "bg-gradient-to-br from-teal-500 to-emerald-600",
      icon: "text-teal-100",
      badge: "bg-white/20 text-white border-0",
    },
  }[color];

  return (
    <Card className={`${styles.bg} border-0 text-white`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white/80">{title}</CardTitle>
        <div className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles.badge}`}>
          {currency}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-48 bg-white/20" />
        ) : (
          <div className="flex items-end gap-2">
            <Landmark className={`h-5 w-5 ${styles.icon} mb-0.5`} />
            <span className="text-2xl font-bold">{formatCurrency(amount, currency)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
