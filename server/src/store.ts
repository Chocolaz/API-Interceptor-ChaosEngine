import fs from 'fs/promises';
import path from 'path';
import { AppConfig, ChaosConfig, MockRoute } from './types';

const DEFAULT_CONFIG: AppConfig = {
  targetUrl: '',
  chaos: {
    enabled: false,
    delayMs: 0,
    failureRate: 0,
    failureStatus: 500,
    dropConnection: false,
  },
  mocks: [
    {
      id: 'mock_default_1',
      enabled: true,
      method: 'GET',
      path: '/api/health',
      status: 200,
      responseBody: {
        status: 'ok',
        message: 'Mock server is running smoothly',
      },
    },
  ],
};

export class ConfigStore {
  private configPath: string;
  private state: AppConfig;

  constructor(customPath?: string) {
    this.configPath = customPath || path.resolve(__dirname, '../data/config.json');
    this.state = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  public async init(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8');
      const parsed = JSON.parse(data);
      this.state = {
        targetUrl: typeof parsed.targetUrl === 'string' ? parsed.targetUrl : '',
        chaos: {
          ...DEFAULT_CONFIG.chaos,
          ...(parsed.chaos || {}),
        },
        mocks: Array.isArray(parsed.mocks) ? parsed.mocks : [],
      };
    } catch {
      // If file does not exist or invalid JSON, initialize with DEFAULT_CONFIG
      this.state = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      await this.saveToDisk();
    }
  }

  private async saveToDisk(): Promise<void> {
    const dir = path.dirname(this.configPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.configPath, JSON.stringify(this.state, null, 2), 'utf-8');
  }

  public getConfig(): AppConfig {
    return this.state;
  }

  public async updateChaos(chaos: ChaosConfig): Promise<ChaosConfig> {
    this.state.chaos = { ...chaos };
    await this.saveToDisk();
    return this.state.chaos;
  }

  public async updateTargetUrl(targetUrl: string): Promise<string> {
    this.state.targetUrl = targetUrl;
    await this.saveToDisk();
    return this.state.targetUrl;
  }

  public async addMock(mockData: Omit<MockRoute, 'id'>): Promise<MockRoute> {
    const newMock: MockRoute = {
      ...mockData,
      id: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    this.state.mocks.push(newMock);
    await this.saveToDisk();
    return newMock;
  }

  public async updateMock(id: string, updates: Partial<MockRoute>): Promise<MockRoute | null> {
    const index = this.state.mocks.findIndex((m) => m.id === id);
    if (index === -1) {
      return null;
    }
    const existing = this.state.mocks[index];
    const updated: MockRoute = {
      ...existing,
      ...updates,
      id: existing.id, // ID cannot be overwritten
    };
    this.state.mocks[index] = updated;
    await this.saveToDisk();
    return updated;
  }

  public async deleteMock(id: string): Promise<boolean> {
    const initialLen = this.state.mocks.length;
    this.state.mocks = this.state.mocks.filter((m) => m.id !== id);
    if (this.state.mocks.length !== initialLen) {
      await this.saveToDisk();
      return true;
    }
    return false;
  }
}

export const store = new ConfigStore();
