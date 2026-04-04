import { useState, useEffect } from "react";
import {
  useGetCompanyProfile,
  getGetCompanyProfileQueryKey,
  useSaveCompanyProfile,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Plus, X } from "lucide-react";

const STAGES = [
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C+",
  "Growth",
  "Public",
  "Enterprise",
];
const REVENUE_RANGES = [
  "Pre-revenue",
  "<$1M",
  "$1M–$10M",
  "$10M–$50M",
  "$50M–$200M",
  "$200M–$1B",
  "$1B+",
];
const INDUSTRIES = [
  "Technology / SaaS",
  "Fintech / Financial Services",
  "Healthcare / Biotech",
  "Consumer / Retail",
  "Media / Entertainment",
  "Enterprise Software",
  "E-commerce",
  "Real Estate",
  "Manufacturing / Industrial",
  "Professional Services",
  "Education",
  "Other",
];
const TEAM_SIZES = ["1–10", "11–50", "51–200", "201–500", "501–1,000", "1,000+"];
const GEOGRAPHIES = [
  "North America",
  "Europe",
  "Asia Pacific",
  "Latin America",
  "Middle East & Africa",
  "Global",
];

function ChipButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 12px",
        fontSize: "11px",
        border: `1px solid ${selected ? "#4F46E5" : "#E5E7EB"}`,
        background: selected ? "#EEF2FF" : "#FFFFFF",
        color: selected ? "#4F46E5" : "#6B7280",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function ColumnChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "7px 10px",
        fontSize: "11px",
        border: `1px solid ${selected ? "#4F46E5" : "#E5E7EB"}`,
        background: selected ? "#EEF2FF" : "#FFFFFF",
        color: selected ? "#4F46E5" : "#6B7280",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

export function CompanyProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: profile, isLoading } = useGetCompanyProfile({
    query: { queryKey: getGetCompanyProfileQueryKey() },
  });
  const saveProfile = useSaveCompanyProfile();

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [stage, setStage] = useState("");
  const [revenueRange, setRevenueRange] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [geography, setGeography] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [newPriority, setNewPriority] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.companyName || "");
      setIndustry(profile.industry || "");
      setStage(profile.stage || "");
      setRevenueRange(profile.revenueRange || "");
      const raw = profile.strategicPriorities || "";
      const items = raw
        .split(/\n|,/)
        .map((s: string) => s.trim())
        .filter(Boolean);
      setPriorities(items);
    }
  }, [profile]);

  const addPriority = () => {
    if (!newPriority.trim()) return;
    setPriorities((prev) => [...prev, newPriority.trim()]);
    setNewPriority("");
  };

  const removePriority = (i: number) =>
    setPriorities((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfile.mutate(
      {
        data: {
          companyName,
          industry,
          stage,
          revenueRange,
          strategicPriorities: priorities.join("\n"),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetCompanyProfileQueryKey(),
          });
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
          toast({ title: "Profile saved" });
        },
        onError: () => {
          toast({ title: "Failed to save profile", variant: "destructive" });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{ height: "40px", background: "#F3F4F6" }}
          />
        ))}
      </div>
    );
  }

  const labelStyle: React.CSSProperties = {
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    color: "#6B7280",
    display: "block",
    marginBottom: "8px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    fontSize: "13px",
    border: "1px solid #E5E7EB",
    background: "#FFFFFF",
    color: "#111827",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ maxWidth: "640px" }}
      className="space-y-6"
    >
      <div>
        <label style={labelStyle}>Company Name</label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          style={inputStyle}
          placeholder="e.g. Acme Corp"
        />
      </div>

      <div>
        <label style={labelStyle}>Industry</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {INDUSTRIES.map((ind) => (
            <ChipButton
              key={ind}
              label={ind}
              selected={industry === ind}
              onClick={() => setIndustry(ind)}
            />
          ))}
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}
      >
        <div>
          <label style={labelStyle}>Stage</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {STAGES.map((s) => (
              <ColumnChip
                key={s}
                label={s}
                selected={stage === s}
                onClick={() => setStage(s)}
              />
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Revenue Range</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {REVENUE_RANGES.map((r) => (
              <ColumnChip
                key={r}
                label={r}
                selected={revenueRange === r}
                onClick={() => setRevenueRange(r)}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}
      >
        <div>
          <label style={labelStyle}>Team Size</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {TEAM_SIZES.map((t) => (
              <ChipButton
                key={t}
                label={t}
                selected={teamSize === t}
                onClick={() => setTeamSize(t)}
              />
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Geography</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {GEOGRAPHIES.map((g) => (
              <ChipButton
                key={g}
                label={g}
                selected={geography === g}
                onClick={() => setGeography(g)}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Strategic Priorities</label>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            marginBottom: priorities.length ? "8px" : "0",
          }}
        >
          {priorities.map((p, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "#F3F4F6",
                border: "1px solid #E5E7EB",
              }}
            >
              <span style={{ fontSize: "13px", color: "#111827" }}>{p}</span>
              <button
                type="button"
                onClick={() => removePriority(i)}
                style={{
                  padding: "2px",
                  color: "#9CA3AF",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  flexShrink: 0,
                  marginLeft: "8px",
                }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPriority();
              }
            }}
            placeholder="Add a strategic priority…"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            type="button"
            onClick={addPriority}
            style={{
              padding: "9px 14px",
              background: "#F3F4F6",
              border: "1px solid #E5E7EB",
              color: "#6B7280",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              flexShrink: 0,
            }}
          >
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "8px",
          borderTop: "1px solid #E5E7EB",
        }}
      >
        {saved ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: "#16a34a",
            }}
          >
            <CheckCircle2 size={14} /> Saved
          </div>
        ) : (
          <div />
        )}
        <button
          type="submit"
          disabled={
            saveProfile.isPending ||
            !companyName ||
            !industry ||
            !stage ||
            !revenueRange
          }
          style={{
            padding: "9px 24px",
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            background: "#111827",
            color: "#FFFFFF",
            border: "none",
            cursor: "pointer",
            opacity:
              saveProfile.isPending ||
              !companyName ||
              !industry ||
              !stage ||
              !revenueRange
                ? 0.4
                : 1,
          }}
        >
          {saveProfile.isPending ? "Saving…" : "Save Profile"}
        </button>
      </div>
    </form>
  );
}
