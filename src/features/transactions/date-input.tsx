import { parseISO } from "date-fns";

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function addDays(dateStr: string, delta: number): string {
  try {
    const d = parseISO(dateStr);
    d.setDate(d.getDate() + delta);
    return d.toISOString().slice(0, 10);
  } catch {
    return dateStr;
  }
}

export function DateInput({ value, onChange, disabled }: DateInputProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className="flex h-8 items-center rounded border px-1 text-xs hover:bg-muted disabled:opacity-50"
        onClick={() => onChange(addDays(value, -1))}
        disabled={disabled}
        tabIndex={-1}
      >
        &#9664;
      </button>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded border border-input bg-background px-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        disabled={disabled}
      />
      <button
        type="button"
        className="flex h-8 items-center rounded border px-1 text-xs hover:bg-muted disabled:opacity-50"
        onClick={() => onChange(addDays(value, 1))}
        disabled={disabled}
        tabIndex={-1}
      >
        &#9654;
      </button>
    </div>
  );
}
