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

export type ChartCell = {
  type: "bar" | "line" | "area" | "pie" | "scatter" | "treemap" | "table" | "stat" | "text";
  title: string;
  data: Array<Record<string, any>>;
  xKey?: string;
  yKey?: string | string[];
  metadata?: {
    source?: string;
    confidence?: number;
    freshness?: string;
  };
};
