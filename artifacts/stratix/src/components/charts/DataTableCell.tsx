import { ChartCell } from "./types";
import { CHART_COLORS } from "./theme";

type Props = { cell: ChartCell };

export function DataTableCell({ cell }: Props) {
  const { data, title } = cell;
  if (!data.length) {
    return (
      <p className="text-sm" style={{ color: CHART_COLORS.mutedText }}>
        No data
      </p>
    );
  }

  const columns = Object.keys(data[0]);

  return (
    <div className="w-full">
      {title && (
        <p className="text-sm font-medium mb-3" style={{ color: CHART_COLORS.text }}>
          {title}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: CHART_COLORS.grid }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ backgroundColor: "#F9FAFB" }}>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-2 text-left font-medium whitespace-nowrap"
                  style={{ color: CHART_COLORS.mutedText, borderBottom: `1px solid ${CHART_COLORS.grid}` }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                style={{
                  backgroundColor: i % 2 === 0 ? CHART_COLORS.background : "#FAFAFA",
                  borderBottom: `1px solid ${CHART_COLORS.grid}`,
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-4 py-2 whitespace-nowrap"
                    style={{ color: CHART_COLORS.text }}
                  >
                    {row[col] !== undefined && row[col] !== null ? String(row[col]) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
