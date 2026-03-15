import { useEffect, useState } from "react";
import { useApolloClient } from "@apollo/client";
import {
  GetAllTransactionsDocument,
  type GetAllTransactionsQuery,
  type GetAllTransactionsQueryVariables,
} from "@/graphql/generated/graphql";

type TransactionEdge = GetAllTransactionsQuery["transactionRelay"]["edges"][number];

interface UseAllTransactionsOptions {
  accountId?: string | null;
  dateGte?: string | null;
  dateLte?: string | null;
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
  skip = false,
}: UseAllTransactionsOptions): UseAllTransactionsResult {
  const client = useApolloClient();
  const [edges, setEdges] = useState<TransactionEdge[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Stable key to detect filter changes
  const key = `${accountId ?? ""}|${dateGte ?? ""}|${dateLte ?? ""}`;

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
            },
            fetchPolicy: "network-only",
          });

          if (cancelled) return;

          const relay: GetAllTransactionsQuery["transactionRelay"] = result.data.transactionRelay;
          allEdges.push(...relay.edges);
          hasNext = relay.pageInfo.hasNextPage;
          cursor = relay.pageInfo.endCursor ?? null;

          if (!cursor) break;
        }

        if (!cancelled) {
          setEdges(allEdges);
          setTotalCount(allEdges.length);
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
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, skip, client]);

  return { edges, totalCount, loading, error };
}
