import { useState } from "react";
import { useLocation } from "wouter";
import { motion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  BookOpen,
  Layers,
  LayoutGrid,
  Shield,
  Zap,
  Globe,
  TrendingUp,
  Users,
  Lock,
  BarChart3,
  FileText,
  ArrowRight,
  Check,
  X,
  MessageSquare,
  Sparkles,
} from "lucide-react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const previewTabs = [
  { label: "Explore", icon: Search },
  { label: "Notebooks", icon: BookOpen },
  { label: "Context", icon: Layers },
  { label: "Boards", icon: LayoutGrid },
];

const features = [
  { icon: Search, title: "Deep Research", desc: "AI-powered research across 600+ data sources in seconds." },
  { icon: BarChart3, title: "Live Analytics", desc: "Real-time dashboards and KPIs tailored to your strategy." },
  { icon: FileText, title: "Notebook Reports", desc: "Collaborative notebooks that blend AI analysis with your notes." },
  { icon: Globe, title: "Market Signals", desc: "Track competitors, trends, and market shifts automatically." },
  { icon: Users, title: "Team Collaboration", desc: "Share insights, assign tasks, and align your team in one place." },
  { icon: Zap, title: "Workflow Automation", desc: "Trigger alerts and workflows when key signals change." },
];

const comparisons = [
  {
    scenario: "Competitor launches a new product",
    general: "Generic summary from public articles",
    stratix: "Impact analysis with revenue projections, sourced from SEC filings and your CRM data",
  },
  {
    scenario: "Preparing for board meeting",
    general: "Bullet points you still have to verify",
    stratix: "Auto-generated brief with cited sources, financials, and trend charts",
  },
  {
    scenario: "Entering a new market",
    general: "Wikipedia-level overview",
    stratix: "TAM/SAM/SOM model with local regulatory risks and competitor mapping",
  },
];

const integrationCategories = [
  "CRM", "Finance", "Data Warehouse", "Communication", "Project Management",
  "Cloud", "HR", "Analytics", "Security", "Marketing",
];

const trustBadges = [
  { icon: Shield, label: "SOC 2 Type II" },
  { icon: Lock, label: "End-to-End Encryption" },
  { icon: Globe, label: "GDPR Compliant" },
  { icon: TrendingUp, label: "99.9% Uptime SLA" },
];

/* Mock conversation cards for the Explore preview */
const mockConversations = [
  { title: "Q3 competitive landscape analysis", time: "2m ago", gradient: "from-[#F0EFED] to-[#E8E6E3]" },
  { title: "Revenue impact of new tariff policy", time: "15m ago", gradient: "from-[#EDE8F5] to-[#E3DEF0]" },
  { title: "Market entry strategy: Southeast Asia", time: "1h ago", gradient: "from-[#E8F0ED] to-[#DEE8E3]" },
];

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  function handleGetStarted(e: React.FormEvent) {
    e.preventDefault();
    navigate(email ? `/login?email=${encodeURIComponent(email)}` : "/login");
  }

  return (
    <div className="min-h-screen bg-[#F8F8F7]">
      {/* Header - sticky with blur */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E5E5E3]/40">
        <div className="flex items-center justify-between px-6 py-3.5 max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5 text-lg font-semibold text-[#0A0A0A]">
            <div className="w-8 h-8 rounded-xl bg-[#0A0A0A] flex items-center justify-center text-white text-xs font-bold">S</div>
            Stratix
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-[#525252]">
            <a href="#features" className="hover:text-[#0A0A0A] transition-colors">Features</a>
            <a href="#why" className="hover:text-[#0A0A0A] transition-colors">Why Stratix</a>
            <a href="#security" className="hover:text-[#0A0A0A] transition-colors">Security</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="text-[#525252] hover:text-[#0A0A0A]">
              Sign in
            </Button>
            <Button size="sm" onClick={() => navigate("/login")} className="rounded-lg h-9 px-4 text-sm">
              Get started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <motion.section
        className="text-center px-6 pt-24 pb-20 max-w-3xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="mb-5">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#525252] bg-white rounded-full px-3 py-1.5 border border-[#E5E5E3]/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <Sparkles className="w-3 h-3" />
            Now with 600+ data source integrations
          </span>
        </motion.div>
        <motion.h1
          className="text-5xl md:text-[56px] font-semibold tracking-[-0.025em] text-[#0A0A0A] leading-[1.1] max-w-2xl mx-auto"
          variants={fadeUp}
        >
          Strategic intelligence your team trusts
        </motion.h1>
        <motion.p className="mt-5 text-lg text-[#525252] max-w-lg mx-auto leading-relaxed" variants={fadeUp}>
          Research, analyze, and act on market intelligence -- all in one platform your entire team can use.
        </motion.p>
        <motion.form
          className="mt-10 max-w-md mx-auto"
          onSubmit={handleGetStarted}
          variants={fadeUp}
        >
          <div className="flex items-center bg-white border border-[#E5E5E3] rounded-xl shadow-sm hover:shadow-md transition-shadow p-1.5">
            <Input
              type="email"
              placeholder="Enter your work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 border-0 shadow-none focus:ring-0 bg-transparent pl-3"
            />
            <Button type="submit" size="md" className="whitespace-nowrap h-10 rounded-lg px-5 shrink-0">
              Get started free
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
          <p className="text-xs text-[#9CA3AF] mt-3">No credit card required. Free for teams up to 5.</p>
        </motion.form>
      </motion.section>

      {/* Product Preview */}
      <motion.section
        className="max-w-4xl mx-auto px-6 pb-24"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={fadeUp}
      >
        <div className="rounded-2xl overflow-hidden bg-gradient-to-b from-[#F0EFED] to-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.06)] border border-[#E5E5E3]/30">
          {/* Tab bar */}
          <div className="flex bg-white/60 backdrop-blur-sm border-b border-[#E5E5E3]/50 px-2">
            {previewTabs.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm transition-all relative ${
                  i === activeTab
                    ? "text-[#0A0A0A] font-medium"
                    : "text-[#9CA3AF] hover:text-[#525252]"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {i === activeTab && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#0A0A0A] rounded-full" />
                )}
              </button>
            ))}
          </div>
          {/* Preview area */}
          <div className="min-h-[320px] bg-gradient-to-b from-[#F0EFED]/50 to-white p-6">
            {activeTab === 0 ? (
              <div className="space-y-3 max-w-xl mx-auto pt-4">
                {/* Mock search bar */}
                <div className="flex items-center gap-3 bg-white rounded-xl border border-[#E5E5E3] px-4 py-3 shadow-sm">
                  <Search className="w-4 h-4 text-[#9CA3AF]" />
                  <span className="text-sm text-[#9CA3AF]">Ask anything about your market...</span>
                </div>
                {/* Mock conversation cards */}
                {mockConversations.map((conv) => (
                  <div
                    key={conv.title}
                    className={`bg-gradient-to-r ${conv.gradient} rounded-xl px-4 py-3.5 flex items-center justify-between group cursor-default`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center">
                        <MessageSquare className="w-3.5 h-3.5 text-[#525252]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#0A0A0A]">{conv.title}</p>
                        <p className="text-xs text-[#9CA3AF]">{conv.time}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#9CA3AF] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center min-h-[280px]">
                {(() => {
                  const current = previewTabs[activeTab];
                  if (!current) return null;
                  const TabIcon = current.icon;
                  return (
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-[#E5E5E3]/50 flex items-center justify-center mx-auto mb-4">
                        <TabIcon className="w-6 h-6 text-[#9CA3AF]" />
                      </div>
                      <p className="text-sm text-[#9CA3AF] font-medium">{current.label}</p>
                      <p className="text-xs text-[#C4C4C4] mt-1">Preview coming soon</p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* Features */}
      <motion.section
        id="features"
        className="max-w-5xl mx-auto px-6 pb-28"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.h2 className="text-3xl font-semibold tracking-tight text-[#0A0A0A] text-center mb-3" variants={fadeUp}>
          Everything your strategy team needs
        </motion.h2>
        <motion.p className="text-base text-[#525252] text-center mb-12 max-w-lg mx-auto" variants={fadeUp}>
          Purpose-built tools for market intelligence, competitive analysis, and strategic planning.
        </motion.p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <motion.div key={f.title} variants={fadeUp}>
              <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-200 h-full border border-[#E5E5E3]/30">
                <div className="w-10 h-10 rounded-xl bg-[#F5F5F4] flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-[#0A0A0A]" />
                </div>
                <h3 className="text-base font-medium text-[#0A0A0A] mb-1.5">{f.title}</h3>
                <p className="text-sm text-[#525252] leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Why Stratix */}
      <motion.section
        id="why"
        className="max-w-4xl mx-auto px-6 pb-28"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.h2 className="text-3xl font-semibold tracking-tight text-[#0A0A0A] text-center mb-3" variants={fadeUp}>
          Why Stratix
        </motion.h2>
        <motion.p className="text-base text-[#525252] text-center mb-12" variants={fadeUp}>
          General AI vs. purpose-built strategic intelligence
        </motion.p>

        {/* Comparison header */}
        <motion.div variants={fadeUp} className="hidden md:grid grid-cols-[1fr_1fr_1fr] gap-4 mb-3 px-5">
          <span className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">Scenario</span>
          <span className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">General AI</span>
          <span className="text-xs font-medium text-[#0A0A0A] uppercase tracking-wider flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-[#0A0A0A] flex items-center justify-center text-white text-[8px] font-bold">S</div>
            Stratix
          </span>
        </motion.div>

        <div className="space-y-3">
          {comparisons.map((c) => (
            <motion.div key={c.scenario} variants={fadeUp}>
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E5E5E3]/30 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr] gap-0">
                  <div className="p-5 md:border-r border-b md:border-b-0 border-[#E5E5E3]/50">
                    <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wide mb-1.5 md:hidden">Scenario</p>
                    <p className="text-sm font-medium text-[#0A0A0A]">{c.scenario}</p>
                  </div>
                  <div className="p-5 md:border-r border-b md:border-b-0 border-[#E5E5E3]/50">
                    <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wide mb-1.5 md:hidden">General AI</p>
                    <div className="flex items-start gap-2">
                      <X className="w-4 h-4 text-[#D4D4D4] mt-0.5 shrink-0" />
                      <p className="text-sm text-[#9CA3AF]">{c.general}</p>
                    </div>
                  </div>
                  <div className="p-5 bg-[#FAFFF8]">
                    <p className="text-xs font-medium text-[#0A0A0A] uppercase tracking-wide mb-1.5 md:hidden">Stratix</p>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#22C55E] mt-0.5 shrink-0" />
                      <p className="text-sm text-[#0A0A0A] font-medium">{c.stratix}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Integrations */}
      <motion.section
        className="max-w-3xl mx-auto px-6 pb-28 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.h2 className="text-3xl font-semibold tracking-tight text-[#0A0A0A] mb-3" variants={fadeUp}>
          600+ integrations
        </motion.h2>
        <motion.p className="text-base text-[#525252] mb-10" variants={fadeUp}>
          Connect to the tools and data sources your team already uses.
        </motion.p>
        <motion.div className="flex flex-wrap justify-center gap-2.5" variants={fadeUp}>
          {integrationCategories.map((cat) => (
            <Badge key={cat}>{cat}</Badge>
          ))}
        </motion.div>
      </motion.section>

      {/* Trust */}
      <motion.section
        id="security"
        className="max-w-3xl mx-auto px-6 pb-28 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.h2 className="text-3xl font-semibold tracking-tight text-[#0A0A0A] mb-3" variants={fadeUp}>
          Enterprise-grade security
        </motion.h2>
        <motion.p className="text-base text-[#525252] mb-10" variants={fadeUp}>
          Your data is protected with industry-leading security standards.
        </motion.p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {trustBadges.map((b) => (
            <motion.div key={b.label} variants={fadeUp}>
              <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E5E5E3]/30 flex flex-col items-center gap-3 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-200 group">
                <div className="w-11 h-11 rounded-xl bg-[#F5F5F4] flex items-center justify-center group-hover:bg-[#F0EFED] transition-colors">
                  <b.icon className="w-5 h-5 text-[#0A0A0A]" />
                </div>
                <span className="text-xs font-medium text-[#525252]">{b.label}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        className="max-w-3xl mx-auto px-6 pb-28 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={fadeUp}
      >
        <div className="bg-[#0A0A0A] rounded-3xl p-12 text-white">
          <h2 className="text-3xl font-semibold tracking-tight mb-3">
            Ready to get started?
          </h2>
          <p className="text-[#A3A3A3] mb-8 max-w-md mx-auto">
            Join teams that use Stratix to make better strategic decisions, faster.
          </p>
          <Button
            onClick={() => navigate("/login")}
            className="bg-white text-[#0A0A0A] hover:bg-[#F5F5F4] h-11 px-6 rounded-lg text-sm font-medium"
          >
            Start for free
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </motion.section>

      {/* Footer */}
      <footer id="contact" className="border-t border-[#E5E5E3]/60 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#9CA3AF]">
          <div className="flex items-center gap-2 text-[#0A0A0A] font-semibold">
            <div className="w-6 h-6 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-white text-[10px] font-bold">S</div>
            Stratix
          </div>
          <nav className="flex gap-6">
            <a href="#" className="hover:text-[#525252] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#525252] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#525252] transition-colors">Status</a>
            <a href="#" className="hover:text-[#525252] transition-colors">Docs</a>
          </nav>
          <span className="text-xs text-[#C4C4C4]">2026 Stratix. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
