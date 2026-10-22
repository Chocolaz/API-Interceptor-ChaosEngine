import { useState, useEffect, useCallback } from 'react';
import { io as createSocketIOClient, Socket } from 'socket.io-client';
import ChaosPanel from './components/ChaosPanel';
import MockList from './components/MockList';
import MockModal from './components/MockModal';
import LiveInspector from './components/LiveInspector';
import { AppConfig, ChaosConfig, MockRoute, HttpMethod, TrafficLog } from './types';

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

const MAX_LOGS = 100;

export default function App() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [trafficLogs, setTrafficLogs] = useState<TrafficLog[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMock, setEditingMock] = useState<MockRoute | null>(null);
  const [modalDefaultMethod, setModalDefaultMethod] = useState<HttpMethod>('GET');
  const [modalDefaultPath, setModalDefaultPath] = useState<string>('');

  // 1. Load initial config from Control Plane API
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/_api/config');
      if (res.ok) {
        const data: AppConfig = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to load config from server:', err);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // 2. Setup Real-time WebSocket connection to Control Plane (Port 3001)
  useEffect(() => {
    // In dev, Vite proxies /socket.io to Port 3001. In prod, served directly.
    const socket: Socket = createSocketIOClient({
      transports: ['websocket', 'polling'],
    });

    socket.on('traffic_log', (log: TrafficLog) => {
      setTrafficLogs((prev) => [log, ...prev.slice(0, MAX_LOGS - 1)]);
    });

    socket.on('logs_cleared', () => {
      setTrafficLogs([]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Update Chaos settings
  const handleUpdateChaos = async (newChaos: ChaosConfig) => {
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

  // Open Create Mock Modal
  const handleOpenCreateModal = (defaultMethod?: HttpMethod, defaultPath?: string) => {
    setEditingMock(null);
    setModalDefaultMethod(defaultMethod || 'GET');
    setModalDefaultPath(defaultPath || '');
    setIsModalOpen(true);
  };

  // Open Edit Mock Modal
  const handleOpenEditModal = (mock: MockRoute) => {
    setEditingMock(mock);
    setIsModalOpen(true);
  };

  // 1-Click Action from Live Inspector ("Mock This")
  const handleMockThis = (log: TrafficLog) => {
    const validMethod = log.method.toUpperCase() as HttpMethod;
    setEditingMock(null);
    setModalDefaultMethod(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(validMethod) ? validMethod : 'GET');
    setModalDefaultPath(log.path);
    setIsModalOpen(true);
  };

  // Clear Traffic Logs
  const handleClearLogs = async () => {
    setTrafficLogs([]);
    try {
      await fetch('/_api/logs/clear', { method: 'POST' });
    } catch (err) {
      console.error('Failed to clear traffic logs on server:', err);
    }
  };

  // Save Mock (Create or Update)
  const handleSaveMock = async (mockData: Omit<MockRoute, 'id'>, id?: string) => {
    if (id) {
      // Update
      try {
        const res = await fetch(`/_api/mocks/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockData),
        });
        if (res.ok) {
          const updated: MockRoute = await res.json();
          setConfig((prev) => ({
            ...prev,
            mocks: prev.mocks.map((m) => (m.id === id ? updated : m)),
          }));
        }
      } catch (err) {
        console.error('Failed to update mock route:', err);
      }
    } else {
      // Create
      try {
        const res = await fetch('/_api/mocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockData),
        });
        if (res.ok) {
          const created: MockRoute = await res.json();
          setConfig((prev) => ({
            ...prev,
            mocks: [...prev.mocks, created],
          }));
        }
      } catch (err) {
        console.error('Failed to create mock route:', err);
      }
    }
  };

  // Toggle Mock Enabled
  const handleToggleMock = async (mock: MockRoute) => {
    const updatedEnabled = !mock.enabled;
    setConfig((prev) => ({
      ...prev,
      mocks: prev.mocks.map((m) => (m.id === mock.id ? { ...m, enabled: updatedEnabled } : m)),
    }));

    try {
      const res = await fetch(`/_api/mocks/${mock.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: updatedEnabled }),
      });
      if (!res.ok) {
        fetchConfig();
      }
    } catch (err) {
      console.error('Failed to toggle mock status:', err);
      fetchConfig();
    }
  };

  // Delete Mock
  const handleDeleteMock = async (id: string) => {
    setConfig((prev) => ({
      ...prev,
      mocks: prev.mocks.filter((m) => m.id !== id),
    }));

    try {
      const res = await fetch(`/_api/mocks/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        fetchConfig();
      }
    } catch (err) {
      console.error('Failed to delete mock route:', err);
      fetchConfig();
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

      {/* Main Split View (2 Columns 50% / 50%) */}
      <main className="flex-1 overflow-hidden flex divide-x divide-slate-800">
        {/* Left Column (50%): Mock Routes Manager */}
        <section className="w-1/2 flex flex-col overflow-hidden">
          <MockList
            mocks={config.mocks}
            onOpenCreate={() => handleOpenCreateModal()}
            onOpenEdit={handleOpenEditModal}
            onToggleEnabled={handleToggleMock}
            onDelete={handleDeleteMock}
          />
        </section>

        {/* Right Column (50%): Live Traffic Stream Inspector */}
        <section className="w-1/2 flex flex-col overflow-hidden">
          <LiveInspector
            logs={trafficLogs}
            onClearLogs={handleClearLogs}
            onMockThis={handleMockThis}
          />
        </section>
      </main>

      {/* Create / Edit Mock Modal */}
      <MockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveMock}
        initialMock={editingMock}
        defaultMethod={modalDefaultMethod}
        defaultPath={modalDefaultPath}
      />
    </div>
  );
}
