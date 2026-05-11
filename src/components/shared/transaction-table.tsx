import { CheckCircle2 } from "lucide-react";
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
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate, getDisplayColor } from "@/lib/format";
import { ReviewToggle } from "@/components/shared/review-toggle";
import { TableSkeleton } from "@/components/shared/table-skeleton";

/** Minimal transaction shape required by this table. */
export interface TransactionRow {
  id: string;
  date: string;
  amount: string;
  type: string;
  note?: string | null;
  isInternal?: boolean | null;
  reviewed?: boolean | null;
  requiresDetail?: boolean | null;
  balance?: string | null;
  account?: { name: string; currency: string; bank: { name: string } };
  retailer?: { name: string } | null;
}

export interface TransactionTableColumns {
  /** Review toggle button (left-most). Default: false */
  reviewToggle?: boolean;
  /** Bidirectional toggle (can un-review). Default: false (unidirectional) */
  reviewBidirectional?: boolean;
  /** Show account name + bank. Default: true */
  account?: boolean;
  /** Hide account on mobile (hidden sm:table-cell). Default: false */
  accountMobileHidden?: boolean;
  /** Show retailer name. Default: true */
  retailer?: boolean;
  /** Show category badge. Default: true */
  category?: boolean;
  /** Hide category on mobile. Default: false */
  categoryMobileHidden?: boolean;
  /** Show running balance. Default: false */
  balance?: boolean;
  /** Show note. Default: true */
  note?: boolean;
  /** Hide note on tablet and above. Default: false */
  noteMobileHidden?: boolean;
  /** Show internal/requiresDetail flags. Default: true */
  flags?: boolean;
  /** Hide flags on tablet. Default: false */
  flagsMobileHidden?: boolean;
}

export interface ReviewState {
  localReviewed: Map<string, boolean>;
  toggling: Set<string>;
  onToggle: (id: string) => void;
}

interface TransactionTableProps {
  transactions: Array<{ node: TransactionRow }>;
  loading?: boolean;
  /** Currency override; if omitted, derived from each row's account.currency */
  currency?: string;
  columns?: TransactionTableColumns;
  review?: ReviewState;
  onRowClick?: (id: string) => void;
  title?: string;
  emptyMessage?: string;
  skeletonRows?: number;
}

const DEFAULT_COLS: Required<TransactionTableColumns> = {
  reviewToggle: false,
  reviewBidirectional: false,
  account: true,
  accountMobileHidden: false,
  retailer: true,
  category: true,
  categoryMobileHidden: false,
  balance: false,
  note: true,
  noteMobileHidden: false,
  flags: true,
  flagsMobileHidden: false,
};

function hiddenClass(hidden: boolean, breakpoint: "sm" | "md") {
  return hidden ? `hidden ${breakpoint}:table-cell` : "";
}

export function TransactionTable({
  transactions,
  loading,
  currency: currencyProp,
  columns: colsProp,
  review,
  onRowClick,
  title,
  emptyMessage = "거래 내역이 없습니다",
  skeletonRows = 6,
}: TransactionTableProps) {
  const cols = { ...DEFAULT_COLS, ...colsProp };

  // Count visible columns for empty-state colSpan
  const colCount = [
    cols.reviewToggle,
    true, // date always shown
    cols.retailer,
    cols.account,
    cols.category,
    true, // amount always shown
    cols.balance,
    cols.note,
    cols.flags,
  ].filter(Boolean).length;

  const content = loading ? (
    <TableSkeleton rows={skeletonRows} />
  ) : (
    <Table>
      <TableHeader>
        <TableRow>
          {cols.reviewToggle && <TableHead className="w-10">검토</TableHead>}
          <TableHead>날짜</TableHead>
          {cols.retailer && <TableHead>가맹점</TableHead>}
          {cols.account && (
            <TableHead className={hiddenClass(cols.accountMobileHidden, "sm")}>
              계좌
            </TableHead>
          )}
          {cols.category && (
            <TableHead className={hiddenClass(cols.categoryMobileHidden, "sm")}>
              분류
            </TableHead>
          )}
          <TableHead className="text-right">금액</TableHead>
          {cols.balance && <TableHead className="text-right">잔액</TableHead>}
          {cols.note && (
            <TableHead className={hiddenClass(cols.noteMobileHidden, "md")}>
              메모
            </TableHead>
          )}
          {cols.flags && (
            <TableHead className={hiddenClass(cols.flagsMobileHidden, "md")}>
              플래그
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={colCount}
              className="py-12 text-center text-muted-foreground"
            >
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500" />
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          transactions.map(({ node: tx }) => {
            const currency = currencyProp ?? tx.account?.currency ?? "KRW";
            const isReviewed = review?.localReviewed.has(tx.id)
              ? (review.localReviewed.get(tx.id) ?? tx.reviewed ?? false)
              : (tx.reviewed ?? false);
            const isToggling = review?.toggling.has(tx.id) ?? false;

            return (
              <TableRow
                key={tx.id}
                className={[
                  onRowClick ? "cursor-pointer hover:bg-muted/50" : "",
                  isReviewed && !cols.reviewToggle ? "opacity-50" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onRowClick?.(tx.id)}
              >
                {cols.reviewToggle && review && (
                  <TableCell>
                    <ReviewToggle
                      id={tx.id}
                      isReviewed={isReviewed}
                      isToggling={isToggling}
                      onToggle={(id) => {
                        review.onToggle(id);
                      }}
                      bidirectional={cols.reviewBidirectional}
                    />
                  </TableCell>
                )}
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDate(tx.date)}
                </TableCell>
                {cols.retailer && (
                  <TableCell className="max-w-32 truncate">
                    {tx.retailer?.name ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                )}
                {cols.account && (
                  <TableCell className={hiddenClass(cols.accountMobileHidden, "sm")}>
                    <div className="font-medium">{tx.account?.name ?? "—"}</div>
                    <div className="text-sm text-muted-foreground">
                      {tx.account?.bank.name ?? ""}
                    </div>
                  </TableCell>
                )}
                {cols.category && (
                  <TableCell className={hiddenClass(cols.categoryMobileHidden, "sm")}>
                    <Badge variant="outline">
                      {CATEGORY_LABELS[tx.type] ?? tx.type}
                    </Badge>
                  </TableCell>
                )}
                <TableCell
                  className={`text-right font-mono ${getDisplayColor(tx.amount)}`}
                >
                  {formatCurrency(tx.amount, currency)}
                </TableCell>
                {cols.balance && (
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {tx.balance ? formatCurrency(tx.balance, currency) : "—"}
                  </TableCell>
                )}
                {cols.note && (
                  <TableCell
                    className={`${hiddenClass(cols.noteMobileHidden, "md")} max-w-40 truncate text-muted-foreground`}
                  >
                    {tx.note ?? ""}
                  </TableCell>
                )}
                {cols.flags && (
                  <TableCell className={hiddenClass(cols.flagsMobileHidden, "md")}>
                    <div className="flex flex-wrap gap-1">
                      {tx.isInternal && (
                        <Badge variant="secondary" className="text-xs">
                          Internal
                        </Badge>
                      )}
                      {tx.requiresDetail && (
                        <Badge
                          variant="outline"
                          className="border-amber-400 text-xs text-amber-700"
                        >
                          세부 필요
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  if (title) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">{content}</CardContent>
      </Card>
    );
  }

  return <CardContent className="p-0">{content}</CardContent>;
}
