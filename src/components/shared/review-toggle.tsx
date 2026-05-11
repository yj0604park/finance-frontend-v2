import { CheckCircle2, Circle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewToggleProps {
  id: string;
  isReviewed: boolean;
  isToggling: boolean;
  onToggle: (id: string) => void;
  /** If false, already-reviewed items cannot be toggled back */
  bidirectional?: boolean;
  size?: "sm" | "md";
}

export function ReviewToggle({
  id,
  isReviewed,
  isToggling,
  onToggle,
  bidirectional = false,
  size = "sm",
}: ReviewToggleProps) {
  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const isDisabled = isToggling || (!bidirectional && isReviewed);

  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      disabled={isDisabled}
      className={cn(
        "transition-colors disabled:opacity-40",
        isReviewed
          ? "text-green-500 hover:text-green-600"
          : "text-muted-foreground hover:text-primary",
      )}
      title={isReviewed ? "검토 완료" : "검토 완료로 표시"}
    >
      {isToggling ? (
        <RefreshCw className={cn(iconClass, "animate-spin")} />
      ) : isReviewed ? (
        <CheckCircle2 className={iconClass} />
      ) : (
        <Circle className={iconClass} />
      )}
    </button>
  );
}
