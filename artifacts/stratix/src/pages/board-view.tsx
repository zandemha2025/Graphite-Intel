import { useState, useCallback } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { BoardToolbar, BoardCard, AddCardModal } from "../components/boards";
import type { ChartCell } from "../components/charts/types";

const ResponsiveGridLayout = WidthProvider(Responsive);

const DEMO_CARDS: (ChartCell & { layoutId: string })[] = [
  {
    layoutId: "card-1",
    type: "bar",
    title: "Revenue by Quarter",
    data: [
      { name: "Q1", revenue: 120000, costs: 80000 },
      { name: "Q2", revenue: 180000, costs: 95000 },
      { name: "Q3", revenue: 150000, costs: 88000 },
      { name: "Q4", revenue: 220000, costs: 102000 },
    ],
    xKey: "name",
    yKey: "revenue",
    metadata: { source: "Perplexity", confidence: 0.92, freshness: "2h ago" },
  },
  {
    layoutId: "card-2",
    type: "line",
    title: "Monthly Active Users",
    data: [
      { name: "Jan", users: 1200 },
      { name: "Feb", users: 1800 },
      { name: "Mar", users: 2400 },
      { name: "Apr", users: 2100 },
      { name: "May", users: 3200 },
      { name: "Jun", users: 3800 },
    ],
    xKey: "name",
    yKey: "users",
    metadata: { source: "Internal", confidence: 1, freshness: "live" },
  },
  {
    layoutId: "card-3",
    type: "stat",
    title: "Total Revenue",
    data: [{ value: 670000, label: "YTD Revenue" }],
    xKey: "label",
    yKey: "value",
    metadata: { source: "SerpAPI", confidence: 0.88, freshness: "1d ago" },
  },
  {
    layoutId: "card-4",
    type: "pie",
    title: "Revenue by Region",
    data: [
      { name: "North America", value: 45 },
      { name: "Europe", value: 28 },
      { name: "Asia Pacific", value: 18 },
      { name: "Other", value: 9 },
    ],
    xKey: "name",
    yKey: "value",
    metadata: { source: "Firecrawl", confidence: 0.85, freshness: "6h ago" },
  },
];

const DEFAULT_LAYOUTS = {
  lg: [
    { i: "card-1", x: 0, y: 0, w: 6, h: 4 },
    { i: "card-2", x: 6, y: 0, w: 6, h: 4 },
    { i: "card-3", x: 0, y: 4, w: 4, h: 3 },
    { i: "card-4", x: 4, y: 4, w: 8, h: 3 },
  ],
};

export default function BoardViewPage() {
  const [title, setTitle] = useState("Revenue Overview");
  const [boardType, setBoardType] = useState<"live" | "report" | "monitor">("live");
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [cards, setCards] = useState(DEMO_CARDS);
  const [layouts, setLayouts] = useState(DEFAULT_LAYOUTS);

  const handleAddCard = useCallback((cell: ChartCell) => {
    const id = `card-${Date.now()}`;
    setCards((prev) => [...prev, { ...cell, layoutId: id }]);
    setLayouts((prev) => ({
      ...prev,
      lg: [...(prev.lg || []), { i: id, x: 0, y: Infinity, w: 6, h: 4 }],
    }));
  }, []);

  const handleRemoveCard = useCallback((layoutId: string) => {
    setCards((prev) => prev.filter((c) => c.layoutId !== layoutId));
    setLayouts((prev) => ({
      ...prev,
      lg: (prev.lg || []).filter((l) => l.i !== layoutId),
    }));
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
      <BoardToolbar
        title={title}
        onTitleChange={setTitle}
        boardType={boardType}
        onBoardTypeChange={setBoardType}
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing(!isEditing)}
        onAddCard={() => setShowAddModal(true)}
      />
      <div className="flex-1 overflow-auto p-6">
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={80}
          isDraggable={isEditing}
          isResizable={isEditing}
          onLayoutChange={(_layout, allLayouts) => setLayouts(allLayouts as any)}
          draggableHandle=".cursor-move"
        >
          {cards.map((card) => (
            <div key={card.layoutId}>
              <BoardCard cell={card} isEditing={isEditing} onRemove={() => handleRemoveCard(card.layoutId)} />
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
      <AddCardModal open={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddCard} />
    </div>
  );
}
