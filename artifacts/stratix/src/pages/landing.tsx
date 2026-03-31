import { useGetCurrentAuthUser } from "@workspace/api-client-react";
import { ArrowRight, Shield, Zap, Presentation } from "lucide-react";
import { Link } from "wouter";

export function Landing() {
  const { data: auth, isLoading } = useGetCurrentAuthUser();

  if (isLoading) return <div className="h-screen bg-slate-950" />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-brand selection:text-white flex flex-col">
      {/* Navbar */}
      <header className="px-6 py-4 flex items-center justify-between z-10 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-brand rounded flex items-center justify-center">
            <span className="font-serif font-bold text-white text-lg leading-none">S</span>
          </div>
          <span className="font-serif font-bold text-xl tracking-tight text-white">Stratix</span>
        </div>
        <div>
          {auth?.user ? (
            <Link 
              href="/dashboard" 
              className="text-sm font-medium hover:text-brand transition-colors"
              data-testid="link-dashboard"
            >
              Go to Dashboard
            </Link>
          ) : (
            <a 
              href="/api/login" 
              className="text-sm font-medium bg-white text-slate-950 px-4 py-2 rounded hover:bg-slate-200 transition-colors"
              data-testid="button-signin-nav"
            >
              Sign In
            </a>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand/20 blur-[120px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-900/20 blur-[120px] rounded-full mix-blend-screen" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto mt-[-5vh]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-brand text-xs font-medium uppercase tracking-widest mb-8">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            Executive Intelligence Platform
          </div>
          
          <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
            Intelligence that <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
              commands the room.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 font-light">
            McKinsey-grade insights, comprehensive market audits, and a world-class strategic advisor available on demand. The ultimate edge for the modern executive.
          </p>
          
          {auth?.user ? (
            <Link 
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-brand text-white px-8 py-4 rounded-md font-medium hover:bg-brand/90 transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(234,88,12,0.5)]"
              data-testid="button-enter-app"
            >
              Enter Dashboard <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <a 
              href="/api/login"
              className="inline-flex items-center gap-2 bg-brand text-white px-8 py-4 rounded-md font-medium hover:bg-brand/90 transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(234,88,12,0.5)]"
              data-testid="button-signin-hero"
            >
              Access the Platform <ArrowRight className="w-5 h-5" />
            </a>
          )}
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-32 relative z-10 text-left">
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-sm">
            <Presentation className="w-8 h-8 text-brand mb-4" />
            <h3 className="font-semibold text-lg mb-2">Deep Reporting</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Generate comprehensive market intelligence and financial modeling reports in minutes, not weeks.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-sm">
            <Zap className="w-8 h-8 text-brand mb-4" />
            <h3 className="font-semibold text-lg mb-2">Strategic Advisor</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Real-time AI consultation built on millions of data points to pressure-test your assumptions.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-sm">
            <Shield className="w-8 h-8 text-brand mb-4" />
            <h3 className="font-semibold text-lg mb-2">Enterprise Security</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Bank-grade encryption and strict data partitioning. Your strategic data remains yours alone.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
