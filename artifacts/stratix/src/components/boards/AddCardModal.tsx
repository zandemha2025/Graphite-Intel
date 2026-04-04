import { useState } from "react";
import type { ChartCell } from "../charts/types";

const CHART_TYPES = ["bar", "line", "pie", "stat", "table", "area", "scatter"] as const;

interface AddCardModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (cell: ChartCell) => void;
}

export function AddCardModal({ open, onClose, onAdd }: AddCardModalProps) {
  const [title, setTitle] = useState("");
  const [chartType, setChartType] = useState<string>("bar");

  if (!open) return null;

  const handleAdd = () => {
    const sampleData = chartType === "stat"
      ? [{ value: 42, label: "Sample Metric" }]
      : chartType === "pie"
      ? [{ name: "A", value: 40 }, { name: "B", value: 30 }, { name: "C", value: 30 }]
      : [{ name: "Q1", value: 100 }, { name: "Q2", value: 200 }, { name: "Q3", value: 150 }, { name: "Q4", value: 300 }];

    onAdd({
      type: chartType,
      title: title || "Untitled Card",
      data: sampleData,
      xKey: "name",
      yKey: "value",
      metadata: { source: "manual", confidence: 1, freshness: "live" },
    });
    setTitle("");
    setChartType("bar");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Card</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Card title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chart Type</label>
            <div className="grid grid-cols-4 gap-2">
              {CHART_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setChartType(t)}
                  className={`px-2 py-1.5 text-xs font-medium rounded-md capitalize ${
                    chartType === t ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button onClick={handleAdd} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Add Card</button>
        </div>
      </div>
    </div>
  );
}
