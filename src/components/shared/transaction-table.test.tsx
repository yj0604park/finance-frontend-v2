import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { TransactionRow } from "./transaction-table";
import { TransactionTable } from "./transaction-table";

const mockTx = (overrides: Partial<TransactionRow> = {}): TransactionRow => ({
  id: "tx-1",
  date: "2026-03-15",
  amount: "-12000",
  type: "EAT_OUT",
  note: "점심",
  isInternal: false,
  reviewed: false,
  account: { name: "신한카드", currency: "KRW", bank: { name: "신한" } },
  retailer: { name: "맥도날드" },
  ...overrides,
});

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("TransactionTable", () => {
  it("renders transaction rows", () => {
    wrap(
      <TransactionTable
        transactions={[{ node: mockTx() }]}
        columns={{ retailer: true, account: true }}
      />,
    );
    expect(screen.getByText("맥도날드")).toBeInTheDocument();
    expect(screen.getByText("신한카드")).toBeInTheDocument();
  });

  it("shows empty state when no transactions", () => {
    wrap(<TransactionTable transactions={[]} emptyMessage="거래 없음" />);
    expect(screen.getByText("거래 없음")).toBeInTheDocument();
  });

  it("calls onRowClick with transaction id when row clicked", async () => {
    const onRowClick = vi.fn();
    wrap(
      <TransactionTable
        transactions={[{ node: mockTx({ id: "tx-99" }) }]}
        onRowClick={onRowClick}
      />,
    );
    const row = screen.getByText("맥도날드").closest("tr");
    if (!row) throw new Error("transaction row was not rendered");
    await userEvent.click(row);
    expect(onRowClick).toHaveBeenCalledWith("tx-99");
  });

  it("hides account column when account=false", () => {
    wrap(<TransactionTable transactions={[{ node: mockTx() }]} columns={{ account: false }} />);
    expect(screen.queryByText("신한카드")).not.toBeInTheDocument();
  });

  it("hides retailer column when retailer=false", () => {
    wrap(<TransactionTable transactions={[{ node: mockTx() }]} columns={{ retailer: false }} />);
    expect(screen.queryByText("맥도날드")).not.toBeInTheDocument();
  });

  it("renders review toggle when reviewToggle=true", () => {
    const onToggle = vi.fn();
    wrap(
      <TransactionTable
        transactions={[{ node: mockTx() }]}
        columns={{ reviewToggle: true }}
        review={{
          localReviewed: new Map(),
          toggling: new Set(),
          onToggle,
        }}
      />,
    );
    expect(screen.getByRole("button", { name: "검토 완료로 표시" })).toBeInTheDocument();
  });

  it("shows skeleton when loading", () => {
    const { container } = wrap(
      <TransactionTable transactions={[]} loading={true} skeletonRows={3} />,
    );
    // Skeletons render as divs with animate-pulse
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows balance column when balance=true", () => {
    wrap(
      <TransactionTable
        transactions={[{ node: mockTx({ balance: "88000" }) }]}
        columns={{ balance: true }}
        currency="KRW"
      />,
    );
    expect(screen.getByText("잔액")).toBeInTheDocument();
  });

  it("wraps in Card with title when title prop given", () => {
    wrap(<TransactionTable transactions={[]} title="거래 내역" />);
    expect(screen.getByText("거래 내역")).toBeInTheDocument();
  });

  it("formats date as MM-dd", () => {
    wrap(<TransactionTable transactions={[{ node: mockTx({ date: "2026-03-15" }) }]} />);
    expect(screen.getByText("03-15")).toBeInTheDocument();
  });
});
