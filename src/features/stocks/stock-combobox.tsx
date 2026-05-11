import { useState } from "react";
import { useStockOptions, type StockOption } from "@/hooks/use-stock-options";
import { useCreateStockMutation, CurrencyType } from "@/graphql/generated/graphql";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

interface StockComboboxProps {
  value: string | null;
  onChange: (stock: StockOption | null) => void;
  disabled?: boolean;
}

export function StockCombobox({ value, onChange, disabled }: StockComboboxProps) {
  const { stocks, loading, addStock } = useStockOptions();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const selected = stocks.find((s) => s.id === value) ?? null;

  const filtered = search
    ? stocks.filter(
        (s) =>
          s.ticker.toLowerCase().includes(search.toLowerCase()) ||
          s.name.toLowerCase().includes(search.toLowerCase()),
      )
    : stocks;

  function handleSelect(stock: StockOption) {
    onChange(stock);
    setOpen(false);
    setSearch("");
    setShowCreate(false);
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setSearch(""); setShowCreate(false); } }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled || loading}
          className="flex h-8 w-48 items-center justify-between rounded border border-input bg-background px-2 text-sm disabled:opacity-50"
        >
          <span className={selected ? "" : "text-muted-foreground"}>
            {selected ? `${selected.ticker} - ${selected.name}` : "종목 선택"}
          </span>
          <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        {showCreate ? (
          <CreateStockForm
            onSuccess={(stock) => {
              addStock(stock);
              handleSelect(stock);
            }}
            onCancel={() => setShowCreate(false)}
          />
        ) : (
          <>
            <Input
              autoFocus
              placeholder="ticker 또는 종목명 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2 h-7 text-xs"
            />
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">결과 없음</p>
              ) : (
                filtered.map((stock) => (
                  <button
                    key={stock.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => handleSelect(stock)}
                  >
                    <Check
                      className={`h-3 w-3 shrink-0 ${value === stock.id ? "opacity-100" : "opacity-0"}`}
                    />
                    <span className="font-mono text-xs text-muted-foreground w-14 shrink-0">
                      {stock.ticker}
                    </span>
                    <span className="truncate">{stock.name}</span>
                  </button>
                ))
              )}
            </div>
            <div className="mt-1 border-t pt-1">
              <button
                type="button"
                className="flex w-full items-center gap-1 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-3 w-3" />
                새 종목 추가
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function CreateStockForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (stock: StockOption) => void;
  onCancel: () => void;
}) {
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<CurrencyType>(CurrencyType.Usd);
  const [saving, setSaving] = useState(false);
  const [createStock] = useCreateStockMutation();

  async function handleSubmit() {
    if (!name) return;
    setSaving(true);
    try {
      const result = await createStock({
        variables: { name, ticker: ticker || null, currency },
      });
      const node = result.data?.createStock;
      if (node) {
        onSuccess({
          id: node.id,
          ticker: node.ticker ?? "",
          name: node.name,
          currency: node.currency,
        });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">새 종목</p>
      <div className="space-y-1">
        <Label className="text-xs">Ticker</Label>
        <Input
          autoFocus
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="MSFT"
          className="h-7 text-xs"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">종목명</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Microsoft"
          className="h-7 text-xs"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">통화</Label>
        <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyType)}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(CurrencyType).map((c) => (
              <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-1 pt-1">
        <Button type="button" variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={onCancel}>
          취소
        </Button>
        <Button type="button" size="sm" className="flex-1 text-xs h-7" onClick={handleSubmit} disabled={saving || !name}>
          {saving ? "..." : "추가"}
        </Button>
      </div>
    </div>
  );
}
