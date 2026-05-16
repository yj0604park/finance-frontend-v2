import { useApolloClient } from "@apollo/client";
import { useEffect } from "react";
import { GetAllStocksDocument, useGetAllStocksQuery } from "@/graphql/generated/graphql";

export type StockOption = {
  id: string;
  ticker: string;
  name: string;
  currency: string;
};

export function useStockOptions() {
  const client = useApolloClient();
  const { data, loading, fetchMore } = useGetAllStocksQuery({
    variables: { after: "" },
    fetchPolicy: "cache-first",
  });

  useEffect(() => {
    const pageInfo = data?.stockRelay.pageInfo;
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) return;

    void fetchMore({
      variables: { after: pageInfo.endCursor },
      updateQuery: (previous, { fetchMoreResult }) => ({
        stockRelay: {
          ...fetchMoreResult.stockRelay,
          edges: [...previous.stockRelay.edges, ...fetchMoreResult.stockRelay.edges],
        },
      }),
    });
  }, [data?.stockRelay.pageInfo, fetchMore]);

  const stocks: StockOption[] = (data?.stockRelay?.edges ?? []).map((e) => ({
    id: e.node.id,
    ticker: e.node.ticker ?? "",
    name: e.node.name,
    currency: e.node.currency,
  }));

  function addStock(stock: StockOption) {
    const existing = client.readQuery({
      query: GetAllStocksDocument,
      variables: { after: "" },
    });
    if (!existing) return;
    client.writeQuery({
      query: GetAllStocksDocument,
      variables: { after: "" },
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
