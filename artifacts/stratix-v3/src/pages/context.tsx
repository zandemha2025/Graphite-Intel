import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Building2, FileStack, BookMarked } from "lucide-react";

const tabs = [
  { id: "profile", label: "Company Profile" },
  { id: "knowledge", label: "Knowledge Base" },
  { id: "definitions", label: "Strategic Definitions" },
];

export default function ContextPage() {
  return (
    <Page
      title="Context"
      subtitle="Business knowledge that grounds every AI response"
    >
      <Tabs tabs={tabs}>
        {(activeTab) => {
          if (activeTab === "profile") {
            return (
              <Card className="flex flex-col items-center justify-center py-16">
                <Building2 className="mb-3 h-8 w-8 text-[#D1D5DB]" />
                <p className="text-sm font-medium text-[#111827]">Company Profile</p>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Industry, stage, geography, revenue range, and strategic priorities.
                </p>
              </Card>
            );
          }
          if (activeTab === "knowledge") {
            return (
              <Card className="flex flex-col items-center justify-center py-16">
                <FileStack className="mb-3 h-8 w-8 text-[#D1D5DB]" />
                <p className="text-sm font-medium text-[#111827]">Knowledge Base</p>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Upload documents, PDFs, decks, and spreadsheets with semantic search.
                </p>
              </Card>
            );
          }
          return (
            <Card className="flex flex-col items-center justify-center py-16">
              <BookMarked className="mb-3 h-8 w-8 text-[#D1D5DB]" />
              <p className="text-sm font-medium text-[#111827]">Strategic Definitions</p>
              <p className="mt-1 text-sm text-[#6B7280]">
                Define terms, metrics, competitors, and relationships that teach the AI your domain.
              </p>
            </Card>
          );
        }}
      </Tabs>
    </Page>
  );
}
