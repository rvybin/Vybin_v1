import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface LegalPageLayoutProps {
  title: string;
  children: ReactNode;
}

export function LegalPageLayout({ title, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#0B0C10] text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B0C10] via-[#11131c] to-[#0B0C10]" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-48 left-[-160px] h-[520px] w-[520px] rounded-full bg-[#00BFFF]/10 blur-[140px]" />
        <div className="absolute top-24 right-[-120px] h-[460px] w-[460px] rounded-full bg-[#4C6EF5]/10 blur-[140px]" />
        <div className="absolute bottom-[-180px] left-[18%] h-[420px] w-[420px] rounded-full bg-[#00BFFF]/8 blur-[150px]" />
      </div>

      <div className="relative z-10 px-6 py-10 md:py-14">
        <div className="mx-auto max-w-4xl">
          <Link
            to="/"
            className="inline-flex items-center rounded-xl border border-[#00BFFF]/30 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-[#00BFFF]/60 hover:text-white hover:shadow-[0_0_24px_rgba(0,191,255,0.2)]"
          >
            Back to Vybin
          </Link>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-[0_16px_60px_rgba(0,0,0,0.35)] md:p-12">
            <div className="mb-10 border-b border-white/10 pb-6">
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#00BFFF]">
                Vybin Legal
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
              <p className="mt-4 text-sm text-white/55">Last Updated: March 7, 2026</p>
            </div>

            <div className="space-y-8 text-base leading-8 text-white/80">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
