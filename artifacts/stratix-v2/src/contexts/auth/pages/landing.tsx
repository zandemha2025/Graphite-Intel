import { useState } from "react";
import { useLocation } from "wouter";
import { motion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  function handleGetStarted(e: React.FormEvent) {
    e.preventDefault();
    navigate(email ? `/login?email=${encodeURIComponent(email)}` : "/login");
  }

  return (
    <div className="min-h-screen bg-[#F6F5F4]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 text-lg font-semibold text-[#0A0A0A]">
          <div className="w-7 h-7 rounded-lg bg-[#0A0A0A] flex items-center justify-center text-white text-xs font-bold">S</div>
          Stratix
        </div>
        <nav className="flex items-center gap-6 text-sm text-[#404040]">
          <a href="#security" className="hover:text-[#0A0A0A] transition-colors">Security</a>
          <a href="#contact" className="hover:text-[#0A0A0A] transition-colors">Contact</a>
          <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Sign In</Button>
          <Button size="sm" onClick={() => navigate("/login")}>Log In</Button>
        </nav>
      </header>

      {/* Hero */}
      <motion.section
        className="text-center px-6 pt-20 pb-16 max-w-3xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.h1
          className="text-5xl font-semibold tracking-tight text-[#0A0A0A] leading-tight"
          style={{ letterSpacing: "-0.02em" }}
          variants={fadeUp}
        >
          Strategic intelligence your team trusts
        </motion.h1>
        <motion.p className="mt-4 text-base text-[#404040] max-w-lg mx-auto" variants={fadeUp}>
          Research, analyze, and act on market intelligence -- all in one platform your entire team can use.
        </motion.p>
        <motion.form
          className="mt-8 flex items-center gap-3 max-w-md mx-auto"
          onSubmit={handleGetStarted}
          variants={fadeUp}
        >
          <Input
            type="email"
            placeholder="Enter your work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 bg-white"
          />
          <Button type="submit" size="lg" className="whitespace-nowrap h-11">
            Get started for free
          </Button>
        </motion.form>
      </motion.section>

      {/* Product Preview */}
      <motion.section
        className="max-w-4xl mx-auto px-6 pb-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={fadeUp}
      >
        <Card className="overflow-hidden p-0">
          <div className="flex border-b border-[#E5E5E3]">
            {previewTabs.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-2 px-5 py-3 text-sm transition-colors ${
                  i === activeTab
                    ? "text-[#0A0A0A] border-b-2 border-[#0A0A0A] font-medium"
                    : "text-[#9CA3AF] hover:text-[#404040]"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="h-72 bg-[#FAFAF9] flex items-center justify-center text-sm text-[#9CA3AF]">
            {(() => {
              const current = previewTabs[activeTab];
              if (!current) return null;
              const TabIcon = current.icon;
              return (
                <div className="text-center">
                  <TabIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>{current.label} view preview</p>
                </div>
              );
            })()}
          </div>
        </Card>
      </motion.section>

      {/* Features */}
      <motion.section
        className="max-w-5xl mx-auto px-6 pb-24"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.h2 className="text-2xl font-semibold text-[#0A0A0A] text-center mb-10" variants={fadeUp}>
          Everything your strategy team needs
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <motion.div key={f.title} variants={fadeUp}>
              <Card hoverable className="h-full">
                <f.icon className="w-5 h-5 text-[#0A0A0A] mb-3" />
                <h3 className="text-sm font-medium text-[#0A0A0A] mb-1">{f.title}</h3>
                <p className="text-sm text-[#404040] leading-relaxed">{f.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Why Stratix */}
      <motion.section
        className="max-w-4xl mx-auto px-6 pb-24"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.h2 className="text-2xl font-semibold text-[#0A0A0A] text-center mb-2" variants={fadeUp}>
          Why Stratix
        </motion.h2>
        <motion.p className="text-sm text-[#404040] text-center mb-10" variants={fadeUp}>
          General AI vs. purpose-built strategic intelligence
        </motion.p>
        <div className="space-y-4">
          {comparisons.map((c) => (
            <motion.div key={c.scenario} variants={fadeUp}>
              <Card className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr] gap-4 items-start">
                <div>
                  <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wide mb-1">Scenario</p>
                  <p className="text-sm font-medium text-[#0A0A0A]">{c.scenario}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wide mb-1">General AI</p>
                  <p className="text-sm text-[#404040]">{c.general}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#0A0A0A] uppercase tracking-wide mb-1">Stratix</p>
                  <p className="text-sm text-[#0A0A0A] font-medium">{c.stratix}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Integrations */}
      <motion.section
        className="max-w-3xl mx-auto px-6 pb-24 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.h2 className="text-2xl font-semibold text-[#0A0A0A] mb-2" variants={fadeUp}>
          600+ integrations
        </motion.h2>
        <motion.p className="text-sm text-[#404040] mb-8" variants={fadeUp}>
          Connect to the tools and data sources your team already uses.
        </motion.p>
        <motion.div className="flex flex-wrap justify-center gap-2" variants={fadeUp}>
          {integrationCategories.map((cat) => (
            <Badge key={cat}>{cat}</Badge>
          ))}
        </motion.div>
      </motion.section>

      {/* Trust */}
      <motion.section
        id="security"
        className="max-w-3xl mx-auto px-6 pb-24 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
      >
        <motion.h2 className="text-2xl font-semibold text-[#0A0A0A] mb-8" variants={fadeUp}>
          Enterprise-grade security
        </motion.h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {trustBadges.map((b) => (
            <motion.div key={b.label} variants={fadeUp}>
              <Card className="flex flex-col items-center gap-2 py-6">
                <b.icon className="w-6 h-6 text-[#0A0A0A]" />
                <span className="text-xs font-medium text-[#404040]">{b.label}</span>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Footer */}
      <footer id="contact" className="border-t border-[#E5E5E3] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-[#9CA3AF]">
          <div className="flex items-center gap-2 text-[#0A0A0A] font-semibold">
            <div className="w-5 h-5 rounded bg-[#0A0A0A] flex items-center justify-center text-white text-[10px] font-bold">S</div>
            Stratix
          </div>
          <nav className="flex gap-6">
            <a href="#" className="hover:text-[#404040] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#404040] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#404040] transition-colors">Status</a>
            <a href="#" className="hover:text-[#404040] transition-colors">Docs</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
