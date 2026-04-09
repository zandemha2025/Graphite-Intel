import { useState, useCallback, useId } from "react";

/* ── Default warm parchment palette ── */

const PALETTE = ["#B85C38", "#3C5E8B", "#3C8B4E", "#8B7A3C", "#6B3C8B"];

/* ── Stat Card ── */

export function EmbeddableStat({
  label,
  value,
  change,
  changeDirection,
}: {
  label: string;
  value: string;
  change?: string;
  changeDirection?: "up" | "down" | "neutral";
}) {
  const dirColor =
    changeDirection === "up"
      ? "#3C8B4E"
      : changeDirection === "down"
      ? "#B85C38"
      : "#8B7A3C";

  const dirArrow =
    changeDirection === "up"
      ? "\u25B2"
      : changeDirection === "down"
      ? "\u25BC"
      : "\u2014";

  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "12px",
        border: "1px solid var(--border, #ddd)",
        background: "var(--surface, #fff)",
        fontFamily: "Inter, system-ui, sans-serif",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "12px",
          color: "var(--text-muted, #888)",
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "4px 0 0",
          fontSize: "28px",
          fontWeight: 600,
          color: "var(--text-primary, #222)",
          lineHeight: 1.2,
        }}
      >
        {value}
      </p>
      {change && (
        <p
          style={{
            margin: "4px 0 0",
            fontSize: "13px",
            fontWeight: 500,
            color: dirColor,
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "10px" }}>{dirArrow}</span>
          {change}
        </p>
      )}
    </div>
  );
}

/* ── Bar Chart ── */

export function EmbeddableBar({
  data,
  labels,
  color,
}: {
  data: number[];
  labels: string[];
  color?: string;
}) {
  const uid = useId();
  const [hovered, setHovered] = useState<number | null>(null);

  if (!data.length) return null;

  const max = Math.max(...data, 1);
  const barCount = data.length;
  const padding = 40;
  const chartW = 300;
  const chartH = 180;
  const barGap = 8;
  const barW = Math.max(8, (chartW - padding * 2 - barGap * (barCount - 1)) / barCount);

  return (
    <div style={{ width: "100%", fontFamily: "Inter, system-ui, sans-serif" }}>
      <svg
        viewBox={`0 0 ${chartW} ${chartH + 30}`}
        width="100%"
        role="img"
        aria-label={`Bar chart with ${barCount} values`}
        style={{ display: "block" }}
      >
        {data.map((v, i) => {
          const barH = (v / max) * (chartH - 20);
          const x = padding + i * (barW + barGap);
          const y = chartH - barH;
          const fill = color || PALETTE[i % PALETTE.length];
          const isHovered = hovered === i;

          return (
            <g
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "default" }}
            >
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={3}
                fill={fill}
                opacity={isHovered ? 1 : 0.85}
                aria-label={`${labels[i] || `Bar ${i + 1}`}: ${v}`}
              />
              {isHovered && (
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--text-primary, #222)"
                  fontWeight={600}
                >
                  {v.toLocaleString()}
                </text>
              )}
              <text
                x={x + barW / 2}
                y={chartH + 14}
                textAnchor="middle"
                fontSize="10"
                fill="var(--text-muted, #888)"
              >
                {labels[i] || ""}
              </text>
            </g>
          );
        })}
        {/* Y-axis baseline */}
        <line
          x1={padding - 4}
          y1={chartH}
          x2={padding + barCount * (barW + barGap)}
          y2={chartH}
          stroke="var(--border, #ddd)"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}

/* ── Line Chart ── */

export function EmbeddableLine({
  data,
  labels,
  color,
  fill: showFill,
}: {
  data: number[];
  labels: string[];
  color?: string;
  fill?: boolean;
}) {
  const uid = useId();
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length < 2) return null;

  const lineColor = color || PALETTE[0];
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = 340;
  const chartH = 200;
  const plotW = chartW - padding.left - padding.right;
  const plotH = chartH - padding.top - padding.bottom;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => ({
    x: padding.left + (i / (data.length - 1)) * plotW,
    y: padding.top + plotH - ((v - min) / range) * plotH,
    value: v,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const fillD = `${pathD} L ${points[points.length - 1].x} ${padding.top + plotH} L ${points[0].x} ${padding.top + plotH} Z`;

  const gradientId = `line-grad-${uid.replace(/:/g, "")}`;

  return (
    <div style={{ width: "100%", fontFamily: "Inter, system-ui, sans-serif" }}>
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        width="100%"
        role="img"
        aria-label={`Line chart with ${data.length} data points`}
        style={{ display: "block" }}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padding.top + plotH * (1 - frac);
          return (
            <line
              key={frac}
              x1={padding.left}
              y1={y}
              x2={padding.left + plotW}
              y2={y}
              stroke="var(--border, #eee)"
              strokeWidth={0.5}
              strokeDasharray={frac === 0 ? "0" : "3,3"}
            />
          );
        })}
        {/* Fill area */}
        {showFill && (
          <path d={fillD} fill={`url(#${gradientId})`} />
        )}
        {/* Line */}
        <path d={pathD} fill="none" stroke={lineColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {/* Data points */}
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHovered(i)}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hovered === i ? 5 : 3}
              fill={hovered === i ? lineColor : "var(--surface, #fff)"}
              stroke={lineColor}
              strokeWidth={2}
              aria-label={`${labels[i] || `Point ${i + 1}`}: ${p.value}`}
            />
            {hovered === i && (
              <>
                <line x1={p.x} y1={p.y + 6} x2={p.x} y2={padding.top + plotH} stroke={lineColor} strokeWidth={0.5} strokeDasharray="3,3" />
                <rect
                  x={p.x - 28}
                  y={p.y - 22}
                  width={56}
                  height={18}
                  rx={4}
                  fill="var(--surface-elevated, #f5f5f5)"
                  stroke="var(--border, #ddd)"
                  strokeWidth={0.5}
                />
                <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fontWeight={600} fill="var(--text-primary, #222)">
                  {p.value.toLocaleString()}
                </text>
              </>
            )}
          </g>
        ))}
        {/* X labels */}
        {labels.map((l, i) => {
          if (!l) return null;
          const x = padding.left + (i / (data.length - 1)) * plotW;
          return (
            <text key={i} x={x} y={chartH - 4} textAnchor="middle" fontSize="10" fill="var(--text-muted, #888)">
              {l}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Donut Chart ── */

export function EmbeddableDonut({
  segments,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (!segments.length) return null;

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 80;
  const innerR = 50;

  let startAngle = -Math.PI / 2;

  const arcs = segments.map((seg, i) => {
    const fraction = seg.value / total;
    const angle = fraction * 2 * Math.PI;
    const endAngle = startAngle + angle;

    const x1Outer = cx + outerR * Math.cos(startAngle);
    const y1Outer = cy + outerR * Math.sin(startAngle);
    const x2Outer = cx + outerR * Math.cos(endAngle);
    const y2Outer = cy + outerR * Math.sin(endAngle);

    const x1Inner = cx + innerR * Math.cos(endAngle);
    const y1Inner = cy + innerR * Math.sin(endAngle);
    const x2Inner = cx + innerR * Math.cos(startAngle);
    const y2Inner = cy + innerR * Math.sin(startAngle);

    const largeArc = angle > Math.PI ? 1 : 0;

    const d = [
      `M ${x1Outer} ${y1Outer}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
      `L ${x1Inner} ${y1Inner}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}`,
      "Z",
    ].join(" ");

    const result = {
      d,
      color: seg.color || PALETTE[i % PALETTE.length],
      label: seg.label,
      value: seg.value,
      pct: (fraction * 100).toFixed(1),
    };

    startAngle = endAngle;
    return result;
  });

  return (
    <div style={{ width: "100%", fontFamily: "Inter, system-ui, sans-serif" }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width="100%"
        style={{ display: "block", maxWidth: "220px", margin: "0 auto" }}
        role="img"
        aria-label="Donut chart"
      >
        {arcs.map((arc, i) => (
          <path
            key={i}
            d={arc.d}
            fill={arc.color}
            opacity={hovered === null || hovered === i ? 1 : 0.4}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: "default", transition: "opacity 200ms" }}
            aria-label={`${arc.label}: ${arc.value} (${arc.pct}%)`}
          />
        ))}
        {/* Center text */}
        {hovered !== null ? (
          <>
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize="13" fontWeight={600} fill="var(--text-primary, #222)">
              {arcs[hovered].pct}%
            </text>
            <text x={cx} y={cy + 10} textAnchor="middle" fontSize="10" fill="var(--text-muted, #888)">
              {arcs[hovered].label}
            </text>
          </>
        ) : (
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize="14" fontWeight={600} fill="var(--text-primary, #222)">
            {total.toLocaleString()}
          </text>
        )}
      </svg>
      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px 16px",
          justifyContent: "center",
          marginTop: "12px",
        }}
      >
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: "var(--text-secondary, #555)",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: seg.color || PALETTE[i % PALETTE.length],
                flexShrink: 0,
              }}
            />
            {seg.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Sparkline (inline) ── */

export function EmbeddableSparkline({
  data,
  color,
  width = 80,
  height = 24,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;

  const lineColor = color || PALETTE[0];
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pad = 2;

  const points = data
    .map(
      (v, i) =>
        `${pad + (i / (data.length - 1)) * (width - pad * 2)},${pad + (height - pad * 2) - ((v - min) / range) * (height - pad * 2)}`
    )
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Sparkline trending ${data[data.length - 1] >= data[0] ? "up" : "down"}`}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {(() => {
        const lastI = data.length - 1;
        const lx = pad + (lastI / (data.length - 1)) * (width - pad * 2);
        const ly = pad + (height - pad * 2) - ((data[lastI] - min) / range) * (height - pad * 2);
        return <circle cx={lx} cy={ly} r={2} fill={lineColor} />;
      })()}
    </svg>
  );
}
