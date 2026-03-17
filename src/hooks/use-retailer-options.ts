import { useCallback } from "react";
import { useApolloClient } from "@apollo/client";
import {
  useGetAllRetailersQuery,
  GetAllRetailersDocument,
} from "@/graphql/generated/graphql";
import type { GetAllRetailersQuery } from "@/graphql/generated/graphql";

interface RetailerOption {
  id: string;
  name: string;
  category: string;
}

export function useRetailerOptions(): {
  retailers: RetailerOption[];
  loading: boolean;
  addRetailer: (retailer: RetailerOption) => void;
} {
  const client = useApolloClient();
  const { data, loading } = useGetAllRetailersQuery({
    fetchPolicy: "cache-first",
  });

  const retailers: RetailerOption[] = (data?.retailerRelay?.edges ?? []).map((edge) => ({
    id: edge.node.id,
    name: edge.node.name,
    category: edge.node.category,
  }));

  const addRetailer = useCallback(
    (retailer: RetailerOption) => {
      const existing = client.readQuery<GetAllRetailersQuery>({
        query: GetAllRetailersDocument,
      });
      if (!existing) return;

      client.writeQuery<GetAllRetailersQuery>({
        query: GetAllRetailersDocument,
        data: {
          ...existing,
          retailerRelay: {
            ...existing.retailerRelay,
            edges: [
              ...existing.retailerRelay.edges,
              {
                __typename: "RetailerNodeEdge" as const,
                node: {
                  __typename: "RetailerNode" as const,
                  id: retailer.id,
                  name: retailer.name,
                  category: retailer.category as GetAllRetailersQuery["retailerRelay"]["edges"][0]["node"]["category"],
                },
              },
            ],
          },
        },
      });
    },
    [client],
  );

  return { retailers, loading, addRetailer };
}
