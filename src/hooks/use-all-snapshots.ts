import { useEffect, useState } from "react";
import { useApolloClient } from "@apollo/client";
import {
  CurrencyType,
  GetSnapshotPageDocument,
  type GetSnapshotPageQuery,
  type GetSnapshotPageQueryVariables,
} from "@/graphql/generated/graphql";

type SnapshotNode = GetSnapshotPageQuery["amountSnapshotRelay"]["edges"][number]["node"];

interface UseAllSnapshotsOptions {
  currency: CurrencyType;
  startDate: string | null;
}

export function useAllSnapshots({ currency, startDate }: UseAllSnapshotsOptions) {
  const client = useApolloClient();
  const [nodes, setNodes] = useState<SnapshotNode[]>([]);
  const [loading, setLoading] = useState(true);

  const key = `${currency}|${startDate ?? ""}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNodes([]);

    async function fetchAll() {
      const all: SnapshotNode[] = [];
      let cursor: string | null = null;
      let hasNext = true;

      while (hasNext) {
        const result: { data: GetSnapshotPageQuery } = await client.query<
          GetSnapshotPageQuery,
          GetSnapshotPageQueryVariables
        >({
          query: GetSnapshotPageDocument,
          variables: { currency, startDate: startDate ?? null, after: cursor },
          fetchPolicy: "cache-first",
        });
        if (cancelled) return;

        const relay = result.data.amountSnapshotRelay;
        all.push(...relay.edges.map((e) => e.node));
        hasNext = relay.pageInfo.hasNextPage;
        cursor = relay.pageInfo.endCursor ?? null;
        if (!cursor) break;
      }

      if (!cancelled) {
        setNodes(all);
        setLoading(false);
      }
    }

    fetchAll().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, client]);

  return { nodes, loading };
}
