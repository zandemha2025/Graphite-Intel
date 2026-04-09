import { useMemo } from "react";

interface Cell {
  id: string;
  type: string;
  content: string;
  output?: string;
  status?: string;
}

/**
 * Scans cell content for dependency references and builds a DAG.
 *
 * Supported syntax:
 *  - {{cell-N}}   index-based
 *  - $cell[N]     index-based
 *  - @prev        depends on cell directly above
 *  - @cell:ID     depends on cell with given ID
 *
 * Returns:
 *  - dependencyMap: cellId -> list of cellIds that depend on it (downstream)
 *  - upstreamMap:   cellId -> list of cellIds it depends on (upstream)
 *  - getDependencyChain: returns ordered list of all transitive dependents
 *  - executionOrder: cellId -> numeric tier (1 = no deps, 2 = depends on tier-1, etc.)
 */
export function useReactiveCells(cells: Cell[]) {
  const { dependencyMap, upstreamMap } = useMemo(() => {
    const deps = new Map<string, string[]>();
    const upstream = new Map<string, string[]>();

    const addEdge = (fromId: string, toId: string) => {
      // fromId feeds into toId (downstream)
      if (!deps.has(fromId)) deps.set(fromId, []);
      const existing = deps.get(fromId)!;
      if (!existing.includes(toId)) existing.push(toId);

      // toId depends on fromId (upstream)
      if (!upstream.has(toId)) upstream.set(toId, []);
      const upExisting = upstream.get(toId)!;
      if (!upExisting.includes(fromId)) upExisting.push(fromId);
    };

    cells.forEach((cell, idx) => {
      // Match {{cell-N}} and $cell[N] patterns (index-based)
      const curlyRefs = cell.content.match(/\{\{cell-(\d+)\}\}/g) || [];
      const dollarRefs = cell.content.match(/\$cell\[(\d+)\]/g) || [];

      [...curlyRefs, ...dollarRefs].forEach((ref) => {
        const match = ref.match(/(\d+)/);
        const refIdx = match ? parseInt(match[0], 10) : -1;
        if (refIdx >= 0 && refIdx < cells.length && refIdx !== idx) {
          addEdge(cells[refIdx].id, cell.id);
        }
      });

      // Match @prev -- depends on the cell directly above
      if (/@prev\b/.test(cell.content) && idx > 0) {
        addEdge(cells[idx - 1].id, cell.id);
      }

      // Match @cell:CELL_ID -- depends on cell with given ID
      const cellIdRefs: string[] = cell.content.match(/@cell:([a-zA-Z0-9_-]+)/g) ?? [];
      cellIdRefs.forEach((ref: string) => {
        const targetId = ref.slice(6); // strip "@cell:"
        const target = cells.find((c) => c.id === targetId);
        if (target && target.id !== cell.id) {
          addEdge(target.id, cell.id);
        }
      });
    });

    return { dependencyMap: deps, upstreamMap: upstream };
  }, [cells]);

  /** Get transitive downstream dependents in topological order (BFS). */
  const getDependencyChain = useMemo(() => {
    return (cellId: string): string[] => {
      const visited = new Set<string>();
      const queue = [cellId];
      const result: string[] = [];

      while (queue.length > 0) {
        const current = queue.shift()!;
        const dependents = dependencyMap.get(current) || [];
        for (const dep of dependents) {
          if (!visited.has(dep)) {
            visited.add(dep);
            result.push(dep);
            queue.push(dep);
          }
        }
      }

      return result;
    };
  }, [dependencyMap]);

  /**
   * Execution order: assigns a numeric tier to each cell.
   * Tier 1 = no upstream deps, Tier 2 = depends only on tier-1, etc.
   */
  const executionOrder = useMemo(() => {
    const order = new Map<string, number>();
    const cellIds = new Set(cells.map((c) => c.id));

    const resolve = (cid: string, visited: Set<string>): number => {
      if (order.has(cid)) return order.get(cid)!;
      if (visited.has(cid)) return 1; // cycle guard
      visited.add(cid);

      const ups = upstreamMap.get(cid) || [];
      if (ups.length === 0) {
        order.set(cid, 1);
        return 1;
      }

      let maxUp = 0;
      for (const uid of ups) {
        if (cellIds.has(uid)) {
          maxUp = Math.max(maxUp, resolve(uid, visited));
        }
      }
      const tier = maxUp + 1;
      order.set(cid, tier);
      return tier;
    };

    cells.forEach((c) => resolve(c.id, new Set()));
    return order;
  }, [cells, upstreamMap]);

  return { dependencyMap, upstreamMap, getDependencyChain, executionOrder };
}
