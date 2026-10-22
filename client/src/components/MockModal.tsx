import { useState, useEffect } from 'react';
import { X, AlertCircle, Sparkles, Plus, Trash2, Code2, SlidersHorizontal } from 'lucide-react';
import { HttpMethod, MockRoute } from '../types';

interface MockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mockData: Omit<MockRoute, 'id'>, id?: string) => Promise<void>;
  initialMock?: MockRoute | null;
  defaultMethod?: HttpMethod;
  defaultPath?: string;
  defaultResponseBody?: any;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

interface VisualField {
  id: string;
  key: string;
  type: 'string' | 'number' | 'boolean' | 'null';
  value: string;
}

const TEMPLATES: { label: string; data: any }[] = [
  {
    label: 'Success',
    data: {
      status: 'success',
      message: 'Operation completed successfully',
      data: { id: 1 },
    },
  },
  {
    label: 'Paginated List',
    data: {
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ],
      total: 2,
      page: 1,
      limit: 10,
    },
  },
  {
    label: 'Error 400',
    data: {
      status: 'error',
      code: 'BAD_REQUEST',
      message: 'Invalid input parameters provided',
    },
  },
  {
    label: 'Empty Object',
    data: {},
  },
  {
    label: 'Empty Array',
    data: [],
  },
];

function objToFields(obj: any): VisualField[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return [{ id: 'f_1', key: 'message', type: 'string', value: 'success' }];
  }
  const fields: VisualField[] = [];
  let counter = 1;
  for (const [key, val] of Object.entries(obj)) {
    let type: 'string' | 'number' | 'boolean' | 'null' = 'string';
    let valueStr = '';
    if (typeof val === 'number') {
      type = 'number';
      valueStr = String(val);
    } else if (typeof val === 'boolean') {
      type = 'boolean';
      valueStr = String(val);
    } else if (val === null) {
      type = 'null';
      valueStr = '';
    } else if (typeof val === 'object') {
      type = 'string';
      valueStr = JSON.stringify(val);
    } else {
      type = 'string';
      valueStr = String(val);
    }
    fields.push({
      id: `f_${counter++}`,
      key,
      type,
      value: valueStr,
    });
  }
  return fields.length > 0
    ? fields
    : [{ id: 'f_1', key: '', type: 'string', value: '' }];
}

function fieldsToObj(fields: VisualField[]): Record<string, any> {
  const result: Record<string, any> = {};
  for (const f of fields) {
    const trimmedKey = f.key.trim();
    if (!trimmedKey) continue;
    if (f.type === 'number') {
      result[trimmedKey] = f.value === '' ? 0 : Number(f.value);
    } else if (f.type === 'boolean') {
      result[trimmedKey] = f.value === 'true';
    } else if (f.type === 'null') {
      result[trimmedKey] = null;
    } else {
      try {
        if (
          (f.value.startsWith('{') && f.value.endsWith('}')) ||
          (f.value.startsWith('[') && f.value.endsWith(']'))
        ) {
          result[trimmedKey] = JSON.parse(f.value);
        } else {
          result[trimmedKey] = f.value;
        }
      } catch {
        result[trimmedKey] = f.value;
      }
    }
  }
  return result;
}

export default function MockModal({
  isOpen,
  onClose,
  onSave,
  initialMock,
  defaultMethod,
  defaultPath,
  defaultResponseBody,
}: MockModalProps) {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [path, setPath] = useState('');
  const [status, setStatus] = useState<number>(200);
  const [responseBodyText, setResponseBodyText] = useState('{\n  "message": "success"\n}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Mode: 'code' (raw textarea) or 'visual' (form builder)
  const [editorMode, setEditorMode] = useState<'code' | 'visual'>('code');
  const [visualFields, setVisualFields] = useState<VisualField[]>([]);

  // Initialize form when modal opens or initialMock changes
  useEffect(() => {
    if (initialMock) {
      setMethod(initialMock.method);
      setPath(initialMock.path);
      setStatus(initialMock.status);
      const str = JSON.stringify(initialMock.responseBody, null, 2);
      setResponseBodyText(str);
      setVisualFields(objToFields(initialMock.responseBody));
      setJsonError(null);
    } else {
      setMethod(defaultMethod || 'GET');
      setPath(defaultPath || '');
      setStatus(200);
      if (defaultResponseBody !== undefined) {
        const str =
          typeof defaultResponseBody === 'object'
            ? JSON.stringify(defaultResponseBody, null, 2)
            : String(defaultResponseBody);
        setResponseBodyText(str);
        setVisualFields(objToFields(defaultResponseBody));
      } else {
        const defaultData = { message: 'success' };
        setResponseBodyText(JSON.stringify(defaultData, null, 2));
        setVisualFields(objToFields(defaultData));
      }
      setJsonError(null);
    }
  }, [initialMock, defaultMethod, defaultPath, defaultResponseBody, isOpen]);

  // Validate JSON in code mode
  const handleBodyChange = (text: string) => {
    setResponseBodyText(text);
    if (!text.trim()) {
      setJsonError('Response body cannot be empty');
      return;
    }
    try {
      const parsed = JSON.parse(text);
      setJsonError(null);
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        setVisualFields(objToFields(parsed));
      }
    } catch (err: any) {
      setJsonError(err.message || 'Invalid JSON syntax');
    }
  };

  // Switch to Visual Builder
  const handleSwitchToVisual = () => {
    try {
      const parsed = JSON.parse(responseBodyText);
      if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null) {
        setVisualFields(objToFields(parsed));
      } else {
        setVisualFields([{ id: 'f_1', key: 'data', type: 'string', value: JSON.stringify(parsed) }]);
      }
      setJsonError(null);
    } catch {
      setVisualFields([{ id: 'f_1', key: 'message', type: 'string', value: 'success' }]);
      const obj = { message: 'success' };
      setResponseBodyText(JSON.stringify(obj, null, 2));
      setJsonError(null);
    }
    setEditorMode('visual');
  };

  // Switch to Code Mode
  const handleSwitchToCode = () => {
    const obj = fieldsToObj(visualFields);
    setResponseBodyText(JSON.stringify(obj, null, 2));
    setJsonError(null);
    setEditorMode('code');
  };

  // Visual Field Updates
  const updateField = (id: string, updates: Partial<VisualField>) => {
    setVisualFields((prev) => {
      const updated = prev.map((f) => (f.id === id ? { ...f, ...updates } : f));
      const obj = fieldsToObj(updated);
      setResponseBodyText(JSON.stringify(obj, null, 2));
      setJsonError(null);
      return updated;
    });
  };

  const addField = () => {
    const newField: VisualField = {
      id: `f_${Date.now()}`,
      key: '',
      type: 'string',
      value: '',
    };
    setVisualFields((prev) => [...prev, newField]);
  };

  const removeField = (id: string) => {
    setVisualFields((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      const obj = fieldsToObj(updated);
      setResponseBodyText(JSON.stringify(obj, null, 2));
      return updated;
    });
  };

  // Apply Quick Template
  const applyTemplate = (templateData: any) => {
    const formatted = JSON.stringify(templateData, null, 2);
    setResponseBodyText(formatted);
    setVisualFields(objToFields(templateData));
    setJsonError(null);
  };

  // Format / Prettify JSON
  const formatJson = () => {
    try {
      const parsed = JSON.parse(responseBodyText);
      setResponseBodyText(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message || 'Cannot format invalid JSON');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jsonError) return;

    let parsedBody: any;
    if (editorMode === 'visual') {
      parsedBody = fieldsToObj(visualFields);
    } else {
      try {
        parsedBody = JSON.parse(responseBodyText);
      } catch (err: any) {
        setJsonError(err.message || 'Invalid JSON syntax');
        return;
      }
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
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
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

          {/* Response Body Section with Tabs & Quick Templates */}
          <div className="flex-1 flex flex-col pt-1">
            {/* Toolbar Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              {/* Left: Mode Tabs */}
              <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={handleSwitchToCode}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    editorMode === 'code'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Code JSON</span>
                </button>
                <button
                  type="button"
                  onClick={handleSwitchToVisual}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    editorMode === 'visual'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Visual Builder</span>
                </button>
              </div>

              {/* Right: Quick Templates & Format Button */}
              <div className="flex items-center gap-1.5">
                {editorMode === 'code' && (
                  <button
                    type="button"
                    onClick={formatJson}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 rounded-md transition-colors"
                    title="Beautify / Format JSON"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Format</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Templates Pill List */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
              <span className="text-[11px] text-slate-500 font-medium shrink-0">Templates:</span>
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => applyTemplate(tpl.data)}
                  className="px-2 py-0.5 text-[11px] font-medium bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded transition-colors shrink-0"
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            {/* Error Message */}
            {jsonError && editorMode === 'code' && (
              <div className="flex items-center gap-1 text-[11px] text-red-400 font-medium mb-1.5 bg-red-500/10 border border-red-500/30 rounded px-2.5 py-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}

            {/* Mode 1: Code Textarea */}
            {editorMode === 'code' ? (
              <textarea
                rows={9}
                value={responseBodyText}
                onChange={(e) => handleBodyChange(e.target.value)}
                spellCheck={false}
                className={`w-full bg-slate-950 border font-mono text-xs rounded-lg p-3 text-slate-200 resize-none focus:outline-none ${
                  jsonError
                    ? 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                }`}
              />
            ) : (
              /* Mode 2: Visual Builder */
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col gap-2 max-h-[260px] overflow-y-auto">
                {visualFields.map((field) => (
                  <div key={field.id} className="flex items-center gap-2">
                    {/* Key Input */}
                    <input
                      type="text"
                      placeholder="key_name"
                      value={field.key}
                      onChange={(e) => updateField(field.id, { key: e.target.value })}
                      className="w-1/3 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                    />

                    {/* Type Select */}
                    <select
                      value={field.type}
                      onChange={(e) => {
                        const newType = e.target.value as VisualField['type'];
                        let defVal = field.value;
                        if (newType === 'boolean') defVal = 'true';
                        if (newType === 'number') defVal = '0';
                        if (newType === 'null') defVal = '';
                        updateField(field.id, { type: newType, value: defVal });
                      }}
                      className="w-24 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-400 font-medium focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="null">Null</option>
                    </select>

                    {/* Value Input */}
                    <div className="flex-1">
                      {field.type === 'boolean' ? (
                        <select
                          value={field.value}
                          onChange={(e) => updateField(field.id, { value: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : field.type === 'null' ? (
                        <input
                          type="text"
                          disabled
                          value="null"
                          className="w-full bg-slate-900/50 border border-slate-800/50 rounded px-2 py-1.5 text-xs text-slate-500 font-mono italic cursor-not-allowed"
                        />
                      ) : field.type === 'number' ? (
                        <input
                          type="number"
                          placeholder="0"
                          value={field.value}
                          onChange={(e) => updateField(field.id, { value: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                        />
                      ) : (
                        <input
                          type="text"
                          placeholder="value"
                          value={field.value}
                          onChange={(e) => updateField(field.id, { value: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                        />
                      )}
                    </div>

                    {/* Delete Field Button */}
                    <button
                      type="button"
                      onClick={() => removeField(field.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors shrink-0"
                      title="Remove field"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add Field Button */}
                <button
                  type="button"
                  onClick={addField}
                  className="mt-1 flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/60 text-slate-400 hover:text-indigo-400 rounded-lg text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Field</span>
                </button>
              </div>
            )}
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
