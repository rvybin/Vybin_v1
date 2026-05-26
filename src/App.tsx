import { useEffect, useRef, useState } from "react";
import { Route, Routes, useNavigate, useLocation } from "react-router-dom";
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
import { AssistantTab } from "./components/AssistantTab";
import { supabase } from "./lib/supabase";
import { registerServiceWorker } from "./lib/pushNotifications";
import { CursorGlow } from "./components/CursorGlow";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";

const MCGILL_RED = "#ED1B2F";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center text-[#6E6E73]">
      Loading…
    </div>
  );
}

function LandingRoute() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromApp = (location.state as { fromApp?: boolean } | null)?.fromApp === true;

  useEffect(() => {
    if (!loading && user && !fromApp) {
      navigate("/app", { replace: true });
    }
  }, [user, loading, fromApp, navigate]);

  if (loading) return <LoadingScreen />;
  if (user && !fromApp) return null;

  return (
    <LandingPage
      onGetStarted={() => navigate("/login")}
      isLoggedIn={!!user}
      onOpenApp={() => navigate("/app")}
    />
  );
}

function LoginRoute() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/app", { replace: true });
  }, [user, loading, navigate]);

  if (loading) return <LoadingScreen />;
  if (user) return null;
  return <LoginScreen />;
}

function MainApp() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const onboardingChecked = useRef(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [mountedTabs, setMountedTabs] = useState<Set<Tab>>(new Set(["feed"]));
  const [navAvatarUrl, setNavAvatarUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) navigate("/", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && !authLoading && !onboardingChecked.current) {
      onboardingChecked.current = true;
      checkOnboardingStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (!user) { setNavAvatarUrl(null); return; }
    const cached = localStorage.getItem(`avatar_url_${user.id}`);
    if (cached) setNavAvatarUrl(cached);
    supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => {
      const url = data?.avatar_url ?? null;
      setNavAvatarUrl(url);
      if (url) localStorage.setItem(`avatar_url_${user.id}`, url);
    });
  }, [user]);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    const SUPPORTED = ["interest_match", "saved_reminder"];
    const clearedAt = localStorage.getItem(`vybin_notifs_cleared_${user.id}`);

    supabase
      .from("notifications")
      .select("id, type, created_at", { count: "exact" })
      .eq("user_id", user.id)
      .eq("read", false)
      .in("type", SUPPORTED)
      .then(({ data }) => {
        const filtered = (data ?? []).filter(
          (n) => !clearedAt || !n.created_at || n.created_at > clearedAt
        );
        setUnreadCount(filtered.length);
      });
  }, [user]);

  const handleTabChange = (tab: Tab) => {
    setMountedTabs((prev) => new Set([...prev, tab]));
    setActiveTab(tab);
  };

  const checkOnboardingStatus = async () => {
    if (!user) return;
    setCheckingOnboarding(true);
    try {
      const [{ data: profile }, { count }] = await Promise.all([
        supabase.from("profiles").select("onboarded").eq("id", user.id).maybeSingle(),
        supabase.from("user_preferences").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      // Treat as onboarded if the flag is set OR they already have preferences saved
      setIsOnboarded((profile as any)?.onboarded === true || (count ?? 0) > 0);
    } catch {
      setIsOnboarded(false);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  const handleEditPreferences = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ onboarded: false }).eq("id", user.id);
    setIsOnboarded(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  const tabLabelMap: Record<Tab, string> = {
    feed: "Feed",
    applications: "Applications",
    calendar: "Schedule",
    assistant: "AI Assistant",
    saved: "Saved",
    profile: "Profile",
  };

  if (authLoading || checkingOnboarding) return <LoadingScreen />;
  if (!user) return null;

  if (!isOnboarded) {
    return <OnboardingScreen onComplete={() => setIsOnboarded(true)} />;
  }

  const navAvatar = navAvatarUrl || localStorage.getItem(`avatar_url_${user.id}`);
  const tabs: Tab[] = ["feed", "applications", "calendar", "assistant", "saved", "profile"];
  const tabDisplayName = (t: Tab) => t === "assistant" ? "AI" : tabLabelMap[t];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F6F7F9] text-black">
      {/* Desktop TopNav */}
      <div className="hidden md:block fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl blur-2xl opacity-50" style={{ background: MCGILL_RED }} />
            <div
              className="relative flex items-center justify-between rounded-2xl border border-white/20 backdrop-blur-xl px-5 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
              style={{ background: "rgba(237,27,47,0.75)" }}
            >
              <button onClick={() => navigate("/", { state: { fromApp: true } })} className="flex items-center gap-2 select-none" title="Back to homepage">
                <span className="text-2xl font-extrabold tracking-tight text-white">
                  vyb<span className="opacity-90">in</span>
                </span>
              </button>

              <div className="flex items-center gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={[
                      "px-4 py-2 rounded-xl text-sm font-semibold transition -translate-y-[1px]",
                      activeTab === tab
                        ? "text-[#333333] bg-white"
                        : "text-[#333333]/80 hover:text-white hover:bg-white/60",
                    ].join(" ")}
                  >
                    {tabDisplayName(tab)}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                {navAvatar && (
                  <img src={navAvatar} alt="Profile" className="h-9 w-9 rounded-full border border-white/25 object-cover" />
                )}
                <button onClick={handleSignOut} className="text-sm font-semibold text-white/90 hover:text-white transition">
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="fixed left-0 right-0 top-0 z-[60] border-b border-black/10 bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <button onClick={() => navigate("/", { state: { fromApp: true } })} className="flex items-center gap-2 select-none" title="Back to homepage">
            <span className="text-xl font-extrabold tracking-tight" style={{ color: MCGILL_RED }}>
              vyb<span className="opacity-90">in</span>
            </span>
          </button>
          <div className="text-sm font-semibold text-black/75">{tabLabelMap[activeTab]}</div>
          <div className="flex items-center gap-2">
            {navAvatar && (
              <img src={navAvatar} alt="Profile" className="h-9 w-9 rounded-full border border-black/10 object-cover" />
            )}
            <button
              onClick={handleSignOut}
              className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-black/70 transition hover:bg-black/5"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-screen overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-16 md:pb-0 md:pt-24">
        {mountedTabs.has("feed") && <div className={activeTab === "feed" ? "" : "hidden"}><FeedTab /></div>}
        {mountedTabs.has("applications") && <div className={activeTab === "applications" ? "" : "hidden"}><ApplicationsTab /></div>}
        {mountedTabs.has("calendar") && <div className={activeTab === "calendar" ? "" : "hidden"}><CalendarTab /></div>}
        {mountedTabs.has("assistant") && <div className={activeTab === "assistant" ? "" : "hidden"}><AssistantTab /></div>}
        {mountedTabs.has("saved") && <div className={activeTab === "saved" ? "" : "hidden"}><SavedTab /></div>}
        {mountedTabs.has("profile") && <div className={activeTab === "profile" ? "" : "hidden"}><ProfileTab onEditPreferences={handleEditPreferences} /></div>}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} unreadCount={unreadCount} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CursorGlow />
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/app" element={<MainApp />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
