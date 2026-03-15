import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetAccountDetailQuery, useGetTransactionListQuery } from "@/graphql/generated/graphql";
import { formatCurrency, getDisplayColor } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Circle, Plus, RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { CreateTransactionDialog } from "@/features/transactions/create-transaction-dialog";

const PAGE_SIZE = 50;

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING_ACCOUNT: "Checking",
  SAVINGS_ACCOUNT: "Savings",
  INSTALLMENT_SAVING: "Installment",
  TIME_DEPOSIT: "Time Deposit",
  CREDIT_CARD: "Credit Card",
  STOCK: "Stock",
  LOAN: "Loan",
};

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function toggleReviewed(pk: string): Promise<void> {
  const numericId = atob(pk).split(":")[1];
  await fetch(`/money/toggle_reviewed/${numericId}/`, {
    method: "GET",
    credentials: "include",
    headers: { "X-CSRFToken": getCsrfToken() },
  });
}

export function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUnreviewedOnly, setShowUnreviewedOnly] = useState(false);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [localReviewed, setLocalReviewed] = useState<Map<string, boolean>>(new Map());
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const decodedId = accountId ? decodeURIComponent(accountId) : undefined;

  const { data: accountData, loading: accountLoading } = useGetAccountDetailQuery({
    variables: { accountId: decodedId ?? null },
    skip: !decodedId,
  });

  const {
    data: txData,
    loading: txLoading,
    refetch: refetchTransactions,
  } = useGetTransactionListQuery({
    variables: {
      accountId: decodedId ?? null,
      first: PAGE_SIZE,
      after: cursor ?? "",
    },
    skip: !decodedId,
  });

  const account = accountData?.accountRelay?.edges?.[0]?.node;
  const allTransactions = txData?.transactionRelay?.edges ?? [];
  const currency = txData?.accountRelay?.edges?.[0]?.node?.currency ?? account?.currency ?? "KRW";
  const pageInfo = txData?.transactionRelay?.pageInfo;
  const totalCount = txData?.transactionRelay?.totalCount ?? 0;
  const currentPage = cursorStack.length + 1;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // 미검토 필터 (로컬 상태 반영)
  const transactions = showUnreviewedOnly
    ? allTransactions.filter((edge) => {
        const reviewed = localReviewed.has(edge.node.id)
          ? localReviewed.get(edge.node.id)
          : edge.node.reviewed;
        return !reviewed;
      })
    : allTransactions;

  const handleNextPage = () => {
    if (!pageInfo?.endCursor) return;
    setCursorStack((prev) => [...prev, cursor ?? ""]);
    setCursor(pageInfo.endCursor ?? null);
  };

  const handlePrevPage = () => {
    const stack = [...cursorStack];
    const prev = stack.pop() ?? null;
    setCursorStack(stack);
    setCursor(prev);
  };

  const handleToggleReviewed = useCallback(async (id: string) => {
    setToggling((prev) => new Set(prev).add(id));
    try {
      await toggleReviewed(id);
      setLocalReviewed((prev) => {
        const next = new Map(prev);
        const current = next.has(id) ? next.get(id) : false;
        next.set(id, !current);
        return next;
      });
    } catch (e) {
      console.error("Failed to toggle reviewed", e);
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  if (!decodedId) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No account selected. Please select an account from the accounts list.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/accounts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {accountLoading ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{account?.name ?? "Account"}</h1>
            {account && (
              <>
                <Badge variant="outline">{account.bank.name}</Badge>
                <Badge variant="secondary">
                  {ACCOUNT_TYPE_LABELS[account.type] || account.type}
                </Badge>
              </>
            )}
          </div>
        )}
      </div>

      {/* Account Summary */}
      {account && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">잔액</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${getDisplayColor(account.amount)}`}>
                {formatCurrency(account.amount, account.currency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">거래 기간</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {account.firstTransaction ?? "—"} ~ {account.lastTransaction ?? "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 거래 수</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalCount > 0 ? totalCount : "—"}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>거래 내역</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="unreviewed-filter"
                checked={showUnreviewedOnly}
                onCheckedChange={setShowUnreviewedOnly}
              />
              <Label htmlFor="unreviewed-filter" className="text-sm cursor-pointer">
                미검토만
              </Label>
            </div>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-1 h-4 w-4" />
              거래 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {txLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={`skel-${i.toString()}`} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">검토</TableHead>
                  <TableHead>날짜</TableHead>
                  <TableHead>가맹점</TableHead>
                  <TableHead>분류</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead className="text-right">잔액</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead>플래그</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {showUnreviewedOnly ? (
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle2 className="h-8 w-8 text-green-500" />
                          모든 거래가 검토 완료되었습니다!
                        </div>
                      ) : (
                        "거래 내역이 없습니다"
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((edge) => {
                    const tx = edge.node;
                    const isToggling = toggling.has(tx.id);
                    const isReviewed = localReviewed.has(tx.id)
                      ? localReviewed.get(tx.id)
                      : tx.reviewed;
                    return (
                      <TableRow key={tx.id} className={isReviewed ? "opacity-50" : ""}>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => handleToggleReviewed(tx.id)}
                            disabled={isToggling || isReviewed === true}
                            className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                            title={isReviewed ? "검토 완료" : "검토 완료로 표시"}
                          >
                            {isToggling ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : isReviewed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDateSafe(tx.date)}
                        </TableCell>
                        <TableCell className="text-sm">{tx.retailer?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_LABELS[tx.type] ?? tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm ${getDisplayColor(tx.amount)}`}>
                          {formatCurrency(tx.amount, currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {tx.balance ? formatCurrency(tx.balance, currency) : "—"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {tx.note || "—"}
                        </TableCell>
                        <TableCell>
                          {tx.isInternal && (
                            <Badge variant="secondary" className="text-xs">Internal</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
          {totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages} 페이지 ({totalCount}건)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={cursorStack.length === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  이전
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!pageInfo?.hasNextPage}
                >
                  다음
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showCreateDialog && decodedId && (
        <CreateTransactionDialog
          accountId={decodedId}
          currency={currency}
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={() => {
            refetchTransactions();
            setShowCreateDialog(false);
          }}
        />
      )}
    </div>
  );
}

function formatDateSafe(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "yyyy-MM-dd");
  } catch {
    return dateStr;
  }
}
