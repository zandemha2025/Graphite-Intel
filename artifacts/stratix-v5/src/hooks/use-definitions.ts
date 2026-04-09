import { useState, useEffect, useCallback, useRef } from "react";

/* ── Types ── */

export type Definition = {
  id: string;
  term: string;
  value: string;
  category: "market" | "metric" | "customer" | "competitor";
};

/* ── Constants ── */

const DEFINITIONS_STORAGE_KEY = "stratix:definitions";

const DEFAULT_DEFINITIONS: Definition[] = [
  { id: "def-1", term: "TAM", value: "Total Addressable Market - the total revenue opportunity available for a product or service", category: "market" },
  { id: "def-2", term: "ARR", value: "Annual Recurring Revenue - the annualized value of subscription contracts", category: "metric" },
  { id: "def-3", term: "ICP", value: "Ideal Customer Profile - the description of the company that would benefit most from your product", category: "customer" },
];

/* ── localStorage helpers ── */

function loadFromLocalStorage(): Definition[] {
  try {
    const raw = localStorage.getItem(DEFINITIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore parse errors */ }
  return DEFAULT_DEFINITIONS;
}

function persistToLocalStorage(defs: Definition[]) {
  try { localStorage.setItem(DEFINITIONS_STORAGE_KEY, JSON.stringify(defs)); } catch { /* quota errors */ }
}

/* ── API helpers ── */

const API_BASE = "/api/context/definitions";

async function fetchDefinitionsFromApi(): Promise<Definition[] | null> {
  try {
    const res = await fetch(API_BASE, { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

async function createDefinitionApi(def: Omit<Definition, "id">): Promise<Definition | null> {
  try {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(def),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function updateDefinitionApi(id: string, def: Partial<Definition>): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(def),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function deleteDefinitionApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ── Hook ── */

export function useDefinitions() {
  const [definitions, setDefinitions] = useState<Definition[]>(loadFromLocalStorage);
  const [loading, setLoading] = useState(true);
  const apiAvailable = useRef(false);

  // Fetch from API on mount, fall back to localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const apiDefs = await fetchDefinitionsFromApi();
      if (cancelled) return;
      if (apiDefs) {
        apiAvailable.current = true;
        setDefinitions(apiDefs.length > 0 ? apiDefs : DEFAULT_DEFINITIONS);
        persistToLocalStorage(apiDefs.length > 0 ? apiDefs : DEFAULT_DEFINITIONS);
      }
      // If API failed, we already have localStorage data from useState init
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const addDefinition = useCallback(async (def: Omit<Definition, "id">) => {
    // Optimistic: create local ID and update state immediately
    const optimisticId = `def-${Date.now()}`;
    const optimistic: Definition = { id: optimisticId, ...def };

    setDefinitions((prev) => {
      const next = [...prev, optimistic];
      persistToLocalStorage(next);
      return next;
    });

    // Sync to API in background
    if (apiAvailable.current) {
      const created = await createDefinitionApi(def);
      if (created && created.id !== optimisticId) {
        // Replace optimistic ID with server ID
        setDefinitions((prev) => {
          const next = prev.map((d) => (d.id === optimisticId ? { ...d, id: created.id } : d));
          persistToLocalStorage(next);
          return next;
        });
      }
    }
  }, []);

  const updateDefinition = useCallback(async (id: string, updates: Partial<Definition>) => {
    // Optimistic update
    setDefinitions((prev) => {
      const next = prev.map((d) => (d.id === id ? { ...d, ...updates } : d));
      persistToLocalStorage(next);
      return next;
    });

    // Sync to API in background
    if (apiAvailable.current) {
      await updateDefinitionApi(id, updates);
    }
  }, []);

  const deleteDefinition = useCallback(async (id: string) => {
    // Optimistic delete
    setDefinitions((prev) => {
      const next = prev.filter((d) => d.id !== id);
      persistToLocalStorage(next);
      return next;
    });

    // Sync to API in background
    if (apiAvailable.current) {
      await deleteDefinitionApi(id);
    }
  }, []);

  return { definitions, loading, addDefinition, updateDefinition, deleteDefinition };
}
