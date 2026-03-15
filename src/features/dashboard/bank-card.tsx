import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { Building2 } from "lucide-react";

interface BankBalance {
  currency: string;
  value: string;
}

interface BankCardProps {
  bank: {
    id: string;
    name: string;
    balance: ReadonlyArray<BankBalance>;
    accountSet: {
      totalCount: number | null;
    };
  };
  colorIdx: number;
}

const BANK_COLORS = [
  "from-indigo-50 to-violet-50 border-indigo-200 dark:from-indigo-950/30 dark:to-violet-950/30 dark:border-indigo-800",
  "from-teal-50 to-emerald-50 border-teal-200 dark:from-teal-950/30 dark:to-emerald-950/30 dark:border-teal-800",
  "from-violet-50 to-purple-50 border-violet-200 dark:from-violet-950/30 dark:to-purple-950/30 dark:border-violet-800",
  "from-amber-50 to-orange-50 border-amber-200 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-800",
  "from-sky-50 to-blue-50 border-sky-200 dark:from-sky-950/30 dark:to-blue-950/30 dark:border-sky-800",
  "from-pink-50 to-rose-50 border-pink-200 dark:from-pink-950/30 dark:to-rose-950/30 dark:border-pink-800",
];

const ICON_COLORS = [
  "text-indigo-500",
  "text-teal-500",
  "text-violet-500",
  "text-amber-500",
  "text-sky-500",
  "text-pink-500",
];

export function BankCard({ bank, colorIdx }: BankCardProps) {
  const navigate = useNavigate();
  const colorClass = BANK_COLORS[colorIdx % BANK_COLORS.length];
  const iconClass = ICON_COLORS[colorIdx % ICON_COLORS.length];

  return (
    <Card
      className={`bg-gradient-to-br ${colorClass} transition-shadow hover:shadow-md cursor-pointer`}
      onClick={() => navigate(`/accounts?bank=${encodeURIComponent(bank.id)}`)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Building2 className={`h-4 w-4 ${iconClass}`} />
          {bank.name}
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {bank.accountSet.totalCount ?? 0}개 계좌
        </span>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {bank.balance.map((b) => (
          <div key={b.currency} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">{b.currency}</span>
            <span className="text-sm font-bold">{formatCurrency(b.value, b.currency)}</span>
          </div>
        ))}
        {bank.balance.length === 0 && (
          <p className="text-xs text-muted-foreground">잔액 없음</p>
        )}
      </CardContent>
    </Card>
  );
}
