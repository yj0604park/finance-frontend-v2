import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApolloClient } from "@apollo/client";
import {
  GetAllTransactionsDocument,
  type GetAllTransactionsQuery,
  type GetAllTransactionsQueryVariables,
  useGetSimpleAccountListQuery,
} from "@/graphql/generated/graphql";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ErrorAlert } from "@/components/shared/error-alert";
import { TransactionTable } from "@/components/shared/transaction-table";
import { PaginationControls } from "@/components/shared/pagination-controls";

const PAGE_SIZE = 10;
const FETCH_BATCH = 100;

type TxEdge = GetAllTransactionsQuery["transactionRelay"]["edges"][number];

export function TransactionsPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  const [allEdges, setAllEdges] = useState<TxEdge[]>([]);
  const [loadingMore, setLoadingMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { data: accountData } = useGetSimpleAccountListQuery();
  const accounts = accountData?.accountRelay?.edges ?? [];

  const filterKey = `${accountFilter}|${startDate}|${endDate}`;
  const filterKeyRef = useRef(filterKey);

  useEffect(() => {
    filterKeyRef.current = filterKey;
    let cancelled = false;
    setAllEdges([]);
    setLoadingMore(true);
    setError(null);
    setCurrentPage(1);

    async function fetchAll() {
      const accumulated: TxEdge[] = [];
      let cursor = "";
      let hasNext = true;

      try {
        while (hasNext) {
          const result = await client.query<GetAllTransactionsQuery, GetAllTransactionsQueryVariables>({
            query: GetAllTransactionsDocument,
            variables: {
              first: FETCH_BATCH,
              after: cursor,
              accountId: accountFilter === "all" ? null : accountFilter,
              dateGte: startDate || null,
              dateLte: endDate || null,
            },
            fetchPolicy: "cache-first",
          });
          if (cancelled || filterKeyRef.current !== filterKey) return;

          accumulated.push(...result.data.transactionRelay.edges);
          setAllEdges([...accumulated]); // show data progressively
          hasNext = result.data.transactionRelay.pageInfo.hasNextPage;
          cursor = result.data.transactionRelay.pageInfo.endCursor ?? "";
          if (!cursor) break;
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoadingMore(false);
      }
    }

    void fetchAll();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const totalCount = allEdges.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pagedTransactions = allEdges.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  // While loading, show skeleton only if we have no data yet
  const showSkeleton = loadingMore && totalCount === 0;

  if (error) {
    return <ErrorAlert error={error} prefix="Failed to load transactions" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Transactions</h1>
        <div className="flex items-center gap-2">
          {loadingMore && totalCount > 0 && (
            <span className="text-xs text-muted-foreground animate-pulse">{totalCount}건 로딩 중…</span>
          )}
          <Badge variant="outline">{totalCount} total</Badge>
        </div>
      </div>

      {/* Filters */}
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartChange={(v) => { setStartDate(v); }}
        onEndChange={(v) => { setEndDate(v); }}
      >
        <div className="w-full sm:w-52">
          <Select
            value={accountFilter}
            onValueChange={(v) => { setAccountFilter(v); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((edge) => (
                <SelectItem key={edge.node.id} value={edge.node.id}>
                  {edge.node.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </DateRangeFilter>

      {/* Table */}
      <Card>
        <TransactionTable
          transactions={pagedTransactions}
          loading={showSkeleton}
          columns={{
            account: true,
            accountMobileHidden: true,
            category: true,
            categoryMobileHidden: true,
            note: true,
            noteMobileHidden: true,
            flags: true,
            flagsMobileHidden: true,
          }}
          onRowClick={(id) => navigate(`/transactions/${encodeURIComponent(id)}`)}
          emptyMessage="No transactions found"
          skeletonRows={8}
        />
      </Card>

      {/* Pagination */}
      {totalCount > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          canPrev={currentPage > 1}
          canNext={currentPage < totalPages}
          onPrev={() => setCurrentPage((p) => p - 1)}
          onNext={() => setCurrentPage((p) => p + 1)}
          onGoToPage={setCurrentPage}
        />
      )}
    </div>
  );
}
