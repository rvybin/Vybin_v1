import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Settings,
  LogOut,
  Upload,
  Trash2,
  Eye,
  Bell,
  X,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
const MCGILL_RED = "#ED1B2F";
const LIGHT_BG = "#F6F7F9";

interface ProfileTabProps {
  onEditPreferences: () => void;
}

function dedupeNotifications<T extends { user_id?: string; title?: string | null; body?: string | null; url?: string | null }>(
  rows: T[]
) {
  const seen = new Set<string>();

  return rows.filter((row) => {
    const key = [
      row.user_id ?? "",
      row.title ?? "",
      row.body ?? "",
      row.url ?? "",
    ].join("::");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function ProfileTab({ onEditPreferences }: ProfileTabProps) {
  const { user, signOut: contextSignOut } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showSettings, setShowSettings] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const settingsRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load cached avatar for faster UI
  useEffect(() => {
    if (!user) return;
    const cachedAvatar = localStorage.getItem(`avatar_url_${user.id}`);
    if (cachedAvatar) {
      setProfile((prev: any) => ({ ...prev, avatar_url: cachedAvatar }));
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([loadProfile(), loadNotifications()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false);
      if (cameraRef.current && !cameraRef.current.contains(e.target as Node)) setShowCameraMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, banner_url")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error loading profile:", error.message);
      return;
    }

    // Auto-create missing profile
    if (!data) {
      const fallbackName = user.email?.split("@")[0] ?? "User";
      const { error: insertError } = await supabase.from("profiles").insert([{ id: user.id, display_name: fallbackName }]);
      if (insertError) console.error("Error creating profile:", insertError.message);
      setProfile({ display_name: fallbackName, avatar_url: null, banner_url: null });
      return;
    }

    setProfile(data);
    if (data.avatar_url) localStorage.setItem(`avatar_url_${user.id}`, data.avatar_url);
  };

  const loadNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, title, body, url, created_at, read")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error.message);
      return;
    }

    setNotifications(dedupeNotifications(data || []));
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !user) return;

      setUploading(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = pub.publicUrl;

      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      if (updateError) throw updateError;

      setProfile((p: any) => ({ ...p, avatar_url: publicUrl }));
      localStorage.setItem(`avatar_url_${user.id}`, publicUrl);

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 1200);
    } catch (err) {
      console.error(err);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setShowCameraMenu(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    try {
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      if (error) throw error;

      setProfile((p: any) => ({ ...p, avatar_url: null }));
      localStorage.removeItem(`avatar_url_${user.id}`);
      setShowCameraMenu(false);
      setShowAvatarModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to remove photo.");
    }
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      if (contextSignOut) await contextSignOut();
      window.location.reload();
    } catch (err) {
      console.error("Sign out error:", err);
      alert("Failed to sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  const avatarSrc =
    profile?.avatar_url ||
    localStorage.getItem(`avatar_url_${user?.id}`) ||
    DEFAULT_AVATAR;

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "User";

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: LIGHT_BG }}>
      {/* Header card */}
      <div className="px-5 pt-6 pb-5">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: MCGILL_RED }}>
                Profile
              </h1>
              <p className="text-sm sm:text-base text-black/60 mt-1">Your account & notifications</p>
              <div className="mt-4 h-[2px] w-24 rounded-full" style={{ background: MCGILL_RED }} />
            </div>

            {/* Settings dropdown */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings((p) => !p)}
                className="p-2 rounded-xl border border-black/10 bg-white hover:bg-black/5 transition"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" style={{ color: "rgba(0,0,0,0.65)" }} />
              </button>

              {showSettings && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-black/10 rounded-xl shadow-lg overflow-hidden z-50">
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="w-full text-left px-3 py-2.5 flex items-center gap-2 text-sm hover:bg-red-500/5 text-red-600 transition disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" />
                    {signingOut ? "Signing out..." : "Sign Out"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Profile summary card */}
          <div className="mt-4 bg-white rounded-2xl border border-black/5 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative" ref={cameraRef}>
                  <img
                    src={avatarSrc}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border border-black/10 shadow-sm"
                  />

                  {uploadSuccess && (
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 border border-black/10 shadow-sm">
                      <CheckCircle2 className="w-5 h-5" style={{ color: "#10B981" }} />
                    </div>
                  )}

                  <button
                    onClick={() => setShowCameraMenu((p) => !p)}
                    disabled={uploading}
                    className="absolute -bottom-2 -right-2 p-2 rounded-full border border-black/10 bg-white hover:bg-black/5 transition disabled:opacity-50"
                    title="Change photo"
                  >
                    <Camera className="w-4 h-4" style={{ color: "rgba(0,0,0,0.65)" }} />
                  </button>

                  {showCameraMenu && (
                    <div className="absolute top-[88px] left-0 w-52 bg-white border border-black/10 rounded-xl shadow-lg overflow-hidden z-50 text-[13px]">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-black/5 transition text-black/80"
                      >
                        <Upload className="w-4 h-4" style={{ color: MCGILL_RED }} />
                        Upload Photo
                      </button>

                      <button
                        onClick={() => {
                          setShowAvatarModal(true);
                          setShowCameraMenu(false);
                        }}
                        className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-black/5 transition text-black/80"
                      >
                        <Eye className="w-4 h-4" style={{ color: MCGILL_RED }} />
                        View Photo
                      </button>

                      <button
                        onClick={handleRemoveAvatar}
                        className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-red-500/5 text-red-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove Photo
                      </button>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                <div>
                  <h2 className="text-xl font-extrabold text-black leading-tight">{displayName}</h2>
                  <p className="text-sm text-black/60">Signed in as {user?.email ?? "—"}</p>
                </div>
              </div>

              <button
                onClick={onEditPreferences}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-black/15 bg-white transition hover:text-white flex items-center justify-center gap-2"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = MCGILL_RED;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = MCGILL_RED;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "white";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,0,0,0.15)";
                }}
              >
                <Settings className="w-4 h-4" />
                Edit Preferences
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="px-5 pb-10">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" style={{ color: MCGILL_RED }} />
                <h3 className="text-lg font-extrabold text-black">Notifications</h3>
              </div>
              {loading && <span className="text-sm text-black/50">Loading…</span>}
            </div>

            <div className="border-t border-black/5">
              {!notifications.length ? (
                <div className="p-8 text-center text-black/60">No new notifications</div>
              ) : (
                <div className="divide-y divide-black/5">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      className={`w-full text-left p-5 transition hover:bg-black/5 ${
                        n.read ? "" : "bg-red-50"
                      }`}
                      onClick={() => n.url && window.open(n.url, "_blank")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-black">{n.title}</p>
                          {n.body && <p className="text-sm text-black/60 mt-1">{n.body}</p>}
                        </div>
                        {!n.read && (
                          <span
                            className="text-[11px] font-bold px-2 py-1 rounded-full border"
                            style={{ color: MCGILL_RED, borderColor: "rgba(237,27,47,0.35)", background: "rgba(237,27,47,0.08)" }}
                          >
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-black/45 mt-2">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Avatar modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <button
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAvatarModal(false)}
            aria-label="Close"
          />
          <div
            className="relative bg-white rounded-3xl shadow-2xl border border-black/10 p-4 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAvatarModal(false)}
              className="absolute top-3 right-3 p-2 rounded-full border border-black/10 bg-white hover:bg-black/5 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={avatarSrc}
              alt="Profile zoom"
              className="w-full aspect-square object-cover rounded-2xl border border-black/10"
            />

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold border border-black/15 bg-white transition hover:text-white"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = MCGILL_RED;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = MCGILL_RED;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "white";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,0,0,0.15)";
                }}
              >
                Upload
              </button>

              <button
                onClick={handleRemoveAvatar}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-black/15 bg-white text-red-600 hover:bg-red-50 transition"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
