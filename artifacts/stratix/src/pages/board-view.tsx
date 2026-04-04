import { useState, useCallback, useRef } from "react";
import { BoardToolbar } from "../components/boards/BoardToolbar";
import { BoardCard } from "../components/boards/BoardCard";
import { AddCardModal } from "../components/boards/AddCardModal";
import { type BoardType } from "../components/boards/BoardTypeSelector";
import { type ChartCell } from "../components/charts/types";

type GridItem = {
  id: string;
  cell: ChartCell;
  col: number; // 0-based column (out of 3)
  row: number; // 0-based row
  colSpan: number; // 1 or 2
};

const DEMO_CELLS: GridItem[] = [
  {
    id: "g1",
    cell: {
      type: "bar",
      title: "Revenue by Quarter",
      data: [
        { label: "Q1", value: 420 },
        { label: "Q2", value: 580 },
        { label: "Q3", value: 510 },
        { label: "Q4", value: 740 },
      ],
      xKey: "label",
      yKey: "value",
      metadata: { source: "Finance", confidence: 0.97, freshness: "Updated today" },
    },
    col: 0,
    row: 0,
    colSpan: 2,
  },
  {
    id: "g2",
    cell: {
      type: "stat",
      title: "Total Pipeline",
      data: [{ value: "$4.2M", label: "Pipeline", change: "+18%" }],
      metadata: { source: "CRM" },
    },
    col: 2,
    row: 0,
    colSpan: 1,
  },
  {
    id: "g3",
    cell: {
      type: "line",
      title: "Weekly Active Users",
      data: [
        { label: "W1", value: 1200 },
        { label: "W2", value: 1350 },
        { label: "W3", value: 1100 },
        { label: "W4", value: 1600 },
        { label: "W5", value: 1850 },
        { label: "W6", value: 2100 },
      ],
      xKey: "label",
      yKey: "value",
      metadata: { source: "Analytics" },
    },
    col: 0,
    row: 1,
    colSpan: 1,
  },
  {
    id: "g4",
    cell: {
      type: "pie",
      title: "Traffic Sources",
      data: [
        { label: "Direct", value: 38 },
        { label: "Organic", value: 27 },
        { label: "Referral", value: 22 },
        { label: "Paid", value: 13 },
      ],
      metadata: { source: "Marketing" },
    },
    col: 1,
    row: 1,
    colSpan: 2,
  },
];

// Drag state
type DragState = {
  id: string;
  originCol: number;
  originRow: number;
};

export function BoardView() {
  const [title, setTitle] = useState("Growth Overview");
  const [boardType, setBoardType] = useState<BoardType>("live");
  const [isEditMode, setIsEditMode] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [items, setItems] = useState<GridItem[]>(DEMO_CELLS);

  const dragRef = useRef<DragState | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function addCard(cell: ChartCell) {
    const maxRow = items.reduce((m, i) => Math.max(m, i.row), -1);
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        cell,
        col: 0,
        row: maxRow + 1,
        colSpan: cell.type === "stat" ? 1 : 2,
      },
    ]);
  }

  function removeCard(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  // Drag handlers
  const onDragStart = useCallback((id: string, col: number, row: number) => {
    dragRef.current = { id, originCol: col, originRow: row };
  }, []);

  const onDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  }, []);

  const onDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    if (!dragRef.current || dragRef.current.id === targetId) return;

    const srcId = dragRef.current.id;
    setItems((prev) => {
      const srcIdx = prev.findIndex((i) => i.id === srcId);
      const tgtIdx = prev.findIndex((i) => i.id === targetId);
      if (srcIdx === -1 || tgtIdx === -1) return prev;

      const next = [...prev];
      const srcItem = next[srcIdx];
      const tgtItem = next[tgtIdx];

      // Swap positions
      const srcPos = { col: srcItem.col, row: srcItem.row };
      next[srcIdx] = { ...srcItem, col: tgtItem.col, row: tgtItem.row };
      next[tgtIdx] = { ...tgtItem, col: srcPos.col, row: srcPos.row };
      return next;
    });
    dragRef.current = null;
  }, []);

  const onDragEnd = useCallback(() => {
    setDragOverId(null);
    dragRef.current = null;
  }, []);

  // Build a sorted render order
  const sorted = [...items].sort((a, b) => a.row - b.row || a.col - b.col);

  return (
    <div className="flex flex-col h-full" style={{ background: "#F9FAFB" }}>
      <BoardToolbar
        title={title}
        boardType={boardType}
        isEditMode={isEditMode}
        onTitleChange={setTitle}
        onBoardTypeChange={setBoardType}
        onToggleEditMode={() => setIsEditMode((v) => !v)}
        onAddCard={() => setShowAddModal(true)}
        onShare={() => {}}
      />

      {/* Grid canvas */}
      <div className="flex-1 overflow-y-auto p-6">
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
        >
          {sorted.map((item) => (
            <div
              key={item.id}
              draggable={isEditMode}
              onDragStart={() => onDragStart(item.id, item.col, item.row)}
              onDragOver={(e) => onDragOver(e, item.id)}
              onDrop={(e) => onDrop(e, item.id)}
              onDragEnd={onDragEnd}
              style={{
                gridColumn: `span ${item.colSpan}`,
                minHeight: item.cell.type === "stat" ? 100 : 240,
                opacity: dragOverId === item.id ? 0.6 : 1,
                transition: "opacity 0.15s",
                outline: dragOverId === item.id ? "2px dashed #4F46E5" : "none",
                borderRadius: 12,
              }}
            >
              <BoardCard
                cell={item.cell}
                isEditMode={isEditMode}
                onRemove={() => removeCard(item.id)}
                dragHandleProps={{
                  draggable: true,
                  onDragStart: (e) => {
                    e.stopPropagation();
                    onDragStart(item.id, item.col, item.row);
                  },
                }}
              />
            </div>
          ))}

          {/* Add card tile — only in edit mode */}
          {isEditMode && (
            <div
              onClick={() => setShowAddModal(true)}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
              style={{ borderColor: "#E5E7EB", minHeight: 140 }}
            >
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center"
                style={{ background: "#F3F4F6" }}
              >
                <span className="text-xl font-light" style={{ color: "#9CA3AF", lineHeight: 1 }}>+</span>
              </div>
              <span className="text-xs font-medium" style={{ color: "#9CA3AF" }}>
                Add card
              </span>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddCardModal onAdd={addCard} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
