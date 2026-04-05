interface EmptyStateProps {
 icon: React.ComponentType<{ className?: string }>;
 title: string;
 description: string;
 action?: { label: string; onClick: () => void };
 secondaryAction?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action, secondaryAction }: EmptyStateProps) {
 return (
 <div className="flex flex-col items-center justify-center py-16 max-w-[400px] mx-auto text-center">
 <div className="mb-4">
 <Icon className="h-12 w-12 text-[#9CA3AF]" />
 </div>
 <h3 className="text-lg font-medium text-[#111827] mb-2">{title}</h3>
 <p className="text-sm text-[#9CA3AF] mb-6">{description}</p>
 {(action || secondaryAction) && (
 <div className="flex items-center gap-3">
 {action && (
 <button
 onClick={action.onClick}
 className="px-4 py-2 text-sm font-medium bg-[#111827] text-white rounded-md hover:bg-[#1f2937] transition-colors"
 >
 {action.label}
 </button>
 )}
 {secondaryAction && (
 <button
 onClick={secondaryAction.onClick}
 className="px-4 py-2 text-sm font-medium text-[#6B7280] hover:text-[#111827] transition-colors"
 >
 {secondaryAction.label}
 </button>
 )}
 </div>
 )}
 </div>
 );
}
