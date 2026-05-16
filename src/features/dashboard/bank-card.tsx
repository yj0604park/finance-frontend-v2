import { Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

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
  "border-border",
  "border-border",
  "border-border",
  "border-border",
  "border-border",
  "border-border",
];

const ICON_COLORS = [
  "text-primary",
  "text-primary",
  "text-primary",
  "text-primary",
  "text-primary",
  "text-primary",
];

export function BankCard({ bank, colorIdx }: BankCardProps) {
  const navigate = useNavigate();
  const colorClass = BANK_COLORS[colorIdx % BANK_COLORS.length];
  const iconClass = ICON_COLORS[colorIdx % ICON_COLORS.length];

  return (
    <Card
      className={`${colorClass} transition-shadow hover:shadow-md cursor-pointer`}
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
        {bank.balance.length === 0 && <p className="text-xs text-muted-foreground">잔액 없음</p>}
      </CardContent>
    </Card>
  );
}
