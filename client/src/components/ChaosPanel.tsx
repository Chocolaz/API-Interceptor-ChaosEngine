import { useState, useEffect } from 'react';
import { Copy, Check, Flame, Globe, Clock, AlertTriangle, ZapOff } from 'lucide-react';
import { ChaosConfig } from '../types';

interface ChaosPanelProps {
  targetUrl: string;
  chaos: ChaosConfig;
  onUpdateChaos: (chaos: ChaosConfig) => Promise<void>;
  onUpdateTarget: (targetUrl: string) => Promise<void>;
}

const ERROR_STATUS_OPTIONS = [400, 401, 403, 404, 429, 500, 502, 503, 504];
const PROXY_INGRESS_URL = 'http://localhost:4000';

export default function ChaosPanel({
  targetUrl,
  chaos,
  onUpdateChaos,
  onUpdateTarget,
}: ChaosPanelProps) {
  const [copied, setCopied] = useState(false);
  const [localTarget, setLocalTarget] = useState(targetUrl);
  const [isSavingTarget, setIsSavingTarget] = useState(false);

  useEffect(() => {
    setLocalTarget(targetUrl);
  }, [targetUrl]);

  const handleCopyIngress = async () => {
    try {
      await navigator.clipboard.writeText(PROXY_INGRESS_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const handleSaveTarget = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingTarget(true);
    try {
      await onUpdateTarget(localTarget.trim());
    } finally {
      setIsSavingTarget(false);
    }
  };

  const handleToggleChaos = () => {
    onUpdateChaos({
      ...chaos,
      enabled: !chaos.enabled,
    });
  };

  const handleLatencyChange = (delayMs: number) => {
    onUpdateChaos({
      ...chaos,
      delayMs,
    });
  };

  const handleFailureRateChange = (percentage: number) => {
    onUpdateChaos({
      ...chaos,
      failureRate: Number((percentage / 100).toFixed(2)),
    });
  };

  const handleStatusChange = (status: number) => {
    onUpdateChaos({
      ...chaos,
      failureStatus: status,
    });
  };

  const handleDropConnectionChange = (dropConnection: boolean) => {
    onUpdateChaos({
      ...chaos,
      dropConnection,
    });
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-3 shrink-0 flex flex-col gap-3">
      {/* Top Row: Server Status & Target URL */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Server Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs text-slate-400 font-medium">Proxy Ingress:</span>
            <code className="text-xs font-mono font-semibold text-emerald-400 select-all">
              {PROXY_INGRESS_URL}
            </code>
            <button
              onClick={handleCopyIngress}
              className="ml-1 p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
              title="Copy Ingress URL"
              type="button"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Target Backend Input */}
        <form onSubmit={handleSaveTarget} className="flex-1 max-w-xl flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Globe className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={localTarget}
              onChange={(e) => setLocalTarget(e.target.value)}
              placeholder="https://api.example.com (Leave empty for Mock-only)"
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isSavingTarget || localTarget === targetUrl}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-xs font-medium text-slate-200 rounded-lg border border-slate-700 transition-colors shrink-0"
          >
            {isSavingTarget ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>

      {/* Bottom Row: Chaos Controls Bar */}
      <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-800/60">
        {/* Chaos Master Switch */}
        <button
          type="button"
          onClick={handleToggleChaos}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
            chaos.enabled
              ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.35)] animate-pulse'
              : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-slate-300'
          }`}
        >
          <Flame className={`w-4 h-4 ${chaos.enabled ? 'text-red-400' : 'text-slate-500'}`} />
          {chaos.enabled ? 'Chaos Active' : 'Chaos Off'}
        </button>

        {/* Latency Slider */}
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">Latency:</span>
          <input
            type="range"
            min={0}
            max={5000}
            step={100}
            value={chaos.delayMs}
            onChange={(e) => handleLatencyChange(Number(e.target.value))}
            className="w-24 accent-indigo-500 cursor-pointer"
          />
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300 min-w-[50px] text-center">
            {chaos.delayMs}ms
          </span>
        </div>

        {/* Failure Rate Slider */}
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">Failure Rate:</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(chaos.failureRate * 100)}
            onChange={(e) => handleFailureRateChange(Number(e.target.value))}
            className="w-24 accent-red-500 cursor-pointer"
          />
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-red-300 min-w-[42px] text-center">
            {Math.round(chaos.failureRate * 100)}%
          </span>
        </div>

        {/* Error Status Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Status:</span>
          <select
            value={chaos.failureStatus}
            onChange={(e) => handleStatusChange(Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded px-2 py-1 font-mono focus:border-indigo-500 focus:outline-none"
          >
            {ERROR_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* Drop Connection Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={chaos.dropConnection}
            onChange={(e) => handleDropConnectionChange(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-red-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <ZapOff className="w-3.5 h-3.5 text-amber-500/80" />
            Drop Connection
          </span>
        </label>
      </div>
    </header>
  );
}
