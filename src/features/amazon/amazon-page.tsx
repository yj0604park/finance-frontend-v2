import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  useGetAmazonOrdersQuery,
  useCreateAmazonOrderMutation,
  useGetAllTransactionsQuery,
} from "@/graphql/generated/graphql";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Package, RotateCcw, Link2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subMonths } from "date-fns";

const PAGE_SIZE = 30;

function CreateAmazonOrderDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [item, setItem] = useState("");
  const [transactionId, setTransactionId] = useState<string>("none");
  const [isReturned, setIsReturned] = useState(false);

  const threeMonthsAgo = format(subMonths(new Date(), 3), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: txData } = useGetAllTransactionsQuery({
    variables: {
      first: 200,
      after: "",
      accountId: null,
      dateGte: threeMonthsAgo,
      dateLte: today,
    },
    skip: !open,
  });

  const amazonTxs = txData?.transactionRelay?.edges ?? [];

  const [createOrder, { loading }] = useCreateAmazonOrderMutation({
    onCompleted: () => {
      setOpen(false);
      setItem("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setTransactionId("none");
      setIsReturned(false);
      onCreated();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !date) return;
    createOrder({
      variables: {
        date,
        item,
        isReturned,
        transactionId: transactionId === "none" ? null : transactionId,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          주문 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Amazon 주문 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="order-date">날짜</Label>
            <Input
              id="order-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="order-item">상품명</Label>
            <Input
              id="order-item"
              placeholder="주문한 상품을 입력하세요"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="order-tx">연결할 거래</Label>
            <Select value={transactionId} onValueChange={setTransactionId}>
              <SelectTrigger id="order-tx">
                <SelectValue placeholder="거래 선택 (선택사항)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">연결 안함</SelectItem>
                {amazonTxs.map((e) => (
                  <SelectItem key={e.node.id} value={e.node.id}>
                    {format(parseISO(e.node.date), "MM/dd")} —{" "}
                    {formatCurrency(e.node.amount, e.node.account.currency)}{" "}
                    {e.node.retailer?.name ?? ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="order-returned"
              type="checkbox"
              checked={isReturned}
              onChange={(e) => setIsReturned(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-primary"
            />
            <Label htmlFor="order-returned">반품됨</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={loading || !item}>
              {loading ? "저장 중..." : "저장"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AmazonPage() {
  const [cursor, setCursor] = useState<string>("");
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const { data, loading, error, refetch } = useGetAmazonOrdersQuery({
    variables: { first: PAGE_SIZE, after: cursor },
  });

  const orders = data?.amazonOrderRelay?.edges ?? [];
  const pageInfo = data?.amazonOrderRelay?.pageInfo;
  const totalCount = data?.amazonOrderRelay?.totalCount ?? 0;

  function handleNext() {
    if (pageInfo?.endCursor) {
      setCursorStack((prev) => [...prev, cursor]);
      setCursor(pageInfo.endCursor ?? "");
    }
  }

  function handlePrev() {
    const stack = [...cursorStack];
    const prev = stack.pop() ?? "";
    setCursorStack(stack);
    setCursor(prev);
  }

  // Note: counts are page-scoped (current 30 items) — server doesn't provide filtered totals
  const linkedCount = orders.filter((e) => e.node.transaction !== null).length;
  const returnedCount = orders.filter((e) => e.node.isReturned).length;

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
        Failed to load orders: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Amazon Orders</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Amazon 주문 내역 관리
          </p>
        </div>
        <CreateAmazonOrderDialog onCreated={() => refetch()} />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-violet-100 p-2 dark:bg-violet-900/30">
                <Package className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">총 주문</p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/30">
                <Link2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">거래 연결됨 (이 페이지)</p>
                <p className="text-2xl font-bold">{linkedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
                <RotateCcw className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">반품 (이 페이지)</p>
                <p className="text-2xl font-bold">{returnedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>주문 목록</CardTitle>
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
                  <TableHead>상품명</TableHead>
                  <TableHead>연결된 거래</TableHead>
                  <TableHead>금액</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-12"
                    >
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      주문 내역이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((edge) => {
                    const order = edge.node;
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(order.date)}
                        </TableCell>
                        <TableCell className="text-sm font-medium max-w-xs">
                          {order.item}
                        </TableCell>
                        <TableCell className="text-sm">
                          {order.transaction ? (
                            <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                              <Link2 className="h-3.5 w-3.5" />
                              연결됨
                            </span>
                          ) : (
                            <span className="text-muted-foreground">미연결</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {order.transaction ? (
                            formatCurrency(
                              order.transaction.amount,
                              order.transaction.account.currency,
                            )
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {order.isReturned ? (
                            <Badge
                              variant="outline"
                              className="text-xs border-orange-400 text-orange-600"
                            >
                              반품
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs border-green-400 text-green-700"
                            >
                              정상
                            </Badge>
                          )}
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
          페이지 {cursorStack.length + 1} · {orders.length} / {totalCount}
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
