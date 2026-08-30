function Navbar() {
  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-gray-800 bg-[#1e2029]">
      <h1 className="text-xl font-semibold tracking-tight text-gray-100">AI Mentor</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-400">Welcome back, <span className="text-gray-200">User</span></span>
        <div className="h-10 w-10 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 flex items-center justify-center text-sm font-bold shadow-sm">
          U
        </div>
      </div>
    </header>
  );
}

export default Navbar;
