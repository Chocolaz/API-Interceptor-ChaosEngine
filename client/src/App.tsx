export default function App() {
  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-950 text-slate-100">
      {/* Top Header Placeholder */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            Local API Mock & Chaos Engine
          </span>
        </div>
      </header>

      {/* Main Split View Placeholder */}
      <main className="flex-1 overflow-hidden flex divide-x divide-slate-800">
        <section className="w-1/2 p-6 flex flex-col">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Mock Routes</h2>
        </section>
        <section className="w-1/2 p-6 flex flex-col">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Live Traffic (Port 4000)</h2>
        </section>
      </main>
    </div>
  );
}
