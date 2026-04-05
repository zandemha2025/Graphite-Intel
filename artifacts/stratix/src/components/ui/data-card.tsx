import { cn } from "@/lib/utils";

interface DataCardProps {
 children: React.ReactNode;
 className?: string;
 hover?: boolean;
 onClick?: () => void;
}

export function DataCard({ children, className, hover, onClick }: DataCardProps) {
 return (
 <div
 className={cn(
 "bg-white border border-[#E5E5E3] rounded-xl p-5 transition-colors",
 hover && "hover:border-[#D1D0CE] cursor-pointer",
 className,
 )}
 onClick={onClick}
 role={onClick ? "button" : undefined}
 tabIndex={onClick ? 0 : undefined}
 onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
 >
 {children}
 </div>
 );
}
