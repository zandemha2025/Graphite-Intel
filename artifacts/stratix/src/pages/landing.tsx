import { useGetCurrentAuthUser } from "@workspace/api-client-react";
import { Link } from "wouter";

export function Landing() {
  const { data: auth, isLoading } = useGetCurrentAuthUser();

  if (isLoading) return <div className="h-screen bg-[#0D0C0B]" />;

  return (
    <div className="min-h-screen bg-[#0D0C0B] text-[#E8E4DC] flex flex-col">
      {/* Flat editorial header */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/8 z-20 relative">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 border border-[#E8E4DC]/40 flex items-center justify-center">
            <span className="font-serif font-semibold text-[#E8E4DC] text-sm leading-none">S</span>
          </div>
          <span className="font-serif font-semibold text-lg tracking-tight text-[#E8E4DC] uppercase letter-spacing-wide">Stratix</span>
        </div>
        <div>
          {auth?.user ? (
            <Link
              href="/dashboard"
              className="text-sm font-medium text-[#E8E4DC]/70 hover:text-[#E8E4DC] transition-colors tracking-wide"
              data-testid="link-dashboard"
            >
              Dashboard
            </Link>
          ) : (
            <a
              href="/api/login"
              className="text-sm font-medium bg-[#E8E4DC] text-[#0D0C0B] px-5 py-2 hover:bg-[#D4CEC5] transition-colors tracking-wide uppercase"
              data-testid="button-signin-nav"
            >
              Sign In
            </a>
          )}
        </div>
      </header>

      {/* Cinematic hero */}
      <main className="flex-1 relative overflow-hidden">
        {/* Full-bleed background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1600&q=80&fit=crop&crop=top"
            alt="Executive boardroom"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0D0C0B]/20 via-[#0D0C0B]/60 to-[#0D0C0B]" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-start justify-end h-full min-h-[80vh] px-12 pb-20 max-w-5xl">
          <div className="mb-4">
            <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#E8E4DC]/40 border border-[#E8E4DC]/15 px-3 py-1">
              Executive Intelligence Platform
            </span>
          </div>

          <h1 className="font-serif text-6xl md:text-8xl font-light tracking-tight text-[#E8E4DC] leading-[0.95] mb-8 max-w-3xl">
            Intelligence that commands the room.
          </h1>

          <p className="text-base md:text-lg text-[#E8E4DC]/55 max-w-xl mb-10 font-light leading-relaxed">
            McKinsey-grade insights, comprehensive market audits, and a world-class strategic advisor — built around your business context from day one.
          </p>

          {auth?.user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-3 bg-[#E8E4DC] text-[#0D0C0B] px-8 py-3.5 font-medium hover:bg-[#D4CEC5] transition-colors text-sm uppercase tracking-widest"
              data-testid="button-enter-app"
            >
              Enter Dashboard
            </Link>
          ) : (
            <a
              href="/api/login"
              className="inline-flex items-center gap-3 bg-[#E8E4DC] text-[#0D0C0B] px-8 py-3.5 font-medium hover:bg-[#D4CEC5] transition-colors text-sm uppercase tracking-widest"
              data-testid="button-signin-hero"
            >
              Access the Platform
            </a>
          )}
        </div>

        {/* Bottom strip */}
        <div className="relative z-10 border-t border-white/8 grid grid-cols-3 divide-x divide-white/8">
          <div className="px-10 py-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/35 mb-1">Capability</p>
            <p className="font-serif text-base text-[#E8E4DC]/80">Deep Reporting</p>
            <p className="text-xs text-[#E8E4DC]/40 mt-1 leading-relaxed">McKinsey-quality intelligence reports generated on demand.</p>
          </div>
          <div className="px-10 py-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/35 mb-1">Capability</p>
            <p className="font-serif text-base text-[#E8E4DC]/80">Strategic Engagement</p>
            <p className="text-xs text-[#E8E4DC]/40 mt-1 leading-relaxed">AI advisor trained on your business context from the start.</p>
          </div>
          <div className="px-10 py-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/35 mb-1">Capability</p>
            <p className="font-serif text-base text-[#E8E4DC]/80">Context Intelligence</p>
            <p className="text-xs text-[#E8E4DC]/40 mt-1 leading-relaxed">Your industry, stage, and competitors woven into every response.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
