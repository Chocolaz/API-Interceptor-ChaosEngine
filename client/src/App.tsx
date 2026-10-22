import { useState, useEffect, useCallback } from 'react';
import ChaosPanel from './components/ChaosPanel';
import { AppConfig, ChaosConfig } from './types';

const DEFAULT_CONFIG: AppConfig = {
  targetUrl: '',
  chaos: {
    enabled: false,
    delayMs: 0,
    failureRate: 0,
    failureStatus: 500,
    dropConnection: false,
  },
  mocks: [],
};

export default function App() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  // Load initial config from Control Plane API
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/_api/config');
      if (res.ok) {
        const data: AppConfig = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to load config from server:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Update Chaos settings
  const handleUpdateChaos = async (newChaos: ChaosConfig) => {
    // Optimistic UI update
    setConfig((prev) => ({ ...prev, chaos: newChaos }));
    try {
      const res = await fetch('/_api/chaos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChaos),
      });
      if (res.ok) {
        const saved: ChaosConfig = await res.json();
        setConfig((prev) => ({ ...prev, chaos: saved }));
      }
    } catch (err) {
      console.error('Failed to save chaos config:', err);
    }
  };

  // Update Target URL
  const handleUpdateTarget = async (targetUrl: string) => {
    setConfig((prev) => ({ ...prev, targetUrl }));
    try {
      const res = await fetch('/_api/target', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl }),
      });
      if (res.ok) {
        const saved = await res.json();
        setConfig((prev) => ({ ...prev, targetUrl: saved.targetUrl }));
      }
    } catch (err) {
      console.error('Failed to save target URL:', err);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Top Header & Chaos Control Bar */}
      <ChaosPanel
        targetUrl={config.targetUrl}
        chaos={config.chaos}
        onUpdateChaos={handleUpdateChaos}
        onUpdateTarget={handleUpdateTarget}
      />

      {/* Main Split View Placeholder (To be completed in Commit 3 & 4) */}
      <main className="flex-1 overflow-hidden flex divide-x divide-slate-800">
        <section className="w-1/2 p-6 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Mock Routes {loading ? '...' : `(${config.mocks.length})`}
            </h2>
          </div>
          <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
            MockList component will be mounted here in Commit 3
          </div>
        </section>

        <section className="w-1/2 p-6 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Live Traffic (Port 4000)
            </h2>
          </div>
          <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
            LiveInspector component will be mounted here in Commit 4
          </div>
        </section>
      </main>
    </div>
  );
}
