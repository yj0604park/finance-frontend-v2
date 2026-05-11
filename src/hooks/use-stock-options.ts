import { useGetAllStocksQuery } from "@/graphql/generated/graphql";
import { useApolloClient } from "@apollo/client";
import { GetAllStocksDocument } from "@/graphql/generated/graphql";

export type StockOption = {
  id: string;
  ticker: string;
  name: string;
  currency: string;
};

export function useStockOptions() {
  const client = useApolloClient();
  const { data, loading } = useGetAllStocksQuery({
    fetchPolicy: "cache-first",
  });

  const stocks: StockOption[] = (data?.stockRelay?.edges ?? []).map((e) => ({
    id: e.node.id,
    ticker: e.node.ticker ?? "",
    name: e.node.name,
    currency: e.node.currency,
  }));

  function addStock(stock: StockOption) {
    const existing = client.readQuery({ query: GetAllStocksDocument });
    if (!existing) return;
    client.writeQuery({
      query: GetAllStocksDocument,
      data: {
        stockRelay: {
          ...existing.stockRelay,
          edges: [
            ...existing.stockRelay.edges,
            {
              __typename: "StockNodeEdge",
              node: {
                __typename: "StockNode",
                id: stock.id,
                ticker: stock.ticker,
                name: stock.name,
                currency: stock.currency,
              },
            },
          ],
        },
      },
    });
  }

  return { stocks, loading, addStock };
}
