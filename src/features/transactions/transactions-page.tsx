import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ErrorAlert } from "@/components/shared/error-alert";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { TransactionTable } from "@/components/shared/transaction-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TransactionCategory,
  useGetAllTransactionsQuery,
  useGetSimpleAccountListQuery,
} from "@/graphql/generated/graphql";
import { useCursorPagination } from "@/hooks/use-cursor-pagination";
import { CATEGORY_LABELS } from "@/lib/constants";

const PAGE_SIZE = 50;

export function TransactionsPage() {
  const navigate = useNavigate();
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const pagination = useCursorPagination();

  const { data: accountData } = useGetSimpleAccountListQuery();
  const accounts = accountData?.accountRelay?.edges ?? [];

  const { data, loading, error } = useGetAllTransactionsQuery({
    variables: {
      first: PAGE_SIZE,
      after: pagination.cursor,
      accountId: accountFilter === "all" ? null : accountFilter,
      dateGte: startDate || null,
      dateLte: endDate || null,
      type: categoryFilter === "all" ? null : (categoryFilter as TransactionCategory),
    },
    fetchPolicy: "cache-first",
  });

  const transactions = data?.transactionRelay.edges ?? [];
  const pageInfo = data?.transactionRelay.pageInfo;
  const totalCount = data?.transactionRelay.totalCount ?? 0;
  if (error) {
    return <ErrorAlert error={error} prefix="Failed to load transactions" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Transactions</h1>
        <div className="flex items-center gap-2">
          {loading && transactions.length > 0 && (
            <span className="text-xs text-muted-foreground animate-pulse">새로고침 중…</span>
          )}
          <Badge variant="outline">{totalCount} total</Badge>
        </div>
      </div>

      {/* Filters */}
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartChange={(v) => {
          setStartDate(v);
          pagination.reset();
        }}
        onEndChange={(v) => {
          setEndDate(v);
          pagination.reset();
        }}
      >
        <div className="w-full sm:w-52">
          <Select
            value={accountFilter}
            onValueChange={(v) => {
              setAccountFilter(v);
              pagination.reset();
            }}
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
        <div className="w-full sm:w-52">
          <Select
            value={categoryFilter}
            onValueChange={(v) => {
              setCategoryFilter(v);
              pagination.reset();
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.values(TransactionCategory).map((category) => (
                <SelectItem key={category} value={category}>
                  {CATEGORY_LABELS[category] ?? category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </DateRangeFilter>

      {/* Table */}
      <Card>
        <TransactionTable
          transactions={transactions}
          loading={loading && transactions.length === 0}
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
          currentPage={pagination.currentPage}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          canPrev={pagination.canPrev}
          canNext={!!pageInfo?.hasNextPage}
          onPrev={pagination.goPrev}
          onNext={() => pagination.goNext(pageInfo?.endCursor)}
        />
      )}
    </div>
  );
}
