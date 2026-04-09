import { useState, useEffect } from "react";
import {
  useGetCompanyProfile, getGetCompanyProfileQueryKey,
  useListDocuments, getListDocumentsQueryKey,
} from "@workspace/api-client-react";

export type HealthBreakdownItem = {
  complete: boolean;
  score: number;
  label: string;
};

export type ContextHealthResult = {
  score: number;
  breakdown: {
    profile: HealthBreakdownItem;
    documents: HealthBreakdownItem;
    sources: HealthBreakdownItem;
    definitions: HealthBreakdownItem;
  };
  loading: boolean;
};

export function useContextHealth(): ContextHealthResult {
  const { data: profile, isLoading: profileLoading } = useGetCompanyProfile({
    query: { queryKey: getGetCompanyProfileQueryKey() },
  });
  const { data: docs = [], isLoading: docsLoading } = useListDocuments({
    query: { queryKey: getListDocumentsQueryKey() },
  });

  const [connections, setConnections] = useState<Array<{ id: number }>>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [definitions, setDefinitions] = useState<unknown[]>([]);
  const [definitionsLoading, setDefinitionsLoading] = useState(true);

  useEffect(() => {
    // Fetch connections
    fetch("/api/connectors/accounts/summary", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { accounts: [] }))
      .then((d) => setConnections(d?.accounts || []))
      .catch(() => setConnections([]))
      .finally(() => setConnectionsLoading(false));

    // Fetch definitions: try API first, fall back to localStorage
    fetch("/api/context/definitions", { credentials: "include" })
      .then((r) => {
        if (r.ok) return r.json();
        throw new Error("not ok");
      })
      .then((d) => {
        const list = Array.isArray(d) ? d : d?.definitions || d?.data || [];
        setDefinitions(list);
      })
      .catch(() => {
        try {
          const stored = localStorage.getItem("stratix:definitions");
          if (stored) {
            const parsed = JSON.parse(stored);
            setDefinitions(Array.isArray(parsed) ? parsed : []);
          }
        } catch {
          // silent
        }
      })
      .finally(() => setDefinitionsLoading(false));
  }, []);

  const p = profile as unknown as Record<string, string> | undefined;
  const docList = Array.isArray(docs) ? docs : [];

  const profileComplete = !!(p?.companyName && p?.industry && p?.description);
  const documentsComplete = docList.length > 0;
  const sourcesComplete = connections.length > 0;
  const definitionsComplete = definitions.length > 0;

  const profileScore = profileComplete ? 25 : 0;
  const documentsScore = documentsComplete ? 25 : 0;
  const sourcesScore = sourcesComplete ? 25 : 0;
  const definitionsScore = definitionsComplete ? 25 : 0;

  const score = profileScore + documentsScore + sourcesScore + definitionsScore;
  const loading = profileLoading || docsLoading || connectionsLoading || definitionsLoading;

  return {
    score,
    breakdown: {
      profile: { complete: profileComplete, score: profileScore, label: "Company Profile" },
      documents: { complete: documentsComplete, score: documentsScore, label: "Documents" },
      sources: { complete: sourcesComplete, score: sourcesScore, label: "Data Sources" },
      definitions: { complete: definitionsComplete, score: definitionsScore, label: "Definitions" },
    },
    loading,
  };
}
