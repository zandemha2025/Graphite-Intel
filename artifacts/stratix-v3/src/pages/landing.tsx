import { Link } from "wouter";
import { useState } from "react";
import { Compass, BookOpen, Brain, LayoutGrid, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const surfaces = [
  {
    icon: Compass,
    title: "Explore",
    desc: "Ask questions, get intelligence. Split-pane interface with cell-based output and source attribution.",
  },
  {
    icon: BookOpen,
    title: "Notebooks",
    desc: "Deep structured analysis with reactive cells. Build comprehensive research documents and deliverables.",
  },
  {
    icon: Brain,
    title: "Context",
    desc: "Your business knowledge layer. Company profile, documents, and strategic definitions that ground every answer.",
  },
  {
    icon: LayoutGrid,
    title: "Boards",
    desc: "Live dashboards, report boards, and monitoring boards. Drag-and-drop grid with auto-refresh.",
  },
];

const features = [
  {
    title: "Source Attribution",
    desc: "Every insight shows its sources: Perplexity, SerpAPI, Firecrawl, stored documents.",
  },
  {
    title: "Cell-Based Output",
    desc: "Results are discrete, saveable cells: tables, charts, SWOT analyses, key findings.",
  },
  {
    title: "Context-Aware",
    desc: "The platform learns your business. Industry terms, competitors, metrics -- all grounded in your context.",
  },
  {
    title: "Always Answers",
    desc: "Never says 'I can't help.' Pulls from all available sources with clear confidence indicators.",
  },
];

export default function LandingPage() {
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-[#E5E7EB]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#4F46E5] text-white text-xs font-bold">
              S
            </div>
            <span className="text-sm font-semibold text-[#111827]">Stratix</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h1 className="mx-auto max-w-2xl text-4xl font-semibold leading-tight text-[#111827]">
          Strategic intelligence your team trusts
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-[#6B7280]">
          The platform where executives and strategists do their thinking. Ask questions,
          analyze in depth, build on institutional knowledge, and communicate findings.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="h-10 w-64 rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
          />
          <Link href="/login">
            <Button size="lg">
              Start Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Four surfaces */}
      <section className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-[#6B7280]">
            Four Interconnected Surfaces
          </h2>
          <p className="mb-10 text-center text-2xl font-semibold text-[#111827]">
            How strategic intelligence work actually flows
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {surfaces.map((s) => (
              <div
                key={s.title}
                className="rounded-lg border border-[#E5E7EB] bg-white p-5"
              >
                <s.icon className="mb-3 h-5 w-5 text-[#4F46E5]" />
                <h3 className="mb-1.5 text-sm font-semibold text-[#111827]">
                  {s.title}
                </h3>
                <p className="text-sm leading-relaxed text-[#6B7280]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-10 text-center text-2xl font-semibold text-[#111827]">
          Built for strategic clarity
        </h2>
        <div className="grid gap-8 md:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#4F46E5]" />
              <div>
                <h3 className="mb-1 text-sm font-semibold text-[#111827]">
                  {f.title}
                </h3>
                <p className="text-sm text-[#6B7280]">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold text-[#111827]">
            Ready to think strategically?
          </h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            Get started in minutes. No credit card required.
          </p>
          <div className="mt-6">
            <Link href="/login">
              <Button size="lg">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#4F46E5] text-white text-[10px] font-bold">
              S
            </div>
            <span className="text-xs text-[#6B7280]">Stratix</span>
          </div>
          <p className="text-xs text-[#9CA3AF]">GRPHINTEL</p>
        </div>
      </footer>
    </div>
  );
}
