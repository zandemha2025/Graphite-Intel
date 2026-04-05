import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Check } from "lucide-react";
import { SCHEDULE_PRESETS } from "./board-types";

type Props = {
  open: boolean;
  currentCron?: string;
  onClose: () => void;
  onSave: (cron: string | undefined) => void;
};

export function ScheduleDialog({ open, currentCron, onClose, onSave }: Props) {
  const [selected, setSelected] = useState<string | undefined>(currentCron);
  const [customCron, setCustomCron] = useState("");
  const [isCustom, setIsCustom] = useState(
    !!currentCron && !SCHEDULE_PRESETS.some((p) => p.cron === currentCron),
  );

  const handleSave = () => {
    const cron = isCustom ? customCron.trim() || undefined : selected;
    onSave(cron);
    onClose();
  };

  const handleClear = () => {
    onSave(undefined);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm" style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#111827" }}>
            <Clock className="h-4 w-4" style={{ color: "#4F46E5" }} />
            Refresh Schedule
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-xs" style={{ color: "#6B7280" }}>
            Set how often all cards on this board auto-refresh.
          </p>

          {/* Preset options */}
          <div className="space-y-1.5">
            {SCHEDULE_PRESETS.map((preset) => {
              const active = !isCustom && selected === preset.cron;
              return (
                <button
                  key={preset.cron}
                  onClick={() => { setSelected(preset.cron); setIsCustom(false); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all"
                  style={{
                    background: active ? "#EEF2FF" : "#F9FAFB",
                    border: active ? "1.5px solid #4F46E5" : "1.5px solid #E5E7EB",
                  }}
                >
                  <span className="text-xs font-medium" style={{ color: active ? "#4F46E5" : "#111827" }}>
                    {preset.label}
                  </span>
                  {active && <Check className="h-3.5 w-3.5" style={{ color: "#4F46E5" }} />}
                </button>
              );
            })}

            {/* Custom cron */}
            <button
              onClick={() => setIsCustom(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all"
              style={{
                background: isCustom ? "#EEF2FF" : "#F9FAFB",
                border: isCustom ? "1.5px solid #4F46E5" : "1.5px solid #E5E7EB",
              }}
            >
              <span className="text-xs font-medium" style={{ color: isCustom ? "#4F46E5" : "#111827" }}>
                Custom cron
              </span>
              {isCustom && <Check className="h-3.5 w-3.5" style={{ color: "#4F46E5" }} />}
            </button>

            {isCustom && (
              <input
                type="text"
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                placeholder="*/30 * * * *"
                className="w-full px-3 py-2 rounded-md text-sm outline-none font-mono"
                style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", color: "#111827" }}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleClear}
              className="text-xs font-medium"
              style={{ color: "#DC2626" }}
            >
              Remove schedule
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded text-xs font-medium"
                style={{ background: "#F3F4F6", color: "#374151" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 rounded text-xs font-medium"
                style={{ background: "#4F46E5", color: "#FFFFFF" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
