import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Upload,
  Trash2,
  Eye,
  Bell,
  X,
  CheckCircle2,
  Settings,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { openPremiumCheckout } from "../lib/billing";

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
const MCGILL_RED = "#ED1B2F";
const LIGHT_BG = "#F6F7F9";
const SUPPORTED_NOTIFICATION_TYPES = new Set(["interest_match", "saved_reminder"]);

interface ProfileTabProps {
  onEditPreferences: () => void;
}

interface NotificationRow {
  id: string;
  user_id: string;
  event_id: string | null;
  title: string | null;
  body: string | null;
  url: string | null;
  created_at: string | null;
  read: boolean | null;
  type: string | null;
}

interface PreferenceRow {
  interest_name: string | null;
}

function dedupeNotifications(rows: NotificationRow[]) {
  const seen = new Set<string>();

  return rows.filter((row) => {
    const key = [row.user_id, row.type ?? "", row.title ?? "", row.body ?? "", row.url ?? ""].join("::");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function ProfileTab({ onEditPreferences }: ProfileTabProps) {
  const { user } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const cameraRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    Promise.all([loadProfile(), loadNotifications(), loadPreferences()]).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cameraRef.current && !cameraRef.current.contains(e.target as Node)) setShowCameraMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadPreferences = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("user_preferences")
      .select("interest_name")
      .eq("user_id", user.id)
      .order("interest_name");

    if (error) {
      console.error("Error loading preferences:", error.message);
      return;
    }

    setPreferences(
      (data ?? [])
        .map((row) => (row as PreferenceRow).interest_name?.trim())
        .filter((value): value is string => Boolean(value))
    );
  };

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, banner_url, is_premium")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error loading profile:", error.message);
      return;
    }

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
      .select("id, user_id, event_id, title, body, url, created_at, read, type")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error.message);
      return;
    }

    const fakeNotificationIds = (data ?? [])
      .filter((notification) => (notification.body ?? "").trim() === "AI Career Networking Panel")
      .map((notification) => notification.id);

    if (fakeNotificationIds.length) {
      const { error: cleanupError } = await supabase.from("notifications").delete().in("id", fakeNotificationIds);
      if (cleanupError) {
        console.error("Failed to clean fake notifications:", cleanupError.message);
      }
    }

    const filtered = (data ?? []).filter((notification) => {
      if (!SUPPORTED_NOTIFICATION_TYPES.has(notification.type ?? "")) return false;
      if ((notification.body ?? "").trim() === "AI Career Networking Panel") return false;
      return true;
    });
    setNotifications(dedupeNotifications(filtered as NotificationRow[]));
  };

  const handleDeleteNotification = async (notificationId: string) => {
    const target = notifications.find((notification) => notification.id === notificationId);
    if (!target || !user) return;

    const previous = notifications;
    setNotifications((current) =>
      current.filter((notification) => {
        const sameSignature =
          notification.user_id === target.user_id &&
          (notification.type ?? "") === (target.type ?? "") &&
          (notification.title ?? "") === (target.title ?? "") &&
          (notification.body ?? "") === (target.body ?? "") &&
          (notification.url ?? "") === (target.url ?? "");

        const sameEvent = target.event_id
          ? notification.user_id === target.user_id &&
            (notification.event_id ?? "") === target.event_id &&
            (notification.type ?? "") === (target.type ?? "")
          : false;

        return !(sameSignature || sameEvent);
      })
    );

    let query = supabase.from("notifications").delete().eq("user_id", target.user_id);

    if (target.event_id) {
      query = query.eq("event_id", target.event_id).eq("type", target.type ?? "");
    } else {
      query = query
        .eq("type", target.type ?? "")
        .eq("title", target.title ?? "")
        .eq("body", target.body ?? "")
        .eq("url", target.url ?? "");
    }

    const { error } = await query;
    if (error) {
      console.error("Failed to delete notification:", error.message);
      setNotifications(previous);
    }
  };

  const formatNotificationTimestamp = (value: string | null) => {
    if (!value) return "";

    return new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
      .format(new Date(value))
      .replace(" AM", "am")
      .replace(" PM", "pm");
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

  const avatarSrc =
    profile?.avatar_url ||
    localStorage.getItem(`avatar_url_${user?.id}`) ||
    DEFAULT_AVATAR;

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "User";

  return (
    <div className="flex-1 overflow-x-hidden overflow-y-auto pb-24" style={{ background: LIGHT_BG }}>
      <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-6">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: MCGILL_RED }}>
              Profile
            </h1>
            <p className="text-sm sm:text-base text-black/60 mt-1">Your account & notifications</p>
            <div className="mt-4 h-[2px] w-24 rounded-full" style={{ background: MCGILL_RED }} />
          </div>

          {/* Premium card */}
          <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
            {profile?.is_premium ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
                      ✦ Vybin Premium
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-black/50">You have access to all premium features.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-black">Upgrade to Premium</p>
                  <p className="mt-0.5 text-sm text-black/50">
                    Unlock the class schedule planner and AI assistant — $10/month.
                  </p>
                </div>
                <button
                  onClick={openPremiumCheckout}
                  className="flex-shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ background: MCGILL_RED }}
                >
                  Upgrade — $10/mo
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
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

                <div className="min-w-0">
                  <h2 className="break-words text-xl font-extrabold leading-tight text-black">{displayName}</h2>
                  <p className="break-all text-sm text-black/60">Signed in as {user?.email ?? "-"}</p>
                </div>
              </div>

              <button
                onClick={onEditPreferences}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-black/15 bg-white transition hover:text-white flex items-center justify-center gap-2"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = MCGILL_RED;
                  e.currentTarget.style.borderColor = MCGILL_RED;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.borderColor = "rgba(0,0,0,0.15)";
                }}
              >
                <Settings className="w-4 h-4" />
                Edit Preferences
              </button>
            </div>

            <div className="mt-5 border-t border-black/5 pt-5">
              <h3 className="text-sm font-bold text-black">Current preferences</h3>
              <p className="mt-1 text-sm text-black/55">These are the interests currently shaping your feed.</p>

              {preferences.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {preferences.map((preference) => (
                    <span
                      key={preference}
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                    >
                      {preference}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-black/55">
                  No preferences selected yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-10 sm:px-5">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" style={{ color: MCGILL_RED }} />
                <h3 className="text-lg font-extrabold text-black">Notifications</h3>
              </div>
              {loading && <span className="text-sm text-black/50">Loading...</span>}
            </div>

            <div className="border-t border-black/5">
              {!notifications.length ? (
                <div className="p-8 text-center text-black/60">No new notifications</div>
              ) : (
                <div className="divide-y divide-black/5">
                  {notifications.map((notification) => (
                    <div key={notification.id} className={`p-4 transition sm:p-5 ${notification.read ? "" : "bg-red-50"}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <button
                          className="min-w-0 flex-1 text-left"
                          onClick={() => notification.url && window.open(notification.url, "_blank", "noopener,noreferrer")}
                          disabled={!notification.url}
                        >
                          <p className="break-words font-bold text-black">{notification.title}</p>
                          {notification.body ? <p className="mt-1 break-words text-sm text-black/60">{notification.body}</p> : null}
                          <p className="mt-2 text-xs text-black/45">{formatNotificationTimestamp(notification.created_at)}</p>
                        </button>

                        <div className="flex items-center justify-end gap-2 sm:justify-start">
                          {!notification.read ? (
                            <span
                              className="text-[11px] font-bold px-2 py-1 rounded-full border"
                              style={{
                                color: MCGILL_RED,
                                borderColor: "rgba(237,27,47,0.35)",
                                background: "rgba(237,27,47,0.08)",
                              }}
                            >
                              New
                            </span>
                          ) : null}

                          <button
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="p-2 rounded-full border border-black/10 bg-white hover:bg-black/5 transition"
                            aria-label="Dismiss notification"
                          >
                            <X className="w-4 h-4 text-black/60" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
                  e.currentTarget.style.background = MCGILL_RED;
                  e.currentTarget.style.borderColor = MCGILL_RED;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.borderColor = "rgba(0,0,0,0.15)";
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
