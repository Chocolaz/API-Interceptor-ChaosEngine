import { useState } from 'react';
import {
  Activity,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Radio,
  Clock,
} from 'lucide-react';
import { TrafficLog, ResolutionSource, HttpMethod } from '../types';
import { getMethodBadgeClass, getStatusBadgeClass } from './MockList';

interface LiveInspectorProps {
  logs: TrafficLog[];
  onClearLogs: () => void;
  onMockThis: (log: TrafficLog) => void;
}

function getSourceBadge(source: ResolutionSource) {
  switch (source) {
    case 'MOCK':
      return {
        label: 'MOCK',
        className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      };
    case 'PROXY':
      return {
        label: 'PROXY',
        className: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      };
    case 'CHAOS_ERROR':
      return {
        label: 'CHAOS ERROR',
        className: 'bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse font-semibold',
      };
    case 'CHAOS_DROP':
      return {
        label: 'CHAOS DROP',
        className: 'bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse font-semibold',
      };
    case 'UNMATCHED_404':
      return {
        label: 'UNMATCHED 404',
        className: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      };
    default:
      return {
        label: source,
        className: 'bg-slate-800 text-slate-300 border-slate-700',
      };
  }
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return isoString;
  }
}

export default function LiveInspector({
  logs,
  onClearLogs,
  onMockThis,
}: LiveInspectorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 bg-slate-950">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Live Traffic (Port 4000)
            </h2>
          </div>
          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
            {logs.length} / 100
          </span>
        </div>

        <button
          type="button"
          onClick={onClearLogs}
          disabled={logs.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 text-xs font-medium text-slate-300 rounded-lg border border-slate-800 transition-colors"
          title="Clear traffic logs"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>
      </div>

      {/* Stream List (Newest at top) */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 pt-2">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-900/80 border border-slate-800 flex items-center justify-center">
              <Activity className="w-6 h-6 text-slate-600 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Listening for incoming traffic...</p>
              <p className="text-[11px] text-slate-600 mt-1 max-w-xs">
                Requests sent to <code className="text-slate-400">http://localhost:4000</code> will stream here in real-time.
              </p>
            </div>
          </div>
        ) : (
          logs.map((log) => {
            const isExpanded = expandedId === log.id;
            const sourceBadge = getSourceBadge(log.source);
            const canMockThis = log.source === 'UNMATCHED_404' || log.source === 'PROXY';

            return (
              <div
                key={log.id}
                className="py-2.5 px-2 rounded-lg hover:bg-slate-900/50 transition-colors flex flex-col gap-2"
              >
                {/* Main Row */}
                <div className="flex items-center justify-between gap-3 min-w-0">
                  {/* Left: Expand toggle, Time, Method, Path, Status */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleExpand(log.id)}
                      className="p-1 text-slate-500 hover:text-slate-300 rounded transition-colors shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <span className="text-[11px] font-mono text-slate-500 shrink-0">
                      {formatTime(log.timestamp)}
                    </span>

                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${getMethodBadgeClass(
                        log.method as HttpMethod
                      )}`}
                    >
                      {log.method}
                    </span>

                    <span
                      className="font-mono text-xs text-slate-200 truncate select-all"
                      title={log.path}
                    >
                      {log.path}
                    </span>

                    <span
                      className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border shrink-0 ${getStatusBadgeClass(
                        log.status
                      )}`}
                    >
                      {log.status === 0 ? 'DROPPED' : log.status}
                    </span>
                  </div>

                  {/* Right: Duration, Source Badge, and Action Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-600" />
                      {log.durationMs}ms
                    </span>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${sourceBadge.className}`}
                    >
                      {sourceBadge.label}
                    </span>

                    {/* 1-Click Action: + Mock This */}
                    {canMockThis && (
                      <button
                        type="button"
                        onClick={() => onMockThis(log)}
                        className="flex items-center gap-1 px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 rounded text-[11px] font-medium transition-all shadow-sm"
                        title={`Create mock route for ${log.method} ${log.path}`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>Mock This</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="ml-7 mt-1 p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono space-y-2 text-slate-300 animate-in fade-in duration-100">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Log ID: {log.id}</span>
                      <span>Full Time: {log.timestamp}</span>
                    </div>

                    {log.query && Object.keys(log.query).length > 0 && (
                      <div>
                        <span className="text-slate-500 text-[11px] uppercase tracking-wider block mb-1">
                          Query Parameters:
                        </span>
                        <pre className="bg-slate-950 p-2 rounded border border-slate-800/80 overflow-x-auto text-[11px] text-sky-300">
                          {JSON.stringify(log.query, null, 2)}
                        </pre>
                      </div>
                    )}

                    {log.requestBody && (
                      <div>
                        <span className="text-slate-500 text-[11px] uppercase tracking-wider block mb-1">
                          Request Body:
                        </span>
                        <pre className="bg-slate-950 p-2 rounded border border-slate-800/80 overflow-x-auto text-[11px] text-emerald-300">
                          {typeof log.requestBody === 'object'
                            ? JSON.stringify(log.requestBody, null, 2)
                            : String(log.requestBody)}
                        </pre>
                      </div>
                    )}

                    {!log.requestBody && (!log.query || Object.keys(log.query).length === 0) && (
                      <div className="text-slate-500 text-[11px] italic">
                        No request body or query parameters attached.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
