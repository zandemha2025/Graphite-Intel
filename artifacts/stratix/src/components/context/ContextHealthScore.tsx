import { AlertCircle, CheckCircle2 } from "lucide-react";

interface Props {
  profileComplete: boolean;
  companyName: string;
  docCount: number;
  definitionCount: number;
}

function HealthSegment({
  label,
  value,
  max,
  detail,
}: {
  label: string;
  value: number;
  max: number;
  detail?: string;
}) {
  const pct = Math.round((value / max) * 100);
  const done = value >= max;
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#6B7280",
          marginBottom: "4px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </div>
      <div
        style={{
          height: "3px",
          background: "#E5E7EB",
          borderRadius: "2px",
          marginBottom: "4px",
        }}
      >
        <div
          style={{
            height: "100%",
            background: done ? "#16a34a" : "#4F46E5",
            borderRadius: "2px",
            width: `${pct}%`,
            transition: "width 0.5s ease",
          }}
        />
      </div>
      <div style={{ fontSize: "10px", color: done ? "#16a34a" : "#6B7280" }}>
        {detail ?? (done ? "Complete" : `${pct}%`)}
      </div>
    </div>
  );
}

export function ContextHealthScore({
  profileComplete,
  companyName,
  docCount,
  definitionCount,
}: Props) {
  const profileScore = profileComplete ? 40 : companyName.trim() ? 20 : 0;
  const docScore = Math.min(30, Math.round((Math.min(docCount, 5) / 5) * 30));
  const defScore = Math.min(
    30,
    Math.round((Math.min(definitionCount, 10) / 10) * 30),
  );
  const total = profileScore + docScore + defScore;

  const suggestion =
    definitionCount === 0
      ? "Add competitor definitions to improve competitive analysis"
      : definitionCount < 5
        ? "Add more definitions (metrics, markets) to sharpen AI responses"
        : docCount === 0
          ? "Upload documents to ground AI answers in your data"
          : !profileComplete
            ? "Complete your company profile for best results"
            : "Your context is well-configured. Keep definitions updated.";

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
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "14px",
        }}
      >
        <div>
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
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span
              style={{
                fontSize: "32px",
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1,
              }}
            >
              {total}%
            </span>
            <span style={{ fontSize: "13px", color: "#6B7280" }}>complete</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: "16px",
            fontSize: "11px",
            color: "#6B7280",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {profileComplete ? (
              <CheckCircle2 size={12} style={{ color: "#16a34a" }} />
            ) : (
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  border: "1.5px solid #E5E7EB",
                }}
              />
            )}
            Profile
          </div>
          <div>
            {docCount} doc{docCount !== 1 ? "s" : ""}
          </div>
          <div>
            {definitionCount} def{definitionCount !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div
        style={{
          height: "5px",
          background: "#E5E7EB",
          borderRadius: "3px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            height: "100%",
            background: total >= 80 ? "#16a34a" : "#4F46E5",
            borderRadius: "3px",
            width: `${total}%`,
            transition: "width 0.6s ease",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: "20px", marginBottom: "14px" }}>
        <HealthSegment
          label="Company Profile"
          value={profileScore}
          max={40}
          detail={profileComplete ? "Complete" : "Incomplete"}
        />
        <HealthSegment
          label="Knowledge Base"
          value={docScore}
          max={30}
          detail={`${docCount} doc${docCount !== 1 ? "s" : ""}`}
        />
        <HealthSegment
          label="Definitions"
          value={defScore}
          max={30}
          detail={`${definitionCount} defined`}
        />
      </div>

      <div
        style={{
          fontSize: "12px",
          color: "#4F46E5",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <AlertCircle size={12} />
        {suggestion}
      </div>
    </div>
  );
}
