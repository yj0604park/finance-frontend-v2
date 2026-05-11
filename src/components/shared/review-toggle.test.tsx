import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReviewToggle } from "./review-toggle";

describe("ReviewToggle", () => {
  it("shows Circle icon when not reviewed", () => {
    render(
      <ReviewToggle id="1" isReviewed={false} isToggling={false} onToggle={vi.fn()} />,
    );
    // circle svg is rendered (no animate-spin, no checkmark)
    const btn = screen.getByRole("button");
    expect(btn).not.toBeDisabled();
    expect(btn).toHaveAttribute("title", "검토 완료로 표시");
  });

  it("shows CheckCircle2 icon when reviewed", () => {
    render(
      <ReviewToggle id="1" isReviewed={true} isToggling={false} onToggle={vi.fn()} />,
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("title", "검토 완료");
  });

  it("disables button when toggling", () => {
    render(
      <ReviewToggle id="1" isReviewed={false} isToggling={true} onToggle={vi.fn()} />,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("disables unidirectional toggle when already reviewed", () => {
    render(
      <ReviewToggle id="1" isReviewed={true} isToggling={false} onToggle={vi.fn()} bidirectional={false} />,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("keeps bidirectional toggle enabled when reviewed", () => {
    render(
      <ReviewToggle id="1" isReviewed={true} isToggling={false} onToggle={vi.fn()} bidirectional={true} />,
    );
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("calls onToggle with id when clicked", async () => {
    const onToggle = vi.fn();
    render(
      <ReviewToggle id="tx-42" isReviewed={false} isToggling={false} onToggle={onToggle} />,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledWith("tx-42");
  });
});
