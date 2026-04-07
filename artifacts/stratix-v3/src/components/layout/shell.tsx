import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090B]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="flex h-14 items-center border-b border-[#27272A] px-4 lg:hidden bg-[#09090B]/80 backdrop-blur-xl">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-[#A1A1AA] hover:bg-[#27272A]"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 text-sm font-semibold text-[#FAFAFA]">Stratix</span>
        </div>

        <main className="flex-1 overflow-y-auto bg-[#09090B]">
          {children}
        </main>
      </div>
    </div>
  );
}
