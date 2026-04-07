import { Page } from "@/components/layout/page";

export default function SharedPage() {
  return (
    <Page title="Shared" subtitle="Content shared with you and your team">
      <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-[#E5E5E3]/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <p className="text-sm text-[#A3A3A3]">Coming soon</p>
      </div>
    </Page>
  );
}
