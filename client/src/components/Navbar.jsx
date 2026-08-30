function Navbar() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
      <h1 className="text-lg font-semibold tracking-tight">AI Mentor</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">Welcome back</span>
        <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-medium">
          U
        </div>
      </div>
    </header>
  );
}

export default Navbar;
