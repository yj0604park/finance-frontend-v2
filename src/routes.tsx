import { lazy, Suspense } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import { AuthGuard } from "@/components/shared/auth-guard";
import { AppShell } from "@/components/layout/app-shell";

// Lazy-loaded pages
const LoginPage = lazy(() =>
  import("@/features/auth/login-page").then((m) => ({ default: m.LoginPage })),
);
const DashboardPage = lazy(() =>
  import("@/features/dashboard/dashboard-page").then((m) => ({ default: m.DashboardPage })),
);
const AccountsPage = lazy(() =>
  import("@/features/accounts/accounts-page").then((m) => ({ default: m.AccountsPage })),
);
const AccountDetailPage = lazy(() =>
  import("@/features/accounts/account-detail-page").then((m) => ({
    default: m.AccountDetailPage,
  })),
);
const IncomePage = lazy(() =>
  import("@/features/income/income-page").then((m) => ({ default: m.IncomePage })),
);
const IncomeYearDetailPage = lazy(() =>
  import("@/features/income/income-year-detail-page").then((m) => ({
    default: m.IncomeYearDetailPage,
  })),
);
const TransactionsPage = lazy(() =>
  import("@/features/transactions/transactions-page").then((m) => ({
    default: m.TransactionsPage,
  })),
);
const CategoryPage = lazy(() =>
  import("@/features/transactions/category-page").then((m) => ({ default: m.CategoryPage })),
);
const RetailersPage = lazy(() =>
  import("@/features/retailers/retailers-page").then((m) => ({ default: m.RetailersPage })),
);
const RetailerDetailPage = lazy(() =>
  import("@/features/retailers/retailer-detail-page").then((m) => ({
    default: m.RetailerDetailPage,
  })),
);
const StocksPage = lazy(() =>
  import("@/features/stocks/stocks-page").then((m) => ({ default: m.StocksPage })),
);
const StockDetailPage = lazy(() =>
  import("@/features/stocks/stock-detail-page").then((m) => ({ default: m.StockDetailPage })),
);
const StockTransactionDetailPage = lazy(() =>
  import("@/features/stocks/stock-transaction-detail-page").then((m) => ({ default: m.StockTransactionDetailPage })),
);
const ReviewPage = lazy(() =>
  import("@/features/review/review-page").then((m) => ({ default: m.ReviewPage })),
);
const AmazonPage = lazy(() =>
  import("@/features/amazon/amazon-page").then((m) => ({ default: m.AmazonPage })),
);
const TransactionDetailPage = lazy(() =>
  import("@/features/transactions/transaction-detail-page").then((m) => ({
    default: m.TransactionDetailPage,
  })),
);
const ExchangesPage = lazy(() =>
  import("@/features/exchanges/exchanges-page").then((m) => ({
    default: m.ExchangesPage,
  })),
);
const AuditPage = lazy(() =>
  import("@/features/audit/audit-page").then((m) => ({ default: m.AuditPage })),
);

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const routes: RouteObject[] = [
  {
    path: "/login",
    element: (
      <SuspenseWrapper>
        <LoginPage />
      </SuspenseWrapper>
    ),
  },
  {
    path: "/",
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: "dashboard",
        element: (
          <SuspenseWrapper>
            <DashboardPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "accounts",
        element: (
          <SuspenseWrapper>
            <AccountsPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "accounts/:accountId",
        element: (
          <SuspenseWrapper>
            <AccountDetailPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "transactions",
        element: (
          <SuspenseWrapper>
            <TransactionsPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "transactions/:transactionId",
        element: (
          <SuspenseWrapper>
            <TransactionDetailPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "categories",
        element: (
          <SuspenseWrapper>
            <CategoryPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "retailers",
        element: (
          <SuspenseWrapper>
            <RetailersPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "retailers/:retailerId",
        element: (
          <SuspenseWrapper>
            <RetailerDetailPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "income",
        element: (
          <SuspenseWrapper>
            <IncomePage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "income/:year",
        element: (
          <SuspenseWrapper>
            <IncomeYearDetailPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "stocks",
        element: (
          <SuspenseWrapper>
            <StocksPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "stocks/:stockId",
        element: (
          <SuspenseWrapper>
            <StockDetailPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "stock-transactions/:stockTxId",
        element: (
          <SuspenseWrapper>
            <StockTransactionDetailPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "review",
        element: (
          <SuspenseWrapper>
            <ReviewPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "amazon",
        element: (
          <SuspenseWrapper>
            <AmazonPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "exchanges",
        element: (
          <SuspenseWrapper>
            <ExchangesPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "audit",
        element: (
          <SuspenseWrapper>
            <AuditPage />
          </SuspenseWrapper>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
];
