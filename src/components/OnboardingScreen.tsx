import { useState, useEffect, useMemo } from "react";
import { ChevronRight, Check } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface Interest {
  id: string;
  name: string;
  icon: string;
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

const MCGILL_RED = "#ED1B2F";
const LIGHT_BG = "#F6F7F9";
const FALLBACK_INTERESTS: Interest[] = [
  { id: "wellness-mental-health", name: "Wellness & Mental Health", icon: "heart" },
  { id: "career-professional-development", name: "Career & Professional Development", icon: "briefcase" },
  { id: "workshops-skill-building", name: "Workshops & Skill Building", icon: "brain" },
  { id: "social-community-events", name: "Social & Community Events", icon: "megaphone" },
  { id: "arts-creative-activities", name: "Arts & Creative Activities", icon: "palette" },
  { id: "academic-support-research", name: "Academic Support & Research", icon: "graduation-cap" },
  { id: "international-student-services", name: "International Student Services", icon: "cog" },
  { id: "leadership-personal-growth", name: "Leadership & Personal Growth", icon: "rocket" },
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [interestWarning, setInterestWarning] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    loadInterestsAndPrefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadInterestsAndPrefs = async () => {
    if (!user) return; // ✅ ensures user is non-null in this function

    try {
      const [{ data: allInterests }, { data: prefs }] = await Promise.all([
        supabase.from("interests").select("*").order("name"),
        supabase.from("user_preferences").select("interest_name").eq("user_id", user.id), // ✅ fixed
      ]);

      setInterests((allInterests ?? []) as Interest[]); // ✅ fixed

      if (prefs && prefs.length > 0 && allInterests?.length) {
        const matchedIds = allInterests
          .filter((i: any) =>
            prefs.some(
              (p: any) =>
                (p.interest_name ?? "").trim().toLowerCase() === (i.name ?? "").trim().toLowerCase()
            )
          )
          .map((i: any) => i.id);

        setSelectedInterests(new Set(matchedIds));
      }
    } catch (error) {
      console.error("Error loading interests or prefs:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests((prev) => {
      const next = new Set(prev);
      if (next.has(interestId)) next.delete(interestId);
      else next.add(interestId);
      return next;
    });
  };

  const selectedCount = selectedInterests.size;

  const handleComplete = async () => {
    if (selectedCount === 0 || !user) return;

    try {
      setSaving(true);

      const selectedInterestNames = Array.from(selectedInterests)
        .map((id) => interests.find((i) => i.id === id)?.name)
        .filter(Boolean) as string[];

      // Replace instead of append
      await supabase.from("user_preferences").delete().eq("user_id", user.id);

      const rows = selectedInterestNames.map((name) => ({
        user_id: user.id,
        interest_name: name,
      }));

      if (rows.length) {
        const { error } = await supabase.from("user_preferences").insert(rows);
        if (error) throw error;
      }

      await supabase.from("profiles").update({ onboarded: true }).eq("id", user.id);

      onComplete();
    } catch (error) {
      console.error("Error saving interests:", error);
    } finally {
      setSaving(false);
    }
  };

  const sortedInterests = useMemo(() => interests, [interests]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: LIGHT_BG }}>
        <div className="text-black/70">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: LIGHT_BG }}>
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Header */}
        <div className="px-5 pt-6 pb-5">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: MCGILL_RED }}>
                What are you interested in?
              </h1>
              <p className="text-sm sm:text-base text-black/60 mt-1">
                Select at least one topic to personalize your feed
              </p>
              <div className="mt-4 h-[2px] w-24 rounded-full" style={{ background: MCGILL_RED }} />
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="px-5 pb-8">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sortedInterests.map((interest) => {
                const isSelected = selectedInterests.has(interest.id);

                return (
                  <button
                    key={interest.id}
                    onClick={() => toggleInterest(interest.id)}
                    className={`relative rounded-2xl p-4 border transition text-left bg-white hover:bg-black/5 ${
                      isSelected ? "shadow-sm" : ""
                    }`}
                    style={{
                      borderColor: isSelected ? "rgba(237,27,47,0.45)" : "rgba(0,0,0,0.10)",
                      outline: "none",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center border"
                          style={{
                            borderColor: isSelected ? "rgba(237,27,47,0.35)" : "rgba(0,0,0,0.10)",
                            background: isSelected ? "rgba(237,27,47,0.08)" : "rgba(0,0,0,0.02)",
                          }}
                        >
                          <span className="text-xl">{getIcon(interest.icon)}</span>
                        </div>

                        <div className="text-[15px] font-bold text-black">{interest.name}</div>
                      </div>

                      {isSelected && (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center border"
                          style={{ borderColor: "rgba(237,27,47,0.35)", background: "rgba(237,27,47,0.10)" }}
                        >
                          <Check className="w-4 h-4" style={{ color: MCGILL_RED }} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-black/10">
        <div className="mx-auto max-w-5xl px-5 py-4">
          <button
            onClick={handleComplete}
            disabled={selectedCount === 0 || saving}
            className="w-full rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: MCGILL_RED }}
          >
            {saving ? (
              "Saving…"
            ) : (
              <>
                Continue <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-black/50 mt-2">{selectedCount} selected</p>
        </div>
      </div>
    </div>
  );
}

function getIcon(iconName: string): string {
  const iconMap: Record<string, string> = {
    laptop: "💻",
    briefcase: "💼",
    palette: "🎨",
    megaphone: "📣",
    cog: "⚙️",
    brain: "🧠",
    rocket: "🚀",
    "dollar-sign": "💰",
    heart: "❤️",
    "graduation-cap": "🎓",
  };
  return iconMap[iconName] || "✨";
}
