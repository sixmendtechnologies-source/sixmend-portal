import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";
import SideNav from "./SideNav";
import { C } from "../../utils/colors";

export default function Layout() {
  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden" style={{ background: C.bg }}>
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
