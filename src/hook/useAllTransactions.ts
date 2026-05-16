import { useApolloClient } from "@apollo/client";
import { useEffect, useState } from "react";
import {
  GetAllTransactionsDocument,
  type GetAllTransactionsQuery,
  type GetAllTransactionsQueryVariables,
  type TransactionCategory,
} from "@/graphql/generated/graphql";

type TransactionEdge = GetAllTransactionsQuery["transactionRelay"]["edges"][number];

interface UseAllTransactionsOptions {
  accountId?: string | null;
  dateGte?: string | null;
  dateLte?: string | null;
  type?: TransactionCategory | null;
  skip?: boolean;
}

interface UseAllTransactionsResult {
  edges: TransactionEdge[];
  totalCount: number;
  loading: boolean;
  error: Error | null;
}

const PAGE_SIZE = 100;

export function useAllTransactions({
  accountId,
  dateGte,
  dateLte,
  type,
  skip = false,
}: UseAllTransactionsOptions): UseAllTransactionsResult {
  const client = useApolloClient();
  const [edges, setEdges] = useState<TransactionEdge[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (skip) return;

    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      setError(null);
      const allEdges: TransactionEdge[] = [];
      let cursor: string | null = null;
      let hasNext = true;

      try {
        while (hasNext) {
          const result: { data: GetAllTransactionsQuery } = await client.query<
            GetAllTransactionsQuery,
            GetAllTransactionsQueryVariables
          >({
            query: GetAllTransactionsDocument,
            variables: {
              first: PAGE_SIZE,
              after: cursor ?? "",
              accountId: accountId ?? null,
              dateGte: dateGte ?? null,
              dateLte: dateLte ?? null,
              type: type ?? null,
            },
            fetchPolicy: "cache-first",
          });

          if (cancelled) return;

          const relay: GetAllTransactionsQuery["transactionRelay"] = result.data.transactionRelay;
          allEdges.push(...relay.edges);
          setEdges([...allEdges]); // stream results as each batch arrives
          setTotalCount(allEdges.length);
          hasNext = relay.pageInfo.hasNextPage;
          cursor = relay.pageInfo.endCursor ?? null;

          if (!cursor) break;
        }

        if (!cancelled) {
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setLoading(false);
        }
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [accountId, client, dateGte, dateLte, skip, type]);

  return { edges, totalCount, loading, error };
}
