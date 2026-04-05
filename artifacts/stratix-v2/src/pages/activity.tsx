import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { CardSkeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface ActivityItem {
  id: number;
  user: string;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  timestamp: string;
}

interface ActivityResponse {
  items: ActivityItem[];
  hasMore: boolean;
  cursor?: string;
}

const ACTION_FILTERS = [
  { value: "", label: "All actions" },
  { value: "create", label: "Created" },
  { value: "update", label: "Updated" },
  { value: "delete", label: "Deleted" },
  { value: "view", label: "Viewed" },
  { value: "share", label: "Shared" },
  { value: "export", label: "Exported" },
];

const RESOURCE_FILTERS = [
  { value: "", label: "All types" },
  { value: "report", label: "Reports" },
  { value: "notebook", label: "Notebooks" },
  { value: "board", label: "Boards" },
  { value: "workflow", label: "Workflows" },
  { value: "campaign", label: "Campaigns" },
];

const ACTION_VARIANT: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  create: "success",
  update: "info",
  delete: "error",
  view: "default",
  share: "info",
  export: "warning",
};

const RESOURCE_ROUTES: Record<string, string> = {
  report: "/reports",
  notebook: "/notebooks",
  board: "/boards",
  workflow: "/workflows",
  campaign: "/ads/campaigns",
};

export default function ActivityPage() {
  const [, navigate] = useLocation();
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [allItems, setAllItems] = useState<ActivityItem[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);

  const params = new URLSearchParams();
  if (actionFilter) params.set("action", actionFilter);
  if (resourceFilter) params.set("resourceType", resourceFilter);
  if (cursor) params.set("cursor", cursor);

  const { isLoading } = useQuery<ActivityResponse>({
    queryKey: ["activity", actionFilter, resourceFilter, cursor],
    queryFn: async () => {
      const data = await api<ActivityResponse>(`/activity?${params.toString()}`);
      if (cursor) {
        setAllItems((prev) => [...prev, ...data.items]);
      } else {
        setAllItems(data.items);
      }
      setHasMore(data.hasMore);
      return data;
    },
  });

  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setCursor(undefined);
    setAllItems([]);
  };

  const handleResourceClick = (item: ActivityItem) => {
    const base = RESOURCE_ROUTES[item.resourceType];
    if (base) navigate(`${base}/${item.resourceId}`);
  };

  const handleLoadMore = () => {
    const last = allItems[allItems.length - 1];
    if (last) {
      setCursor(last.id.toString());
    }
  };

  return (
    <Page title="Activity" subtitle="Recent activity across your organization">
      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <Select
          value={actionFilter}
          onChange={(e) => handleFilterChange(setActionFilter, e.target.value)}
          options={ACTION_FILTERS}
          className="w-36"
        />
        <Select
          value={resourceFilter}
          onChange={(e) => handleFilterChange(setResourceFilter, e.target.value)}
          options={RESOURCE_FILTERS}
          className="w-36"
        />
      </div>

      {/* Timeline */}
      {isLoading && allItems.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : allItems.length === 0 ? (
        <Card className="flex items-center justify-center h-48">
          <p className="text-sm text-[#9CA3AF]">No activity found</p>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[#E5E5E3]" />

          <div className="space-y-1">
            {allItems.map((item) => (
              <div key={item.id} className="flex gap-4 pl-0">
                {/* Timeline dot */}
                <div className="relative z-10 mt-4 w-[31px] flex justify-center shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E5E5E3] border-2 border-white" />
                </div>

                <Card
                  hoverable
                  clickable={!!RESOURCE_ROUTES[item.resourceType]}
                  onClick={() => handleResourceClick(item)}
                  className="flex-1 flex items-center justify-between py-3 px-4"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#F3F3F1] flex items-center justify-center text-xs font-medium text-[#404040] shrink-0">
                      {item.user.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-[#0A0A0A]">
                        <span className="font-medium">{item.user}</span>{" "}
                        <span className="text-[#404040]">{item.action}</span>{" "}
                        <span className="font-medium">{item.resourceName}</span>
                      </p>
                      <p className="text-xs text-[#9CA3AF]">{item.timestamp}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge variant={ACTION_VARIANT[item.action] ?? "default"}>{item.action}</Badge>
                    <Badge>{item.resourceType}</Badge>
                  </div>
                </Card>
              </div>
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button variant="secondary" onClick={handleLoadMore} loading={isLoading}>
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
