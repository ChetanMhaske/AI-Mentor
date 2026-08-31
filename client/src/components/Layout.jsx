import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

function Layout() {
  return (
    <div className="flex h-screen bg-warm-950 text-cream-100 font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
