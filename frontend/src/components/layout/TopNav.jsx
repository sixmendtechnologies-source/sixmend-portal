import { useLocation } from "react-router-dom";
import { Maximize2, Settings, Bell } from "lucide-react";
import { C } from "../../utils/colors";
import { useAuth } from "../../context/AuthContext";

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/enquiries": "Enquiries",
  "/clients": "Clients",
  "/expenses": "Expenses",
};

export default function TopNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const title = PAGE_TITLES[pathname] || "SixPortal";

  return (
    <div
      className="flex items-center justify-between px-5 h-14 flex-shrink-0"
      style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded flex items-center justify-center text-[11px] font-bold"
          style={{ background: "#1c2230", color: C.textMuted }}
        >
          SP
        </div>
        <span className="text-[15px] font-semibold" style={{ color: C.textPrimary }}>
          SixPortal
        </span>
        <span className="text-[13px]" style={{ color: C.textMuted }}>
          / {title}
        </span>
      </div>

      <div className="flex items-center gap-3" style={{ color: C.textMuted }}>
        <Bell size={15} />
        <Settings size={15} />
        <Maximize2 size={15} />
        {user && (
          <span className="text-[12px] ml-2" style={{ color: C.textMuted }}>
            {user.name}
          </span>
        )}
      </div>
    </div>
  );
}
