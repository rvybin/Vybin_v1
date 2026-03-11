import { useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

interface LandingProps {
  onGetStarted: () => void;
}

export function SplashScreen({ onGetStarted }: LandingProps) {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  useEffect(() => {
    if (glowRef.current) {
      glowRef.current.style.background = `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(0,191,255,0.16), transparent 62%)`;
    }
  }, [mousePos]);

  const scrollToFeatures = () => {
    const el = document.getElementById("features");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0C10] via-[#11131c] to-[#0B0C10] text-white">
      <div ref={glowRef} className="fixed inset-0 pointer-events-none transition-all duration-700" />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-24 -top-24 h-[520px] w-[520px] rounded-full bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] opacity-10 blur-[130px] animate-blob" />
        <div className="absolute bottom-[-120px] right-[-120px] h-[520px] w-[520px] rounded-full bg-gradient-to-r from-[#4C6EF5] to-[#00BFFF] opacity-10 blur-[130px] animate-blob animation-delay-2000" />
      </div>

      <header className="sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="text-2xl font-extrabold tracking-tight">
                  <span className="text-white">vyb</span>
                  <span className="bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] bg-clip-text text-transparent">in</span>
                </div>
              </div>

              <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
                <button onClick={scrollToFeatures} className="transition hover:text-white">
                  Features
                </button>
                <a href="#how" className="transition hover:text-white">
                  How it works
                </a>
                <a href="#launch" className="transition hover:text-white">
                  Launch
                </a>
              </nav>

              <button
                onClick={onGetStarted}
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-[1px] hover:shadow-[0_0_30px_rgba(0,191,255,0.55)] active:translate-y-0"
              >
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="flex min-h-[calc(100vh-120px)] items-center justify-center">
          <div className="w-full">
            <div className="animate-in fade-in slide-in-from-bottom text-center duration-700">
              <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 backdrop-blur">
                <Sparkles className="h-4 w-4 text-[#00BFFF]" />
                Discover what's happening on campus, fast.
              </div>

              <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl md:text-7xl">
                Find events you'll actually{" "}
                <span className="bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] bg-clip-text text-transparent">
                  care about.
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
                Vybin helps university students discover campus events, save what they like, and keep track of what
                they've applied to, all in one place.
                <span className="text-white/80"> Starting with McGill</span>, expanding to more schools next.
              </p>

              <p className="mt-4 text-sm text-white/60">
                <span className="font-medium text-white/80">Discover.</span>{" "}
                <span className="font-medium text-white/80">Connect.</span>{" "}
                <span className="font-medium text-white/80">Vybe.</span>
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <button
                  onClick={onGetStarted}
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#00BFFF] to-[#4C6EF5] px-7 py-4 text-base font-semibold transition-all hover:-translate-y-[2px] hover:shadow-[0_0_40px_rgba(0,191,255,0.6)] active:translate-y-0"
                >
                  Get Started
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </button>

                <button
                  onClick={scrollToFeatures}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-7 py-4 text-base font-semibold text-white/80 backdrop-blur transition hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  See features
                </button>
              </div>

              <p className="mt-4 text-xs text-white/40">Sign in with Google or email. No spam.</p>
            </div>
          </div>
        </section>

        <section id="features" className="pb-16">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                title: "Personalized Feed",
                desc: "Pick your interests once and see relevant events first.",
              },
              {
                title: "Save & Track",
                desc: "Bookmark events and keep a clean list of what you applied to.",
              },
              {
                title: "Fast, Minimal, Clean",
                desc: "A simple UI that's actually usable on desktop and mobile.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl transition hover:bg-white/7"
              >
                <h3 className="font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-white/60">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="pb-16">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">How it works</h3>
            <ol className="mt-3 space-y-2 text-sm text-white/65">
              <li>1) Sign in (Google or email)</li>
              <li>2) Choose your interests</li>
              <li>3) Browse events, save, and apply, all in one place</li>
            </ol>
          </div>
        </section>

        <section id="launch" className="pb-20">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">Launch</h3>
            <p className="mt-2 text-sm text-white/65">
              We're starting with <span className="font-medium text-white/80">McGill</span> as our first school, then
              expanding to more universities.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
