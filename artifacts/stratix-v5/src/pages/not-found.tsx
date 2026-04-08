import { Link } from "wouter";

export function NotFound() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <p className="text-overline text-[var(--text-muted)] mb-2">404</p>
        <h2 className="font-editorial text-display text-[var(--text-primary)]">Page not found</h2>
        <p className="mt-2 text-body text-[var(--text-secondary)]">The page you're looking for doesn't exist.</p>
        <Link href="/solve" className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium">
          Go to Solve
        </Link>
      </div>
    </div>
  );
}
