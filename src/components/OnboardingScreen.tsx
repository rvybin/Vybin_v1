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
  }, [user]);

  const loadInterestsAndPrefs = async () => {
    if (!user) return;

    try {
      const [{ data: allInterests, error: interestsError }, { data: prefs, error: prefsError }] = await Promise.all([
        supabase.from("interests").select("*").order("name"),
        supabase.from("user_preferences").select("interest_name").eq("user_id", user.id),
      ]);

      if (interestsError) throw interestsError;
      if (prefsError) throw prefsError;

      const availableInterests = ((allInterests?.length ? allInterests : FALLBACK_INTERESTS) ?? []) as Interest[];
      setInterests(availableInterests);
      setInterestWarning(
        allInterests?.length
          ? ""
          : "Interest options were missing from the database, so fallback options are being shown until the seed SQL is applied."
      );

      if (prefs && prefs.length > 0 && availableInterests.length) {
        const matchedIds = availableInterests
          .filter((interest) =>
            prefs.some(
              (pref: any) =>
                (pref.interest_name ?? "").trim().toLowerCase() === (interest.name ?? "").trim().toLowerCase()
            )
          )
          .map((interest) => interest.id);

        setSelectedInterests(new Set(matchedIds));
      }
    } catch (error) {
      console.error("Error loading interests or prefs:", error);
      setInterests(FALLBACK_INTERESTS);
      setInterestWarning("Failed to load interests from the database, so fallback options are being shown.");
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
        .map((id) => interests.find((interest) => interest.id === id)?.name)
        .filter(Boolean) as string[];

      await supabase.from("user_preferences").delete().eq("user_id", user.id);

      const rows = selectedInterestNames.map((name) => ({
        user_id: user.id,
        interest_name: name,
      }));

      if (rows.length) {
        const { error } = await supabase.from("user_preferences").insert(rows);
        if (error) throw error;
      }

      const { error: profileError } = await supabase.from("profiles").update({ onboarded: true }).eq("id", user.id);
      if (profileError) throw profileError;

      onComplete();
    } catch (error) {
      console.error("Error saving interests:", error);
      setInterestWarning("Failed to save interests. Apply the latest interests seed SQL, then try again.");
    } finally {
      setSaving(false);
    }
  };

  const sortedInterests = useMemo(() => interests, [interests]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: LIGHT_BG }}>
        <div className="text-black/70">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden" style={{ background: LIGHT_BG }}>
      <div className="flex-1 overflow-y-auto pb-32 sm:pb-28">
        <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-6">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
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

        <div className="px-4 pb-6 sm:px-5 sm:pb-8">
          <div className="max-w-5xl mx-auto">
            {interestWarning ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {interestWarning}
              </div>
            ) : null}

            {sortedInterests.length ? (
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
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center border"
                            style={{
                              borderColor: isSelected ? "rgba(237,27,47,0.35)" : "rgba(0,0,0,0.10)",
                              background: isSelected ? "rgba(237,27,47,0.08)" : "rgba(0,0,0,0.02)",
                            }}
                          >
                            <span className="text-xl">{getIcon(interest.icon)}</span>
                          </div>

                          <div className="min-w-0 break-words text-[15px] font-bold text-black">{interest.name}</div>
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
            ) : (
              <div className="rounded-2xl border border-black/10 bg-white px-5 py-6 text-center text-black/60">
                No interests are available right now. Apply the latest interests seed SQL and refresh.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/10 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-5 sm:py-4" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}>
          <button
            onClick={handleComplete}
            disabled={selectedCount === 0 || saving || !sortedInterests.length}
            className="w-full rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: MCGILL_RED }}
          >
            {saving ? (
              "Saving..."
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
