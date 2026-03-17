import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function toggleSign(v: string): string {
  if (!v || v === "-" || v === "0") return v;
  return v.startsWith("-") ? v.slice(1) : `-${v}`;
}

export function AmountInput({ value, onChange, disabled }: AmountInputProps) {
  const isNegative = value.startsWith("-");

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "-") {
      e.preventDefault();
      onChange(toggleSign(value));
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === "" || raw === "-") {
      onChange(raw);
      return;
    }
    if (/^-?\d*\.?\d*$/.test(raw)) {
      onChange(raw);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-8 shrink-0 px-0 font-mono text-sm"
        onClick={() => onChange(toggleSign(value))}
        disabled={disabled}
        tabIndex={-1}
      >
        {isNegative ? "-" : "+"}
      </Button>
      <Input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="h-8 w-24 text-right text-sm font-mono"
        placeholder="0"
      />
    </div>
  );
}
