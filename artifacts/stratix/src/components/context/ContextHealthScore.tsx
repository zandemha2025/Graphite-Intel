import { useMemo } from "react";

interface HealthBreakdown {
  profile: number;
  documents: number;
  connections: number;
  definitions: number;
  freshness: number;
}

interface Props {
  profileComplete: boolean;
  companyName: string;
  docCount: number;
  definitionCount: number;
  connectionCount: number;
  profileFields: {
    name: boolean;
    industry: boolean;
    stage: boolean;
    revenue: boolean;
    competitors: boolean;
    priorities: boolean;
    researchSummary: boolean;
  };
  lastSyncAt?: string | null;
}

function CircularProgress({
  score,
  size = 96,
  strokeWidth = 6,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score < 40 ? "#DC2626" : score <= 70 ? "#D97706" : "#16a34a";

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "#111827",
            lineHeight: 1,
          }}
        >
          {score}
        </span>
        <span style={{ fontSize: "10px", color: "#6B7280", marginTop: "2px" }}>
          / 100
        </span>
      </div>
    </div>
  );
}

function BreakdownBar({
  label,
  value,
  max,
  detail,
}: {
  label: string;
  value: number;
  max: number;
  detail: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const full = value >= max;

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "4px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#6B7280",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: "10px",
            color: full ? "#16a34a" : "#6B7280",
            fontWeight: full ? 600 : 400,
            flexShrink: 0,
            marginLeft: "8px",
          }}
        >
          {value}/{max}
        </span>
      </div>
      <div
        style={{
          height: "3px",
          background: "#E5E7EB",
          borderRadius: "2px",
          marginBottom: "3px",
        }}
      >
        <div
          style={{
            height: "100%",
            background: full ? "#16a34a" : "#4F46E5",
            borderRadius: "2px",
            width: `${pct}%`,
            transition: "width 0.5s ease",
          }}
        />
      </div>
      <div style={{ fontSize: "10px", color: full ? "#16a34a" : "#9CA3AF" }}>
        {detail}
      </div>
    </div>
  );
}

function computeBreakdown(props: Props): HealthBreakdown {
  const { profileFields, docCount, connectionCount, definitionCount, lastSyncAt } = props;

  // Profile: 0-30 points
  const fieldCount = Object.values(profileFields).filter(Boolean).length;
  const profile = Math.round((fieldCount / 7) * 30);

  // Documents: 0-25 points
  let documents = 0;
  if (docCount >= 20) documents = 25;
  else if (docCount >= 5) documents = 20;
  else if (docCount >= 1) documents = 10;

  // Connections: 0-20 points
  let connections = 0;
  if (connectionCount >= 4) connections = 20;
  else if (connectionCount >= 2) connections = 15;
  else if (connectionCount >= 1) connections = 10;

  // Definitions: 0-15 points
  let definitions = 0;
  if (definitionCount >= 10) definitions = 15;
  else if (definitionCount >= 5) definitions = 10;
  else if (definitionCount >= 1) definitions = 5;

  // Freshness: 0-10 points
  let freshness = 0;
  if (lastSyncAt) {
    const diff = Date.now() - new Date(lastSyncAt).getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours < 24) freshness = 10;
    else if (hours < 168) freshness = 5;
  }

  return { profile, documents, connections, definitions, freshness };
}

export function ContextHealthScore(props: Props) {
  const breakdown = useMemo(() => computeBreakdown(props), [props]);
  const total =
    breakdown.profile +
    breakdown.documents +
    breakdown.connections +
    breakdown.definitions +
    breakdown.freshness;

  return (
    <div
      style={{
        background: "#F3F4F6",
        border: "1px solid #E5E7EB",
        padding: "20px 24px",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          marginBottom: "16px",
        }}
      >
        <CircularProgress score={total} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "#6B7280",
              marginBottom: "6px",
            }}
          >
            Context Health
          </div>
          <div style={{ fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>
            {total < 40
              ? "Your context is minimal. Add more data to get better AI responses."
              : total <= 70
                ? "Good progress. Fill in the gaps below to unlock full AI accuracy."
                : "Strong context coverage. Keep your data fresh for best results."}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px" }}>
        <BreakdownBar
          label="Profile"
          value={breakdown.profile}
          max={30}
          detail={`${Object.values(props.profileFields).filter(Boolean).length}/7 fields`}
        />
        <BreakdownBar
          label="Documents"
          value={breakdown.documents}
          max={25}
          detail={`${props.docCount} uploaded`}
        />
        <BreakdownBar
          label="Sources"
          value={breakdown.connections}
          max={20}
          detail={`${props.connectionCount} connected`}
        />
        <BreakdownBar
          label="Definitions"
          value={breakdown.definitions}
          max={15}
          detail={`${props.definitionCount} defined`}
        />
        <BreakdownBar
          label="Freshness"
          value={breakdown.freshness}
          max={10}
          detail={props.lastSyncAt ? "Recent sync" : "No sync data"}
        />
      </div>
    </div>
  );
}
