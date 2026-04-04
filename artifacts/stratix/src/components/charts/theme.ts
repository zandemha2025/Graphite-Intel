export const CHART_COLORS = {
  primary: "#4F46E5",
  series: ["#4F46E5", "#6366F1", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981"],
  grid: "#E5E7EB",
  text: "#374151",
  mutedText: "#9CA3AF",
  background: "#FFFFFF",
  tooltipBg: "#FFFFFF",
  tooltipBorder: "#E5E7EB",
};

export const TOOLTIP_STYLE = {
  backgroundColor: CHART_COLORS.tooltipBg,
  border: `1px solid ${CHART_COLORS.tooltipBorder}`,
  borderRadius: "6px",
  color: CHART_COLORS.text,
  fontSize: "13px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};
