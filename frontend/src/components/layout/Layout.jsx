import { useState } from "react";
import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";
import SideNav from "./SideNav";
import { C } from "../../utils/colors";

export default function Layout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(
    () => localStorage.getItem("sidebar-expanded") === "true"
  );

  const toggleSidebar = () => {
    setSidebarExpanded((prev) => {
      localStorage.setItem("sidebar-expanded", String(!prev));
      return !prev;
    });
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden" style={{ background: C.bg }}>
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <SideNav expanded={sidebarExpanded} onToggle={toggleSidebar} />
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
