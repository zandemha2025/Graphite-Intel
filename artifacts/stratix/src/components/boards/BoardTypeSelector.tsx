import { useState } from "react";

const BOARD_TYPES = [
  { id: "live", label: "Live Dashboard" },
  { id: "report", label: "Report" },
  { id: "monitor", label: "Monitor" },
] as const;

type BoardType = (typeof BOARD_TYPES)[number]["id"];

export function BoardTypeSelector({ value, onChange }: { value: BoardType; onChange: (v: BoardType) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-1">
      {BOARD_TYPES.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            value === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
