import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onGoToPage?: (page: number) => void;
  /** Override total pages (computed from totalCount/pageSize if omitted) */
  totalPages?: number;
  /** Custom label e.g. "미검토" */
  itemLabel?: string;
}

export function PaginationControls({
  currentPage,
  totalCount,
  pageSize,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onGoToPage,
  totalPages: totalPagesProp,
  itemLabel = "개",
}: PaginationControlsProps) {
  const totalPages = totalPagesProp ?? Math.max(1, Math.ceil(totalCount / pageSize));

  // Compute which page numbers to show (up to 10, sliding window around current)
  const windowSize = 10;
  let windowStart = Math.max(1, currentPage - Math.floor(windowSize / 2));
  const windowEnd = Math.min(totalPages, windowStart + windowSize - 1);
  windowStart = Math.max(1, windowEnd - windowSize + 1);
  const pageNumbers = Array.from({ length: windowEnd - windowStart + 1 }, (_, i) => windowStart + i);

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted-foreground">
        {currentPage} / {totalPages} 페이지 · 총 {totalCount}
        {itemLabel}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={!canPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {onGoToPage && pageNumbers.map((p) => (
          <Button
            key={p}
            variant={p === currentPage ? "default" : "outline"}
            size="sm"
            className="w-8 px-0"
            onClick={() => onGoToPage(p)}
          >
            {p}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={onNext} disabled={!canNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
