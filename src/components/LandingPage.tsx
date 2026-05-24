import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, Instagram, X } from "lucide-react";
import { Footer } from "./Footer";

interface LandingPageProps {
  onGetStarted: () => void;
}

interface RevealSectionProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

const freePlanFeatures = [
  { label: "Personalized campus event feed", included: true },
  { label: "Save events and track applications", included: true },
  { label: "Smart reminders and notifications", included: true },
  { label: "Instant access on desktop and mobile", included: true },
  { label: "AI assistant for event and application questions", included: false },
  { label: "Class schedule import and weekly planner", included: false },
];

const premiumPlanFeatures = [
  { label: "Everything in Free, plus", included: true },
  { label: "AI assistant for student questions and recommendations", included: true },
  { label: "Class screenshot import into a clean weekly planner", included: true },
  { label: "Priority access to new Vybin features", included: true },
  { label: "Smarter organization tools as premium expands", included: true },
];

function RevealSection({ id, className = "", children }: RevealSectionProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -80px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id={id}
      ref={ref}
      className={[
        className,
        "transition-all duration-700 ease-out will-change-transform",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
      ].join(" ")}
    >
      {children}
    </section>
  );
}

function PlanFeature({ label, included }: { label: string; included: boolean }) {
  return (
    <div className="flex items-start gap-3 text-left">
      <div
        className={[
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          included ? "bg-emerald-100 text-emerald-600" : "bg-red-50 text-red-400",
        ].join(" ")}
      >
        {included ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      </div>
      <span className={included ? "text-gray-700" : "text-gray-400 line-through"}>{label}</span>
    </div>
  );
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const headerOffset = window.innerWidth >= 768 ? 118 : 92;
    const elementTop = el.getBoundingClientRect().top + window.scrollY;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const targetY = Math.min(Math.max(0, elementTop - headerOffset), maxScroll);
    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-[#1D1D1F]">
      {/* Soft gradient background — blue left, orange right */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#EBF5FF] via-white to-[#FFF4E8]" />

      {/* Subtle ambient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-48 -top-48 h-[700px] w-[700px] rounded-full bg-[#38BDF8]/12 blur-[160px]" />
        <div className="absolute right-[-220px] top-16 h-[580px] w-[580px] rounded-full bg-[#FB923C]/10 blur-[150px]" />
        <div className="absolute bottom-[-240px] left-[12%] h-[700px] w-[700px] rounded-full bg-[#38BDF8]/8 blur-[160px]" />
      </div>

      {/* Navbar */}
      <div className="fixed left-0 right-0 top-0 z-50">
        <div className="mx-auto max-w-6xl px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="relative flex items-center justify-between rounded-2xl border border-black/[0.07] bg-white/80 px-3 py-3 shadow-[0_2px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:px-4">
            <button onClick={() => scrollToId("top")} className="flex items-center gap-2 select-none -translate-y-[3.5px]">
              <span className="text-xl font-extrabold tracking-tight sm:text-2xl">
                <span className="text-[#38BDF8]">vyb</span>
                <span className="text-[#FB923C]">in</span>
              </span>
            </button>

            <div className="hidden -translate-y-[2px] items-center gap-7 text-base text-[#6E6E73] md:flex">
              {[
                { label: "Features", id: "features" },
                { label: "How it works", id: "how" },
                { label: "Vybin Premium", id: "premium" },
                { label: "Launch", id: "launch" },
              ].map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToId(link.id)}
                  className="transition-colors duration-200 hover:text-[#1D1D1F]"
                >
                  {link.label}
                </button>
              ))}
            </div>

            <button
              onClick={onGetStarted}
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#6366F1] px-3 py-2 text-xs font-semibold text-white shadow-[0_2px_14px_rgba(14,165,233,0.35)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_4px_22px_rgba(14,165,233,0.48)] sm:px-4 sm:text-sm"
            >
              <span className="hidden sm:inline">Get Started</span>
              <span className="sm:hidden">Start</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>

      <div id="top" className="relative z-10">
        {/* Hero */}
        <section className="flex min-h-screen items-center justify-center px-4 pt-24 sm:px-6 md:pt-32">
          <div className="w-full max-w-6xl">
            <div className="mx-auto max-w-4xl text-center">
              <div
                className={[
                  "mb-7 inline-flex items-center gap-2 rounded-full border border-[#0EA5E9]/25 bg-[#EFF6FF] px-4 py-1.5 text-sm text-[#0369A1] transition-all duration-700",
                  mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                ].join(" ")}
              >
                <span className="h-2 w-2 rounded-full bg-[#0EA5E9]" />
                Discover what's happening on campus, fast.
              </div>

              <h1
                className={[
                  "text-4xl font-extrabold leading-[1.05] tracking-tight text-[#1D1D1F] transition-all duration-700 delay-100 sm:text-5xl md:text-7xl",
                  mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                ].join(" ")}
              >
                Find events you actually{" "}
                <span className="bg-gradient-to-r from-[#0EA5E9] to-[#6366F1] bg-clip-text text-transparent">
                  care about
                </span>
                .
              </h1>

              <p
                className={[
                  "mx-auto mt-6 max-w-4xl text-sm text-[#6E6E73] transition-all duration-700 delay-200 sm:text-base md:text-[1.02rem]",
                  mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                ].join(" ")}
              >
                <span className="md:whitespace-nowrap">
                  Vybin helps students discover the most relevant events and opportunities happening on their campus.
                </span>
                <span className="mt-3 block text-[#8E8E93]">
                  Starting with{" "}
                  <span className="font-semibold text-[#ED1B2F]">McGill</span>
                  , expanding to more universities next.
                </span>
              </p>

              <div
                className={[
                  "mt-10 flex flex-col items-center justify-center gap-4 transition-all duration-700 delay-300 sm:flex-row",
                  mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                ].join(" ")}
              >
                <button
                  onClick={onGetStarted}
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#6366F1] px-7 py-4 font-semibold text-white shadow-[0_4px_24px_rgba(14,165,233,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_36px_rgba(14,165,233,0.52)]"
                >
                  Start Vybin
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </button>

                <button
                  onClick={() => scrollToId("features")}
                  className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-6 py-4 text-[#1D1D1F] shadow-[0_2px_14px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
                >
                  See features <ChevronDown className="h-4 w-4 text-[#6E6E73]" />
                </button>
              </div>

              <div
                className={[
                  "mt-4 text-xs text-[#8E8E93] transition-all duration-700 delay-500",
                  mounted ? "opacity-100" : "opacity-0",
                ].join(" ")}
              >
                Sign in with Google or email.
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <RevealSection id="features" className="scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[#1D1D1F] md:text-4xl">
                Discover. Connect.{" "}
                <span className="bg-gradient-to-r from-[#0EA5E9] to-[#6366F1] bg-clip-text text-transparent">Vybe</span>.
              </h2>
              <p className="mx-auto mt-3 max-w-4xl text-sm text-[#6E6E73] sm:text-base md:whitespace-nowrap">
                A focused platform for discovering relevant campus events and tracking the opportunities that matter.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {[
                {
                  title: "Personalized Feed",
                  desc: "Pick your interests once and see relevant events first.",
                  accent: "from-[#EFF6FF] to-[#EEF2FF]",
                  dot: "bg-[#0EA5E9]",
                },
                {
                  title: "Save & Track",
                  desc: "Bookmark events and keep a list of what you applied to.",
                  accent: "from-[#F0FDF4] to-[#ECFDF5]",
                  dot: "bg-[#22C55E]",
                },
                {
                  title: "Fast, Minimal, Clean",
                  desc: "A UI that's actually usable on desktop and mobile.",
                  accent: "from-[#FFF7ED] to-[#FEF3C7]",
                  dot: "bg-[#F59E0B]",
                },
              ].map((feature, index) => (
                <div
                  key={feature.title}
                  className="group overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_2px_20px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.11)]"
                  style={{ transitionDelay: `${index * 80}ms` }}
                >
                  <div className={`h-1.5 w-full bg-gradient-to-r ${feature.accent}`} />
                  <div className="p-6">
                    <div className="mb-3 flex items-center gap-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${feature.dot}`} />
                      <h3 className="text-base font-semibold text-[#1D1D1F]">{feature.title}</h3>
                    </div>
                    <p className="text-sm text-[#6E6E73]">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* How it works */}
        <RevealSection id="how" className="scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="mx-auto max-w-6xl">
            <div className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white p-5 shadow-[0_2px_24px_rgba(0,0,0,0.07)] sm:p-8">
              <h3 className="mb-1 text-2xl font-semibold text-[#1D1D1F]">How it works</h3>
              <p className="mb-7 text-sm text-[#6E6E73]">Three steps to never miss what matters on campus.</p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  {
                    n: "1",
                    t: "Sign in",
                    d: "Google or email, takes seconds.",
                    bg: "bg-[#EFF6FF]",
                    label: "text-[#0369A1]",
                    badge: "bg-[#0EA5E9] text-white",
                  },
                  {
                    n: "2",
                    t: "Choose interests",
                    d: "Tell Vybin what you're into once.",
                    bg: "bg-[#F0FDF4]",
                    label: "text-[#166534]",
                    badge: "bg-[#22C55E] text-white",
                  },
                  {
                    n: "3",
                    t: "Discover + track",
                    d: "Browse, save, and apply — all in one place.",
                    bg: "bg-[#FFF7ED]",
                    label: "text-[#92400E]",
                    badge: "bg-[#F59E0B] text-white",
                  },
                ].map((step) => (
                  <div
                    key={step.n}
                    className={`rounded-2xl p-6 ${step.bg} transition-all duration-200 hover:-translate-y-0.5`}
                  >
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step.badge} mb-3`}>
                      {step.n}
                    </span>
                    <div className={`mb-1 text-lg font-extrabold ${step.label}`}>{step.t}</div>
                    <div className={`text-sm ${step.label} opacity-75`}>{step.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </RevealSection>

        {/* Premium */}
        <RevealSection id="premium" className="scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="mx-auto max-w-7xl">
            <div className="overflow-hidden rounded-[32px] border border-black/[0.06] bg-white px-5 py-12 shadow-[0_4px_40px_rgba(0,0,0,0.08)] sm:px-8">
              <div className="mx-auto max-w-3xl text-center">
                <h3 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F] sm:text-5xl">Choose Your Plan</h3>
                <p className="mx-auto mt-4 max-w-4xl text-sm text-[#6E6E73] sm:text-base md:whitespace-nowrap">
                  Start free and upgrade when you're ready for smarter student tools, better organization, and premium Vybin features.
                </p>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-2">
                {/* Free */}
                <div className="flex h-full flex-col rounded-[24px] border border-black/[0.07] bg-[#F9F9FB] p-7">
                  <div className="text-center">
                    <h4 className="text-3xl font-extrabold text-[#1D1D1F]">Free</h4>
                    <div className="mt-4 flex items-end justify-center gap-1">
                      <span className="text-5xl font-extrabold text-[#1D1D1F]">$0</span>
                      <span className="pb-1 text-lg text-[#6E6E73]">/forever</span>
                    </div>
                    <p className="mt-4 text-[#6E6E73]">A strong free experience for discovering events and staying on top of campus life.</p>
                  </div>

                  <div className="mt-8 space-y-4 text-sm sm:text-base">
                    {freePlanFeatures.map((feature) => (
                      <PlanFeature key={feature.label} label={feature.label} included={feature.included} />
                    ))}
                  </div>

                  <div className="mt-auto pt-9">
                    <button
                      onClick={onGetStarted}
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3.5 font-semibold text-[#1D1D1F] shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_18px_rgba(0,0,0,0.1)]"
                    >
                      Get Started Free
                    </button>
                  </div>
                </div>

                {/* Premium */}
                <div className="relative flex h-full flex-col rounded-[24px] border border-[#0EA5E9]/30 bg-gradient-to-br from-[#EFF6FF] to-[#EEF2FF] p-7 shadow-[0_4px_30px_rgba(14,165,233,0.12)]">
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#0EA5E9] to-[#6366F1] px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_2px_14px_rgba(14,165,233,0.35)]">
                    Most Popular
                  </div>

                  <div className="text-center">
                    <h4 className="text-3xl font-extrabold text-[#1D1D1F]">Premium</h4>
                    <div className="mt-4 flex items-end justify-center gap-1">
                      <span className="text-5xl font-extrabold text-[#1D1D1F]">$4.99</span>
                      <span className="pb-1 text-lg text-[#6E6E73]">/month</span>
                    </div>
                    <p className="mt-4 text-[#6E6E73]">
                      Built for students who want Vybin to do more: smarter answers, better planning, and premium tools in one place.
                    </p>
                  </div>

                  <div className="mt-8 space-y-4 text-sm sm:text-base">
                    {premiumPlanFeatures.map((feature) => (
                      <PlanFeature key={feature.label} label={feature.label} included={feature.included} />
                    ))}
                  </div>

                  <div className="mt-auto pt-9">
                    <button
                      onClick={onGetStarted}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0EA5E9] to-[#6366F1] px-5 py-3.5 font-semibold text-white shadow-[0_4px_20px_rgba(14,165,233,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(14,165,233,0.48)]"
                    >
                      Get Started
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RevealSection>

        {/* Launch */}
        <RevealSection id="launch" className="scroll-mt-24 px-4 pb-20 sm:px-6 sm:pb-24">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-[0_2px_20px_rgba(0,0,0,0.06)] sm:p-8">
              <h3 className="mb-2 text-2xl font-semibold text-[#1D1D1F]">Launch</h3>
              <p className="text-[#6E6E73]">
                We're starting with{" "}
                <span className="font-semibold text-[#ED1B2F]">McGill</span>{" "}
                as our first school, then expanding to more universities.
              </p>
            </div>
          </div>
        </RevealSection>

        {/* Bottom CTA */}
        <RevealSection className="px-4 pb-16 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-3xl border border-black/[0.05] bg-gradient-to-br from-[#EFF6FF] to-[#EEF2FF] px-6 py-16 text-center shadow-[0_2px_20px_rgba(0,0,0,0.05)]">
              <p className="mb-3 text-lg font-semibold text-[#1D1D1F] md:text-xl">
                Discover what actually matters to you on campus.
              </p>
              <p className="mx-auto max-w-3xl text-[#6E6E73]">
                <span className="bg-gradient-to-r from-[#0EA5E9] to-[#6366F1] bg-clip-text font-semibold text-transparent">Vybin</span>{" "}
                filters the noise so you never miss what matters.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <button
                  onClick={onGetStarted}
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#6366F1] px-8 py-4 font-semibold text-white shadow-[0_4px_24px_rgba(14,165,233,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_36px_rgba(14,165,233,0.52)]"
                >
                  Start Vybin
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </button>

                <a
                  href="https://www.instagram.com/vybin_org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-6 py-4 text-[#1D1D1F] shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
                >
                  <Instagram className="h-5 w-5 text-[#DD2A7B]" />
                  Follow @vybin_org
                </a>
              </div>
            </div>
          </div>
        </RevealSection>

        <Footer />
      </div>
    </div>
  );
}
