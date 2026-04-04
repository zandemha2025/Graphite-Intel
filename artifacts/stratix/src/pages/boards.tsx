import { useState } from "react";
import { Link } from "wouter";

interface BoardSummary {
  id: string;
  title: string;
  description: string;
  type: "live" | "report" | "monitor";
  cardCount: number;
  updatedAt: string;
}

const DEMO_BOARDS: BoardSummary[] = [
  { id: "1", title: "Revenue Overview", description: "Key revenue metrics and trends", type: "live", cardCount: 6, updatedAt: "2 hours ago" },
  { id: "2", title: "Marketing Performance", description: "Campaign metrics across channels", type: "report", cardCount: 4, updatedAt: "1 day ago" },
  { id: "3", title: "System Health", description: "Infrastructure and uptime monitoring", type: "monitor", cardCount: 8, updatedAt: "5 min ago" },
];

const TYPE_BADGES: Record<string, string> = {
  live: "bg-green-100 text-green-700",
  report: "bg-blue-100 text-blue-700",
  monitor: "bg-amber-100 text-amber-700",
};

export default function BoardsPage() {
  const [boards] = useState<BoardSummary[]>(DEMO_BOARDS);

  return (
    <div className="flex-1 bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Boards</h1>
            <p className="text-sm text-gray-500 mt-1">Build and manage your intelligence dashboards</p>
          </div>
          <Link href="/boards/new">
            <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm">
              + New Board
            </button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => (
            <Link key={board.id} href={`/boards/${board.id}`}>
              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{board.title}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${TYPE_BADGES[board.type]}`}>
                    {board.type}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4">{board.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{board.cardCount} cards</span>
                  <span>{board.updatedAt}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
