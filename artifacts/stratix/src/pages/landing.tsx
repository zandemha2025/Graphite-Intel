import { useGetCurrentAuthUser } from "@workspace/api-client-react";
import { Link } from "wouter";

const TESTIMONIALS = [
  {
    quote:
      "Stratix gave our board prep a completely different quality of depth. The competitive landscape brief we generated in forty minutes would have cost six figures from a consulting firm.",
    name: "Alexandra Mercer",
    title: "Chief Strategy Officer",
    company: "Vantage Capital Partners",
  },
  {
    quote:
      "We use it before every major negotiation. The counter-party analysis alone has changed how we approach deal rooms. Our team calls it unfair advantage.",
    name: "Jonathan Reeves",
    title: "Managing Director",
    company: "Northgate Advisors",
  },
  {
    quote:
      "The platform understood our market before I finished onboarding. The quality of the strategic context it holds is unlike anything else we have evaluated.",
    name: "Priya Nambiar",
    title: "VP of Corporate Development",
    company: "Meridian Group",
  },
];

const LOGO_SLOTS = [
  "Vantage Capital",
  "Northgate Advisors",
  "Meridian Group",
  "Axiom Partners",
  "Clearwater Ventures",
  "Summit Advisory",
];

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
        <nav className="flex items-center gap-6">
          <Link
            href="/security"
            className="text-xs font-medium text-[#E8E4DC]/50 hover:text-[#E8E4DC]/80 transition-colors tracking-widest uppercase"
          >
            Security
          </Link>
          {auth?.user ? (
            <Link
              href="/dashboard"
              className="text-sm font-medium text-[#E8E4DC]/70 hover:text-[#E8E4DC] transition-colors tracking-wide"
              data-testid="link-dashboard"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium bg-[#E8E4DC] text-[#0D0C0B] px-5 py-2 hover:bg-[#D4CEC5] transition-colors tracking-wide uppercase"
              data-testid="button-signin-nav"
            >
              Sign In
            </Link>
          )}
        </nav>
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
            <Link
              href="/login"
              className="inline-flex items-center gap-3 bg-[#E8E4DC] text-[#0D0C0B] px-8 py-3.5 font-medium hover:bg-[#D4CEC5] transition-colors text-sm uppercase tracking-widest"
              data-testid="button-signin-hero"
            >
              Access the Platform
            </Link>
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

      {/* Client logo strip */}
      <section className="border-t border-white/8 px-12 py-10">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#E8E4DC]/30 text-center mb-8">Trusted by leading firms</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-6 max-w-4xl mx-auto">
          {LOGO_SLOTS.map((name) => (
            <div
              key={name}
              className="border border-white/8 px-4 py-4 flex items-center justify-center opacity-40 hover:opacity-60 transition-opacity"
            >
              <span className="text-[10px] font-medium uppercase tracking-widest text-[#E8E4DC]/70 text-center leading-tight">
                {name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-white/8 px-12 py-16 bg-[#0A0908]">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#E8E4DC]/35 border border-[#E8E4DC]/12 px-3 py-1">
              In Their Words
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="border border-white/8 p-7 flex flex-col justify-between">
                <p className="font-serif text-base text-[#E8E4DC]/75 leading-relaxed font-light mb-8">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <div className="w-6 h-px bg-[#E8E4DC]/20 mb-4" />
                  <p className="text-xs font-medium text-[#E8E4DC]/80 uppercase tracking-wider">{t.name}</p>
                  <p className="text-[10px] text-[#E8E4DC]/40 mt-0.5">{t.title}</p>
                  <p className="text-[10px] text-[#E8E4DC]/30 mt-0.5">{t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8 px-12 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="h-5 w-5 border border-[#E8E4DC]/30 flex items-center justify-center">
                <span className="font-serif font-semibold text-[#E8E4DC] text-[10px] leading-none">S</span>
              </div>
              <span className="font-serif font-medium text-sm tracking-tight text-[#E8E4DC]/60 uppercase">Stratix</span>
            </div>
            <p className="text-[10px] text-[#E8E4DC]/25 font-light">Executive Intelligence Platform &mdash; &copy; {new Date().getFullYear()}</p>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/security"
              className="text-xs text-[#E8E4DC]/40 hover:text-[#E8E4DC]/70 transition-colors uppercase tracking-wider"
              data-testid="footer-link-security"
            >
              Security
            </Link>
            <a
              href="#"
              className="text-xs text-[#E8E4DC]/40 hover:text-[#E8E4DC]/70 transition-colors uppercase tracking-wider"
              data-testid="footer-link-privacy"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-xs text-[#E8E4DC]/40 hover:text-[#E8E4DC]/70 transition-colors uppercase tracking-wider"
              data-testid="footer-link-terms"
            >
              Terms
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
