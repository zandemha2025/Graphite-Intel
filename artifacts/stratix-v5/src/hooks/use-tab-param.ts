import { useState, useCallback, useEffect } from "react";

/**
 * Syncs a tab state with the URL `?tab=X` search param.
 * Uses history.replaceState so the browser doesn't do a full navigation.
 */
export function useTabParam<T extends string>(
  defaultTab: T,
  allowedTabs: T[],
): [T, (tab: T) => void] {
  const readTab = (): T => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("tab") as T | null;
    if (raw && allowedTabs.includes(raw)) return raw;
    return defaultTab;
  };

  const [activeTab, setActiveTabState] = useState<T>(readTab);

  // Re-read on popstate (back/forward)
  useEffect(() => {
    const onPop = () => setActiveTabState(readTab());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveTab = useCallback(
    (tab: T) => {
      setActiveTabState(tab);
      const url = new URL(window.location.href);
      if (tab === defaultTab) {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tab);
      }
      window.history.replaceState({}, "", url.toString());
    },
    [defaultTab],
  );

  return [activeTab, setActiveTab];
}
