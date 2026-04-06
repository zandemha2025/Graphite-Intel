import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid } from "lucide-react";

export default function BoardsPage() {
  return (
    <Page
      title="Boards"
      subtitle="Live dashboards, report boards, and monitoring boards"
      actions={
        <Button size="sm">
          <Plus className="h-4 w-4" />
          New Board
        </Button>
      }
    >
      <Card className="flex flex-col items-center justify-center py-16">
        <LayoutGrid className="mb-3 h-8 w-8 text-[#D1D5DB]" />
        <p className="text-sm font-medium text-[#111827]">No boards yet</p>
        <p className="mt-1 text-sm text-[#6B7280]">
          Create a board to arrange insights into dashboards and reports.
        </p>
        <Button size="sm" className="mt-4">
          <Plus className="h-4 w-4" />
          Create Board
        </Button>
      </Card>
    </Page>
  );
}
