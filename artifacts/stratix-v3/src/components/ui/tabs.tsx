import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (id: string) => void;
  children: (activeTab: string) => ReactNode;
  className?: string;
}

export function Tabs({
  tabs,
  defaultTab,
  activeTab: controlledTab,
  onTabChange,
  children,
  className,
}: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultTab ?? tabs[0]?.id ?? "");
  const activeTab = controlledTab ?? internalTab;

  function handleTabChange(id: string) {
    setInternalTab(id);
    onTabChange?.(id);
  }

  return (
    <div className={className}>
      <div className="flex border-b border-[#E5E7EB]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors relative",
              activeTab === tab.id
                ? "text-[#4F46E5]"
                : "text-[#6B7280] hover:text-[#111827]",
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5]" />
            )}
          </button>
        ))}
      </div>
      <div className="mt-4">{children(activeTab)}</div>
    </div>
  );
}
