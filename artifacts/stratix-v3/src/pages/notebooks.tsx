import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen } from "lucide-react";

export default function NotebooksPage() {
  return (
    <Page
      title="Notebooks"
      subtitle="Deep analysis workspaces with reactive cells"
      actions={
        <Button size="sm">
          <Plus className="h-4 w-4" />
          New Notebook
        </Button>
      }
    >
      <Card className="flex flex-col items-center justify-center py-16">
        <BookOpen className="mb-3 h-8 w-8 text-[#D1D5DB]" />
        <p className="text-sm font-medium text-[#111827]">No notebooks yet</p>
        <p className="mt-1 text-sm text-[#6B7280]">
          Create a notebook to start building structured analyses.
        </p>
        <Button size="sm" className="mt-4">
          <Plus className="h-4 w-4" />
          Create Notebook
        </Button>
      </Card>
    </Page>
  );
}
