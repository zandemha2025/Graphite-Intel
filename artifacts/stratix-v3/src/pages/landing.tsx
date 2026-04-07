import { Link } from "wouter";
import { useState } from "react";
import {
  ArrowRight,
  Compass,
  Brain,
  LayoutGrid,
  Zap,
  Shield,
  Lock,
  Users,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Check,
  Search,
  BarChart3,
  Target,
  TrendingUp,
  Database,
  MessageSquare,
  Globe,
  FileText,
  Layers,
  Workflow,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ---------- data ---------- */

const pillars = [
  {
    icon: Compass,
    label: "The research.",
    title: "Explore",
    desc: "Ask any question about your market. Get cited, structured answers grounded in YOUR data -- not generic AI summaries.",
  },
  {
    icon: Brain,
    label: "The intelligence.",
    title: "Intelligence",
    desc: "5-signal competitive monitoring. Know what your competitor just did -- and what it means for your next move.",
  },
  {
    icon: LayoutGrid,
    label: "The action.",
    title: "Boards & Reports",
    desc: "Dashboards that update themselves. Board-ready reports in one click. Share insights that actually get read.",
  },
];

const steps = [
  {
    num: "01",
    title: "Connect your data",
    desc: "Salesforce, HubSpot, Gong + 3,000 apps via Pipedream. Your first-party data becomes your unfair advantage.",
  },
  {
    num: "02",
    title: "Ask anything",
    desc: "Stratix researches your question, citing your 1P data alongside live market intelligence. Every answer shows its sources.",
  },
  {
    num: "03",
    title: "Get structured intelligence",
    desc: 'McKinsey-quality output with "So What?" and recommendations. Tables, charts, SWOT analyses -- not walls of text.',
  },
  {
    num: "04",
    title: "Track automatically",
    desc: "Monitoring boards watch competitors 24/7. Get alerted when something changes. Never be caught off guard.",
  },
];

const templates = [
  { icon: Target, title: "Competitive Landscape" },
  { icon: TrendingUp, title: "Market Sizing" },
  { icon: BarChart3, title: "Win/Loss Analysis" },
  { icon: Search, title: "Buyer Persona Research" },
  { icon: Globe, title: "Market Entry Assessment" },
  { icon: MessageSquare, title: "Messaging Audit" },
  { icon: FileText, title: "Quarterly Business Review" },
  { icon: Layers, title: "Product Positioning" },
  { icon: Database, title: "Tech Stack Analysis" },
  { icon: Workflow, title: "GTM Playbook" },
  { icon: BookOpen, title: "Industry Deep Dive" },
  { icon: Users, title: "Account Intelligence" },
];

const integrations = [
  "Salesforce",
  "HubSpot",
  "Gong",
  "Slack",
  "Google Ads",
  "LinkedIn",
  "Snowflake",
  "BigQuery",
  "Notion",
  "Jira",
  "Segment",
  "Mixpanel",
];

const complianceItems = [
  { icon: Shield, title: "SOC 2 Type II", desc: "Annual audit completed" },
  { icon: Globe, title: "GDPR Compliant", desc: "EU data residency available" },
  { icon: Lock, title: "SSO / SAML", desc: "Okta, Azure AD, Google" },
  { icon: Users, title: "Role-Based Access", desc: "Granular permissions" },
  { icon: FileCheck, title: "Audit Logging", desc: "Full activity trail" },
  { icon: Database, title: "Data Encryption", desc: "AES-256 at rest, TLS in transit" },
];

const testimonials = [
  {
    quote: "Cut our competitive analysis time from 2 weeks to 2 hours.",
    role: "VP Marketing",
    company: "Series C SaaS",
  },
  {
    quote: "First platform that actually uses our Salesforce data in every answer.",
    role: "CMO",
    company: "Series B startup",
  },
  {
    quote: "Replaced our $40k/quarter consulting budget.",
    role: "Head of Growth",
    company: "Enterprise",
  },
];

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    desc: "Try the intelligence layer.",
    features: [
      "5 queries per month",
      "Explore surface",
      "Basic source attribution",
      "Community support",
    ],
    cta: "Start Free",
    href: "/login",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$299",
    period: "/mo",
    desc: "For growth teams that move fast.",
    features: [
      "Unlimited queries",
      "Explore + Notebooks",
      "Context (business knowledge)",
      "Boards & Reports",
      "Intelligence monitoring",
      "Playbooks & Workflows",
      "3,000+ integrations",
      "Priority support",
    ],
    cta: "Start Free",
    href: "/login",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For organizations with complex needs.",
    features: [
      "Everything in Pro",
      "SSO / SAML",
      "Custom integrations",
      "Dedicated success manager",
      "Data localization",
      "SLA guarantee",
      "Audit logging",
      "Volume discounts",
    ],
    cta: "Contact Sales",
    href: "/login",
    highlighted: false,
  },
];

const faqs = [
  {
    q: "How is Stratix different from ChatGPT or Claude?",
    a: "ChatGPT and Claude are general-purpose assistants. Stratix is purpose-built for strategic intelligence. It connects to your CRM, monitors your competitors, and grounds every answer in your first-party data. The output is structured -- tables, SWOT analyses, cited recommendations -- not conversational text.",
  },
  {
    q: "What data sources does Stratix use?",
    a: "Stratix combines your first-party data (Salesforce, HubSpot, Gong, documents) with live market intelligence from web research, news monitoring, and public filings. Every answer shows exactly which sources informed it.",
  },
  {
    q: "Can I connect my CRM?",
    a: "Yes. Stratix has native integrations with Salesforce and HubSpot, plus 3,000+ additional apps through Pipedream. Your CRM data becomes part of every intelligence query automatically.",
  },
  {
    q: "How does competitive monitoring work?",
    a: "Set up monitoring boards for any competitor. Stratix watches 5 signal types -- website changes, news mentions, job postings, product updates, and social activity -- and alerts you when something meaningful happens.",
  },
  {
    q: "Is my data secure?",
    a: "SOC 2 Type II certified. All data encrypted at rest (AES-256) and in transit (TLS 1.3). We offer SSO/SAML, role-based access controls, audit logging, and EU data residency for GDPR compliance.",
  },
  {
    q: "Do you offer a free trial?",
    a: "Yes. The Free plan gives you 5 queries per month with full access to Explore. No credit card required. Upgrade to Pro anytime for unlimited access.",
  },
];

const footerLinks = {
  Product: ["Explore", "Notebooks", "Context", "Boards", "Integrations", "Pricing"],
  Company: ["About", "Blog", "Careers", "Contact"],
  Resources: ["Documentation", "API Reference", "Templates", "Changelog"],
  Legal: ["Privacy Policy", "Terms of Service", "Security", "DPA"],
};

/* ---------- components ---------- */

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#E5E7EB]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="pr-4 text-base font-medium text-[#111827]">{q}</span>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-[#9CA3AF]" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-[#9CA3AF]" />
        )}
      </button>
      {open && (
        <p className="pb-5 pr-12 text-sm leading-relaxed text-[#6B7280]">{a}</p>
      )}
    </div>
  );
}

/* ---------- page ---------- */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#4F46E5] text-white text-xs font-bold">
                  S
                </div>
                <span className="text-sm font-semibold text-[#111827]">Stratix</span>
              </div>
            </Link>
            <nav className="hidden items-center gap-5 md:flex">
              <a href="#pillars" className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
                Pricing
              </a>
              <a href="#integrations" className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
                Integrations
              </a>
            </nav>
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

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-20 md:pt-28 lg:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-[#111827] md:text-5xl lg:text-6xl">
            Most AI tools give you information.
            <br />
            None of them give you intelligence.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#6B7280] md:text-xl">
            Stratix is the strategic intelligence platform for CMOs. Research your
            market. Track your competitors. Ground every decision in your data.
            One system. One shared context.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 text-base">
                Start Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="secondary" size="lg" className="h-12 px-8 text-base">
                See how it works
              </Button>
            </a>
          </div>
        </div>

        {/* Social proof */}
        <div className="mt-16 border-t border-[#E5E7EB] pt-10 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-[#9CA3AF]">
            Trusted by growth teams at
          </p>
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {["Amplitude", "Lattice", "Ramp", "Notion", "Brex", "Vanta"].map(
              (name) => (
                <span
                  key={name}
                  className="text-base font-semibold text-[#D1D5DB] select-none"
                >
                  {name}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ── Three Pillars ── */}
      <section id="pillars" className="bg-[#111827]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <p className="text-center text-xs font-medium uppercase tracking-widest text-[#9CA3AF]">
            One platform. Three capabilities.
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-center text-3xl font-bold text-white md:text-4xl">
            The research. The intelligence. The action.
          </h2>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {pillars.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
              >
                <p.icon className="mb-4 h-6 w-6 text-[#818CF8]" />
                <p className="text-xs font-medium uppercase tracking-wider text-[#818CF8]">
                  {p.label}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#9CA3AF]">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-[#9CA3AF]">
          How it works
        </p>
        <h2 className="mt-4 text-center text-3xl font-bold text-[#111827] md:text-4xl">
          From question to intelligence in minutes
        </h2>
        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.num} className="relative">
              <span className="text-4xl font-bold text-[#E5E7EB]">{s.num}</span>
              <h3 className="mt-3 text-base font-semibold text-[#111827]">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Templates ── */}
      <section className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <p className="text-center text-xs font-medium uppercase tracking-widest text-[#9CA3AF]">
            Templates
          </p>
          <h2 className="mt-4 text-center text-3xl font-bold text-[#111827] md:text-4xl">
            Intelligence templates for every strategic question
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-base text-[#6B7280]">
            Start with a proven framework. Customize with your data. Get answers in minutes, not weeks.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {templates.map((t) => (
              <div
                key={t.title}
                className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 transition-shadow hover:shadow-md"
              >
                <t.icon className="h-5 w-5 shrink-0 text-[#4F46E5]" />
                <span className="text-sm font-medium text-[#111827]">{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Integrations ── */}
      <section id="integrations" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-[#9CA3AF]">
          Integrations
        </p>
        <h2 className="mt-4 text-center text-3xl font-bold text-[#111827] md:text-4xl">
          3,180 apps. Already connected.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-base text-[#6B7280]">
          Your data and tools, unified. Native integrations with the platforms your team already uses.
        </p>
        <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-4">
          {integrations.map((name) => (
            <div
              key={name}
              className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-3 text-sm font-medium text-[#374151]"
            >
              {name}
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-[#9CA3AF]">
          + 3,000 more via Pipedream
        </p>
      </section>

      {/* ── Compliance ── */}
      <section className="bg-[#111827]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <p className="text-center text-xs font-medium uppercase tracking-widest text-[#9CA3AF]">
            Security & Compliance
          </p>
          <h2 className="mt-4 text-center text-3xl font-bold text-white md:text-4xl">
            Enterprise-ready from day one.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-base text-[#9CA3AF]">
            Built to pass procurement. No surprises, no workarounds.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {complianceItems.map((c) => (
              <div
                key={c.title}
                className="rounded-xl border border-white/10 bg-white/5 p-6"
              >
                <c.icon className="mb-3 h-5 w-5 text-[#818CF8]" />
                <h3 className="text-sm font-semibold text-white">{c.title}</h3>
                <p className="mt-1 text-sm text-[#9CA3AF]">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-[#9CA3AF]">
          Pricing
        </p>
        <h2 className="mt-4 text-center text-3xl font-bold text-[#111827] md:text-4xl">
          Start free. Scale when ready.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-base text-[#6B7280]">
          No credit card required. No time limit on the free plan.
        </p>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border p-8 ${
                tier.highlighted
                  ? "border-[#4F46E5] ring-2 ring-[#4F46E5]/20"
                  : "border-[#E5E7EB]"
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#4F46E5] px-3 py-0.5 text-xs font-medium text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-[#111827]">{tier.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-[#111827]">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-sm text-[#6B7280]">{tier.period}</span>
                )}
              </div>
              <p className="mt-2 text-sm text-[#6B7280]">{tier.desc}</p>
              <Link href={tier.href}>
                <Button
                  variant={tier.highlighted ? "primary" : "secondary"}
                  className="mt-6 w-full"
                >
                  {tier.cta}
                  {tier.highlighted && <ArrowRight className="h-4 w-4" />}
                </Button>
              </Link>
              <ul className="mt-6 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#374151]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4F46E5]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <p className="text-center text-xs font-medium uppercase tracking-widest text-[#9CA3AF]">
            What teams are saying
          </p>
          <h2 className="mt-4 text-center text-3xl font-bold text-[#111827] md:text-4xl">
            Real results. Real teams.
          </h2>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.role}
                className="rounded-2xl border border-[#E5E7EB] bg-white p-8"
              >
                <p className="text-lg font-medium leading-relaxed text-[#111827]">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-6">
                  <p className="text-sm font-semibold text-[#111827]">{t.role}</p>
                  <p className="text-sm text-[#6B7280]">{t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        <h2 className="text-center text-3xl font-bold text-[#111827] md:text-4xl">
          Frequently asked questions
        </h2>
        <div className="mt-12">
          {faqs.map((f) => (
            <FAQItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-[#111827]">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center md:py-28">
          <h2 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            Put intelligence to work.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[#9CA3AF]">
            Stop guessing. Start knowing. Join the teams that have replaced
            gut instinct with grounded intelligence.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/login">
              <Button
                size="lg"
                className="h-12 bg-white px-8 text-base text-[#111827] hover:bg-[#F3F4F6]"
              >
                Start Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E5E7EB]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#4F46E5] text-white text-xs font-bold">
                  S
                </div>
                <span className="text-sm font-semibold text-[#111827]">Stratix</span>
              </div>
              <p className="mt-3 text-sm text-[#6B7280]">
                Strategic intelligence for modern marketing teams.
              </p>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([heading, links]) => (
              <div key={heading}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#111827]">
                  {heading}
                </h4>
                <ul className="mt-3 space-y-2">
                  {links.map((link) => (
                    <li key={link}>
                      <span className="cursor-pointer text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
                        {link}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[#E5E7EB] pt-8 sm:flex-row">
            <p className="text-xs text-[#9CA3AF]">
              &copy; {new Date().getFullYear()} GRPHINTEL Inc. All rights reserved.
            </p>
            <p className="text-xs text-[#9CA3AF]">
              SOC 2 &middot; GDPR &middot; ISO 27001
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
