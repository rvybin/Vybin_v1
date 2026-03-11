import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Instagram } from "lucide-react";
import { Footer } from "./Footer";

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  const year = useMemo(() => new Date().getFullYear(), []);

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
    <div className="relative min-h-screen bg-[#0B0C10] text-white overflow-hidden">
      {/* Background base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B0C10] via-[#11131c] to-[#0B0C10]" />

      {/* Ambient glow blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-56 -left-56 w-[760px] h-[760px] bg-[#00BFFF]/12 rounded-full blur-[160px]" />
        <div className="absolute top-24 right-[-240px] w-[680px] h-[680px] bg-[#4C6EF5]/12 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-260px] left-[10%] w-[760px] h-[760px] bg-[#00BFFF]/8 rounded-full blur-[170px]" />
      </div>

      {/* Subtle star/noise vibe */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.25]">
        <div className="absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:28px_28px]" />
      </div>

      {/* Sticky Glass Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-6xl px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#00BFFF]/30 to-[#4C6EF5]/30 blur-2xl opacity-30" />
            <div className="relative flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)] sm:px-4">
              {/* Left: Logo */}
              <button onClick={() => scrollToId("top")} className="flex items-center gap-2 select-none -translate-y-[3.5px]">
                <span className="text-xl font-extrabold tracking-tight sm:text-2xl">
                  <span className="text-white">vyb</span>
                  <span className="bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] bg-clip-text text-transparent">
                    in
                  </span>
                </span>
              </button>

              {/* Center: Links */}
              <div className="hidden md:flex items-center gap-7 text-base text-white/70 -translate-y-[2px]">
                {[
                  { label: "Features", id: "features" },
                  { label: "How it works", id: "how" },
                  { label: "Launch", id: "launch" },
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => scrollToId(l.id)}
                    className="relative transition-colors duration-300 hover:text-[#00BFFF]"
                  >
                    {l.label}
                    <span className="absolute left-0 -bottom-1 h-[2px] w-full scale-x-0 bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] transition-transform duration-300 hover:scale-x-100 origin-left" />
                  </button>
                ))}
              </div>

              {/* Right: Get Started */}
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

      {/* Page content */}
      <div id="top" className="relative z-10">
        {/* HERO */}
        <section className="flex min-h-screen items-center justify-center px-4 pt-24 sm:px-6 md:pt-32">
          <div className="w-full max-w-6xl">
            <div className="mx-auto max-w-4xl text-center">
              <div
                className={[
                  "inline-flex items-center gap-2 mb-7 px-4 py-1.5 rounded-full",
                  "bg-white/5 border border-white/10 text-sm text-white/70 backdrop-blur-md",
                  "transition-all duration-700",
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
                ].join(" ")}
              >
                <span className="h-2 w-2 rounded-full bg-[#00BFFF] shadow-[0_0_14px_rgba(0,191,255,0.9)]" />
                Discover what’s happening on campus — fast.
              </div>

              <h1
                className={[
                  "text-4xl font-extrabold tracking-tight leading-[1.05] sm:text-5xl md:text-7xl",
                  "transition-all duration-700 delay-100",
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
                ].join(" ")}
              >
                Find events you’ll actually{" "}
                <span className="bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] bg-clip-text text-transparent">
                  care about
                </span>
                .
              </h1>

              <p
                className={[
                  "mx-auto mt-6 max-w-2xl text-sm text-white/65 sm:text-base md:text-lg",
                  "transition-all duration-700 delay-200",
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
                ].join(" ")}
              >
                Vybin helps university students discover campus events, save what they like, and keep
                track of what they’ve applied to — all in one place.
                <br />
                <span className="text-white/50">
                  Starting with{" "}
                  <span className="text-[#FF4D5A] font-semibold drop-shadow-[0_0_12px_rgba(255,77,90,0.55)]">
                    McGill
                  </span>
                  , expanding to more universities next.
                </span>
              </p>

              <div
                className={[
                  "mt-10 flex flex-col sm:flex-row items-center justify-center gap-4",
                  "transition-all duration-700 delay-300",
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
                ].join(" ")}
              >
                <button
                  onClick={onGetStarted}
                  className="group inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] font-semibold shadow-[0_0_30px_rgba(0,191,255,0.55)] hover:shadow-[0_0_48px_rgba(0,191,255,0.85)] transition-all duration-300 hover:-translate-y-1"
                >
                  Start Vybin
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  onClick={() => scrollToId("features")}
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 transition"
                >
                  See features <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              <div
                className={[
                  "mt-4 text-xs text-white/45",
                  "transition-all duration-700 delay-500",
                  mounted ? "opacity-100" : "opacity-0",
                ].join(" ")}
              >
                Sign in with Google or email. No spam.
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Discover. Connect.{" "}
                <span className="text-[#00BFFF] drop-shadow-[0_0_18px_rgba(0,191,255,0.65)]">
                  Vybe
                </span>
                .
              </h2>
              <p className="mx-auto mt-3 max-w-4xl text-sm text-white/60 sm:text-base md:whitespace-nowrap">
                A clean experience that helps you discover events, stay organized, and actually show up.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "Personalized Feed", desc: "Pick your interests once and see relevant events first." },
                { title: "Save & Track", desc: "Bookmark events and keep a list of what you applied to." },
                { title: "Fast, Minimal, Clean", desc: "A UI that’s actually usable on desktop and mobile." },
              ].map((f) => (
                <div key={f.title} className="group relative">
                  <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-[#00BFFF]/55 to-[#4C6EF5]/55 opacity-0 blur-xl transition duration-500 group-hover:opacity-100" />

                  <div className="relative h-full rounded-2xl border border-[#00BFFF]/22 bg-[#071A2A]/55 backdrop-blur-md p-6 shadow-[0_0_35px_rgba(0,191,255,0.10)] hover:shadow-[0_0_45px_rgba(0,191,255,0.18)] transition duration-300 group-hover:bg-[#071A2A]/70 group-hover:-translate-y-1">
                    <div className="flex flex-col items-center justify-center text-center gap-2">
                      {/* CHANGED: titles -> light neon pink */}
                      <h3 className="text-lg font-semibold text-[#FF7AD9] drop-shadow-[0_0_16px_rgba(255,122,217,0.8)]">
                        {f.title}
                      </h3>

                      <p className="text-white/65 text-sm md:whitespace-nowrap">{f.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="mx-auto max-w-6xl">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-8">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-28 right-10 w-[420px] h-[420px] bg-[#00BFFF]/10 rounded-full blur-[120px]" />
                <div className="absolute -bottom-40 left-10 w-[520px] h-[520px] bg-[#4C6EF5]/10 rounded-full blur-[140px]" />
              </div>

              <div className="relative">
                <h3 className="text-2xl font-semibold mb-4">How it works</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { n: "1", t: "Sign in", d: "Google or email — takes seconds." },
                    { n: "2", t: "Choose interests", d: "Tell Vybin what you’re into once." },
                    { n: "3", t: "Discover + track", d: "Browse, save, and apply — all in one place." },
                  ].map((s) => (
                    <div
                      key={s.n}
                      className={[
                        "rounded-2xl border border-white/10 p-6 transition",
                        // CHANGED: Step 1 -> bright light neon red, Step 2 unchanged green, Step 3 -> brighter light neon yellow
                        s.n === "1"
                          ? "bg-[#FF4D6D] shadow-[0_0_45px_rgba(255,77,109,0.40)] hover:shadow-[0_0_60px_rgba(255,77,109,0.52)]"
                          : s.n === "2"
                          ? "bg-[#39FF14] shadow-[0_0_40px_rgba(57,255,20,0.35)] hover:shadow-[0_0_55px_rgba(57,255,20,0.45)]"
                          : "bg-[#FFF36B] shadow-[0_0_45px_rgba(255,243,107,0.40)] hover:shadow-[0_0_60px_rgba(255,243,107,0.52)]",
                      ].join(" ")}
                    >
                      <div className="text-sm text-[#0B0C10]/80 mb-2 font-medium">Step {s.n}</div>
                      <div className="text-lg font-extrabold text-[#0B0C10] mb-1">{s.t}</div>
                      <div className="text-sm text-[#0B0C10]/80">{s.d}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LAUNCH */}
        <section id="launch" className="scroll-mt-24 px-4 pb-20 sm:px-6 sm:pb-24">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md sm:p-8">
              <h3 className="text-2xl font-semibold mb-2">Launch</h3>
              <p className="text-white/60">
                We’re starting with{" "}
                <span className="text-[#FF4D5A] font-semibold drop-shadow-[0_0_12px_rgba(255,77,90,0.55)]">
                  McGill
                </span>{" "}
                as our first school, then expanding to more universities.
              </p>
            </div>
          </div>
        </section>

        {/* FINAL CTA / FOOTER-LIKE SECTION */}
        <section className="px-4 pb-16 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="text-center py-16 border-t border-white/10">
              <p className="text-lg md:text-xl font-semibold text-white/85 mb-4">
                Built by a computer engineer — so you can stop searching and start{" "}
                <span className="text-[#00BFFF] font-semibold">vybin’</span>.
              </p>

              <p className="text-white/60 max-w-3xl mx-auto">
                I made Vybin because I was tired of missing events, losing track of applications, and
                wasting time searching everywhere. So I built the tool I wished existed.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={onGetStarted}
                  className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] font-semibold shadow-[0_0_30px_rgba(0,191,255,0.6)] hover:shadow-[0_0_52px_rgba(0,191,255,0.9)] transition-all duration-300 hover:-translate-y-1"
                >
                  Start Vybin
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>

                <a
                  href="https://www.instagram.com/wearevybin/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-4 border border-white/10 bg-white/5 text-white/75 hover:text-white hover:bg-white/10 transition"
                >
                  <Instagram className="w-5 h-5" />
                  Follow @wearevybin
                </a>
              </div>

              <div className="mt-8 text-sm text-white/45">
                {year} © Vybin — <span className="text-white/60">Discover. Connect. Vybe.</span>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
