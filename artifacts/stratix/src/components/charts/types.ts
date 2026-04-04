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
