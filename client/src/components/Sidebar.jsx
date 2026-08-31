import { NavLink } from "react-router-dom";
import { LayoutDashboard, UploadCloud, BookOpen, BrainCircuit, BarChart3 } from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Upload", icon: UploadCloud },
  { to: "/lesson", label: "Lessons", icon: BookOpen },
  { to: "/progress", label: "Progress", icon: BarChart3 },
];

function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-[#1e2029] border-r border-gray-800 flex flex-col">
      <div className="px-6 py-6 flex items-center gap-2">
        <BrainCircuit className="w-6 h-6 text-indigo-400" />
        <span className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
          AI Mentor
        </span>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-indigo-600 shadow-md shadow-indigo-900/20 text-white"
                  : "text-gray-400 hover:text-gray-100 hover:bg-gray-800/50"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
