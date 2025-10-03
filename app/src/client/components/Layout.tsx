import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";

export function Layout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}