import { Home, FileText, User, Bookmark, CalendarDays } from "lucide-react";

export type Tab = "feed" | "applications" | "calendar" | "saved" | "profile";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const MCGILL_RED = "#ED1B2F";

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabClass = (tab: Tab) =>
    `flex flex-col items-center justify-center gap-1 transition-all duration-150 ${
      activeTab === tab ? "scale-[1.06]" : ""
    }`;

  const iconStyle = (tab: Tab) => ({
    color: activeTab === tab ? MCGILL_RED : "rgba(0,0,0,0.55)",
  });

  const textStyle = (tab: Tab) => ({
    color: activeTab === tab ? MCGILL_RED : "rgba(0,0,0,0.55)",
  });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-black/10 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-5xl flex items-center justify-around h-16 px-6">
        <button onClick={() => onTabChange("feed")} className={tabClass("feed")}>
          <Home className="w-6 h-6" style={iconStyle("feed")} />
          <span className="text-[11px] font-semibold" style={textStyle("feed")}>
            Feed
          </span>
        </button>

        <button onClick={() => onTabChange("applications")} className={tabClass("applications")}>
          <FileText className="w-6 h-6" style={iconStyle("applications")} />
          <span className="text-[11px] font-semibold" style={textStyle("applications")}>
            Apps
          </span>
        </button>

        <button onClick={() => onTabChange("calendar")} className={tabClass("calendar")}>
          <CalendarDays className="w-6 h-6" style={iconStyle("calendar")} />
          <span className="text-[11px] font-semibold" style={textStyle("calendar")}>
            Calendar
          </span>
        </button>

        <button onClick={() => onTabChange("saved")} className={tabClass("saved")}>
          <Bookmark className="w-6 h-6" style={iconStyle("saved")} />
          <span className="text-[11px] font-semibold" style={textStyle("saved")}>
            Saved
          </span>
        </button>

        <button onClick={() => onTabChange("profile")} className={tabClass("profile")}>
          <User className="w-6 h-6" style={iconStyle("profile")} />
          <span className="text-[11px] font-semibold" style={textStyle("profile")}>
            Profile
          </span>
        </button>
      </div>
    </nav>
  );
}
