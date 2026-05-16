import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DateRangeFilter } from "./date-range-filter";

function setup(startDate = "2026-03-01", endDate = "2026-03-31") {
  const onStartChange = vi.fn();
  const onEndChange = vi.fn();
  render(
    <DateRangeFilter
      startDate={startDate}
      endDate={endDate}
      onStartChange={onStartChange}
      onEndChange={onEndChange}
    />,
  );
  return { onStartChange, onEndChange };
}

describe("DateRangeFilter", () => {
  it("renders start and end date inputs", () => {
    setup();
    const dateInputs = document.querySelectorAll("input[type='date']");
    expect(dateInputs).toHaveLength(2);
  });

  it("shifts both dates back one month on prev click", async () => {
    const { onStartChange, onEndChange } = setup("2026-03-01", "2026-03-31");
    const [prevBtn] = screen.getAllByRole("button");
    await userEvent.click(prevBtn);
    expect(onStartChange).toHaveBeenCalledWith("2026-02-01");
    expect(onEndChange).toHaveBeenCalledWith("2026-02-28");
  });

  it("shifts both dates forward one month on next click", async () => {
    const { onStartChange, onEndChange } = setup("2026-03-01", "2026-03-31");
    const buttons = screen.getAllByRole("button");
    await userEvent.click(buttons[buttons.length - 1]);
    expect(onStartChange).toHaveBeenCalledWith("2026-04-01");
    expect(onEndChange).toHaveBeenCalledWith("2026-04-30");
  });

  it("renders children alongside the date inputs", () => {
    const onStartChange = vi.fn();
    const onEndChange = vi.fn();
    render(
      <DateRangeFilter
        startDate="2026-01-01"
        endDate="2026-01-31"
        onStartChange={onStartChange}
        onEndChange={onEndChange}
      >
        <span>Custom filter</span>
      </DateRangeFilter>,
    );
    expect(screen.getByText("Custom filter")).toBeInTheDocument();
  });
});
