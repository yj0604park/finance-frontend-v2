import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PaginationControls } from "./pagination-controls";

function setup(overrides = {}) {
  const defaults = {
    currentPage: 1,
    totalCount: 150,
    pageSize: 50,
    canPrev: false,
    canNext: true,
    onPrev: vi.fn(),
    onNext: vi.fn(),
  };
  return render(<PaginationControls {...defaults} {...overrides} />);
}

describe("PaginationControls", () => {
  it("displays page and total count", () => {
    setup({ currentPage: 2, totalCount: 150, pageSize: 50 });
    expect(screen.getByText(/2 \/ 3 페이지/)).toBeInTheDocument();
    expect(screen.getByText(/총 150개/)).toBeInTheDocument();
  });

  it("disables prev button on first page", () => {
    setup({ canPrev: false });
    expect(screen.getByRole("button", { name: /이전/ })).toBeDisabled();
  });

  it("disables next button on last page", () => {
    setup({ canNext: false });
    expect(screen.getByRole("button", { name: /다음/ })).toBeDisabled();
  });

  it("calls onNext when next is clicked", async () => {
    const onNext = vi.fn();
    setup({ canNext: true, onNext });
    await userEvent.click(screen.getByRole("button", { name: /다음/ }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("calls onPrev when prev is clicked", async () => {
    const onPrev = vi.fn();
    setup({ canPrev: true, onPrev });
    await userEvent.click(screen.getByRole("button", { name: /이전/ }));
    expect(onPrev).toHaveBeenCalledOnce();
  });

  it("uses custom itemLabel", () => {
    setup({ totalCount: 5, itemLabel: "미검토" });
    expect(screen.getByText(/총 5미검토/)).toBeInTheDocument();
  });

  it("shows page 1 of 1 when totalCount <= pageSize", () => {
    setup({ totalCount: 20, pageSize: 50 });
    expect(screen.getByText(/1 \/ 1 페이지/)).toBeInTheDocument();
  });
});
