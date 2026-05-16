import Decimal from "decimal.js";
import { ArrowLeftRight, Hash, TrendingUp } from "lucide-react";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type CurrencyType,
  ExchangeType,
  useGetExchangeListQuery,
} from "@/graphql/generated/graphql";
import { useCursorPagination } from "@/hooks/use-cursor-pagination";
import { formatCurrency, formatDate } from "@/lib/format";

const PAGE_SIZE = 20;

const EXCHANGE_TYPE_LABELS: Record<ExchangeType, string> = {
  [ExchangeType.Etc]: "기타",
  [ExchangeType.Bank]: "은행",
  [ExchangeType.Wirebarley]: "와이어바알리",
  [ExchangeType.Creditcard]: "신용카드",
};

const EXCHANGE_TYPE_COLORS: Record<ExchangeType, string> = {
  [ExchangeType.Etc]: "border-gray-400 text-gray-600",
  [ExchangeType.Bank]: "border-indigo-400 text-indigo-600",
  [ExchangeType.Wirebarley]: "border-teal-400 text-teal-600",
  [ExchangeType.Creditcard]: "border-violet-400 text-violet-600",
};

export function ExchangesPage() {
  const pagination = useCursorPagination();

  const { data, loading, error } = useGetExchangeListQuery({
    variables: { first: PAGE_SIZE, after: pagination.cursor },
  });

  const exchanges = data?.exchangeRelay?.edges ?? [];
  const pageInfo = data?.exchangeRelay?.pageInfo;
  const totalCount = data?.exchangeRelay?.totalCount ?? 0;

  // Compute average ratio_per_krw for entries that have it
  const ratios = exchanges
    .map((e) => e.node.ratioPerKrw)
    .filter((r): r is string => r != null && r !== "");
  const avgRatio =
    ratios.length > 0
      ? ratios
          .reduce((acc, r) => acc.plus(new Decimal(r)), new Decimal(0))
          .div(ratios.length)
          .toFixed(2)
      : null;

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
        환전 내역을 불러오지 못했습니다: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">환전 내역</h1>
          <p className="text-muted-foreground mt-1 text-sm">외화 환전 거래 내역</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/30">
                <Hash className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">총 환전 건수</p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-teal-100 p-2 dark:bg-teal-900/30">
                <TrendingUp className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">평균 환율 (이 페이지, ₩/USD)</p>
                <p className="text-2xl font-bold">
                  {avgRatio != null ? `₩ ${Number(avgRatio).toLocaleString("ko-KR")}` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>환전 목록</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={`skel-${i.toString()}`} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>출금</TableHead>
                  <TableHead>입금</TableHead>
                  <TableHead>환율 (₩/USD)</TableHead>
                  <TableHead>구분</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchanges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-12 text-center">
                      <ArrowLeftRight className="mx-auto mb-2 h-8 w-8 opacity-40" />
                      환전 내역이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  exchanges.map((edge) => {
                    const ex = edge.node;
                    const fromCurrency = ex.fromCurrency as string as CurrencyType;
                    const toCurrency = ex.toCurrency as string as CurrencyType;
                    return (
                      <TableRow key={ex.id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                          {formatDate(ex.date)}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-mono font-medium text-red-600 dark:text-red-400">
                            {formatCurrency(ex.fromAmount, fromCurrency)}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {ex.fromTransaction.account.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-mono font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(ex.toAmount, toCurrency)}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {ex.toTransaction.account.name}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {ex.ratioPerKrw != null ? (
                            `₩ ${Number(ex.ratioPerKrw).toLocaleString("ko-KR", { minimumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${EXCHANGE_TYPE_COLORS[ex.exchangeType]}`}
                          >
                            {EXCHANGE_TYPE_LABELS[ex.exchangeType]}
                          </Badge>
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
      <PaginationControls
        currentPage={pagination.currentPage}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        canPrev={pagination.canPrev}
        canNext={!!pageInfo?.hasNextPage}
        onPrev={pagination.goPrev}
        onNext={() => pagination.goNext(pageInfo?.endCursor)}
      />
    </div>
  );
}
