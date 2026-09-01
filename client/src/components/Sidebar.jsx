import { NavLink } from "react-router-dom";
import { LayoutDashboard, UploadCloud, BookOpen, BrainCircuit, BarChart3, GraduationCap, X } from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "New Lesson", icon: UploadCloud },
  { to: "/lesson", label: "My Lessons", icon: BookOpen },
  { to: "/progress", label: "Progress", icon: BarChart3 },
];

function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-warm-950/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50
        w-64 shrink-0 bg-warm-900 border-r border-warm-700/40 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-pencil-500/20 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-pencil-400" />
            </div>
            <span className="text-xl font-black font-serif bg-gradient-to-r from-pencil-400 to-cream-300 bg-clip-text text-transparent tracking-tight">
              AI Mentor
            </span>
          </div>
          <button onClick={onClose} className="md:hidden text-warm-400 hover:text-cream-100 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-2 overflow-y-auto">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => {
                // Close sidebar on navigation on mobile
                if (window.innerWidth < 768) onClose();
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-pencil-500/15 text-pencil-400 border border-pencil-500/20 shadow-sm"
                    : "text-warm-300 hover:text-cream-100 hover:bg-warm-800/60"
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

        <div className="px-4 pb-6 mt-4">
          <div className="bg-warm-800/60 border border-warm-700/30 rounded-xl p-4">
            <p className="text-xs text-warm-400 font-medium">AI-Powered Learning</p>
            <p className="text-[10px] text-warm-500 mt-1">Personalized lessons adapted to your pace.</p>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
