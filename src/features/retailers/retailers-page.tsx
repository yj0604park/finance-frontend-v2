import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  useCreateRetailerMutation,
  RetailerType,
  TransactionCategory,
} from "@/graphql/generated/graphql";
import { useAllTransactions } from "@/hook/useAllTransactions";
import { formatCurrency, toNumber } from "@/lib/format";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Decimal } from "decimal.js";

// 가맹점 분석에서 제외할 거래 카테고리 (자산 이동성 거래)
const EXCLUDED_CATEGORIES = new Set([
  TransactionCategory.Transfer,
  TransactionCategory.Stock,
]);

const RETAILER_TYPES: { value: RetailerType; label: string }[] = [
  { value: RetailerType.Restaurant, label: "음식점" },
  { value: RetailerType.Store, label: "가게/쇼핑" },
  { value: RetailerType.Service, label: "서비스" },
  { value: RetailerType.Bank, label: "은행/금융" },
  { value: RetailerType.Income, label: "수입" },
  { value: RetailerType.Person, label: "개인" },
  { value: RetailerType.Etc, label: "기타" },
];

const CATEGORIES: { value: TransactionCategory; label: string }[] = [
  { value: TransactionCategory.EatOut, label: "외식" },
  { value: TransactionCategory.Grocery, label: "식료품" },
  { value: TransactionCategory.Clothing, label: "의류" },
  { value: TransactionCategory.Transportation, label: "교통" },
  { value: TransactionCategory.Medical, label: "의료" },
  { value: TransactionCategory.Leisure, label: "여가" },
  { value: TransactionCategory.Service, label: "서비스" },
  { value: TransactionCategory.Membership, label: "멤버십" },
  { value: TransactionCategory.Housing, label: "주거" },
  { value: TransactionCategory.DailyNecessity, label: "생필품" },
  { value: TransactionCategory.Income, label: "수입" },
  { value: TransactionCategory.Transfer, label: "이체" },
  { value: TransactionCategory.Stock, label: "주식" },
  { value: TransactionCategory.Cash, label: "현금" },
  { value: TransactionCategory.Etc, label: "기타" },
];

function CreateRetailerDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<RetailerType>(RetailerType.Etc);
  const [category, setCategory] = useState<TransactionCategory>(TransactionCategory.Etc);

  const [createRetailer, { loading }] = useCreateRetailerMutation({
    onCompleted: () => {
      setOpen(false);
      setName("");
      setType(RetailerType.Etc);
      setCategory(TransactionCategory.Etc);
      onCreated();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    createRetailer({ variables: { name, type, category } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" size="sm">
          <Plus className="h-4 w-4" />
          가맹점 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>새 가맹점 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="retailer-name">가맹점명</Label>
            <Input
              id="retailer-name"
              placeholder="예: 스타벅스"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retailer-type">유형</Label>
            <Select value={type} onValueChange={(v) => setType(v as RetailerType)}>
              <SelectTrigger id="retailer-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RETAILER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="retailer-category">거래 분류</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as TransactionCategory)}>
              <SelectTrigger id="retailer-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>취소</Button>
            <Button type="submit" disabled={loading || !name}>
              {loading ? "저장 중..." : "저장"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RetailersPage() {
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [currency, setCurrency] = useState<string>("USD");

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
  const isThisMonth = year === today.getFullYear() && month === today.getMonth() + 1;

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  const { edges: transactions, loading, error } = useAllTransactions({
    accountId: null,
    dateGte: startDate || null,
    dateLte: endDate || null,
  });

  const retailerSummary = useMemo(() => {
    const map: Record<string, { id: string; name: string; spending: Decimal; income: Decimal; count: number }> = {};

    for (const edge of transactions) {
      const tx = edge.node;
      if (tx.account.currency !== currency || tx.isInternal || EXCLUDED_CATEGORIES.has(tx.type)) continue;
      const name = tx.retailer?.name ?? "(No Retailer)";
      const key = tx.retailer?.id ?? "__none__";

      if (!map[key]) {
        map[key] = { id: key, name, spending: new Decimal(0), income: new Decimal(0), count: 0 };
      }
      const amount = new Decimal(tx.amount);
      if (amount.isNegative()) {
        map[key].spending = map[key].spending.plus(amount.abs());
      } else {
        map[key].income = map[key].income.plus(amount);
      }
      map[key].count += 1;
    }

    return Object.values(map)
      .sort((a, b) => b.spending.comparedTo(a.spending));
  }, [transactions, currency]);

  const top10 = retailerSummary.slice(0, 10);
  const chartData = top10.map((r) => ({
    name: r.name.length > 15 ? `${r.name.slice(0, 15)}…` : r.name,
    spending: toNumber(r.spending.toString()),
  }));

  const totalSpending = retailerSummary.reduce(
    (acc, r) => acc.plus(r.spending),
    new Decimal(0),
  );

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
        Failed to load data: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retailers</h1>
          <p className="text-muted-foreground mt-1 text-sm">가맹점별 지출 분석</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm">{retailerSummary.length}개 가맹점</Badge>
          <CreateRetailerDialog onCreated={() => {}} />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <div className="w-32">
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="KRW">KRW</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="w-20 text-center text-sm font-medium">
              {year}-{String(month).padStart(2, "0")}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth} disabled={isThisMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <>
          {/* Bar chart - top 10 */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Retailers by Spending</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) =>
                        currency === "USD" ? `$${(v / 1000).toFixed(0)}k` : `₩${(v / 10000).toFixed(0)}만`
                      }
                    />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) =>
                        [formatCurrency(value.toString(), currency), "Spending"]
                      }
                    />
                    <Bar dataKey="spending" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Full table */}
          <Card>
            <CardHeader>
              <CardTitle>
                All Retailers
                <Badge variant="outline" className="ml-2 font-normal">
                  Total {formatCurrency(totalSpending.toString(), currency)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Retailer</TableHead>
                    <TableHead className="text-right">Spending</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Txn Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retailerSummary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No data
                      </TableCell>
                    </TableRow>
                  ) : (
                    retailerSummary.map((r) => (
                      <TableRow
                        key={r.name}
                        className={r.id !== "__none__" ? "cursor-pointer hover:bg-muted/50" : ""}
                        onClick={() => {
                          if (r.id !== "__none__") navigate(`/retailers/${encodeURIComponent(r.id)}`);
                        }}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {r.name}
                            {r.id !== "__none__" && (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-red-600">
                          {r.spending.isZero() ? "—" : formatCurrency(r.spending.toString(), currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-foreground">
                          {r.income.isZero() ? "—" : formatCurrency(r.income.toString(), currency)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {r.count}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
