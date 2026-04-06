import { useParams } from "wouter";
import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function NotebookEditPage() {
  const params = useParams<{ id: string }>();

  return (
    <Page
      title={`Notebook ${params.id ?? ""}`}
      subtitle="Reactive cell editor with AI co-pilot"
    >
      <Card className="flex flex-col items-center justify-center py-16">
        <FileText className="mb-3 h-8 w-8 text-[#D1D5DB]" />
        <p className="text-sm font-medium text-[#111827]">Notebook editor</p>
        <p className="mt-1 text-sm text-[#6B7280]">
          The full reactive cell editor is coming in Phase 4.
        </p>
      </Card>
    </Page>
  );
}
