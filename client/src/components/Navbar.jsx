import { Menu } from "lucide-react";

function Navbar({ onMenuClick }) {
  return (
    <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-warm-800/60 bg-warm-950/80 backdrop-blur-sm">
      <div className="flex items-center">
        <button 
          onClick={onMenuClick}
          className="mr-4 p-2 text-warm-300 hover:text-cream-100 hover:bg-warm-800/60 rounded-xl transition-colors md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-warm-400 hidden sm:inline">
          Welcome back, <span className="text-cream-200 font-semibold">Learner</span>
        </span>
        <div className="h-9 w-9 rounded-full bg-pencil-500/20 text-pencil-400 border border-pencil-500/30 flex items-center justify-center text-sm font-bold shrink-0">
          L
        </div>
      </div>
    </header>
  );
}

export default Navbar;
