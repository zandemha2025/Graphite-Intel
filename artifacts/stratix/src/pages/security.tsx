import { Link } from "wouter";

export function Security() {
  return (
    <div className="min-h-screen bg-[#0D0C0B] text-[#E8E4DC] flex flex-col">
      {/* Header */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/8 z-20 relative">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-7 w-7 border border-[#E8E4DC]/40 flex items-center justify-center">
            <span className="font-serif font-semibold text-[#E8E4DC] text-sm leading-none">S</span>
          </div>
          <span className="font-serif font-semibold text-lg tracking-tight text-[#E8E4DC] uppercase">Stratix</span>
        </Link>
        <a
          href="/api/login"
          className="text-sm font-medium bg-[#E8E4DC] text-[#0D0C0B] px-5 py-2 hover:bg-[#D4CEC5] transition-colors tracking-wide uppercase"
        >
          Sign In
        </a>
      </header>

      {/* Page title */}
      <div className="border-b border-white/8 px-12 py-14 max-w-5xl mx-auto w-full">
        <div className="mb-4">
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#E8E4DC]/40 border border-[#E8E4DC]/15 px-3 py-1">
            Trust & Security
          </span>
        </div>
        <h1 className="font-serif text-5xl md:text-6xl font-light tracking-tight text-[#E8E4DC] leading-[0.95] mt-6 mb-6">
          Built for enterprise trust.
        </h1>
        <p className="text-base text-[#E8E4DC]/50 max-w-xl font-light leading-relaxed">
          Stratix is designed for executives and their teams. Security, confidentiality, and data integrity are not afterthoughts — they are foundational to how the platform operates.
        </p>
      </div>

      {/* Sections */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-12 py-14 space-y-0">

        {/* Data Handling */}
        <section className="border-b border-white/8 pb-12 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#E8E4DC]/35 mb-3">Data Policy</p>
              <h2 className="font-serif text-2xl font-light text-[#E8E4DC]">Your data is never used to train AI models.</h2>
            </div>
            <div className="md:col-span-2 space-y-4 text-sm text-[#E8E4DC]/55 font-light leading-relaxed">
              <p>
                All data you submit to Stratix — including company context, chat messages, uploaded documents, and generated reports — is used exclusively to serve your queries. We operate under strict data processing agreements that prohibit your data from being used to improve or train any AI model, by Stratix or its underlying model providers.
              </p>
              <p>
                Your strategic intelligence remains yours. We do not mine your interactions for product insights, aggregate your competitive data for benchmarking, or share any company-identifying information with third parties.
              </p>
            </div>
          </div>
        </section>

        {/* Encryption */}
        <section className="border-b border-white/8 pb-12 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#E8E4DC]/35 mb-3">Encryption</p>
              <h2 className="font-serif text-2xl font-light text-[#E8E4DC]">TLS 1.3 in transit. AES-256 at rest.</h2>
            </div>
            <div className="md:col-span-2 space-y-4 text-sm text-[#E8E4DC]/55 font-light leading-relaxed">
              <div className="grid grid-cols-2 gap-6">
                <div className="border border-white/8 p-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/35 mb-2">In Transit</p>
                  <p className="font-serif text-base text-[#E8E4DC]/80 mb-2">TLS 1.3</p>
                  <p className="text-xs text-[#E8E4DC]/45 leading-relaxed">All API traffic between your browser and Stratix servers is encrypted using TLS 1.3, the current industry standard.</p>
                </div>
                <div className="border border-white/8 p-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/35 mb-2">At Rest</p>
                  <p className="font-serif text-base text-[#E8E4DC]/80 mb-2">AES-256</p>
                  <p className="text-xs text-[#E8E4DC]/45 leading-relaxed">All data stored in our systems, including your company profile, reports, and chat history, is encrypted at rest using AES-256.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SOC 2 */}
        <section className="border-b border-white/8 pb-12 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#E8E4DC]/35 mb-3">Compliance</p>
              <h2 className="font-serif text-2xl font-light text-[#E8E4DC]">SOC 2 Type II</h2>
            </div>
            <div className="md:col-span-2 space-y-4 text-sm text-[#E8E4DC]/55 font-light leading-relaxed">
              <div className="flex items-start gap-4 border border-[#E8E4DC]/10 bg-white/2 p-5">
                <div className="h-2 w-2 bg-[#C9A96E] mt-1.5 shrink-0" />
                <div>
                  <p className="text-[#E8E4DC]/80 font-medium text-sm mb-1">Certification in Progress</p>
                  <p className="text-xs text-[#E8E4DC]/45 leading-relaxed">
                    Stratix is currently undergoing a SOC 2 Type II audit. Our security controls, access management, and operational procedures have been designed from the ground up to meet SOC 2 standards. Certification is expected to be completed in Q3 2026. Enterprise customers may request our current security posture documentation and controls evidence package.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SSO */}
        <section className="border-b border-white/8 pb-12 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#E8E4DC]/35 mb-3">Access Control</p>
              <h2 className="font-serif text-2xl font-light text-[#E8E4DC]">SSO & RBAC</h2>
            </div>
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="border border-white/8 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/35">Single Sign-On</p>
                    <span className="text-[9px] uppercase tracking-wider text-[#C9A96E] border border-[#C9A96E]/30 px-2 py-0.5">Enterprise</span>
                  </div>
                  <p className="text-sm text-[#E8E4DC]/55 font-light leading-relaxed">
                    SAML 2.0 and OIDC-based SSO is available on the Enterprise plan. Integrate with Okta, Azure AD, Google Workspace, and other identity providers.
                  </p>
                </div>
                <div className="border border-white/8 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#E8E4DC]/35">Role-Based Access</p>
                    <span className="text-[9px] uppercase tracking-wider text-[#E8E4DC]/60 border border-white/15 px-2 py-0.5">Available</span>
                  </div>
                  <p className="text-sm text-[#E8E4DC]/55 font-light leading-relaxed">
                    Granular RBAC controls allow administrators to define what each team member can view, commission, and share across reports and strategic sessions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Data Retention */}
        <section className="border-b border-white/8 pb-12 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#E8E4DC]/35 mb-3">Retention & Deletion</p>
              <h2 className="font-serif text-2xl font-light text-[#E8E4DC]">You control your data lifecycle.</h2>
            </div>
            <div className="md:col-span-2 space-y-4 text-sm text-[#E8E4DC]/55 font-light leading-relaxed">
              <p>
                Active accounts retain data for the duration of the subscription. You may request full deletion of your account data at any time — including company profile, reports, and all chat sessions — with a confirmed purge completed within 30 days.
              </p>
              <p>
                Upon subscription cancellation, all personally identifiable data is deleted within 90 days unless a longer retention window is required by applicable law. Aggregated, non-identifying usage statistics may be retained for product analytics under a separate data processing basis.
              </p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#E8E4DC]/35 mb-3">Security Inquiries</p>
              <h2 className="font-serif text-2xl font-light text-[#E8E4DC]">Contact our security team.</h2>
            </div>
            <div className="md:col-span-2 space-y-4 text-sm text-[#E8E4DC]/55 font-light leading-relaxed">
              <p>
                For security inquiries, responsible disclosure, vendor security assessments, or enterprise security documentation requests, contact our security team directly.
              </p>
              <a
                href="mailto:security@stratix.ai"
                className="inline-flex items-center gap-2 border border-[#E8E4DC]/20 px-6 py-3 text-[#E8E4DC]/70 hover:text-[#E8E4DC] hover:border-[#E8E4DC]/40 transition-colors text-xs uppercase tracking-widest"
              >
                security@stratix.ai
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/8 px-12 py-8 max-w-5xl mx-auto w-full">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-xs text-[#E8E4DC]/30 font-light">
            &copy; {new Date().getFullYear()} Stratix Intelligence Platform. All rights reserved.
          </p>
          <nav className="flex items-center gap-6">
            <Link href="/security" className="text-xs text-[#E8E4DC]/40 hover:text-[#E8E4DC]/70 transition-colors uppercase tracking-wider">Security</Link>
            <a href="#" className="text-xs text-[#E8E4DC]/40 hover:text-[#E8E4DC]/70 transition-colors uppercase tracking-wider">Privacy Policy</a>
            <a href="#" className="text-xs text-[#E8E4DC]/40 hover:text-[#E8E4DC]/70 transition-colors uppercase tracking-wider">Terms</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
