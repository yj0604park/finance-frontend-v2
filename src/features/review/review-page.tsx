import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGetUnreviewedTransactionsQuery } from "@/graphql/generated/graphql";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { ErrorAlert } from "@/components/shared/error-alert";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { TransactionTable } from "@/components/shared/transaction-table";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { toggleReviewed } from "@/lib/review";

const PAGE_SIZE = 20;

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
    return <ErrorAlert error={error} prefix="Failed to load transactions" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Transaction Review</h1>
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
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartChange={(v) => { setStartDate(v); setCursor(""); setCursorStack([]); }}
        onEndChange={(v) => { setEndDate(v); setCursor(""); setCursorStack([]); }}
      >
        {transactions.length > 0 && (
          <Button
            variant="default"
            size="sm"
            onClick={handleMarkAllReviewed}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            이 페이지 전체 완료
          </Button>
        )}
      </DateRangeFilter>

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
        <TransactionTable
          transactions={transactions}
          loading={loading}
          columns={{
            reviewToggle: true,
            reviewBidirectional: false,
            account: true,
            retailer: true,
            category: true,
            note: true,
            flags: true,
          }}
          review={{
            localReviewed,
            toggling,
            onToggle: (id) => { void handleToggle(id); },
          }}
          onRowClick={(id) => navigate(`/transactions/${encodeURIComponent(id)}`)}
          emptyMessage="모든 거래가 검토 완료되었습니다!"
          skeletonRows={PAGE_SIZE}
        />
      </Card>

      {/* Pagination */}
      <PaginationControls
        currentPage={cursorStack.length + 1}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        canPrev={cursorStack.length > 0}
        canNext={!!pageInfo?.hasNextPage}
        onPrev={handlePrev}
        onNext={handleNext}
        itemLabel=" 미검토"
      />
    </div>
  );
}
