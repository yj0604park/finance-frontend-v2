import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AccountType,
  useGetAccountDetailQuery,
  useGetTransactionListQuery,
  useUpdateAccountMutation,
} from "@/graphql/generated/graphql";
import { formatCurrency, formatDate, getDisplayColor } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { CalendarDays, CheckCircle2, Hash, Landmark, Pencil, Plus, TrendingUp } from "lucide-react";
import { BulkTransactionForm } from "@/features/transactions/bulk-transaction-form";
import { StockTransactionForm } from "@/features/transactions/stock-transaction-form";
import {
  useGetAccountStockTransactionsQuery,
} from "@/graphql/generated/graphql";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import { TransactionTable } from "@/components/shared/transaction-table";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { toggleReviewed } from "@/lib/review";

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

export function AccountDetailPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [showStockForm, setShowStockForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showUnreviewedOnly, setShowUnreviewedOnly] = useState(false);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [localReviewed, setLocalReviewed] = useState<Map<string, boolean>>(new Map());
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const decodedId = accountId ? decodeURIComponent(accountId) : undefined;

  const { data: accountData, loading: accountLoading, refetch: refetchAccount } = useGetAccountDetailQuery({
    variables: { accountId: decodedId ?? null },
    skip: !decodedId,
  });

  const [updateAccount] = useUpdateAccountMutation();

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

  const isStockAccount = accountData?.accountRelay?.edges?.[0]?.node?.type === AccountType.Stock;

  const {
    data: stockTxData,
    refetch: refetchStockTransactions,
  } = useGetAccountStockTransactionsQuery({
    variables: { accountId: decodedId ?? null, first: 100, after: "" },
    skip: !decodedId || !isStockAccount,
  });

  const account = accountData?.accountRelay?.edges?.[0]?.node;
  const allTransactions = txData?.transactionRelay?.edges ?? [];
  const currency = txData?.accountRelay?.edges?.[0]?.node?.currency ?? account?.currency ?? "KRW";
  const pageInfo = txData?.transactionRelay?.pageInfo;
  const totalCount = txData?.transactionRelay?.totalCount ?? 0;
  const currentPage = cursorStack.length + 1;

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

  const headerBadges = account
    ? [
        { label: account.bank.name, variant: "outline" as const },
        { label: ACCOUNT_TYPE_LABELS[account.type] || account.type, variant: "secondary" as const },
        ...(!account.isActive ? [{ label: "비활성", variant: "destructive" as const }] : []),
        ...(account.firstAdded ? [{ label: "첫 거래부터", variant: "outline" as const, className: "text-green-600 border-green-600" }] : []),
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        onBack={() => navigate("/accounts")}
        title={account?.name ?? "Account"}
        loading={accountLoading}
        badges={headerBadges}
        actions={
          account ? (
            <Button variant="ghost" size="icon" onClick={() => setShowEditDialog(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          ) : undefined
        }
      />

      {/* Account Summary */}
      {account && (
        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            icon={Landmark}
            label="잔액"
            value={formatCurrency(account.amount, account.currency)}
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
            valueColor={getDisplayColor(account.amount)}
          />
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-lg p-2 bg-muted">
                  <CalendarDays className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">거래 기간</p>
                  <p className="truncate text-base font-semibold">
                    {account.firstTransaction ?? "—"} ~ {account.lastTransaction ?? "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <StatsCard
            icon={Hash}
            label="총 거래 수"
            value={totalCount > 0 ? totalCount : "—"}
          />
        </div>
      )}

      {showForm && decodedId && (
        <BulkTransactionForm
          accountId={decodedId}
          currency={currency}
          defaultDate={account?.lastTransaction ?? new Date().toISOString().slice(0, 10)}
          onSuccess={() => {
            setShowForm(false);
            refetchTransactions();
            refetchAccount();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {showStockForm && decodedId && (
        <StockTransactionForm
          accountId={decodedId}
          currency={currency}
          defaultDate={account?.lastTransaction ?? new Date().toISOString().slice(0, 10)}
          onSuccess={() => {
            setShowStockForm(false);
            refetchStockTransactions();
          }}
          onCancel={() => setShowStockForm(false)}
        />
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
                className="shrink-0"
              />
              <Label htmlFor="unreviewed-filter" className="text-sm cursor-pointer">
                미검토만
              </Label>
            </div>
            {isStockAccount && (
              <Button size="sm" variant="outline" onClick={() => setShowStockForm(true)}>
                <TrendingUp className="mr-1 h-4 w-4" />
                주식 거래 추가
              </Button>
            )}
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="mr-1 h-4 w-4" />
              거래 추가
            </Button>
          </div>
        </CardHeader>
        <TransactionTable
          transactions={transactions}
          loading={txLoading}
          currency={currency}
          columns={{
            reviewToggle: true,
            reviewBidirectional: true,
            account: false,
            retailer: true,
            category: true,
            balance: true,
            note: true,
            flags: true,
          }}
          review={{
            localReviewed,
            toggling,
            onToggle: (id) => { void handleToggleReviewed(id); },
          }}
          onRowClick={(id) => navigate(`/transactions/${encodeURIComponent(id)}`)}
          emptyMessage={showUnreviewedOnly ? "모든 거래가 검토 완료되었습니다!" : "거래 내역이 없습니다"}
          skeletonRows={5}
        />
        {totalCount > PAGE_SIZE && (
          <CardContent className="border-t px-4 py-3">
            <PaginationControls
              currentPage={currentPage}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              canPrev={cursorStack.length > 0}
              canNext={!!pageInfo?.hasNextPage}
              onPrev={handlePrevPage}
              onNext={handleNextPage}
            />
          </CardContent>
        )}
      </Card>

      {isStockAccount && (
        <StockTransactionsSection data={stockTxData} />
      )}

      {account && (
        <EditAccountDialog
          account={account}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSave={async (values) => {
            await updateAccount({ variables: { id: account.id, ...values } });
            refetchAccount();
            setShowEditDialog(false);
          }}
        />
      )}
    </div>
  );
}

type StockTxData = ReturnType<typeof useGetAccountStockTransactionsQuery>["data"];

function StockTransactionsSection({ data }: { data: StockTxData }) {
  const navigate = useNavigate();
  const edges = data?.stockTransactionRelay?.edges ?? [];
  const totalCount = data?.stockTransactionRelay?.totalCount ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          주식 거래 내역
          {totalCount > 0 && (
            <Badge variant="secondary" className="text-xs">{totalCount}건</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {edges.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">주식 거래 내역이 없습니다.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>날짜</TableHead>
                <TableHead>종목</TableHead>
                <TableHead className="text-right">수량</TableHead>
                <TableHead className="text-right">단가</TableHead>
                <TableHead className="text-right">총액</TableHead>
                <TableHead className="text-right">잔고</TableHead>
                <TableHead>연결</TableHead>
                <TableHead>메모</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {edges.map(({ node: st }) => {
                const sharesNum = Number(st.shares);
                const isBuy = sharesNum > 0;
                return (
                  <TableRow
                    key={st.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/stock-transactions/${encodeURIComponent(st.id)}`)}
                  >
                    <TableCell className="text-sm whitespace-nowrap">{formatDate(st.date)}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground mr-1">{st.stock.ticker}</span>
                      <span className="text-sm">{st.stock.name}</span>
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm ${isBuy ? "text-blue-600" : "text-orange-500"}`}>
                      {sharesNum > 0 ? "+" : ""}{sharesNum}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(st.price, st.stock.currency)}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm ${Number(st.amount) < 0 ? "text-red-500" : "text-green-600"}`}>
                      {formatCurrency(st.amount, st.stock.currency)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {st.balance ? formatCurrency(st.balance, st.stock.currency) : "—"}
                    </TableCell>
                    <TableCell>
                      {st.relatedTransaction ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">미연결</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{st.note ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}



interface EditAccountDialogProps {
  account: {
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    firstAdded: boolean;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: { name: string; type: AccountType; isActive: boolean; firstAdded: boolean }) => Promise<void>;
}

function EditAccountDialog({ account, open, onOpenChange, onSave }: EditAccountDialogProps) {
  const [name, setName] = useState(account.name);
  const [type, setType] = useState<AccountType>(account.type as AccountType);
  const [isActive, setIsActive] = useState(account.isActive);
  const [firstAdded, setFirstAdded] = useState(account.firstAdded);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ name, type, isActive, firstAdded });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>계좌 수정</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="edit-name">이름</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-type">계좌 유형</Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger id="edit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="edit-active">활성 계좌</Label>
            <Switch id="edit-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="edit-first-added">첫 거래부터 기록</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                첫 거래부터 차근차근 쌓고 있으면 ON, 아직 초기 내역 미입력이면 OFF
              </p>
            </div>
            <Switch id="edit-first-added" checked={firstAdded} onCheckedChange={setFirstAdded} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
