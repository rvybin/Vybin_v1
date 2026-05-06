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

  const unreadCount = notifications.filter((n) => !n.read).length;
  const visibleNotifications = notifications.slice(0, 20);

  const handleClearAllNotifications = async () => {
    if (!user || !notifications.length) return;
    const ids = notifications.map((n) => n.id);
    setNotifications([]);
    await supabase.from("notifications").delete().in("id", ids);
  };

  return (
    <div className="flex-1 overflow-x-hidden overflow-y-auto pb-24" style={{ background: LIGHT_BG }}>
      <div className="mx-auto max-w-2xl space-y-3 px-4 py-4 sm:px-5 sm:py-6">

        {/* Profile card */}
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0" ref={cameraRef}>
              <img
                src={avatarSrc}
                alt="Profile"
                className="h-16 w-16 rounded-full border border-black/10 object-cover shadow-sm"
              />
              {uploadSuccess && (
                <div className="absolute -bottom-1 -right-1 rounded-full border border-black/10 bg-white p-0.5 shadow-sm">
                  <CheckCircle2 className="h-4 w-4" style={{ color: "#10B981" }} />
                </div>
              )}
              <button
                onClick={() => setShowCameraMenu((p) => !p)}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 rounded-full border border-black/10 bg-white p-1.5 transition hover:bg-black/5 disabled:opacity-50"
                title="Change photo"
              >
                <Camera className="h-3 w-3" style={{ color: "rgba(0,0,0,0.6)" }} />
              </button>

              {showCameraMenu && (
                <div className="absolute left-0 top-[72px] z-50 w-48 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg text-[13px]">
                  <button onClick={() => fileInputRef.current?.click()} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-black/80 hover:bg-black/5 transition">
                    <Upload className="h-4 w-4" style={{ color: MCGILL_RED }} /> Upload photo
                  </button>
                  <button onClick={() => { setShowAvatarModal(true); setShowCameraMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-black/80 hover:bg-black/5 transition">
                    <Eye className="h-4 w-4" style={{ color: MCGILL_RED }} /> View photo
                  </button>
                  <button onClick={handleRemoveAvatar} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-red-600 hover:bg-red-50 transition">
                    <Trash2 className="h-4 w-4" /> Remove photo
                  </button>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-extrabold text-black">{displayName}</h2>
              <p className="truncate text-sm text-black/50">{user?.email ?? "-"}</p>
            </div>

            <button
              onClick={() => supabase.auth.signOut()}
              className="flex-shrink-0 rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold text-black/55 transition hover:bg-black/5"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Subscription card */}
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
          {profile?.is_premium ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  ✦ Vybin Premium
                </span>
                <p className="mt-1 text-sm text-black/50">You have access to all premium features.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-black">Upgrade to Premium</p>
                <p className="mt-0.5 text-sm text-black/50">Unlock the AI assistant and class schedule planner.</p>
              </div>
              <button
                onClick={openPremiumCheckout}
                className="flex-shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: MCGILL_RED }}
              >
                Upgrade — $10/mo
              </button>
            </div>
          )}
        </div>

        {/* Interests card */}
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-black">My Interests</p>
              <p className="mt-0.5 text-sm text-black/50">Shapes your event feed.</p>
            </div>
            <button
              onClick={onEditPreferences}
              className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold text-black/60 transition hover:bg-black/5"
            >
              <Settings className="h-3.5 w-3.5" /> Edit
            </button>
          </div>

          {preferences.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {preferences.map((p) => (
                <span key={p} className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                  {p}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-black/40">No interests selected yet.</p>
          )}
        </div>

        {/* Notifications card */}
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" style={{ color: MCGILL_RED }} />
              <span className="font-semibold text-black">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: MCGILL_RED }}>
                  {unreadCount}
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={handleClearAllNotifications}
                className="text-xs font-semibold text-black/40 transition hover:text-red-500"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="border-t border-black/5">
            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-black/40">Loading...</div>
            ) : !visibleNotifications.length ? (
              <div className="px-5 py-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-black/15" />
                <p className="mt-2 text-sm text-black/40">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-black/5">
                {visibleNotifications.map((n) => (
                  <div key={n.id} className={`flex items-start gap-3 px-4 py-3.5 sm:px-5 ${!n.read ? "bg-red-50/60" : ""}`}>
                    {!n.read && (
                      <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: MCGILL_RED }} />
                    )}
                    <button
                      className={`min-w-0 flex-1 text-left ${n.read ? "pl-4" : ""}`}
                      onClick={() => n.url && window.open(n.url, "_blank", "noopener,noreferrer")}
                      disabled={!n.url}
                    >
                      <p className="truncate text-sm font-semibold text-black">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-sm text-black/55 line-clamp-2">{n.body}</p>}
                      <p className="mt-1 text-[11px] text-black/35">{formatNotificationTimestamp(n.created_at)}</p>
                    </button>
                    <button
                      onClick={() => handleDeleteNotification(n.id)}
                      className="flex-shrink-0 rounded-full p-1.5 text-black/30 transition hover:bg-black/5 hover:text-black/60"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {notifications.length > 20 && (
                  <p className="px-5 py-3 text-center text-xs text-black/35">
                    Showing 20 most recent — clear some to see older ones
                  </p>
                )}
              </div>
            )}
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
