import { useCallback, useState } from "react";

export function useCursorPagination() {
  const [cursor, setCursor] = useState("");
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  const reset = useCallback(() => {
    setCursor("");
    setCursorStack([]);
  }, []);

  const goNext = useCallback(
    (endCursor?: string | null) => {
      if (!endCursor) return;
      setCursorStack((prev) => [...prev, cursor]);
      setCursor(endCursor);
    },
    [cursor],
  );

  const goPrev = useCallback(() => {
    if (cursorStack.length === 0) return;

    const nextStack = cursorStack.slice(0, -1);
    setCursor(cursorStack.at(-1) ?? "");
    setCursorStack(nextStack);
  }, [cursorStack]);

  return {
    cursor,
    currentPage: cursorStack.length + 1,
    canPrev: cursorStack.length > 0,
    reset,
    goNext,
    goPrev,
  };
}
