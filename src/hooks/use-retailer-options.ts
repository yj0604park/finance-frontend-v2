import { useApolloClient } from "@apollo/client";
import { useCallback, useEffect, useState } from "react";
import {
  GetAllRetailersDocument,
  type GetAllRetailersQuery,
  type GetAllRetailersQueryVariables,
} from "@/graphql/generated/graphql";

export interface RetailerOption {
  id: string;
  name: string;
  category: string;
}

// Module-level cache: shared across all hook instances so the full list is
// fetched only once per app session (Apollo cache-first handles network caching
// per page; this avoids redundant pagination loops on remount).
let _cached: RetailerOption[] | null = null;
let _fetchPromise: Promise<RetailerOption[]> | null = null;
const _listeners = new Set<(list: RetailerOption[]) => void>();

export function useRetailerOptions(): {
  retailers: RetailerOption[];
  loading: boolean;
  addRetailer: (retailer: RetailerOption) => void;
} {
  const client = useApolloClient();
  const [retailers, setRetailers] = useState<RetailerOption[]>(_cached ?? []);
  const [loading, setLoading] = useState(_cached === null);

  useEffect(() => {
    _listeners.add(setRetailers);
    return () => {
      _listeners.delete(setRetailers);
    };
  }, []);

  useEffect(() => {
    if (_cached !== null) {
      setRetailers(_cached);
      setLoading(false);
      return;
    }

    if (!_fetchPromise) {
      _fetchPromise = (async () => {
        const all: RetailerOption[] = [];
        let cursor: string | null = null;
        let hasNext = true;

        const MAX_PAGES = 50;
        let page = 0;
        while (hasNext && page < MAX_PAGES) {
          page++;
          const result: { data: GetAllRetailersQuery } = await client.query<
            GetAllRetailersQuery,
            GetAllRetailersQueryVariables
          >({
            query: GetAllRetailersDocument,
            variables: { after: cursor },
            fetchPolicy: "no-cache",
          });
          const relay: GetAllRetailersQuery["retailerRelay"] = result.data.retailerRelay;
          for (const edge of relay.edges) {
            all.push({
              id: edge.node.id,
              name: edge.node.name,
              category: edge.node.category as string,
            });
          }
          hasNext = relay.pageInfo.hasNextPage;
          cursor = relay.pageInfo.endCursor ?? null;
          if (!cursor) break;
        }

        // Deduplicate by id in case of any pagination overlap
        const seen = new Set<string>();
        const deduped = all.filter((r) => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });
        _cached = deduped;
        return deduped;
      })().catch((err) => {
        // Reset so the next mount can retry
        _fetchPromise = null;
        throw err;
      });
    }

    _fetchPromise
      .then((all) => {
        setRetailers(all ?? []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [client]);

  // Called after server confirms a new retailer was created.
  const addRetailer = useCallback((retailer: RetailerOption) => {
    const updated = [...(_cached ?? []), retailer];
    _cached = updated;
    _listeners.forEach((fn) => {
      fn(updated);
    });
  }, []);

  return { retailers, loading, addRetailer };
}
