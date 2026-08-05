import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  CreditCard,
  LogOut,
} from "lucide-react";
import { C } from "../../utils/colors";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/enquiries", icon: ClipboardList, label: "Enquiries" },
  { to: "/clients", icon: Users, label: "Clients" },
  { to: "/expenses", icon: CreditCard, label: "Expenses" },
];

export default function SideNav() {
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
      className="w-14 flex-shrink-0 flex flex-col items-center py-4 gap-1"
      style={{ borderRight: `1px solid ${C.border}`, background: C.bg }}
    >
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          title={label}
          className="group relative"
        >
          {({ isActive }) => (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
              style={{
                color: isActive ? C.green : C.textMuted,
                background: isActive ? "var(--nav-active-bg)" : "transparent",
                border: isActive ? `1px solid ${C.green}` : "1px solid transparent",
              }}
            >
              <Icon size={17} />
              <span
                className="absolute left-14 z-50 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                style={{ background: C.card, color: C.textPrimary, border: `1px solid ${C.border}` }}
              >
                {label}
              </span>
            </div>
          )}
        </NavLink>
      ))}

      <div className="flex-1" />

      <button
        onClick={handleLogout}
        title="Logout"
        className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors hover:bg-red-900/20"
        style={{ color: C.textMuted }}
      >
        <LogOut size={17} />
      </button>

      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
        style={{ background: "#fb8c00", color: "#1a1200" }}
        title={user?.name}
      >
        {initials}
      </div>
    </div>
  );
}
