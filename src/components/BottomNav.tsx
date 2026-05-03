import { Home, FileText, User, Bookmark, CalendarDays } from "lucide-react";

export type Tab = "feed" | "applications" | "calendar" | "saved" | "profile";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const MCGILL_RED = "#ED1B2F";

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabClass = (tab: Tab) =>
    `min-w-0 flex flex-col items-center justify-center gap-1 px-1 transition-all duration-150 ${
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
      className="fixed bottom-0 left-0 right-0 z-[60] border-t border-black/10 bg-white/95 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
    >
      <div className="mx-auto flex h-[72px] max-w-5xl items-center justify-around px-2 sm:px-4">
        <button onClick={() => onTabChange("feed")} className={tabClass("feed")}>
          <Home className="h-5 w-5 sm:h-6 sm:w-6" style={iconStyle("feed")} />
          <span className="truncate text-[10px] font-semibold sm:text-[11px]" style={textStyle("feed")}>
            Feed
          </span>
        </button>

        <button onClick={() => onTabChange("applications")} className={tabClass("applications")}>
          <FileText className="h-5 w-5 sm:h-6 sm:w-6" style={iconStyle("applications")} />
          <span className="truncate text-[10px] font-semibold sm:text-[11px]" style={textStyle("applications")}>
            Apps
          </span>
        </button>

        <button onClick={() => onTabChange("calendar")} className={tabClass("calendar")}>
          <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6" style={iconStyle("calendar")} />
          <span className="truncate text-[10px] font-semibold sm:text-[11px]" style={textStyle("calendar")}>
            Schedule
          </span>
        </button>

        <button onClick={() => onTabChange("saved")} className={tabClass("saved")}>
          <Bookmark className="h-5 w-5 sm:h-6 sm:w-6" style={iconStyle("saved")} />
          <span className="truncate text-[10px] font-semibold sm:text-[11px]" style={textStyle("saved")}>
            Saved
          </span>
        </button>

        <button onClick={() => onTabChange("profile")} className={tabClass("profile")}>
          <User className="h-5 w-5 sm:h-6 sm:w-6" style={iconStyle("profile")} />
          <span className="truncate text-[10px] font-semibold sm:text-[11px]" style={textStyle("profile")}>
            Profile
          </span>
        </button>
      </div>
    </nav>
  );
}
