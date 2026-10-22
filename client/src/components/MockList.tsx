import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, CheckCircle2, AlertCircle, Clock, Filter } from 'lucide-react';
import { HttpMethod, MockRoute } from '../types';

interface MockListProps {
  mocks: MockRoute[];
  onOpenCreate: () => void;
  onOpenEdit: (mock: MockRoute) => void;
  onToggleEnabled: (mock: MockRoute) => void;
  onDelete: (id: string) => void;
}

export function getMethodBadgeClass(method: HttpMethod): string {
  switch (method) {
    case 'GET':
      return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    case 'POST':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'PUT':
    case 'PATCH':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'DELETE':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  }
}

export function getStatusBadgeClass(status: number): string {
  if (status >= 200 && status < 300) {
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  }
  if (status >= 300 && status < 400) {
    return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
  }
  if (status >= 400 && status < 500) {
    return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  }
  return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
}

export default function MockList({
  mocks,
  onOpenCreate,
  onOpenEdit,
  onToggleEnabled,
  onDelete,
}: MockListProps) {
  const [search, setSearch] = useState('');

  const filteredMocks = mocks.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      m.path.toLowerCase().includes(q) ||
      m.method.toLowerCase().includes(q) ||
      String(m.status).includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 bg-slate-950">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Mock Routes
            </h2>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
              {mocks.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Mock</span>
          </button>
        </div>

        {/* Search Filter Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mocks by path, method, or status..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 transition-colors"
          />
        </div>
      </div>

      {/* Mock Routes List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 pt-2">
        {filteredMocks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 gap-2">
            {search ? (
              <>
                <AlertCircle className="w-8 h-8 text-slate-600" />
                <p className="text-xs">No mock routes found matching "{search}"</p>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-8 h-8 text-slate-600" />
                <p className="text-xs font-medium text-slate-400">No mock routes defined yet</p>
                <p className="text-[11px] text-slate-600 max-w-xs">
                  Click "+ New Mock" above or use "Mock This" from the Live Inspector on the right.
                </p>
              </>
            )}
          </div>
        ) : (
          filteredMocks.map((mock) => (
            <div
              key={mock.id}
              className={`flex items-center justify-between py-3 px-2 rounded-lg transition-colors ${
                mock.enabled ? 'hover:bg-slate-900/60' : 'opacity-50 hover:bg-slate-900/40'
              }`}
            >
              {/* Left Info: Toggle, Method, Path, Status */}
              <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => onToggleEnabled(mock)}
                  className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center shrink-0 ${
                    mock.enabled ? 'bg-indigo-600' : 'bg-slate-800'
                  }`}
                  title={mock.enabled ? 'Click to disable' : 'Click to enable'}
                >
                  <span
                    className={`inline-block w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      mock.enabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>

                {/* Method Badge */}
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 ${getMethodBadgeClass(
                    mock.method
                  )}`}
                >
                  {mock.method}
                </span>

                {/* Path Monospace */}
                <span
                  className="font-mono text-xs text-slate-200 truncate select-all"
                  title={mock.path}
                >
                  {mock.path}
                </span>

                {/* Status Badge */}
                <span
                  className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border shrink-0 ${getStatusBadgeClass(
                    mock.status
                  )}`}
                >
                  {mock.status}
                </span>

                {/* Dynamic Path Parameter Badge */}
                {(mock.path.includes(':') || mock.path.includes('*')) && (
                  <span
                    className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 shrink-0"
                    title="Dynamic Route (:param / * wildcard)"
                  >
                    PARAM
                  </span>
                )}

                {/* Custom Delay Badge */}
                {Boolean(mock.delayMs && mock.delayMs > 0) && (
                  <span
                    className="flex items-center gap-1 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0"
                    title={`Custom Route Delay: ${mock.delayMs}ms`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>{mock.delayMs}ms</span>
                  </span>
                )}

                {/* Conditions / Rules Badge */}
                {Boolean(
                  (mock.queryParams && Object.keys(mock.queryParams).length > 0) ||
                    (mock.headers && Object.keys(mock.headers).length > 0)
                ) && (
                  <span
                    className="flex items-center gap-1 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 shrink-0"
                    title={`Conditions: ${[
                      mock.queryParams && Object.keys(mock.queryParams).length > 0
                        ? `${Object.keys(mock.queryParams).length} query`
                        : '',
                      mock.headers && Object.keys(mock.headers).length > 0
                        ? `${Object.keys(mock.headers).length} header`
                        : '',
                    ]
                      .filter(Boolean)
                      .join(', ')}`}
                  >
                    <Filter className="w-3 h-3" />
                    <span>rules</span>
                  </span>
                )}
              </div>

              {/* Action Buttons: Edit and Delete */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenEdit(mock)}
                  className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors"
                  title="Edit mock route"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(mock.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                  title="Delete mock route"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
