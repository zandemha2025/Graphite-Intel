export type ResearchDepth = "quick" | "standard" | "deep";

const OPTIONS: { value: ResearchDepth; label: string; desc: string }[] = [
  { value: "quick", label: "Quick", desc: "Fast, surface-level" },
  { value: "standard", label: "Standard", desc: "Balanced depth" },
  { value: "deep", label: "Deep", desc: "Comprehensive research" },
];

export function DepthToggle({
  value,
  onChange,
}: {
  value: ResearchDepth;
  onChange: (v: ResearchDepth) => void;
}) {
  return (
    <div
      className="flex items-center gap-0.5 p-0.5 rounded-md"
      style={{ background: "#F3F4F6", border: "1px solid #E5E7EB" }}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          title={opt.desc}
          className="px-3 py-1 text-xs rounded transition-all"
          style={{
            background: value === opt.value ? "#FFFFFF" : "transparent",
            color: value === opt.value ? "#4F46E5" : "#6B7280",
            fontWeight: value === opt.value ? 600 : 400,
            boxShadow: value === opt.value ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
