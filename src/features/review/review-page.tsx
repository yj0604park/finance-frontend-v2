import { useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useGetUnreviewedTransactionsQuery } from "@/graphql/generated/graphql";
import { formatCurrency, getDisplayColor } from "@/lib/format";
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
import { CheckCircle2, Circle, RefreshCw } from "lucide-react";

const PAGE_SIZE = 20;

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

export function ReviewPage() {
  const navigate = useNavigate();

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [cursor, setCursor] = useState<string>("");
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [localReviewed, setLocalReviewed] = useState<Map<string, boolean>>(new Map());

  const { data, loading, error, refetch } = useGetUnreviewedTransactionsQuery({
    variables: {
      first: PAGE_SIZE,
      after: cursor,
      dateGte: startDate || null,
      dateLte: endDate || null,
    },
    fetchPolicy: "network-only",
  });

  const allEdges = data?.transactionRelay?.edges ?? [];
  // Hide locally-reviewed items optimistically
  const transactions = allEdges.filter((edge) => !localReviewed.get(edge.node.id));
  const pageInfo = data?.transactionRelay?.pageInfo;
  const totalCount = data?.transactionRelay?.totalCount ?? 0;

  const handleToggle = useCallback(async (id: string) => {
    setToggling((prev) => new Set(prev).add(id));
    try {
      await toggleReviewed(id);
      setLocalReviewed((prev) => new Map(prev).set(id, true));
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

  const handleMarkAllReviewed = useCallback(async () => {
    await Promise.all(transactions.map((edge) => handleToggle(edge.node.id)));
    void refetch();
  }, [transactions, handleToggle, refetch]);

  function handleNext() {
    if (pageInfo?.endCursor) {
      setCursorStack((prev) => [...prev, cursor]);
      setCursor(pageInfo.endCursor ?? "");
      setLocalReviewed(new Map());
    }
  }

  function handlePrev() {
    const stack = [...cursorStack];
    const prev = stack.pop() ?? "";
    setCursorStack(stack);
    setCursor(prev);
    setLocalReviewed(new Map());
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
        Failed to load transactions: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction Review</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            미검토 거래 내역을 확인하고 처리하세요.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 text-sm px-3 py-1">
            {totalCount} 미검토
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setCursor(""); setCursorStack([]); setLocalReviewed(new Map()); void refetch(); }}
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            새로고침
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <span className="text-sm font-medium text-muted-foreground">기간</span>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCursor(""); setCursorStack([]); }}
              className="w-40"
            />
            <span className="text-muted-foreground text-sm">~</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCursor(""); setCursorStack([]); }}
              className="w-40"
            />
          </div>
          {transactions.length > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={handleMarkAllReviewed}
              className="ml-auto gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              이 페이지 전체 완료
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            미검토 거래
            {totalCount > 0 && (
              <Badge variant="secondary">{totalCount}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <Skeleton key={`skel-${i.toString()}`} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">검토</TableHead>
                  <TableHead>날짜</TableHead>
                  <TableHead>계좌</TableHead>
                  <TableHead>가맹점</TableHead>
                  <TableHead>분류</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead>플래그</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground py-12"
                    >
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      모든 거래가 검토 완료되었습니다!
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((edge) => {
                    const tx = edge.node;
                    const currency = tx.account.currency;
                    const isToggling = toggling.has(tx.id);
                    return (
                      <TableRow
                        key={tx.id}
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => navigate(`/transactions/${encodeURIComponent(tx.id)}`)}
                      >
                        <TableCell>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void handleToggle(tx.id); }}
                            disabled={isToggling}
                            className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                          >
                            {isToggling ? (
                              <RefreshCw className="h-5 w-5 animate-spin" />
                            ) : (
                              <Circle className="h-5 w-5" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(parseISO(tx.date), "yyyy-MM-dd")}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{tx.account.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {tx.account.bank.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {tx.retailer?.name ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_LABELS[tx.type] ?? tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono text-sm ${getDisplayColor(tx.amount)}`}
                        >
                          {formatCurrency(tx.amount, currency)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-40 truncate">
                          {tx.note ?? ""}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {tx.isInternal && (
                              <Badge variant="secondary" className="text-xs">
                                Internal
                              </Badge>
                            )}
                            {tx.requiresDetail && (
                              <Badge
                                variant="outline"
                                className="text-xs border-amber-400 text-amber-700"
                              >
                                세부 필요
                              </Badge>
                            )}
                          </div>
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

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          페이지 {cursorStack.length + 1} · {transactions.length}개 표시 / 총 {totalCount}개 미검토
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={cursorStack.length === 0}
          >
            이전
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={!pageInfo?.hasNextPage}
          >
            다음
          </Button>
        </div>
      </div>
    </div>
  );
}
