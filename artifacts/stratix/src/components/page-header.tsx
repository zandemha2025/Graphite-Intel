import type { ReactNode } from "react";

interface PageHeaderProps {
 /** Breadcrumb pieces, e.g. ["Reports", "New Report"] */
 breadcrumbs?: string[];
 /** Page title */
 title: string;
 /** Optional subtitle text */
 subtitle?: string;
 /** Action buttons rendered to the right of the title */
 actions?: ReactNode;
 /** Hide the bottom separator line */
 hideSeparator?: boolean;
}

export function PageHeader({
 breadcrumbs,
 title,
 subtitle,
 actions,
 hideSeparator = false,
}: PageHeaderProps) {
 return (
 <div className="mb-6">
 {/* Breadcrumb */}
 {breadcrumbs && breadcrumbs.length > 0 && (
 <div className="flex items-center gap-1.5 mb-1">
 {breadcrumbs.map((crumb, i) => (
 <span key={i} className="flex items-center gap-1.5">
 {i > 0 && (
 <span
 className="text-[12px]"
 style={{ color: "#D1D5DB" }}
 >
 /
 </span>
 )}
 <span
 className="text-[12px]"
 style={{
 color: i === breadcrumbs.length - 1 ? "#6B7280" : "#9CA3AF",
 fontWeight: i === breadcrumbs.length - 1 ? 500 : 400,
 }}
 >
 {crumb}
 </span>
 </span>
 ))}
 </div>
 )}

 {/* Title row */}
 <div className="flex items-center justify-between gap-4">
 <h1
 className="text-[24px] font-semibold leading-tight tracking-tight"
 style={{ color: "#0A0A0A" }}
 >
 {title}
 </h1>
 {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
 </div>

 {/* Subtitle */}
 {subtitle && (
 <p
 className="text-[14px] mt-1"
 style={{ color: "#6B7280" }}
 >
 {subtitle}
 </p>
 )}

 {/* Separator */}
 {!hideSeparator && (
 <div
 className="mt-4"
 style={{ borderBottom: "1px solid #E5E5E3" }}
 />
 )}
 </div>
 );
}
