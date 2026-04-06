import { useParams } from "wouter";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";

export default function BoardViewPage() {
  const params = useParams<{ id: string }>();

  return (
    <Page
      title={`Board ${params.id ?? ""}`}
      subtitle="Drag-and-drop grid layout with dual view"
    >
      <Card className="flex flex-col items-center justify-center py-16">
        <LayoutGrid className="mb-3 h-8 w-8 text-[#D1D5DB]" />
        <p className="text-sm font-medium text-[#111827]">Board viewer</p>
        <p className="mt-1 text-sm text-[#6B7280]">
          The full board builder with drag-and-drop is coming in Phase 3.
        </p>
      </Card>
    </Page>
  );
}
