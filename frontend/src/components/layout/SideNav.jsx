import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  CreditCard,
  LogOut,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { C } from "../../utils/colors";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/enquiries", icon: ClipboardList, label: "Enquiries" },
  { to: "/clients", icon: Users, label: "Clients" },
  { to: "/expenses", icon: CreditCard, label: "Expenses" },
];

export default function SideNav({ expanded, onToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <div
      className="flex-shrink-0 flex flex-col py-3 gap-1 overflow-hidden"
      style={{
        width: expanded ? "200px" : "56px",
        borderRight: `1px solid ${C.border}`,
        background: C.bg,
        transition: "width 200ms ease",
      }}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        title={expanded ? "Collapse sidebar" : "Expand sidebar"}
        className="flex items-center justify-center w-8 h-8 rounded-lg mx-auto mb-1 transition-colors hover:opacity-70"
        style={{ color: C.textMuted }}
      >
        {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Nav items */}
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          title={!expanded ? label : undefined}
          className="group relative px-2"
        >
          {({ isActive }) => (
            <div
              className="flex items-center gap-3 rounded-lg transition-colors"
              style={{
                padding: expanded ? "8px 10px" : "10px",
                justifyContent: expanded ? "flex-start" : "center",
                color: isActive ? C.green : C.textMuted,
                background: isActive ? "var(--nav-active-bg)" : "transparent",
                border: isActive ? `1px solid ${C.green}` : "1px solid transparent",
              }}
            >
              <Icon size={17} style={{ flexShrink: 0 }} />
              {expanded && (
                <span className="text-[13px] font-medium whitespace-nowrap">{label}</span>
              )}
              {/* Tooltip when collapsed */}
              {!expanded && (
                <span
                  className="absolute left-14 z-50 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                  style={{ background: C.card, color: C.textPrimary, border: `1px solid ${C.border}` }}
                >
                  {label}
                </span>
              )}
            </div>
          )}
        </NavLink>
      ))}

      <div className="flex-1" />

      {/* Logout */}
      <button
        onClick={handleLogout}
        title={!expanded ? "Logout" : undefined}
        className="group relative flex items-center gap-3 rounded-lg mx-2 transition-colors hover:opacity-70"
        style={{
          padding: expanded ? "8px 10px" : "10px",
          justifyContent: expanded ? "flex-start" : "center",
          color: C.textMuted,
        }}
      >
        <LogOut size={17} style={{ flexShrink: 0 }} />
        {expanded && <span className="text-[13px] font-medium whitespace-nowrap">Logout</span>}
        {!expanded && (
          <span
            className="absolute left-12 z-50 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
            style={{ background: C.card, color: C.textPrimary, border: `1px solid ${C.border}` }}
          >
            Logout
          </span>
        )}
      </button>

      {/* User avatar */}
      <div
        className="flex items-center gap-2 mx-2 rounded-lg px-2 py-1.5 overflow-hidden"
        title={!expanded ? user?.name : undefined}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{ background: "#fb8c00", color: "#1a1200" }}
        >
          {initials}
        </div>
        {expanded && (
          <div className="overflow-hidden">
            <div className="text-[12px] font-medium truncate leading-tight" style={{ color: C.textPrimary }}>
              {user?.name}
            </div>
            <div className="text-[10px] truncate leading-tight" style={{ color: C.textMuted }}>
              {user?.email}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
