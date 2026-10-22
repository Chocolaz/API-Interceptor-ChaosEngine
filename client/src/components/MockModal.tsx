import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { HttpMethod, MockRoute } from '../types';

interface MockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mockData: Omit<MockRoute, 'id'>, id?: string) => Promise<void>;
  initialMock?: MockRoute | null;
  defaultMethod?: HttpMethod;
  defaultPath?: string;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function MockModal({
  isOpen,
  onClose,
  onSave,
  initialMock,
  defaultMethod,
  defaultPath,
}: MockModalProps) {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [path, setPath] = useState('');
  const [status, setStatus] = useState<number>(200);
  const [responseBodyText, setResponseBodyText] = useState('{\n  "message": "success"\n}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when modal opens or initialMock changes
  useEffect(() => {
    if (initialMock) {
      setMethod(initialMock.method);
      setPath(initialMock.path);
      setStatus(initialMock.status);
      setResponseBodyText(JSON.stringify(initialMock.responseBody, null, 2));
      setJsonError(null);
    } else {
      setMethod(defaultMethod || 'GET');
      setPath(defaultPath || '');
      setStatus(200);
      setResponseBodyText('{\n  "message": "success"\n}');
      setJsonError(null);
    }
  }, [initialMock, defaultMethod, defaultPath, isOpen]);

  // Validate JSON on every change
  const handleBodyChange = (text: string) => {
    setResponseBodyText(text);
    if (!text.trim()) {
      setJsonError('Response body cannot be empty');
      return;
    }
    try {
      JSON.parse(text);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message || 'Invalid JSON syntax');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jsonError) return;

    let parsedBody: any;
    try {
      parsedBody = JSON.parse(responseBodyText);
    } catch (err: any) {
      setJsonError(err.message || 'Invalid JSON syntax');
      return;
    }

    // Auto-prepend leading slash if omitted
    let normalizedPath = path.trim();
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = `/${normalizedPath}`;
    }

    setIsSaving(true);
    try {
      await onSave(
        {
          method,
          path: normalizedPath,
          status: Number(status) || 200,
          responseBody: parsedBody,
          enabled: initialMock ? initialMock.enabled : true,
        },
        initialMock?.id
      );
      onClose();
    } catch (err) {
      console.error('Failed to save mock route:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-base font-semibold text-slate-100">
            {initialMock ? 'Edit Mock Route' : 'Create New Mock Route'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto">
          {/* Method & Status Code */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">HTTP Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 rounded-lg px-3 py-2 font-mono font-medium focus:border-indigo-500 focus:outline-none"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Status Code</label>
              <input
                type="number"
                min={100}
                max={599}
                value={status}
                onChange={(e) => setStatus(Number(e.target.value))}
                required
                className="w-full bg-slate-950 border border-slate-800 text-sm text-slate-200 rounded-lg px-3 py-2 font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Path Input */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Route Path <span className="text-slate-500 text-[11px]">(e.g., /api/v1/users)</span>
            </label>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/api/users"
              required
              className="w-full bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Response Body Textarea */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-400">Response Body (JSON)</label>
              {jsonError && (
                <span className="flex items-center gap-1 text-[11px] text-red-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {jsonError}
                </span>
              )}
            </div>
            <textarea
              rows={8}
              value={responseBodyText}
              onChange={(e) => handleBodyChange(e.target.value)}
              spellCheck={false}
              className={`w-full bg-slate-950 border font-mono text-xs rounded-lg p-3 text-slate-200 resize-none focus:outline-none ${
                jsonError
                  ? 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                  : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
              }`}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={Boolean(jsonError) || isSaving || !path.trim()}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 rounded-lg transition-colors shadow-sm"
            >
              {isSaving ? 'Saving...' : initialMock ? 'Update Mock' : 'Save Mock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
