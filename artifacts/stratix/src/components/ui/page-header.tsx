import { Link } from "wouter";

interface PageHeaderProps {
 title: string;
 subtitle?: string;
 breadcrumbs?: { label: string; href?: string }[];
 actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
 return (
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-6 border-b border-[#E5E5E3]">
 <div>
 {breadcrumbs && breadcrumbs.length > 0 && (
 <nav className="flex items-center gap-1.5 mb-2">
 {breadcrumbs.map((crumb, i) => (
 <span key={i} className="flex items-center gap-1.5">
 {i > 0 && <span className="text-xs text-[#9CA3AF]">/</span>}
 {crumb.href ? (
 <Link href={crumb.href} className="text-xs text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
 {crumb.label}
 </Link>
 ) : (
 <span className="text-xs text-[#9CA3AF]">{crumb.label}</span>
 )}
 </span>
 ))}
 </nav>
 )}
 <h1 className="text-2xl font-semibold tracking-[-0.01em] text-[#111827]">{title}</h1>
 {subtitle && (
 <p className="text-sm text-[#9CA3AF] mt-1">{subtitle}</p>
 )}
 </div>
 {actions && (
 <div className="flex items-center gap-3 shrink-0">{actions}</div>
 )}
 </div>
 );
}
