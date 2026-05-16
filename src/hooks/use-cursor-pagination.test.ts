import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCursorPagination } from "./use-cursor-pagination";

describe("useCursorPagination", () => {
  it("starts on the first page", () => {
    const { result } = renderHook(() => useCursorPagination());

    expect(result.current.cursor).toBe("");
    expect(result.current.currentPage).toBe(1);
    expect(result.current.canPrev).toBe(false);
  });

  it("moves forward and backward through cursor history", () => {
    const { result } = renderHook(() => useCursorPagination());

    act(() => result.current.goNext("cursor-1"));
    expect(result.current.cursor).toBe("cursor-1");
    expect(result.current.currentPage).toBe(2);
    expect(result.current.canPrev).toBe(true);

    act(() => result.current.goNext("cursor-2"));
    expect(result.current.cursor).toBe("cursor-2");
    expect(result.current.currentPage).toBe(3);

    act(() => result.current.goPrev());
    expect(result.current.cursor).toBe("cursor-1");
    expect(result.current.currentPage).toBe(2);

    act(() => result.current.goPrev());
    expect(result.current.cursor).toBe("");
    expect(result.current.currentPage).toBe(1);
    expect(result.current.canPrev).toBe(false);
  });

  it("ignores missing next cursors", () => {
    const { result } = renderHook(() => useCursorPagination());

    act(() => result.current.goNext(null));
    act(() => result.current.goNext(undefined));

    expect(result.current.cursor).toBe("");
    expect(result.current.currentPage).toBe(1);
  });

  it("resets cursor history", () => {
    const { result } = renderHook(() => useCursorPagination());

    act(() => result.current.goNext("cursor-1"));
    act(() => result.current.goNext("cursor-2"));
    act(() => result.current.reset());

    expect(result.current.cursor).toBe("");
    expect(result.current.currentPage).toBe(1);
    expect(result.current.canPrev).toBe(false);
  });
});
