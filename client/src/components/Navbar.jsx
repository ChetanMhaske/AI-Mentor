function Navbar() {
  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-warm-800/60 bg-warm-950/80 backdrop-blur-sm">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-warm-400">
          Welcome back, <span className="text-cream-200 font-semibold">Learner</span>
        </span>
        <div className="h-9 w-9 rounded-full bg-pencil-500/20 text-pencil-400 border border-pencil-500/30 flex items-center justify-center text-sm font-bold">
          L
        </div>
      </div>
    </header>
  );
}

export default Navbar;
