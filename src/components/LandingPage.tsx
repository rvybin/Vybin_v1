import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, Instagram, X } from "lucide-react";
import { openPremiumCheckout } from "../lib/billing";
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
  { label: 'AI assistant for event and application questions', included: false },
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
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          included
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
            : "border-rose-400/25 bg-rose-400/10 text-rose-300",
        ].join(" ")}
      >
        {included ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      </div>
      <span className={included ? "text-white/82" : "text-white/42 line-through"}>{label}</span>
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
    <div className="relative min-h-screen overflow-hidden bg-[#0B0C10] text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B0C10] via-[#11131c] to-[#0B0C10]" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-56 -top-56 h-[760px] w-[760px] rounded-full bg-[#00BFFF]/12 blur-[160px]" />
        <div className="absolute right-[-240px] top-24 h-[680px] w-[680px] rounded-full bg-[#4C6EF5]/12 blur-[160px]" />
        <div className="absolute bottom-[-260px] left-[10%] h-[760px] w-[760px] rounded-full bg-[#00BFFF]/8 blur-[170px]" />
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-[0.25]">
        <div className="absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:28px_28px]" />
      </div>

      <div className="fixed left-0 right-0 top-0 z-50">
        <div className="mx-auto max-w-6xl px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#00BFFF]/30 to-[#4C6EF5]/30 opacity-30 blur-2xl" />
            <div className="relative flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)] sm:px-4">
              <button onClick={() => scrollToId("top")} className="flex items-center gap-2 select-none -translate-y-[3.5px]">
                <span className="text-xl font-extrabold tracking-tight sm:text-2xl">
                  <span className="text-white">vyb</span>
                  <span className="bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] bg-clip-text text-transparent">in</span>
                </span>
              </button>

              <div className="hidden -translate-y-[2px] items-center gap-7 text-base text-white/70 md:flex">
                {[
                  { label: "Features", id: "features" },
                  { label: "How it works", id: "how" },
                  { label: "Vybin Premium", id: "premium" },
                  { label: "Launch", id: "launch" },
                ].map((link) => (
                  <button
                    key={link.id}
                    onClick={() => scrollToId(link.id)}
                    className="relative transition-colors duration-300 hover:text-[#00BFFF]"
                  >
                    {link.label}
                    <span className="absolute left-0 -bottom-1 h-[2px] w-full origin-left scale-x-0 bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] transition-transform duration-300 hover:scale-x-100" />
                  </button>
                ))}
              </div>

              <button
                onClick={onGetStarted}
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] px-3 py-2 text-xs font-semibold shadow-[0_0_18px_rgba(0,191,255,0.45)] transition-all duration-300 hover:-translate-y-[1px] hover:shadow-[0_0_30px_rgba(0,191,255,0.75)] sm:px-4 sm:text-sm"
              >
                <span className="hidden sm:inline">Get Started</span>
                <span className="sm:hidden">Start</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div id="top" className="relative z-10">
        <section className="flex min-h-screen items-center justify-center px-4 pt-24 sm:px-6 md:pt-32">
          <div className="w-full max-w-6xl">
            <div className="mx-auto max-w-4xl text-center">
              <div
                className={[
                  "mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/70 backdrop-blur-md transition-all duration-700",
                  mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                ].join(" ")}
              >
                <span className="h-2 w-2 rounded-full bg-[#00BFFF] shadow-[0_0_14px_rgba(0,191,255,0.9)]" />
                Discover what's happening on campus, fast.
              </div>

              <h1
                className={[
                  "text-4xl font-extrabold leading-[1.05] tracking-tight transition-all duration-700 delay-100 sm:text-5xl md:text-7xl",
                  mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                ].join(" ")}
              >
                Find events you'll actually{" "}
                <span className="bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] bg-clip-text text-transparent">
                  care about
                </span>
                .
              </h1>

              <p
                className={[
                  "mx-auto mt-6 max-w-4xl text-sm text-white/65 transition-all duration-700 delay-200 sm:text-base md:text-[1.02rem]",
                  mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                ].join(" ")}
              >
                <span className="md:whitespace-nowrap">
                  Vybin helps students discover the most relevant events and opportunities happening on their campus.
                </span>
                <span className="mt-3 block text-white/50">
                  Starting with{" "}
                  <span className="font-semibold text-[#FF4D5A] drop-shadow-[0_0_12px_rgba(255,77,90,0.55)]">
                    McGill
                  </span>
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
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] px-7 py-4 font-semibold shadow-[0_0_30px_rgba(0,191,255,0.55)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_48px_rgba(0,191,255,0.85)]"
                >
                  Start Vybin
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  onClick={() => scrollToId("features")}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  See features <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              <div
                className={[
                  "mt-4 text-xs text-white/45 transition-all duration-700 delay-500",
                  mounted ? "opacity-100" : "opacity-0",
                ].join(" ")}
              >
                Sign in with Google or email.
              </div>
            </div>
          </div>
        </section>

        <RevealSection id="features" className="scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Discover. Connect.{" "}
                <span className="text-[#00BFFF] drop-shadow-[0_0_18px_rgba(0,191,255,0.65)]">Vybe</span>.
              </h2>
              <p className="mx-auto mt-3 max-w-4xl text-sm text-white/60 sm:text-base md:whitespace-nowrap">
                A focused platform for discovering relevant campus events and tracking the opportunities that matter.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                { title: "Personalized Feed", desc: "Pick your interests once and see relevant events first." },
                { title: "Save & Track", desc: "Bookmark events and keep a list of what you applied to." },
                { title: "Fast, Minimal, Clean", desc: "A UI that's actually usable on desktop and mobile." },
              ].map((feature, index) => (
                <div
                  key={feature.title}
                  className="group relative transition-all duration-700"
                  style={{ transitionDelay: `${index * 120}ms` }}
                >
                  <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-[#00BFFF]/55 to-[#4C6EF5]/55 opacity-0 blur-xl transition duration-500 group-hover:opacity-100" />
                  <div className="relative h-full rounded-2xl border border-[#00BFFF]/22 bg-[#071A2A]/55 p-6 shadow-[0_0_35px_rgba(0,191,255,0.10)] backdrop-blur-md transition duration-300 group-hover:-translate-y-1 group-hover:bg-[#071A2A]/70 group-hover:shadow-[0_0_45px_rgba(0,191,255,0.18)]">
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <h3 className="text-lg font-semibold text-[#FF7AD9] drop-shadow-[0_0_16px_rgba(255,122,217,0.8)]">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-white/65 md:whitespace-nowrap">{feature.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>

        <RevealSection id="how" className="scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="mx-auto max-w-6xl">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-8">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-28 right-10 h-[420px] w-[420px] rounded-full bg-[#00BFFF]/10 blur-[120px]" />
                <div className="absolute -bottom-40 left-10 h-[520px] w-[520px] rounded-full bg-[#4C6EF5]/10 blur-[140px]" />
              </div>

              <div className="relative">
                <h3 className="mb-4 text-2xl font-semibold">How it works</h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {[
                    { n: "1", t: "Sign in", d: "Google or email, takes seconds." },
                    { n: "2", t: "Choose interests", d: "Tell Vybin what you're into once." },
                    { n: "3", t: "Discover + track", d: "Browse, save, and apply, all in one place." },
                  ].map((step) => (
                    <div
                      key={step.n}
                      className={[
                        "rounded-2xl border border-white/10 p-6 transition",
                        step.n === "1"
                          ? "bg-[#FF4D6D] shadow-[0_0_45px_rgba(255,77,109,0.40)] hover:shadow-[0_0_60px_rgba(255,77,109,0.52)]"
                          : step.n === "2"
                          ? "bg-[#39FF14] shadow-[0_0_40px_rgba(57,255,20,0.35)] hover:shadow-[0_0_55px_rgba(57,255,20,0.45)]"
                          : "bg-[#FFF36B] shadow-[0_0_45px_rgba(255,243,107,0.40)] hover:shadow-[0_0_60px_rgba(255,243,107,0.52)]",
                      ].join(" ")}
                    >
                      <div className="mb-2 text-sm font-medium text-[#0B0C10]/80">Step {step.n}</div>
                      <div className="mb-1 text-lg font-extrabold text-[#0B0C10]">{step.t}</div>
                      <div className="text-sm text-[#0B0C10]/80">{step.d}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </RevealSection>

        <RevealSection id="premium" className="scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="mx-auto max-w-7xl">
            <div className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,10,20,0.92),rgba(7,10,18,0.98))] px-5 py-12 shadow-[0_18px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_26px_80px_rgba(0,191,255,0.14)] sm:px-8">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-32 left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-[#00BFFF]/10 blur-[130px]" />
                <div className="absolute bottom-[-120px] right-[-60px] h-[300px] w-[300px] rounded-full bg-[#4C6EF5]/10 blur-[120px]" />
                <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="absolute inset-[-1px] rounded-[32px] border border-[#00BFFF]/25 shadow-[0_0_90px_rgba(0,191,255,0.16)]" />
                </div>
              </div>

              <div className="relative">
                <div className="mx-auto max-w-3xl text-center">
                  <h3 className="text-3xl font-extrabold tracking-tight sm:text-5xl">Choose Your Plan</h3>
                  <p className="mx-auto mt-4 max-w-4xl text-sm text-white/58 sm:text-base md:whitespace-nowrap">
                    Start free and upgrade when you're ready for smarter student tools, better organization, and premium Vybin features.
                  </p>
                </div>

                <div className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="flex h-full flex-col rounded-[28px] border border-white/10 bg-[#0F1220]/85 p-7 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
                    <div className="text-center">
                      <h4 className="text-3xl font-extrabold">Free</h4>
                      <div className="mt-4 flex items-end justify-center gap-1">
                        <span className="text-5xl font-extrabold">$0</span>
                        <span className="pb-1 text-lg text-white/50">/forever</span>
                      </div>
                      <p className="mt-4 text-white/62">A strong free experience for discovering events and staying on top of campus life.</p>
                    </div>

                    <div className="mt-8 space-y-4 text-sm sm:text-base">
                      {freePlanFeatures.map((feature) => (
                        <PlanFeature key={feature.label} label={feature.label} included={feature.included} />
                      ))}
                    </div>

                    <button
                      onClick={onGetStarted}
                      className="mt-auto inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 pt-9 font-semibold text-white/90 transition hover:bg-white/10"
                    >
                      Get Started Free
                    </button>
                  </div>

                  <div className="relative flex h-full flex-col rounded-[28px] border border-[#00BFFF]/45 bg-[linear-gradient(180deg,rgba(8,24,38,0.96),rgba(14,16,30,0.98))] p-7 shadow-[0_0_55px_rgba(0,191,255,0.14)]">
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_0_24px_rgba(0,191,255,0.35)]">
                      Most Popular
                    </div>

                    <div className="text-center">
                      <h4 className="text-3xl font-extrabold">Premium</h4>
                      <div className="mt-4 flex items-end justify-center gap-1">
                        <span className="text-5xl font-extrabold">$10</span>
                        <span className="pb-1 text-lg text-white/50">/month</span>
                      </div>
                      <p className="mt-4 text-white/68">
                        Built for students who want Vybin to do more: smarter answers, better planning, and premium tools in one place.
                      </p>
                    </div>

                    <div className="mt-8 space-y-4 text-sm sm:text-base">
                      {premiumPlanFeatures.map((feature) => (
                        <PlanFeature key={feature.label} label={feature.label} included={feature.included} />
                      ))}
                    </div>

                    <button
                      onClick={openPremiumCheckout}
                      className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] px-5 py-3.5 pt-9 font-semibold text-white shadow-[0_0_28px_rgba(0,191,255,0.28)] transition hover:-translate-y-[1px] hover:shadow-[0_0_42px_rgba(0,191,255,0.42)]"
                    >
                      Upgrade to Premium
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RevealSection>

        <RevealSection id="launch" className="scroll-mt-24 px-4 pb-20 sm:px-6 sm:pb-24">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-8">
              <h3 className="mb-2 text-2xl font-semibold">Launch</h3>
              <p className="text-white/60">
                We're starting with{" "}
                <span className="font-semibold text-[#FF4D5A] drop-shadow-[0_0_12px_rgba(255,77,90,0.55)]">McGill</span>{" "}
                as our first school, then expanding to more universities.
              </p>
            </div>
          </div>
        </RevealSection>

        <RevealSection className="px-4 pb-16 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="border-t border-white/10 py-16 text-center">
              <p className="mb-4 text-lg font-semibold text-white/85 md:text-xl">
                Built to make campus opportunities easier to discover with{" "}
                <span className="font-semibold text-[#00BFFF]">vybin'</span>.
              </p>

              <p className="mx-auto max-w-3xl text-white/60">
                Vybin was created to cut through the noise around campus life and give students one clear place to
                find relevant events, stay organized, and follow through on the opportunities that matter.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <button
                  onClick={onGetStarted}
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] px-8 py-4 font-semibold shadow-[0_0_30px_rgba(0,191,255,0.6)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_52px_rgba(0,191,255,0.9)]"
                >
                  Start Vybin
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>

                <a
                  href="https://www.instagram.com/vybin_org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-white/75 transition hover:bg-white/10 hover:text-white"
                >
                  <Instagram className="h-5 w-5" />
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
