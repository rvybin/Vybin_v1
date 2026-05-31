import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

interface LegalPageLayoutProps {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}

export function LegalPageLayout({ title, effectiveDate, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0B0C10] text-white">
      {/* Background gradients */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-48 left-[-160px] h-[520px] w-[520px] rounded-full bg-[#ED1B2F]/8 blur-[140px]" />
        <div className="absolute top-24 right-[-120px] h-[460px] w-[460px] rounded-full bg-[#ED1B2F]/5 blur-[160px]" />
        <div className="absolute bottom-[-180px] left-[18%] h-[420px] w-[420px] rounded-full bg-white/3 blur-[150px]" />
      </div>

      <div className="relative z-10 px-4 py-10 sm:px-6 md:py-14">
        <div className="mx-auto max-w-3xl">

          {/* Back button */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-white/20 hover:bg-white/8 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Vybin
          </Link>

          {/* Card */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">

            {/* Header */}
            <div className="border-b border-white/8 bg-gradient-to-r from-[#ED1B2F]/10 to-transparent px-8 py-8 md:px-10">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ED1B2F]/15">
                  <Shield className="h-4.5 w-4.5 text-[#ED1B2F]" />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#ED1B2F]">
                  Vybin Legal
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {title}
              </h1>
              <p className="mt-2 text-sm text-white/40">
                Effective date: {effectiveDate}
              </p>
            </div>

            {/* Body */}
            <div className="space-y-8 px-8 py-10 md:px-10">
              {children}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/8 bg-white/[0.02] px-8 py-5 md:px-10">
              <p className="text-xs text-white/30">
                © {new Date().getFullYear()} Vybin · Montréal, Québec, Canada
              </p>
              <div className="flex gap-4 text-xs text-white/30">
                <Link to="/terms" className="hover:text-white/60 transition">Terms</Link>
                <Link to="/privacy" className="hover:text-white/60 transition">Privacy</Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
