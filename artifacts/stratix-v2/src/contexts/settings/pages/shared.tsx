import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CardSkeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface SharedItem {
  id: number;
  resourceType: string;
  resourceId: string;
  title: string;
  sharedBy: string;
  sharedWith: string;
  permission: "view" | "edit" | "admin";
  sharedAt: string;
}

const RESOURCE_ROUTES: Record<string, string> = {
  report: "/reports",
  notebook: "/notebooks",
  board: "/boards",
  workflow: "/workflows",
  campaign: "/ads/campaigns",
};

const PERMISSION_VARIANT: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  view: "default",
  edit: "info",
  admin: "success",
};

const TYPE_VARIANT: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  report: "info",
  notebook: "warning",
  board: "success",
  workflow: "default",
  campaign: "error",
};

function SharedList({ items, isLoading, direction }: { items?: SharedItem[]; isLoading: boolean; direction: "with-me" | "by-me" }) {
  const [, navigate] = useLocation();

  const handleClick = (item: SharedItem) => {
    const base = RESOURCE_ROUTES[item.resourceType];
    if (base) navigate(`${base}/${item.resourceId}`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return (
      <Card className="flex items-center justify-center h-48">
        <p className="text-sm text-[#9CA3AF]">
          {direction === "with-me" ? "Nothing has been shared with you yet" : "You haven't shared anything yet"}
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <Card
          key={item.id}
          hoverable
          clickable={!!RESOURCE_ROUTES[item.resourceType]}
          onClick={() => handleClick(item)}
          className="flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-2">
            <Badge variant={TYPE_VARIANT[item.resourceType] ?? "default"}>
              {item.resourceType}
            </Badge>
            <Badge variant={PERMISSION_VARIANT[item.permission]}>
              {item.permission}
            </Badge>
          </div>
          <h3 className="text-sm font-medium text-[#0A0A0A] line-clamp-2">{item.title}</h3>
          <div className="mt-auto">
            <p className="text-xs text-[#9CA3AF]">
              {direction === "with-me" ? `Shared by ${item.sharedBy}` : `Shared with ${item.sharedWith}`}
            </p>
            <p className="text-xs text-[#9CA3AF]">{item.sharedAt}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function SharedPage() {
  const { data: withMe, isLoading: withMeLoading } = useQuery<SharedItem[]>({
    queryKey: ["shared", "with-me"],
    queryFn: () => api<SharedItem[]>("/shared/with-me"),
  });

  const { data: byMe, isLoading: byMeLoading } = useQuery<SharedItem[]>({
    queryKey: ["shared", "by-me"],
    queryFn: () => api<SharedItem[]>("/shared/by-me"),
  });

  return (
    <Page title="Shared" subtitle="Items shared across your team">
      <Tabs defaultValue="with-me">
        <TabsList>
          <TabsTrigger value="with-me">
            Shared With Me
            {withMe?.length ? <span className="ml-1.5 text-xs text-[#9CA3AF]">({withMe.length})</span> : null}
          </TabsTrigger>
          <TabsTrigger value="by-me">
            Shared By Me
            {byMe?.length ? <span className="ml-1.5 text-xs text-[#9CA3AF]">({byMe.length})</span> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="with-me">
          <SharedList items={withMe} isLoading={withMeLoading} direction="with-me" />
        </TabsContent>

        <TabsContent value="by-me">
          <SharedList items={byMe} isLoading={byMeLoading} direction="by-me" />
        </TabsContent>
      </Tabs>
    </Page>
  );
}
