import { useState, useRef, useEffect, useCallback } from "react";
import { useRetailerOptions } from "@/hooks/use-retailer-options";
import { CreateRetailerForm } from "@/features/retailers/create-retailer-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, X } from "lucide-react";

interface RetailerComboboxProps {
  value: string | null;
  onChange: (retailer: { id: string; name: string; category: string } | null) => void;
  disabled?: boolean;
}

export function RetailerCombobox({ value, onChange, disabled }: RetailerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { retailers, addRetailer } = useRetailerOptions();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = value ? retailers.find((r) => r.id === value) ?? null : null;

  const MAX_VISIBLE = 20;
  const trimmed = search.trim();
  const allMatches = trimmed
    ? retailers.filter((r) => r.name.toLowerCase().includes(trimmed.toLowerCase()))
    : [];
  const filtered = allMatches.slice(0, MAX_VISIBLE);
  const hasMore = allMatches.length > MAX_VISIBLE;

  useEffect(() => {
    if (open && !showCreateForm) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, showCreateForm]);

  function handleSelect(retailer: { id: string; name: string; category: string }) {
    onChange(retailer);
    setOpen(false);
    setSearch("");
    setShowCreateForm(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  const focusListItem = useCallback((index: number) => {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("button[data-item]");
    buttons?.[index]?.focus();
  }, []);

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0) handleSelect(filtered[0]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      focusListItem(0);
    }
  }

  function handleItemKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusListItem(index + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (index === 0) inputRef.current?.focus();
      else focusListItem(index - 1);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setSearch("");
      setShowCreateForm(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-8 w-full justify-between px-2 text-sm font-normal"
          type="button"
          onKeyDown={(e) => {
            if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
              setSearch(e.key);
              setOpen(true);
            }
          }}
        >
          <span className={selected ? "text-foreground" : "text-muted-foreground"}>
            {selected ? selected.name : "가맹점 선택"}
          </span>
          <span className="flex items-center gap-0.5">
            {selected && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClear(e as unknown as React.MouseEvent); }}
                onClick={handleClear}
                className="rounded p-0.5 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        {showCreateForm ? (
          <div className="p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">새 가맹점 추가</p>
            <CreateRetailerForm
              onSuccess={(retailer) => {
                addRetailer(retailer);
                handleSelect(retailer);
              }}
              onCancel={() => setShowCreateForm(false)}
              submitLabel="추가"
            />
          </div>
        ) : (
          <>
            <div className="border-b p-2">
              <Input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="검색..."
                className="h-7 text-sm"
              />
            </div>
            <ul ref={listRef} className="max-h-48 overflow-y-auto py-1">
              {!trimmed ? (
                <li className="px-3 py-4 text-center text-xs text-muted-foreground">검색어를 입력하세요</li>
              ) : filtered.length === 0 ? (
                <li>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-primary hover:bg-muted"
                    onClick={() => setShowCreateForm(true)}
                  >
                    + 새 가맹점 추가
                  </button>
                </li>
              ) : (
                <>
                  {filtered.map((r, i) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        data-item
                        className={`w-full px-3 py-1.5 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none ${
                          r.id === value ? "bg-muted/50 font-medium" : ""
                        }`}
                        onClick={() => handleSelect(r)}
                        onKeyDown={(e) => handleItemKeyDown(e, i)}
                      >
                        {r.name}
                      </button>
                    </li>
                  ))}
                  {hasMore && (
                    <li className="px-3 py-1.5 text-xs text-muted-foreground">
                      {allMatches.length - MAX_VISIBLE}개 더 있음 — 검색어를 구체화하세요
                    </li>
                  )}
                  <li className="border-t">
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-primary hover:bg-muted"
                      onClick={() => setShowCreateForm(true)}
                    >
                      + 새 가맹점 추가
                    </button>
                  </li>
                </>
              )}
            </ul>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
