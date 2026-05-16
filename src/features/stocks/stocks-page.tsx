import { ChevronRight, Plus, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CurrencyType,
  useCreateStockMutation,
  useGetStockListQuery,
} from "@/graphql/generated/graphql";

function CreateStockDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [currency, setCurrency] = useState<CurrencyType>(CurrencyType.Usd);

  const [createStock, { loading }] = useCreateStockMutation({
    onCompleted: () => {
      setOpen(false);
      setName("");
      setTicker("");
      setCurrency(CurrencyType.Usd);
      onCreated();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    createStock({
      variables: {
        name,
        ticker: ticker || null,
        currency,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          종목 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>새 종목 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stock-name">종목명</Label>
            <Input
              id="stock-name"
              placeholder="예: Apple Inc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-ticker">티커 (선택)</Label>
            <Input
              id="stock-ticker"
              placeholder="예: AAPL"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-currency">통화</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyType)}>
              <SelectTrigger id="stock-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CurrencyType.Usd}>USD</SelectItem>
                <SelectItem value={CurrencyType.Krw}>KRW</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={loading || !name}>
              {loading ? "저장 중..." : "저장"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StocksPage() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useGetStockListQuery();
  const stocks = data?.stockRelay?.edges ?? [];

  const usdStocks = stocks.filter((e) => e.node.currency === CurrencyType.Usd);
  const krwStocks = stocks.filter((e) => e.node.currency === CurrencyType.Krw);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
        Failed to load stocks: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Stocks</h1>
          <p className="text-muted-foreground mt-1 text-sm">주식 종목별 가격 기록 관리</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm">
            {data?.stockRelay?.totalCount ?? 0} 종목
          </Badge>
          <CreateStockDialog onCreated={() => refetch()} />
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/30">
                <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">USD 종목</p>
                <p className="text-2xl font-bold">{usdStocks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-violet-100 p-2 dark:bg-violet-900/30">
                <TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">KRW 종목</p>
                <p className="text-2xl font-bold">{krwStocks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock cards grid */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={`skel-${i.toString()}`} className="h-20" />
          ))}
        </div>
      ) : stocks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <TrendingUp className="h-10 w-10 mb-3 opacity-30" />
            <p>등록된 종목이 없습니다</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stocks.map((edge) => {
            const stock = edge.node;
            const isUsd = stock.currency === CurrencyType.Usd;
            return (
              <Card
                key={stock.id}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => navigate(`/stocks/${encodeURIComponent(stock.id)}`)}
              >
                <CardContent className="flex items-center justify-between pt-5 pb-5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-lg p-2 ${
                        isUsd
                          ? "bg-indigo-100 dark:bg-indigo-900/30"
                          : "bg-violet-100 dark:bg-violet-900/30"
                      }`}
                    >
                      <TrendingUp
                        className={`h-5 w-5 ${
                          isUsd
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "text-violet-600 dark:text-violet-400"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-mono font-bold text-base leading-tight">
                        {stock.ticker ?? stock.name}
                      </p>
                      {stock.ticker && (
                        <p className="text-muted-foreground text-xs truncate max-w-[140px]">
                          {stock.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        isUsd
                          ? "border-indigo-300 text-indigo-700 dark:text-indigo-400 text-xs"
                          : "border-violet-300 text-violet-700 dark:text-violet-400 text-xs"
                      }
                    >
                      {stock.currency}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
