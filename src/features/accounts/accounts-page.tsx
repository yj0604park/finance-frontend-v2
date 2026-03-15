import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AccountType,
  CurrencyType,
  useCreateAccountMutation,
  useGetAccountListQuery,
  useGetBankSimpleListQuery,
} from "@/graphql/generated/graphql";
import { formatCurrency, getDisplayColor } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { format, parseISO } from "date-fns";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CHECKING_ACCOUNT: "Checking",
  SAVINGS_ACCOUNT: "Savings",
  INSTALLMENT_SAVING: "Installment",
  TIME_DEPOSIT: "Time Deposit",
  CREDIT_CARD: "Credit Card",
  STOCK: "Stock",
  LOAN: "Loan",
};

export function AccountsPage() {
  const [searchParams] = useSearchParams();
  const [bankFilter, setBankFilter] = useState<string>(searchParams.get("bank") ?? "all");
  const [activeFilter, setActiveFilter] = useState<string>("active");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: bankData } = useGetBankSimpleListQuery();

  const isActiveFilter =
    activeFilter === "all"
      ? null
      : { exact: activeFilter === "active", inList: null, isNull: null };

  const { data, loading, error, refetch } = useGetAccountListQuery({
    variables: {
      after: "",
      bankId: bankFilter === "all" ? null : bankFilter,
      isActive: isActiveFilter,
    },
  });

  const navigate = useNavigate();
  const accounts = data?.accountRelay?.edges ?? [];
  const banks = bankData?.bankRelay?.edges ?? [];

  // 통화별 잔액 합계
  const balanceByCurrency = accounts.reduce<Record<string, number>>((acc, edge) => {
    const { currency, amount } = edge.node;
    acc[currency] = (acc[currency] ?? 0) + parseFloat(amount);
    return acc;
  }, {});

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
        Failed to load accounts: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
          <Badge variant="outline">{data?.accountRelay?.totalCount ?? 0} total</Badge>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          계좌 추가
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <div className="w-48">
            <Select value={bankFilter} onValueChange={setBankFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Banks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Banks</SelectItem>
                {banks.map((bank) => (
                  <SelectItem key={bank.node.id} value={bank.node.id}>
                    {bank.node.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!loading && Object.keys(balanceByCurrency).length > 0 && (
            <div className="ml-auto flex items-center gap-4">
              {Object.entries(balanceByCurrency).map(([currency, total]) => (
                <div key={currency} className="text-right">
                  <p className="text-xs text-muted-foreground">{currency} 합계</p>
                  <p className="text-sm font-bold">{formatCurrency(total.toString(), currency)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={`skel-${i.toString()}`} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>First Txn</TableHead>
                  <TableHead>Last Txn</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No accounts found
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((edge) => {
                    const account = edge.node;
                    return (
                      <TableRow
                        key={account.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/accounts/${encodeURIComponent(account.id)}`)}
                      >
                        <TableCell className="font-medium">{account.name}</TableCell>
                        <TableCell>{account.bank.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {ACCOUNT_TYPE_LABELS[account.type] || account.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{account.currency}</TableCell>
                        <TableCell className={`text-right font-mono ${getDisplayColor(account.amount)}`}>
                          {formatCurrency(account.amount, account.currency)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {account.firstTransaction ? formatDate(account.firstTransaction) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {account.lastTransaction ? formatDate(account.lastTransaction) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={account.isActive ? "default" : "secondary"}>
                            {account.isActive ? "Active" : "Inactive"}
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
      <CreateAccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        banks={banks}
        defaultBankId={bankFilter !== "all" ? bankFilter : undefined}
        onCreated={() => {
          setDialogOpen(false);
          void refetch();
        }}
      />
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "yyyy-MM-dd");
  } catch {
    return dateStr;
  }
}

function CreateAccountDialog({
  open,
  onOpenChange,
  banks,
  defaultBankId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banks: Array<{ node: { id: string; name: string } }>;
  defaultBankId?: string;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [bankId, setBankId] = useState(defaultBankId ?? "");
  const [type, setType] = useState<AccountType>(AccountType.CheckingAccount);
  const [currency, setCurrency] = useState<CurrencyType>(CurrencyType.Krw);
  const [createAccount, { loading }] = useCreateAccountMutation();

  useEffect(() => {
    if (open) {
      setName("");
      setBankId(defaultBankId ?? "");
      setType(AccountType.CheckingAccount);
      setCurrency(CurrencyType.Krw);
    }
  }, [open, defaultBankId]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !bankId) return;
    await createAccount({ variables: { name: name.trim(), bankId, type, currency } });
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>계좌 추가</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>계좌명</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="계좌명 입력" />
          </div>
          <div className="space-y-1.5">
            <Label>은행</Label>
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger>
                <SelectValue placeholder="은행 선택" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b.node.id} value={b.node.id}>
                    {b.node.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>종류</Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>통화</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CurrencyType.Krw}>KRW</SelectItem>
                <SelectItem value={CurrencyType.Usd}>USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim() || !bankId}>
            {loading ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
