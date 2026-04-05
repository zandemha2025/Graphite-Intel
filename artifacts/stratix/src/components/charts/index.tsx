import ReactMarkdown from "react-markdown";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

export type CellType = "markdown" | "chart" | "table" | "stat";

export type StatItem = {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
};

export type CellData = {
  id: string;
  type: CellType;
  title?: string;
  source?: string;
  // markdown
  content?: string;
  // chart
  chartType?: "bar" | "line" | "pie" | "area";
  data?: Record<string, unknown>[];
  xKey?: string;
  yKey?: string;
  // table
  columns?: string[];
  rows?: Record<string, unknown>[];
  // stat
  stats?: StatItem[];
};

const CHART_COLORS = ["#4F46E5", "#7C3AED", "#A78BFA", "#818CF8", "#6366F1"];

function MarkdownCell({ content }: { content: string }) {
  return (
    <div
      className="prose prose-sm max-w-none"
      style={{
        "--tw-prose-body": "#1F2937",
        "--tw-prose-headings": "#111827",
        "--tw-prose-links": "#4F46E5",
        "--tw-prose-bold": "#111827",
        "--tw-prose-counters": "#6B7280",
        "--tw-prose-bullets": "#6B7280",
        "--tw-prose-hr": "#E5E7EB",
        "--tw-prose-quotes": "#1F2937",
        "--tw-prose-quote-borders": "#E5E7EB",
        "--tw-prose-code": "#111827",
        "--tw-prose-pre-bg": "#F9FAFB",
        "--tw-prose-th-borders": "#E5E7EB",
        "--tw-prose-td-borders": "#F3F4F6",
      } as React.CSSProperties}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

function ChartCell({ cell }: { cell: CellData }) {
  const { chartType = "bar", data = [], xKey = "name", yKey = "value" } = cell;

  return (
    <ResponsiveContainer width="100%" height={220}>
      {chartType === "pie" ? (
        <PieChart>
          <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={80} label>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      ) : chartType === "line" ? (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#6B7280" }} />
          <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} />
          <Tooltip />
          <Line type="monotone" dataKey={yKey} stroke="#4F46E5" strokeWidth={2} dot={false} />
        </LineChart>
      ) : chartType === "area" ? (
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#6B7280" }} />
          <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} />
          <Tooltip />
          <Area type="monotone" dataKey={yKey} stroke="#4F46E5" fill="#EEF2FF" strokeWidth={2} />
        </AreaChart>
      ) : (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#6B7280" }} />
          <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} />
          <Tooltip />
          <Bar dataKey={yKey} fill="#4F46E5" radius={[2, 2, 0, 0]} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

function TableCell({ cell }: { cell: CellData }) {
  const { columns = [], rows = [] } = cell;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
            {columns.map((col) => (
              <th
                key={col}
                className="text-left px-3 py-2 font-medium"
                style={{ color: "#6B7280", fontSize: 10 }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #F3F4F6" }}>
              {columns.map((col) => (
                <td key={col} className="px-3 py-2" style={{ color: "#374151" }}>
                  {String(row[col] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCell({ stats }: { stats: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, i) => (
        <div key={i} className="p-3 rounded-md" style={{ background: "#F9FAFB" }}>
          <p className="text-xs mb-1" style={{ color: "#6B7280" }}>{stat.label}</p>
          <p className="text-xl font-semibold" style={{ color: "#111827" }}>{stat.value}</p>
          {stat.change && (
            <p
              className="text-xs mt-0.5"
              style={{
                color: stat.trend === "up" ? "#16A34A" : stat.trend === "down" ? "#DC2626" : "#6B7280",
              }}
            >
              {stat.change}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export function ChartRenderer({ cell }: { cell: CellData }) {
  switch (cell.type) {
    case "chart":
      return <ChartCell cell={cell} />;
    case "table":
      return <TableCell cell={cell} />;
    case "stat":
      return <StatCell stats={cell.stats ?? []} />;
    default:
      return <MarkdownCell content={cell.content ?? ""} />;
  }
}
