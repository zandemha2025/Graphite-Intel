import { Hand, Timer, Database, BarChart3 } from "lucide-react";

// ─── Trigger Types ────────────────────────────────────────────

const TRIGGER_TYPES = [
  { value: "manual", label: "Manual", icon: Hand, description: "Click to run" },
  { value: "cron", label: "Schedule", icon: Timer, description: "Run on a cron schedule" },
  { value: "data_change", label: "Data Change", icon: Database, description: "Fire when new data syncs" },
  { value: "threshold", label: "Threshold", icon: BarChart3, description: "Fire when a metric crosses a value" },
] as const;

const CRON_PRESETS = [
  { label: "Every hour", value: "0 * * * *" },
  { label: "Daily at 9am", value: "0 9 * * *" },
  { label: "Weekly (Mon 9am)", value: "0 9 * * 1" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Custom", value: "" },
];

const CONNECTOR_OPTIONS = [
  { value: "", label: "Any connector" },
  { value: "gong", label: "Gong" },
  { value: "salesforce", label: "Salesforce" },
  { value: "hubspot", label: "HubSpot" },
  { value: "slack", label: "Slack" },
  { value: "google-drive", label: "Google Drive" },
  { value: "pipedream", label: "Pipedream" },
];

export function TriggerConfigSection({
  config,
  onChange,
}: {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}) {
  const trigger = config?.trigger ?? { type: "manual" };
  const triggerType = trigger.type ?? "manual";

  const setTrigger = (updates: Record<string, any>) => {
    onChange({ ...config, trigger: { ...trigger, ...updates } });
  };

  const setTriggerType = (type: string) => {
    const defaults: Record<string, Record<string, any>> = {
      manual: { type: "manual" },
      cron: { type: "cron", cron: "0 9 * * *" },
      data_change: { type: "data_change", connectorId: "", dataType: "" },
      threshold: { type: "threshold", metric: "", condition: "above", value: 0 },
    };
    onChange({ ...config, trigger: defaults[type] ?? { type: "manual" } });
  };

  return (
    <div className="space-y-4">
      <h2
        className="text-xs font-medium"
        style={{ color: "var(--workspace-muted)" }}
      >
        Trigger
      </h2>

      {/* Trigger Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {TRIGGER_TYPES.map((t) => {
          const Icon = t.icon;
          const isActive = triggerType === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setTriggerType(t.value)}
              className="flex items-center gap-2 p-3 text-left transition-all"
              style={{
                border: isActive
                  ? "2px solid var(--workspace-fg)"
                  : "1px solid var(--workspace-border)",
                background: isActive ? "var(--workspace-muted-bg)" : "#FFFFFF",
              }}
            >
              <Icon
                className="h-4 w-4 shrink-0"
                style={{ color: isActive ? "var(--workspace-fg)" : "var(--workspace-muted)" }}
              />
              <div>
                <span
                  className="text-xs font-medium block"
                  style={{ color: isActive ? "var(--workspace-fg)" : "var(--workspace-muted)" }}
                >
                  {t.label}
                </span>
                <span className="text-[10px] block" style={{ color: "var(--workspace-muted)" }}>
                  {t.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Type-specific config */}
      {triggerType === "cron" && (
        <div
          className="p-4 space-y-3"
          style={{ border: "1px solid var(--workspace-border)", background: "var(--workspace-muted-bg)" }}
        >
          <label
            className="text-xs font-medium mb-1.5 block"
            style={{ color: "var(--workspace-muted)" }}
          >
            Schedule
          </label>
          <div className="flex flex-wrap gap-2">
            {CRON_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  if (preset.value) setTrigger({ cron: preset.value });
                }}
                className="px-3 py-1.5 text-xs transition-colors"
                style={{
                  border:
                    trigger.cron === preset.value
                      ? "1px solid var(--workspace-fg)"
                      : "1px solid var(--workspace-border)",
                  color:
                    trigger.cron === preset.value
                      ? "var(--workspace-fg)"
                      : "var(--workspace-muted)",
                  background: trigger.cron === preset.value ? "var(--workspace-muted-bg)" : "#FFFFFF",
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div>
            <label
              className="text-xs font-medium mb-1 block"
              style={{ color: "var(--workspace-muted)" }}
            >
              Cron Expression
            </label>
            <input
              type="text"
              value={trigger.cron || ""}
              onChange={(e) => setTrigger({ cron: e.target.value })}
              placeholder="0 9 * * *"
              className="w-full px-3 py-2 text-xs font-mono focus:outline-none"
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--workspace-border)",
                color: "var(--workspace-fg)",
              }}
            />
          </div>
        </div>
      )}

      {triggerType === "data_change" && (
        <div
          className="p-4 space-y-3"
          style={{ border: "1px solid var(--workspace-border)", background: "var(--workspace-muted-bg)" }}
        >
          <div>
            <label
              className="text-xs font-medium mb-1.5 block"
              style={{ color: "var(--workspace-muted)" }}
            >
              Connector / Data Source
            </label>
            <select
              value={trigger.connectorId || ""}
              onChange={(e) => setTrigger({ connectorId: e.target.value })}
              className="w-full px-3 py-2 text-xs focus:outline-none"
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--workspace-border)",
                color: "var(--workspace-fg)",
              }}
            >
              {CONNECTOR_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="text-xs font-medium mb-1 block"
              style={{ color: "var(--workspace-muted)" }}
            >
              Data Type (optional)
            </label>
            <input
              type="text"
              value={trigger.dataType || ""}
              onChange={(e) => setTrigger({ dataType: e.target.value })}
              placeholder="e.g. calls, deals, contacts"
              className="w-full px-3 py-2 text-xs focus:outline-none"
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--workspace-border)",
                color: "var(--workspace-fg)",
              }}
            />
          </div>
        </div>
      )}

      {triggerType === "threshold" && (
        <div
          className="p-4 space-y-3"
          style={{ border: "1px solid var(--workspace-border)", background: "var(--workspace-muted-bg)" }}
        >
          <div>
            <label
              className="text-xs font-medium mb-1.5 block"
              style={{ color: "var(--workspace-muted)" }}
            >
              Metric
            </label>
            <input
              type="text"
              value={trigger.metric || ""}
              onChange={(e) => setTrigger({ metric: e.target.value })}
              placeholder="e.g. deal_value, open_rate, churn_risk"
              className="w-full px-3 py-2 text-xs focus:outline-none"
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--workspace-border)",
                color: "var(--workspace-fg)",
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="text-xs font-medium mb-1 block"
                style={{ color: "var(--workspace-muted)" }}
              >
                Condition
              </label>
              <select
                value={trigger.condition || "above"}
                onChange={(e) => setTrigger({ condition: e.target.value })}
                className="w-full px-3 py-2 text-xs focus:outline-none"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--workspace-border)",
                  color: "var(--workspace-fg)",
                }}
              >
                <option value="above">Goes above</option>
                <option value="below">Goes below</option>
              </select>
            </div>
            <div>
              <label
                className="text-xs font-medium mb-1 block"
                style={{ color: "var(--workspace-muted)" }}
              >
                Value
              </label>
              <input
                type="number"
                value={trigger.value ?? 0}
                onChange={(e) => setTrigger({ value: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs focus:outline-none"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--workspace-border)",
                  color: "var(--workspace-fg)",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
