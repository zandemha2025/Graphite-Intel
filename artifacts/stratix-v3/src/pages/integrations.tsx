import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Cable } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <Page
      title="Integrations"
      subtitle="Connected data sources and services"
    >
      <Card className="flex flex-col items-center justify-center py-16">
        <Cable className="mb-3 h-8 w-8 text-[#D1D5DB]" />
        <p className="text-sm font-medium text-[#111827]">Integrations</p>
        <p className="mt-1 text-sm text-[#6B7280]">
          Connect Perplexity, SerpAPI, Firecrawl, Google Drive, and more.
        </p>
      </Card>
    </Page>
  );
}
