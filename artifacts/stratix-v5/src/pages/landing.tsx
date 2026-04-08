import { Link } from "wouter";
import {
  ArrowRight,
  Sparkles,
  Hammer,
  Radar,
  Plug,
  Shield,
  Lock,
  Globe,
  MessageSquareQuote,
  Zap,
  BarChart3,
  Target,
  Users,
  Share2,
  Bell,
  BookOpen,
  PenTool,
  ChevronRight,
} from "lucide-react";

export function Landing() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[var(--background)]/90 backdrop-blur-md border-b border-[var(--border)]/50">
        <div className="max-w-[1100px] mx-auto flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-[8px] bg-[var(--accent)] flex items-center justify-center text-white text-[11px] font-bold">S</div>
            <span className="text-[16px] font-semibold text-[var(--text-primary)]">Stratix</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-body-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Sign in</Link>
            <Link href="/login" className="flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white text-body-sm font-medium hover:bg-[var(--accent-hover)] transition-colors">
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 lg:py-32">
        <div className="max-w-[1100px] mx-auto px-6 text-center">
          <p className="text-overline text-[var(--accent)] mb-4">Intelligence Platform</p>
          <h1 className="font-editorial text-[36px] md:text-[52px] lg:text-[64px] leading-[1.08] text-[var(--text-primary)] max-w-3xl mx-auto">
            Intelligence that moves your brand forward
          </h1>
          <p className="mt-6 text-[18px] leading-[1.6] text-[var(--text-secondary)] max-w-xl mx-auto">
            Bespoke AI intelligence for CMOs. Describe your situation in plain language — get strategy-grade analysis in minutes.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link href="/login" className="flex items-center gap-2 px-6 py-3 rounded-[var(--radius-lg)] bg-[var(--accent)] text-white text-[15px] font-medium hover:bg-[var(--accent-hover)] transition-colors">
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Platform Preview Mock */}
      <section className="pb-20">
        <div className="max-w-[960px] mx-auto px-6">
          <div className="rounded-[16px] overflow-hidden border border-[#3D3A35] shadow-2xl">
            {/* Title bar */}
            <div className="bg-[#232120] flex items-center justify-between px-4 py-2.5 border-b border-[#3D3A35]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#FF605C]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#FFBD44]" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[#00CA4E]" />
                </div>
                <span className="text-[11px] text-[#8A857E] ml-3 font-mono">stratix.ai/solve</span>
              </div>
            </div>

            {/* App body */}
            <div className="bg-[#2C2925] flex min-h-[380px]">
              {/* Sidebar */}
              <div className="w-12 bg-[#252220] border-r border-[#3D3A35] flex flex-col items-center py-3 gap-3 shrink-0">
                <div className="h-7 w-7 rounded-[6px] bg-[var(--accent)] flex items-center justify-center text-white text-[9px] font-bold">S</div>
                <div className="w-5 h-px bg-[#3D3A35] my-1" />
                <div className="h-7 w-7 rounded-[6px] bg-[#B85C38]/20 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-[#B85C38]" />
                </div>
                <div className="h-7 w-7 rounded-[6px] hover:bg-[#3D3A35]/50 flex items-center justify-center">
                  <Hammer className="h-3.5 w-3.5 text-[#8A857E]" />
                </div>
                <div className="h-7 w-7 rounded-[6px] hover:bg-[#3D3A35]/50 flex items-center justify-center">
                  <Radar className="h-3.5 w-3.5 text-[#8A857E]" />
                </div>
                <div className="h-7 w-7 rounded-[6px] hover:bg-[#3D3A35]/50 flex items-center justify-center">
                  <Plug className="h-3.5 w-3.5 text-[#8A857E]" />
                </div>
              </div>

              {/* Main content area */}
              <div className="flex-1 flex flex-col">
                {/* Top bar */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#3D3A35]">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[#E8E4DD] font-medium">New Task</span>
                    <ChevronRight className="h-3 w-3 text-[#6B6560] rotate-90" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 px-2.5 rounded-full bg-[#3D3A35] flex items-center gap-1.5">
                      <div className="h-3.5 w-3.5 rounded-full bg-[var(--accent)] flex items-center justify-center text-[7px] text-white font-bold">A</div>
                      <span className="text-[11px] text-[#B5B0A8]">Analyst</span>
                    </div>
                  </div>
                </div>

                {/* AI Response area */}
                <div className="flex-1 p-5 overflow-hidden">
                  <div className="space-y-4 text-[13px] leading-relaxed">
                    <div className="flex items-start gap-2.5">
                      <div className="h-5 w-5 rounded-full bg-[var(--accent)]/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-3 w-3 text-[var(--accent)]" />
                      </div>
                      <div className="space-y-3 text-[#E8E4DD]">
                        <p className="text-[#B5B0A8] text-[12px]">Analyzing competitive positioning for Q2...</p>

                        <div>
                          <p className="font-medium text-[#E8E4DD] mb-1">&#x1F4CA; Market Overview</p>
                          <p className="text-[#B5B0A8] text-[12px]">Your category grew 18% YoY. Three competitors launched repositioning campaigns in the last 45 days.</p>
                        </div>

                        <div>
                          <p className="font-medium text-[#E8E4DD] mb-1">&#x1F3AF; Key Findings</p>
                          <div className="space-y-1.5 text-[12px] text-[#B5B0A8]">
                            <p>&#x2022; Competitor A shifted 40% of budget to brand awareness</p>
                            <p>&#x2022; Your share of voice declined 3.2pp in organic search</p>
                            <p>&#x2022; Gong signals show buyer hesitation on pricing tier</p>
                          </div>
                        </div>

                        <div>
                          <p className="font-medium text-[#E8E4DD] mb-1">&#x26A1; Recommended Actions</p>
                          <div className="space-y-1.5 text-[12px] text-[#B5B0A8]">
                            <p>1. Launch defensive content around top 5 lost keywords</p>
                            <p>2. Re-sequence nurture flow to address pricing objections</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-[#00CA4E] animate-pulse" />
                          <span className="text-[11px] text-[#6B6560]">5 sources analyzed &middot; 12s</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-[1100px] mx-auto px-6">
          <h2 className="font-editorial text-display-lg text-[var(--text-primary)] text-center mb-4">How it works</h2>
          <p className="text-body-lg text-[var(--text-secondary)] text-center max-w-xl mx-auto mb-16">From question to action in three steps.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: PenTool,
                title: "Describe your situation",
                desc: "Type a plain-language question about your market, competitors, campaign performance, or strategic challenge.",
              },
              {
                step: "2",
                icon: BarChart3,
                title: "Get strategy-grade analysis",
                desc: "Stratix pulls from your first-party data, web signals, and competitive intelligence to build a structured response.",
              },
              {
                step: "3",
                icon: Target,
                title: "Act on intelligence",
                desc: "Export to decks, trigger workflows, share with your team, or drill deeper — all from the same interface.",
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-full border-2 border-[var(--accent)]/30 bg-[var(--accent)]/5 mb-5">
                  <s.icon className="h-6 w-6 text-[var(--accent)]" />
                </div>
                <div className="text-[13px] font-semibold text-[var(--accent)] mb-2">Step {s.step}</div>
                <h3 className="text-heading text-[var(--text-primary)] mb-2">{s.title}</h3>
                <p className="text-body-sm text-[var(--text-secondary)] leading-relaxed max-w-[280px] mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Four Pillars */}
      <section className="py-20 bg-[var(--surface)]">
        <div className="max-w-[1100px] mx-auto px-6">
          <h2 className="font-editorial text-display-lg text-[var(--text-primary)] text-center mb-4">Four pillars. One platform.</h2>
          <p className="text-body-lg text-[var(--text-secondary)] text-center max-w-xl mx-auto mb-16">Everything you need to understand your market, build deliverables, and connect your data.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: Sparkles, name: "Solve", desc: "Any question. Any situation. Every angle researched, evidence weighed — ready to act on.", color: "var(--accent)" },
              { icon: Hammer, name: "Build", desc: "Production-grade reports, dashboards, and notebooks from the first generation. Output that used to require design+dev.", color: "#7B6B5A" },
              { icon: Radar, name: "Intelligence", desc: "Every platform your competitor is on reveals their strategy. Stratix watches all of them, every day.", color: "#5A8A5C" },
              { icon: Plug, name: "Connect", desc: "Your CRM, ad accounts, analytics, and docs — correlated with external signals. Answers specific to YOUR business.", color: "#C49032" },
            ].map((p) => (
              <div key={p.name} className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--background)] p-8 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-[var(--radius-md)] flex items-center justify-center" style={{ background: `${p.color}10` }}>
                    <p.icon className="h-5 w-5" style={{ color: p.color }} />
                  </div>
                  <h3 className="text-heading-lg text-[var(--text-primary)]">{p.name}</h3>
                </div>
                <p className="text-body text-[var(--text-secondary)] leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-[1100px] mx-auto px-6">
          <h2 className="font-editorial text-display-lg text-[var(--text-primary)] text-center mb-4">What leaders are saying</h2>
          <p className="text-body-lg text-[var(--text-secondary)] text-center max-w-xl mx-auto mb-16">Marketing executives trust Stratix to make faster, smarter decisions.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "We used to spend two weeks prepping board decks. Stratix gives me the same caliber of analysis in a single conversation.",
                name: "Rachel Emery",
                title: "CMO",
                company: "Fieldmark Health",
              },
              {
                quote: "The competitive intelligence alone replaced three separate tools. Seeing real-time share-of-voice shifts connected to our CRM data is a game-changer.",
                name: "David Okafor",
                title: "VP Marketing",
                company: "Lumen Commerce",
              },
              {
                quote: "My team went from reactive reporting to proactive strategy. Stratix is the only platform where our first-party data actually talks to market signals.",
                name: "Sara Lindqvist",
                title: "Chief Growth Officer",
                company: "Novabridge",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-7 flex flex-col"
              >
                <MessageSquareQuote className="h-5 w-5 text-[var(--accent)]/40 mb-4 shrink-0" />
                <p className="text-body text-[var(--text-primary)] leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-5 pt-4 border-t border-[var(--border)]">
                  <p className="text-body-sm font-medium text-[var(--text-primary)]">{t.name}</p>
                  <p className="text-caption text-[var(--text-secondary)]">{t.title}, {t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Logos */}
      <section className="py-16 bg-[var(--surface)]">
        <div className="max-w-[1100px] mx-auto px-6 text-center">
          <h2 className="font-editorial text-display-sm text-[var(--text-primary)] mb-3">Connect your stack</h2>
          <p className="text-body text-[var(--text-secondary)] mb-10">Integrate the tools you already use. One query, all your data.</p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { name: "Salesforce", icon: Users },
              { name: "HubSpot", icon: Target },
              { name: "Gong", icon: Zap },
              { name: "Google Analytics", icon: BarChart3 },
              { name: "Meta Ads", icon: Share2 },
              { name: "LinkedIn", icon: Globe },
              { name: "Slack", icon: Bell },
              { name: "Notion", icon: BookOpen },
            ].map((integration) => (
              <div
                key={integration.name}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] bg-[var(--background)] text-[13px] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 hover:text-[var(--text-primary)] transition-colors"
              >
                <integration.icon className="h-3.5 w-3.5" />
                {integration.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-16 border-t border-[var(--border)]">
        <div className="max-w-[1100px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-heading text-[var(--text-primary)]">Enterprise-grade security</h3>
            <p className="text-body text-[var(--text-secondary)] mt-1">Your data is encrypted, compliant, and never used for training.</p>
          </div>
          <div className="flex items-center gap-6">
            {[{ icon: Shield, label: "SOC 2" }, { icon: Lock, label: "Encrypted" }, { icon: Globe, label: "GDPR" }].map((b) => (
              <div key={b.label} className="flex items-center gap-2 text-body-sm text-[var(--text-secondary)]">
                <b.icon className="h-4 w-4" /> {b.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#2C2925]">
        <div className="max-w-[1100px] mx-auto px-6 text-center">
          <h2 className="font-editorial text-display-lg text-[#F7F5F0]">Ready to outthink your competition?</h2>
          <p className="mt-4 text-body-lg text-[#B5B0A8] max-w-lg mx-auto">Join forward-thinking brands using Stratix to turn market noise into strategic advantage.</p>
          <Link href="/login" className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-[var(--radius-lg)] bg-[var(--accent)] text-white text-[15px] font-medium hover:bg-[var(--accent-hover)] transition-colors">
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#2C2925] border-t border-white/5">
        <div className="max-w-[1100px] mx-auto px-6 text-center">
          <p className="text-caption text-[#6B6560]">&copy; 2026 Stratix. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
