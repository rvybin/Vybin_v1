import { useState, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LandingPage } from "./components/LandingPage";
import { LoginScreen } from "./components/LoginScreen";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { BottomNav, type Tab } from "./components/BottomNav";
import { FeedTab } from "./components/FeedTab";
import { ApplicationsTab } from "./components/ApplicationsTab";
import { ProfileTab } from "./components/ProfileTab";
import { SavedTab } from "./components/SavedTab";
import { CalendarTab } from "./components/CalendarTab";
import { supabase } from "./lib/supabase";
import { CursorGlow } from "./components/CursorGlow";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";

const MCGILL_RED = "#ED1B2F";

function AppContent() {
  const { user, loading: authLoading } = useAuth();

  const [showAuth, setShowAuth] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("feed");

  useEffect(() => {
    if (!user) setShowAuth(false);
  }, [user]);

  useEffect(() => {
    if (user && !authLoading) checkOnboardingStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const checkOnboardingStatus = async () => {
    if (!user) return;
    setCheckingOnboarding(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", user.id)
        .maybeSingle();

      setIsOnboarded(profile?.onboarded === true);
    } catch {
      setIsOnboarded(false);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  const handleOnboardingComplete = () => setIsOnboarded(true);

  const handleEditPreferences = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ onboarded: false }).eq("id", user.id);
    setIsOnboarded(false);
  };

  const showNav = !authLoading && !checkingOnboarding && !!user && isOnboarded;

  if (authLoading) {
    return <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center text-white/70">Loading…</div>;
  }

  if (!user) {
    return showAuth ? <LoginScreen /> : <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  if (checkingOnboarding) {
    return <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center text-white/70">Loading…</div>;
  }

  if (!isOnboarded) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // Desktop TopNav
  const TopNav = () => {
    const tabBtn = (tab: Tab, label: string) => {
      const active = activeTab === tab;
      return (
        <button
          onClick={() => setActiveTab(tab)}
          className={[
            "px-4 py-2 rounded-xl text-sm font-semibold transition -translate-y-[1px]",
            active ? "text-[#333333] bg-white" : "text-[#333333]/80 hover:text-white hover:bg-white/60",
          ].join(" ")}
        >
          {label}
        </button>
      );
    };

    return (
      <div className="hidden md:block fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="relative">
            {/* glow */}
            <div className="absolute inset-0 rounded-2xl blur-2xl opacity-50" style={{ background: MCGILL_RED }} />

            <div
              className="relative flex items-center justify-between rounded-2xl border border-white/20 backdrop-blur-xl px-5 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
              style={{ background: "rgba(237,27,47,0.75)" }}
            >
              {/* Logo */}
              <button onClick={() => setActiveTab("feed")} className="flex items-center gap-2 select-none">
                <span className="text-2xl font-extrabold tracking-tight text-white">
                  vyb<span className="opacity-90">in</span>
                </span>
              </button>

              {/* Tabs */}
              <div className="flex items-center gap-2">
                {tabBtn("feed", "Feed")}
                {tabBtn("applications", "Applications")}
                {tabBtn("calendar", "Calendar")}
                {tabBtn("saved", "Saved")}
                {tabBtn("profile", "Profile")}
              </div>

              {/* Sign out */}
              <button onClick={() => supabase.auth.signOut()} className="text-sm font-semibold text-white/90 hover:text-white transition">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-black">
      {showNav && <TopNav />}

      <div className="min-h-screen pb-24 md:pb-0 pt-0 md:pt-24">
        {activeTab === "feed" && <FeedTab />}
        {activeTab === "applications" && <ApplicationsTab />}
        {activeTab === "calendar" && <CalendarTab />}
        {activeTab === "saved" && <SavedTab />}
        {activeTab === "profile" && <ProfileTab onEditPreferences={handleEditPreferences} />}
      </div>

      {showNav && <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CursorGlow />
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
