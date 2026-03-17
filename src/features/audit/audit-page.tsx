import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TransactionCategory,
  useGetAccountListQuery,
  useGetAccountMonthCountQuery,
  useGetInternalTransactionsQuery,
} from "@/graphql/generated/graphql";
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
import { AlertTriangle, CheckCircle2 } from "lucide-react";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING_ACCOUNT: "Checking",
  SAVINGS_ACCOUNT: "Savings",
  INSTALLMENT_SAVING: "Installment",
  TIME_DEPOSIT: "Time Deposit",
  CREDIT_CARD: "Credit Card",
  STOCK: "Stock",
  LOAN: "Loan",
};

// ─── Section: 비활성 계좌 잔고 불일치 ────────────────────────────────────────

function InactiveAccountsSection() {
  const navigate = useNavigate();
  const { data, loading } = useGetAccountListQuery({
    variables: {
      after: "",
      bankId: null,
      isActive: { exact: false, inList: [], isNull: false },
    },
  });

  const nonZeroAccounts = (data?.accountRelay?.edges ?? []).filter(
    (edge) => Number(edge.node.amount) !== 0,
  );

  return (
    <AuditCard
      title="비활성 계좌 잔고 불일치"
      description="비활성 처리됐지만 잔고가 0이 아닌 계좌"
      count={nonZeroAccounts.length}
      loading={loading}
      emptyMessage="비활성 계좌 중 잔고가 0이 아닌 계좌가 없습니다."
    >
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
            return (
              <TableRow
                key={account.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/accounts/${encodeURIComponent(account.id)}`)}
              >
                <TableCell className="font-medium">{account.name}</TableCell>
                <TableCell className="text-muted-foreground">{account.bank.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
                  </Badge>
                </TableCell>
                <TableCell
                  className={`text-right font-mono font-semibold ${
                    Number(account.amount) < 0 ? "text-red-500" : "text-amber-600"
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
    </AuditCard>
  );
}

// ─── Section: 내부이체 데이터 불일치 ─────────────────────────────────────────

function InternalMismatchSection() {
  const navigate = useNavigate();
  const { data, loading } = useGetInternalTransactionsQuery({
    variables: { after: "" },
    fetchPolicy: "cache-and-network",
  });

  const allInternal = data?.transactionRelay?.edges ?? [];
  // isInternal=true 인데 type≠TRANSFER 이거나 retailer가 있는 경우
  const mismatched = allInternal.filter(
    (edge) =>
      edge.node.type !== TransactionCategory.Transfer || edge.node.retailer != null,
  );

  return (
    <AuditCard
      title="내부이체 데이터 불일치"
      description="isInternal=true인데 유형이 TRANSFER가 아니거나 가맹점이 연결된 거래"
      count={mismatched.length}
      loading={loading}
      emptyMessage="내부이체 불일치 거래가 없습니다."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>날짜</TableHead>
            <TableHead>계좌</TableHead>
            <TableHead>유형</TableHead>
            <TableHead>가맹점</TableHead>
            <TableHead className="text-right">금액</TableHead>
            <TableHead>문제</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mismatched.map((edge) => {
            const tx = edge.node;
            const issues: string[] = [];
            if (tx.type !== TransactionCategory.Transfer) issues.push("유형 불일치");
            if (tx.retailer) issues.push("가맹점 있음");
            return (
              <TableRow
                key={tx.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/transactions/${encodeURIComponent(tx.id)}`)}
              >
                <TableCell className="text-sm whitespace-nowrap">{tx.date}</TableCell>
                <TableCell className="text-sm">
                  <span>{tx.account.name}</span>
                  <span className="ml-1 text-xs text-muted-foreground">{tx.account.bank.name}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{tx.type}</Badge>
                </TableCell>
                <TableCell className="text-sm">{tx.retailer?.name ?? "—"}</TableCell>
                <TableCell
                  className={`text-right font-mono text-sm ${
                    Number(tx.amount) < 0 ? "text-red-500" : ""
                  }`}
                >
                  {formatCurrency(tx.amount, tx.account.currency)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {issues.map((issue) => (
                      <Badge key={issue} variant="destructive" className="text-xs">{issue}</Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </AuditCard>
  );
}

// ─── Section: 데이터 입력 완성도 ─────────────────────────────────────────────

function CompletenessSection() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: accountData, loading: accountLoading } = useGetAccountListQuery({
    variables: { after: "", bankId: null, isActive: { exact: true, inList: [], isNull: false } },
  });

  const activeAccounts = (accountData?.accountRelay?.edges ?? []).filter(
    (edge) => edge.node.firstAdded,
  );

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base">데이터 입력 완성도</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            첫 거래부터 기록 중인 계좌(firstAdded=true)의 월별 거래 유무
          </p>
        </div>
        <div className="flex gap-1">
          {yearOptions.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setSelectedYear(y)}
              className={`rounded px-2 py-0.5 text-sm border ${
                y === selectedYear
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input hover:bg-muted"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {accountLoading ? (
          <div className="p-6 text-sm text-muted-foreground">불러오는 중...</div>
        ) : activeAccounts.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            firstAdded=true인 활성 계좌가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">계좌</TableHead>
                  <TableHead className="min-w-[80px] text-xs text-muted-foreground">첫 거래</TableHead>
                  {months.map((m) => (
                    <TableHead key={m} className="text-center text-xs w-8 px-1">
                      {m}월
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeAccounts.map((edge) => {
                  const account = edge.node;
                  const firstTx = account.firstTransaction;
                  const lastTx = account.lastTransaction;

                  return (
                    <TableRow key={account.id}>
                      <TableCell
                        className="cursor-pointer hover:text-primary font-medium text-sm"
                        onClick={() => navigate(`/accounts/${encodeURIComponent(account.id)}`)}
                      >
                        <div>{account.name}</div>
                        <div className="text-xs text-muted-foreground">{account.bank.name}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {firstTx ?? "—"}
                      </TableCell>
                      {months.map((m) => (
                        <MonthCell
                          key={m}
                          accountId={account.id}
                          year={selectedYear}
                          month={m}
                          firstTx={firstTx}
                          lastTx={lastTx}
                          onNavigate={() =>
                            navigate(`/accounts/${encodeURIComponent(account.id)}`)
                          }
                        />
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MonthCell({
  accountId,
  year,
  month,
  firstTx,
  lastTx,
  onNavigate,
}: {
  accountId: string;
  year: number;
  month: number;
  firstTx: string | null | undefined;
  lastTx: string | null | undefined;
  onNavigate: () => void;
}) {
  // Determine if this month is "in scope" for this account
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-31`;

  const beforeFirst = firstTx && monthEnd < firstTx;
  const afterLast = lastTx && monthStart > lastTx;
  const outOfScope = beforeFirst || afterLast;

  if (outOfScope) {
    return <TableCell className="px-1 text-center"><span className="text-muted-foreground/30 text-xs">—</span></TableCell>;
  }

  return (
    <MonthCellData
      accountId={accountId}
      year={year}
      month={month}
      onNavigate={onNavigate}
    />
  );
}

function MonthCellData({
  accountId,
  year,
  month,
  onNavigate,
}: {
  accountId: string;
  year: number;
  month: number;
  onNavigate: () => void;
}) {
  const monthStr = String(month).padStart(2, "0");
  const dateGte = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const dateLte = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

  const { data, loading } = useGetAccountMonthCountQuery({
    variables: { accountId, dateGte, dateLte },
  });

  const count = data?.transactionRelay?.totalCount ?? 0;

  return (
    <TableCell className="px-1 text-center">
      <button
        type="button"
        onClick={onNavigate}
        title={`${year}년 ${month}월 ${loading ? "..." : `${count}건`}`}
        className={`h-6 w-6 rounded text-xs font-medium transition-colors ${
          loading
            ? "bg-muted text-muted-foreground"
            : count === 0
            ? "bg-red-100 text-red-600 hover:bg-red-200"
            : "bg-green-100 text-green-700 hover:bg-green-200"
        }`}
      >
        {loading ? "·" : count > 99 ? "99+" : count}
      </button>
    </TableCell>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">감사 (Audit)</h1>
        <p className="text-muted-foreground mt-1">데이터 품질 및 일관성 점검</p>
      </div>
      <InactiveAccountsSection />
      <InternalMismatchSection />
      <CompletenessSection />
    </div>
  );
}

// ─── Shared Card wrapper ──────────────────────────────────────────────────────

function AuditCard({
  title,
  description,
  count,
  loading,
  emptyMessage,
  children,
}: {
  title: string;
  description: string;
  count: number;
  loading: boolean;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <CardTitle className="text-base">{title}</CardTitle>
            {!loading && (
              <Badge
                variant={count > 0 ? "destructive" : "secondary"}
                className="ml-auto"
              >
                {count > 0 ? `${count}건` : <CheckCircle2 className="h-3 w-3" />}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-6">{description}</p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">불러오는 중...</div>
        ) : count === 0 ? (
          <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
