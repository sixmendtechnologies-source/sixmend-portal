import { useLocation, useNavigate, Link } from "react-router-dom";
import { Settings, Maximize2 } from "lucide-react";
import { C } from "../../utils/colors";
import { useAuth } from "../../context/AuthContext";

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/enquiries": "Enquiries",
  "/clients": "Clients",
  "/expenses": "Expenses",
  "/settings": "Settings",
};

export default function TopNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const title = PAGE_TITLES[pathname] || "Manage";

  return (
    <div
      className="flex items-center justify-between px-5 h-14 flex-shrink-0"
      style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}
    >
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <img src="/sixmend-mark.png" alt="Sixmend" className="w-7 h-7 rounded object-contain" />
          <span className="text-[15px] font-bold tracking-wide" style={{ color: C.textPrimary }}>
            MANAGE
          </span>
        </Link>
        <span style={{ color: C.border }}>|</span>
        <span className="text-[13px]" style={{ color: C.textMuted }}>{title}</span>
      </div>

      <div className="flex items-center gap-3">
        {user?.role === "admin" && (
          <button
            onClick={() => navigate("/settings")}
            title="Settings"
            className="w-7 h-7 rounded flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{
              color: pathname === "/settings" ? C.green : C.textMuted,
              background: pathname === "/settings" ? "var(--nav-active-bg)" : "transparent",
            }}
          >
            <Settings size={15} />
          </button>
        )}
        <Maximize2 size={15} style={{ color: C.textMuted }} />
        {user && (
          <span className="text-[12px] ml-1" style={{ color: C.textMuted }}>{user.name}</span>
        )}
      </div>
    </div>
  );
}
