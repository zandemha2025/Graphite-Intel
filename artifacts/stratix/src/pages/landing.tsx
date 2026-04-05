import { useGetCurrentAuthUser } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Brain,
  FolderSearch,
  Workflow,
  BookOpen,
  BarChart3,
  Users,
  Upload,
  Sparkles,
  Rocket,
  Shield,
  Lock,
  KeyRound,
  UserCheck,
  ArrowRight,
  ChevronRight,
  MessageSquare,
  Database,
  Zap,
  Globe,
  Plug,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const staggerChild = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: Brain,
    title: "AI Research & Reports",
    description:
      "McKinsey-grade strategic intelligence generated on demand. Deep competitive analysis, market sizing, and executive briefs.",
  },
  {
    icon: FolderSearch,
    title: "Knowledge Vault",
    description:
      "Unified document intelligence with RAG-powered retrieval. Upload once, query forever across your entire corpus.",
  },
  {
    icon: Workflow,
    title: "Workflow Automation",
    description:
      "Multi-step AI agents that execute your strategy. Build, customize, and deploy complex analytical pipelines.",
  },
  {
    icon: BookOpen,
    title: "Playbooks",
    description:
      "Structured review and due diligence workflows. Repeatable processes for M&A, competitive reviews, and market entry.",
  },
  {
    icon: BarChart3,
    title: "Paid Ads Intelligence",
    description:
      "Campaign optimization powered by AI insights. Track performance, identify opportunities, and maximize ROAS.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Shared workspaces with role-based access control. Collaborate on research, share findings, and align on strategy.",
  },
];

const COMPARISONS = [
  {
    prompt: "Tell me about our top competitor's pricing strategy.",
    generic: {
      label: "General AI",
      answer:
        "Here's what I found on their public website and recent press releases. They appear to offer three tiers...",
      tone: "Wikipedia-level summary from public sources",
    },
    stratix: {
      label: "Stratix",
      answer:
        "Based on 47 Gong calls this quarter, reps report they've dropped pricing 15% on enterprise deals. Your Salesforce pipeline shows 6 overlapping opportunities worth $2.1M. Here's a recommended counter-strategy.",
      tone: "Actionable intelligence from your own systems",
    },
  },
  {
    prompt: "How is our Q1 pipeline looking?",
    generic: {
      label: "General AI",
      answer:
        "I don't have access to your CRM data. I can help you think about pipeline metrics to track...",
      tone: "Generic advice, no data access",
    },
    stratix: {
      label: "Stratix",
      answer:
        "Q1 pipeline is at $14.2M across 38 opportunities. Stage 3+ is $6.8M, up 22% from last quarter. Three deals flagged as at-risk based on engagement drop-off in Gong and email activity.",
      tone: "Real numbers from Salesforce, Gong, and HubSpot",
    },
  },
  {
    prompt: "Draft a competitive battle card for the sales team.",
    generic: {
      label: "General AI",
      answer:
        "Here's a generic template with sections for strengths, weaknesses, and positioning...",
      tone: "Template with placeholder content",
    },
    stratix: {
      label: "Stratix",
      answer:
        "Battle card generated from 128 closed-won and 43 closed-lost deals. Top objection: pricing (34%). Win rate jumps from 28% to 61% when the ROI calculator is used in Stage 2. Auto-shared to #sales-enablement in Slack.",
      tone: "Data-driven playbook, auto-distributed to your team",
    },
  },
];

const INTEGRATION_CATEGORIES = [
  { label: "CRM", examples: "Salesforce, HubSpot, Pipedrive" },
  { label: "Communication", examples: "Slack, Teams, Gmail" },
  { label: "Analytics", examples: "Gong, Mixpanel, Amplitude" },
  { label: "Support", examples: "Zendesk, Intercom, Freshdesk" },
  { label: "Marketing", examples: "Marketo, Mailchimp, Meta Ads" },
  { label: "Dev Tools", examples: "GitHub, Jira, Linear" },
];

const STEPS = [
  {
    icon: Upload,
    number: "01",
    title: "Upload",
    description:
      "Connect your data sources, upload documents, and configure your business context. Stratix learns your world.",
  },
  {
    icon: Sparkles,
    number: "02",
    title: "Analyze",
    description:
      "AI agents process your information, cross-reference market data, and generate strategic intelligence in minutes.",
  },
  {
    icon: Rocket,
    number: "03",
    title: "Act",
    description:
      "Make decisions backed by comprehensive analysis. Share reports, run playbooks, and automate recurring workflows.",
  },
];

const SECURITY_BADGES = [
  {
    icon: Shield,
    title: "Enterprise-Grade Security",
    description: "Built for organizations that demand the highest standards",
  },
  {
    icon: Lock,
    title: "SOC 2 Compliant",
    description: "Audited controls for security, availability, and confidentiality",
  },
  {
    icon: KeyRound,
    title: "End-to-End Encryption",
    description: "Data encrypted in transit and at rest with AES-256",
  },
  {
    icon: UserCheck,
    title: "Role-Based Access",
    description: "Granular permissions ensure the right people see the right data",
  },
];

const METRICS = [
  { value: "10x", label: "Faster than traditional consulting" },
  { value: "85%", label: "Reduction in research time" },
  { value: "500+", label: "Strategic reports generated" },
];

const LOGO_SLOTS = [
  "Vantage Capital",
  "Northgate Advisors",
  "Meridian Group",
  "Axiom Partners",
  "Clearwater Ventures",
  "Summit Advisory",
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Landing() {
  const { data: auth, isLoading } = useGetCurrentAuthUser();

  if (isLoading) return <div className="h-screen bg-[#0D0C0B]" />;

  return (
    <div className="min-h-screen bg-[#0D0C0B] text-[#E8E4DC] flex flex-col overflow-x-hidden">
      {/* ---- Header ---- */}
      <header className="fixed top-0 left-0 right-0 px-6 md:px-10 py-4 flex items-center justify-between border-b border-white/[0.06] z-50 bg-[#0D0C0B]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 border border-[#E8E4DC]/30 flex items-center justify-center">
            <span className="font-serif font-semibold text-[#E8E4DC] text-sm leading-none">
              S
            </span>
          </div>
          <span className="font-serif font-semibold text-lg tracking-tight text-[#E8E4DC] uppercase">
            Stratix
          </span>
        </div>
        <nav className="flex items-center gap-5">
          <Link
            href="/security"
            className="hidden md:inline text-xs font-medium text-[#E8E4DC]/40 hover:text-[#E8E4DC]/70 transition-colors tracking-widest uppercase"
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

      {/* ---- Hero ---- */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 px-6">
        {/* Subtle animated gradient background */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(232,228,220,0.03) 0%, transparent 70%)" }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#E8E4DC]/[0.08] to-transparent" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                "linear-gradient(#E8E4DC 1px, transparent 1px), linear-gradient(90deg, #E8E4DC 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <span className="inline-block text-[10px] font-medium uppercase tracking-[0.3em] text-[#E8E4DC]/35 border border-[#E8E4DC]/10 px-4 py-1.5 mb-8">
              Executive Intelligence Platform
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-tight text-[#E8E4DC] leading-[0.95] mb-8"
          >
            Strategic Intelligence
            <br />
            <span className="text-[#E8E4DC]/50">for the C-Suite</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-base md:text-lg text-[#E8E4DC]/45 max-w-2xl mx-auto mb-12 font-light leading-relaxed"
          >
            The intelligence layer that connects your data sources, applies AI
            analysis, and delivers strategic insights no general-purpose AI
            can match.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {auth?.user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-[#E8E4DC] text-[#0D0C0B] px-8 py-3.5 font-medium hover:bg-[#D4CEC5] transition-colors text-sm uppercase tracking-widest"
                data-testid="button-enter-app"
              >
                Enter Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 bg-[#E8E4DC] text-[#0D0C0B] px-8 py-3.5 font-medium hover:bg-[#D4CEC5] transition-all text-sm uppercase tracking-widest group"
                  data-testid="button-signin-hero"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <a
                  href="mailto:hello@stratix.ai?subject=Demo%20Request"
                  className="inline-flex items-center gap-2 border border-[#E8E4DC]/15 text-[#E8E4DC]/60 px-8 py-3.5 font-medium hover:border-[#E8E4DC]/30 hover:text-[#E8E4DC]/80 transition-all text-sm uppercase tracking-widest"
                >
                  Book a Demo
                </a>
              </>
            )}
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-px h-8 bg-gradient-to-b from-[#E8E4DC]/20 to-transparent"
          />
        </motion.div>
      </section>

      {/* ---- Metrics strip ---- */}
      <section className="border-t border-white/[0.06] bg-[#0A0908]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
          {METRICS.map((m, i) => (
            <FadeIn key={m.label} delay={i * 0.1} className="px-8 md:px-10 py-8 text-center">
              <p className="font-serif text-3xl md:text-4xl font-light text-[#E8E4DC] mb-2">
                {m.value}
              </p>
              <p className="text-xs text-[#E8E4DC]/35 uppercase tracking-widest">
                {m.label}
              </p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ---- Trusted By ---- */}
      <section className="border-t border-white/[0.06] px-6 md:px-12 py-12">
        <FadeIn>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#E8E4DC]/25 text-center mb-8">
            Trusted by leading firms
          </p>
        </FadeIn>
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 max-w-4xl mx-auto">
          {LOGO_SLOTS.map((name) => (
            <motion.div
              key={name}
              variants={staggerChild}
              className="border border-white/[0.06] px-4 py-4 flex items-center justify-center opacity-30 hover:opacity-50 transition-opacity"
            >
              <span className="text-[10px] font-medium uppercase tracking-widest text-[#E8E4DC]/70 text-center leading-tight">
                {name}
              </span>
            </motion.div>
          ))}
        </StaggerContainer>
      </section>

      {/* ---- Features Grid ---- */}
      <section className="border-t border-white/[0.06] px-6 md:px-12 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="mb-16 max-w-2xl">
            <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#E8E4DC]/30 border border-[#E8E4DC]/10 px-3 py-1 inline-block mb-6">
              Capabilities
            </span>
            <h2 className="font-serif text-3xl md:text-5xl font-light tracking-tight text-[#E8E4DC] leading-[1.1] mb-4">
              Everything your team needs
              <br />
              <span className="text-[#E8E4DC]/40">to move with conviction</span>
            </h2>
            <p className="text-sm md:text-base text-[#E8E4DC]/35 font-light leading-relaxed">
              Six integrated modules designed to replace the patchwork of tools,
              consultants, and spreadsheets that slow down strategic work.
            </p>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.06]">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  variants={staggerChild}
                  className="bg-[#0D0C0B] p-8 md:p-10 group hover:bg-[#0F0E0D] transition-colors"
                >
                  <div className="w-10 h-10 border border-[#E8E4DC]/10 flex items-center justify-center mb-6 group-hover:border-[#E8E4DC]/20 transition-colors">
                    <Icon className="w-5 h-5 text-[#E8E4DC]/40 group-hover:text-[#E8E4DC]/60 transition-colors" />
                  </div>
                  <h3 className="font-serif text-lg font-normal text-[#E8E4DC]/85 mb-3">
                    {f.title}
                  </h3>
                  <p className="text-sm text-[#E8E4DC]/35 leading-relaxed font-light">
                    {f.description}
                  </p>
                </motion.div>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* ---- Why Stratix ---- */}
      <section className="border-t border-white/[0.06] px-6 md:px-12 py-20 md:py-28 bg-[#0A0908]">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="mb-16 text-center max-w-3xl mx-auto">
            <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#E8E4DC]/30 border border-[#E8E4DC]/10 px-3 py-1 inline-block mb-6">
              Why Stratix
            </span>
            <h2 className="font-serif text-3xl md:text-5xl font-light tracking-tight text-[#E8E4DC] leading-[1.1] mb-4">
              AI tools answer questions.
              <br />
              <span className="text-[#E8E4DC]/40">Stratix answers YOUR questions.</span>
            </h2>
            <p className="text-sm md:text-base text-[#E8E4DC]/35 font-light leading-relaxed">
              ChatGPT, Claude, and Copilot know the internet. Stratix knows your
              business. Same AI models — your data, your context, completely
              different answers.
            </p>
          </FadeIn>

          {/* Comparison cards */}
          <div className="space-y-6">
            {COMPARISONS.map((c, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="border border-white/[0.06]">
                  {/* Prompt bar */}
                  <div className="px-6 md:px-8 py-4 border-b border-white/[0.06] flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-[#E8E4DC]/30 flex-shrink-0" />
                    <p className="text-sm text-[#E8E4DC]/60 font-light italic">
                      "{c.prompt}"
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
                    {/* Generic AI side */}
                    <div className="p-6 md:p-8">
                      <div className="flex items-center gap-2 mb-4">
                        <Globe className="w-4 h-4 text-[#E8E4DC]/25" />
                        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#E8E4DC]/25">
                          {c.generic.label}
                        </span>
                      </div>
                      <p className="text-sm text-[#E8E4DC]/35 font-light leading-relaxed mb-3">
                        {c.generic.answer}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-[#E8E4DC]/20">
                        {c.generic.tone}
                      </p>
                    </div>

                    {/* Stratix side */}
                    <div className="p-6 md:p-8 bg-[#0F0E0D]">
                      <div className="flex items-center gap-2 mb-4">
                        <Database className="w-4 h-4 text-[#E8E4DC]/50" />
                        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#E8E4DC]/50">
                          {c.stratix.label}
                        </span>
                      </div>
                      <p className="text-sm text-[#E8E4DC]/70 font-light leading-relaxed mb-3">
                        {c.stratix.answer}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-[#E8E4DC]/40">
                        {c.stratix.tone}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Closing line */}
          <FadeIn delay={0.3} className="mt-12 text-center">
            <p className="font-serif text-xl md:text-2xl font-light text-[#E8E4DC]/60 tracking-tight">
              Same AI models. Your data.{" "}
              <span className="text-[#E8E4DC]">Completely different answers.</span>
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ---- Integrations ---- */}
      <section className="border-t border-white/[0.06] px-6 md:px-12 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="mb-12 text-center">
            <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#E8E4DC]/30 border border-[#E8E4DC]/10 px-3 py-1 inline-block mb-6">
              Integrations
            </span>
            <h2 className="font-serif text-3xl md:text-5xl font-light tracking-tight text-[#E8E4DC] leading-[1.1] mb-4">
              Connects to the tools
              <br />
              <span className="text-[#E8E4DC]/40">you already use</span>
            </h2>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-white/[0.06] mb-8">
            {INTEGRATION_CATEGORIES.map((cat) => (
              <motion.div
                key={cat.label}
                variants={staggerChild}
                className="bg-[#0D0C0B] p-6 text-center group hover:bg-[#0F0E0D] transition-colors"
              >
                <Plug className="w-5 h-5 text-[#E8E4DC]/25 mx-auto mb-4 group-hover:text-[#E8E4DC]/40 transition-colors" />
                <h3 className="text-xs font-medium text-[#E8E4DC]/60 uppercase tracking-wider mb-2">
                  {cat.label}
                </h3>
                <p className="text-[10px] text-[#E8E4DC]/25 leading-relaxed font-light">
                  {cat.examples}
                </p>
              </motion.div>
            ))}
          </StaggerContainer>

          <FadeIn className="text-center">
            <div className="inline-flex items-center gap-2 border border-[#E8E4DC]/10 px-5 py-2.5">
              <Zap className="w-3.5 h-3.5 text-[#E8E4DC]/35" />
              <span className="text-xs text-[#E8E4DC]/40 uppercase tracking-widest font-medium">
                600+ integrations via Pipedream Connect
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ---- How It Works ---- */}
      <section className="border-t border-white/[0.06] px-6 md:px-12 py-20 md:py-28 bg-[#0A0908]">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="mb-16 text-center">
            <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#E8E4DC]/30 border border-[#E8E4DC]/10 px-3 py-1 inline-block mb-6">
              How It Works
            </span>
            <h2 className="font-serif text-3xl md:text-5xl font-light tracking-tight text-[#E8E4DC] leading-[1.1]">
              Three steps to clarity
            </h2>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.title}
                  variants={staggerChild}
                  className="relative text-center md:text-left md:px-8"
                >
                  {/* Connector line (desktop only) */}
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-8 right-0 w-full h-px bg-gradient-to-r from-transparent via-[#E8E4DC]/[0.08] to-transparent translate-x-1/2" />
                  )}

                  <div className="flex flex-col items-center md:items-start">
                    <div className="w-14 h-14 border border-[#E8E4DC]/10 flex items-center justify-center mb-6 relative">
                      <Icon className="w-6 h-6 text-[#E8E4DC]/40" />
                      <span className="absolute -top-2 -right-2 text-[9px] font-medium text-[#E8E4DC]/25 tracking-wider">
                        {s.number}
                      </span>
                    </div>
                    <h3 className="font-serif text-xl font-normal text-[#E8E4DC]/80 mb-3">
                      {s.title}
                    </h3>
                    <p className="text-sm text-[#E8E4DC]/35 leading-relaxed font-light max-w-xs">
                      {s.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* ---- Trust & Security ---- */}
      <section className="border-t border-white/[0.06] px-6 md:px-12 py-20 md:py-28">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="mb-16 text-center">
            <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#E8E4DC]/30 border border-[#E8E4DC]/10 px-3 py-1 inline-block mb-6">
              Trust & Security
            </span>
            <h2 className="font-serif text-3xl md:text-5xl font-light tracking-tight text-[#E8E4DC] leading-[1.1] mb-4">
              Built for enterprise
            </h2>
            <p className="text-sm md:text-base text-[#E8E4DC]/35 font-light leading-relaxed max-w-xl mx-auto">
              Your data never trains our models. Industry-leading security
              practices protect every document, conversation, and insight.
            </p>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.06]">
            {SECURITY_BADGES.map((b) => {
              const Icon = b.icon;
              return (
                <motion.div
                  key={b.title}
                  variants={staggerChild}
                  className="bg-[#0D0C0B] p-8 text-center"
                >
                  <div className="w-12 h-12 border border-[#E8E4DC]/10 flex items-center justify-center mx-auto mb-5">
                    <Icon className="w-5 h-5 text-[#E8E4DC]/35" />
                  </div>
                  <h3 className="text-sm font-medium text-[#E8E4DC]/70 mb-2 uppercase tracking-wider">
                    {b.title}
                  </h3>
                  <p className="text-xs text-[#E8E4DC]/30 leading-relaxed font-light">
                    {b.description}
                  </p>
                </motion.div>
              );
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* ---- Final CTA ---- */}
      <section className="border-t border-white/[0.06] px-6 md:px-12 py-24 md:py-32 bg-[#0A0908] relative overflow-hidden">
        {/* Background accent */}
        <div className="absolute inset-0">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(232,228,220,0.02) 0%, transparent 70%)" }}
          />
        </div>

        <FadeIn className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-5xl font-light tracking-tight text-[#E8E4DC] leading-[1.1] mb-6">
            Start making better decisions today
          </h2>
          <p className="text-sm md:text-base text-[#E8E4DC]/35 font-light leading-relaxed max-w-lg mx-auto mb-10">
            Join the teams using Stratix to turn complexity into clarity. No
            credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {auth?.user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-[#E8E4DC] text-[#0D0C0B] px-8 py-3.5 font-medium hover:bg-[#D4CEC5] transition-colors text-sm uppercase tracking-widest"
              >
                Go to Dashboard
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 bg-[#E8E4DC] text-[#0D0C0B] px-8 py-3.5 font-medium hover:bg-[#D4CEC5] transition-all text-sm uppercase tracking-widest group"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <a
                  href="mailto:hello@stratix.ai?subject=Demo%20Request"
                  className="inline-flex items-center gap-2 border border-[#E8E4DC]/15 text-[#E8E4DC]/60 px-8 py-3.5 font-medium hover:border-[#E8E4DC]/30 hover:text-[#E8E4DC]/80 transition-all text-sm uppercase tracking-widest"
                >
                  Book a Demo
                </a>
              </>
            )}
          </div>
        </FadeIn>
      </section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-white/[0.06] px-6 md:px-12 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="h-5 w-5 border border-[#E8E4DC]/25 flex items-center justify-center">
                <span className="font-serif font-semibold text-[#E8E4DC] text-[10px] leading-none">
                  S
                </span>
              </div>
              <span className="font-serif font-medium text-sm tracking-tight text-[#E8E4DC]/50 uppercase">
                Stratix
              </span>
            </div>
            <p className="text-[10px] text-[#E8E4DC]/20 font-light">
              Executive Intelligence Platform &mdash; &copy;{" "}
              {new Date().getFullYear()}
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-6">
            <Link
              href="/security"
              className="text-xs text-[#E8E4DC]/35 hover:text-[#E8E4DC]/60 transition-colors uppercase tracking-wider"
              data-testid="footer-link-security"
            >
              Security
            </Link>
            <Link
              to="/security"
              className="text-xs text-[#E8E4DC]/35 hover:text-[#E8E4DC]/60 transition-colors uppercase tracking-wider"
              data-testid="footer-link-privacy"
            >
              Privacy Policy
            </Link>
            <Link
              to="/security"
              className="text-xs text-[#E8E4DC]/35 hover:text-[#E8E4DC]/60 transition-colors uppercase tracking-wider"
              data-testid="footer-link-terms"
            >
              Terms
            </Link>
            <Link
              to="/login"
              className="text-xs text-[#E8E4DC]/35 hover:text-[#E8E4DC]/60 transition-colors uppercase tracking-wider"
            >
              Product
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
