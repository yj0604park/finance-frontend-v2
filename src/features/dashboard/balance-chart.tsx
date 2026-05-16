import { format, parseISO, subYears } from "date-fns";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencyType } from "@/graphql/generated/graphql";
import { useAllSnapshots } from "@/hooks/use-all-snapshots";
import { formatCurrency, toNumber } from "@/lib/format";

type Period = "1y" | "3y" | "max";

const PERIODS: { value: Period; label: string }[] = [
  { value: "1y", label: "1년" },
  { value: "3y", label: "3년" },
  { value: "max", label: "최대" },
];

function getStartDate(period: Period): string | null {
  if (period === "max") return null;
  const d = period === "1y" ? subYears(new Date(), 1) : subYears(new Date(), 3);
  return format(d, "yyyy-MM-dd");
}

interface BalanceChartProps {
  title: string;
  currency: CurrencyType;
}

export function BalanceChart({ title, currency }: BalanceChartProps) {
  const [period, setPeriod] = useState<Period>("1y");
  const startDate = getStartDate(period);
  const { nodes, loading } = useAllSnapshots({ currency, startDate });

  const chartData = nodes.map((node) => ({
    date: node.date,
    amount: toNumber(node.amount),
  }));

  const color = currency === CurrencyType.Krw ? "#6366f1" : "#14b8a6";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`rounded px-2 py-0.5 text-xs transition-colors ${
                period === p.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[250px] w-full" />
        ) : chartData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">
            데이터 없음
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`gradient-${currency}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => {
                  try {
                    return format(parseISO(v), period === "max" ? "yyyy/MM" : "MM/dd");
                  } catch {
                    return v;
                  }
                }}
                className="text-xs"
                minTickGap={40}
              />
              <YAxis
                tickFormatter={(v: number) =>
                  currency === CurrencyType.Krw
                    ? `${(v / 1000000).toFixed(0)}M`
                    : `$${(v / 1000).toFixed(0)}K`
                }
                className="text-xs"
                width={60}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0];
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <p className="text-xs text-muted-foreground">{item.payload.date}</p>
                      <p className="text-sm font-bold">
                        {formatCurrency(item.value as number, currency)}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={color}
                fill={`url(#gradient-${currency})`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
