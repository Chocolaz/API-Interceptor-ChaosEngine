export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ChaosConfig {
  enabled: boolean;
  delayMs: number;          // Range: 0 to 10000
  failureRate: number;      // Range: 0.0 to 1.0 (e.g., 0.25 = 25%)
  failureStatus: number;    // Allowed: 400 | 401 | 403 | 404 | 429 | 500 | 502 | 503 | 504
  dropConnection: boolean;  // If true, destroys socket immediately without response
}

export interface MockRoute {
  id: string;               // UUID or timestamp string (e.g., "mock_1700000001")
  enabled: boolean;         // Toggle mock without deleting
  method: HttpMethod;
  path: string;             // Must start with "/", e.g., "/api/v1/users" or "/api/users/:id"
  status: number;           // Default: 200
  responseBody: any;        // Parsed JSON object or array
  delayMs?: number;         // Custom route delay in ms (optional)
  queryParams?: Record<string, string>; // Expected query params (optional)
  headers?: Record<string, string>;     // Expected request headers (optional)
}

export interface AppConfig {
  targetUrl: string;        // Empty string "" disables proxy fallback. Example: "https://jsonplaceholder.typicode.com"
  chaos: ChaosConfig;
  mocks: MockRoute[];
}

export type ResolutionSource = 'CHAOS_DROP' | 'CHAOS_ERROR' | 'MOCK' | 'PROXY' | 'UNMATCHED_404';

export interface TrafficLog {
  id: string;
  timestamp: string;        // ISO string
  method: string;
  path: string;             // Path only, excluding query string (e.g., "/api/users")
  query: Record<string, any>;
  status: number;           // 0 if connection dropped
  durationMs: number;
  source: ResolutionSource;
  requestBody?: any;
  responseBody?: any;
}
