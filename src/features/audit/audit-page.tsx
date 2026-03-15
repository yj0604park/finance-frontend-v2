import { useNavigate } from "react-router-dom";
import { useGetAccountListQuery } from "@/graphql/generated/graphql";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING_ACCOUNT: "Checking",
  SAVINGS_ACCOUNT: "Savings",
  INSTALLMENT_SAVING: "Installment",
  TIME_DEPOSIT: "Time Deposit",
  CREDIT_CARD: "Credit Card",
  STOCK: "Stock",
  LOAN: "Loan",
};

export function AuditPage() {
  const navigate = useNavigate();

  const { data, loading } = useGetAccountListQuery({
    variables: {
      after: "",
      bankId: null,
      isActive: { exact: false, inList: [], isNull: false },
    },
  });

  const inactiveAccounts = data?.accountRelay?.edges ?? [];
  const nonZeroAccounts = inactiveAccounts.filter(
    (edge) => Number(edge.node.amount) !== 0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">감사 (Audit)</h1>
        <p className="text-muted-foreground mt-1">데이터 품질 및 일관성 점검</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <CardTitle>비활성 계좌 잔고 불일치</CardTitle>
          {!loading && (
            <Badge
              variant={nonZeroAccounts.length > 0 ? "destructive" : "secondary"}
              className="ml-auto"
            >
              {nonZeroAccounts.length}건
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">불러오는 중...</div>
          ) : nonZeroAccounts.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              비활성 계좌 중 잔고가 0이 아닌 계좌가 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>계좌명</TableHead>
                  <TableHead>은행</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead className="text-right">잔액</TableHead>
                  <TableHead>마지막 거래</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nonZeroAccounts.map((edge) => {
                  const account = edge.node;
                  const amount = Number(account.amount);
                  return (
                    <TableRow
                      key={account.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        navigate(`/accounts/${encodeURIComponent(account.id)}`)
                      }
                    >
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {account.bank.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono font-semibold ${
                          amount < 0 ? "text-red-500" : "text-amber-600"
                        }`}
                      >
                        {formatCurrency(account.amount, account.currency)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {account.lastTransaction ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
