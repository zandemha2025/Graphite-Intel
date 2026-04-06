import { Page } from "@/components/layout/page";
import { Card } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <Page
      title="Settings"
      subtitle="Account, organization, and billing"
    >
      <Card className="flex flex-col items-center justify-center py-16">
        <SettingsIcon className="mb-3 h-8 w-8 text-[#D1D5DB]" />
        <p className="text-sm font-medium text-[#111827]">Settings</p>
        <p className="mt-1 text-sm text-[#6B7280]">
          Manage your account, team members, and billing preferences.
        </p>
      </Card>
    </Page>
  );
}
