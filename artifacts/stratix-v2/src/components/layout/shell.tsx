import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import type { User } from "@/hooks/use-auth";

interface ShellProps {
  user: User;
  children: ReactNode;
}

export function Shell({ user, children }: ShellProps) {
  return (
    <div className="flex h-screen bg-[#F6F5F4]">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
