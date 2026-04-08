import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-brand-black">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 -right-[20%] w-[600px] h-[600px] bg-brand-accent/[0.02] rounded-full blur-[150px]"></div>
          <div className="absolute bottom-0 -left-[10%] w-[400px] h-[400px] bg-brand-white/[0.02] rounded-full blur-[120px]"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
