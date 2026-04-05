import { cn } from "@/lib/utils";

interface StatusBadgeProps {
 status: "active" | "pending" | "complete" | "failed" | "draft" | "published" | "running" | "paused";
 size?: "sm" | "md";
}

const STATUS_STYLES: Record<StatusBadgeProps["status"], string> = {
 active: "bg-green-50 text-green-700",
 complete: "bg-green-50 text-green-700",
 pending: "bg-yellow-50 text-yellow-700",
 running: "bg-yellow-50 text-yellow-700",
 failed: "bg-red-50 text-red-700",
 draft: "bg-gray-100 text-gray-600",
 published: "bg-blue-50 text-blue-700",
 paused: "bg-gray-100 text-gray-600",
};

const SIZE_CLASSES: Record<"sm" | "md", string> = {
 sm: "text-[10px] px-2 py-0.5",
 md: "text-xs px-2.5 py-0.5",
};

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
 return (
 <span
 className={cn(
 "inline-flex items-center rounded-full font-medium capitalize",
 STATUS_STYLES[status],
 SIZE_CLASSES[size],
 )}
 >
 {status}
 </span>
 );
}
