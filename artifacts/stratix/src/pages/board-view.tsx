import { useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import GridLayout, { LayoutItem, Layout as GridLayoutType } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { ArrowLeft } from "lucide-react";
import { BoardToolbar } from "@/components/boards/BoardToolbar";
import { BoardCard } from "@/components/boards/BoardCard";
import { AddCardModal } from "@/components/boards/AddCardModal";
import type { BoardCardData, BoardCardContent } from "@/components/boards/BoardCard";
import type { BoardType } from "@/components/boards/BoardTypeSelector";

// ── seed helpers ────────────────────────────────────────────────────────────

function makeSeedCards(): BoardCardData[] {
  return [
    {
      id: "c1",
      title: "Revenue by Quarter",
      source: "CRM",
      content: {
        kind: "chart",
        cell: {
          type: "bar",
          title: "Revenue by Quarter",
          data: [
            { name: "Q1", value: 42000 },
            { name: "Q2", value: 68000 },
            { name: "Q3", value: 55000 },
            { name: "Q4", value: 81000 },
          ],
          xKey: "name",
          yKey: "value",
        },
      },
    },
    {
      id: "c2",
      title: "Monthly Active Users",
      source: "Analytics",
      content: {
        kind: "chart",
        cell: {
          type: "line",
          title: "Monthly Active Users",
          data: [
            { name: "Jan", value: 1200 },
            { name: "Feb", value: 1450 },
            { name: "Mar", value: 1380 },
            { name: "Apr", value: 1710 },
            { name: "May", value: 1960 },
          ],
          xKey: "name",
          yKey: "value",
        },
      },
    },
    {
      id: "c3",
      title: "Total Revenue",
      source: "Finance",
      content: { kind: "stat", label: "Total Revenue (YTD)", value: "$246K", change: "+18% vs last year", positive: true },
    },
    {
      id: "c4",
      title: "Segment Breakdown",
      source: "CRM",
      content: {
        kind: "chart",
        cell: {
          type: "pie",
          title: "Segment Breakdown",
          data: [
            { name: "Enterprise", value: 55 },
            { name: "Mid-Market", value: 30 },
            { name: "SMB", value: 15 },
          ],
          xKey: "name",
          yKey: "value",
        },
      },
    },
  ];
}

const SEED_LAYOUT: LayoutItem[] = [
  { i: "c1", x: 0, y: 0, w: 6, h: 4 },
  { i: "c2", x: 6, y: 0, w: 6, h: 4 },
  { i: "c3", x: 0, y: 4, w: 3, h: 3 },
  { i: "c4", x: 3, y: 4, w: 5, h: 3 },
];

// ── page ────────────────────────────────────────────────────────────────────

export default function BoardView() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const [title, setTitle] = useState("Untitled Board");
  const [boardType, setBoardType] = useState<BoardType>("live");
  const [viewMode, setViewMode] = useState<"layout" | "edit">("layout");
  const [cards, setCards] = useState<BoardCardData[]>(makeSeedCards);
  const [layout, setLayout] = useState<LayoutItem[]>(SEED_LAYOUT);
  const [addOpen, setAddOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(900);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(node);
  }, []);

  const handleAddCard = (cardTitle: string, content: BoardCardContent) => {
    const id = `c-${Date.now()}`;
    setCards((prev) => [...prev, { id, title: cardTitle, content }]);
    setLayout((prev) => [...prev, { i: id, x: 0, y: Infinity, w: 6, h: 4 }]);
  };

  const handleRemove = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    setLayout((prev) => prev.filter((l) => l.i !== id));
  };

  const handleDuplicate = (id: string) => {
    const original = cards.find((c) => c.id === id);
    if (!original) return;
    const newId = `c-${Date.now()}`;
    setCards((prev) => [...prev, { ...original, id: newId, title: `${original.title} (copy)` }]);
    const origLayout = layout.find((l) => l.i === id);
    setLayout((prev) => [...prev, { ...(origLayout ?? { w: 6, h: 4, x: 0 }), i: newId, y: Infinity }]);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#F3F4F6" }}>
      {/* Back nav */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-b" style={{ background: "#FFFFFF", borderColor: "#E5E7EB" }}>
        <button
          onClick={() => setLocation("/boards")}
          className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity"
          style={{ color: "#6B7280" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Boards
        </button>
      </div>

      <BoardToolbar
        title={title}
        boardType={boardType}
        viewMode={viewMode}
        onTitleChange={setTitle}
        onBoardTypeChange={setBoardType}
        onViewModeChange={setViewMode}
        onAddCard={() => setAddOpen(true)}
      />

      {/* Grid canvas */}
      <div className="flex-1 overflow-auto p-4" ref={containerRef}>
        <GridLayout
          className="layout"
          layout={layout as GridLayoutType}
          width={containerWidth - 32}
          onLayoutChange={(l) => setLayout([...l])}
          gridConfig={{ cols: 12, rowHeight: 80, margin: [12, 12] as readonly [number, number], containerPadding: [0, 0] as readonly [number, number] }}
          dragConfig={{ enabled: viewMode === "edit", handle: ".drag-handle", bounded: false, cancel: undefined, threshold: 3 }}
          resizeConfig={{ enabled: viewMode === "edit", handles: ["se"] as readonly import("react-grid-layout").ResizeHandleAxis[] }}
        >
          {cards.map((card) => (
            <div key={card.id} className="relative group">
              {viewMode === "edit" && (
                <div
                  className="drag-handle absolute top-0 left-0 right-0 h-7 cursor-grab active:cursor-grabbing z-10 rounded-t-lg"
                  style={{ background: "rgba(79,70,229,0.06)" }}
                />
              )}
              <BoardCard
                card={card}
                editMode={viewMode === "edit"}
                onRemove={handleRemove}
                onDuplicate={handleDuplicate}
              />
            </div>
          ))}
        </GridLayout>

        {cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="text-sm" style={{ color: "#9CA3AF" }}>No cards yet.</div>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium"
              style={{ background: "#4F46E5", color: "#FFFFFF" }}
            >
              + Add Card
            </button>
          </div>
        )}
      </div>

      <AddCardModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAddCard} />
    </div>
  );
}
