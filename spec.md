# Project Specification: Local API Mock & Chaos Engine (MVP)

## 1. System Overview & Strict Rules for AI
A lightweight, local-only developer utility consisting of a Control Plane (Port 3001) with a React Dashboard (Port 5173 in dev, served by 3001 in prod) and an Ingress Proxy/Mock Server (Port 4000).

### STRICT RULES FOR AI GENERATION:
1. **NO Extra Features:** Do NOT implement authentication, database migrations, dynamic templating (Faker.js), GraphQL support, HTTPS certificates, or multi-user workspaces.
2. **Exact Schema Matching:** Follow the TypeScript interfaces in Section 3 strictly. Do not rename fields.
3. **Single Source of Truth:** All configurations are persisted in a single local file: `server/data/config.json`.
4. **In-Memory Speed:** The server must load `config.json` into memory on startup and update both memory and the file synchronously on write operations.

---

## 2. Tech Stack & Directory Structure

### Tech Stack
- **Backend:** Node.js, Express, TypeScript, `socket.io`, `http-proxy-middleware`, `cors`
- **Frontend:** React (Vite), TypeScript, Tailwind CSS, `lucide-react` (icons), `socket.io-client`
- **Storage:** Local JSON file (`fs/promises`)

### Monorepo Directory Structure
```text
chaos-mock-engine/
├── SPEC.md
├── server/
│   ├── data/
│   │   └── config.json          # Auto-generated if missing
│   ├── src/
│   │   ├── types.ts             # Shared TypeScript interfaces
│   │   ├── store.ts             # Read/Write config.json + In-memory state
│   │   ├── fuzzy.ts             # Levenshtein distance algorithm
│   │   ├── controlServer.ts     # Port 3001: REST API + Socket.io
│   │   ├── proxyServer.ts       # Port 4000: Chaos + Mock + Proxy pipeline
│   │   └── index.ts             # Entry point booting both servers
│   ├── package.json
│   └── tsconfig.json
└── client/
    ├── src/
    │   ├── components/
    │   │   ├── ChaosPanel.tsx       # Top bar controls for Chaos & Target URL
    │   │   ├── MockList.tsx         # Left column: CRUD list of mocks
    │   │   ├── MockModal.tsx        # Create/Edit Mock Dialog
    │   │   └── LiveInspector.tsx    # Right column: Real-time request stream
    │   ├── types.ts                 # Identical to server/src/types.ts
    │   ├── App.tsx
    │   └── main.tsx
    ├── package.json
    └── vite.config.ts
```

---

## 3. Data Models & TypeScript Interfaces (`types.ts`)

Both `server/src/types.ts` and `client/src/types.ts` MUST use these exact definitions:

```typescript
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
  path: string;             // Must start with "/", e.g., "/api/v1/users"
  status: number;           // Default: 200
  responseBody: any;        // Parsed JSON object or array
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
}
```

---

## 4. Backend Pipeline Specification (Port 4000)

Every request hitting Port `4000` MUST go through these exact sequential steps:

### Step 1: Request Initialization & CORS
- Enable CORS for all origins (`*`), allowing all methods and headers (`*`), handling `OPTIONS` preflight with `204 No Content` immediately (do not log or apply chaos to `OPTIONS`).
- Record `startTime = Date.now()`.
- Extract `reqPath = req.path` (ignoring trailing slashes, normalized: `/api/users/` -> `/api/users`).

### Step 2: Chaos Evaluation
Check `state.chaos.enabled`. If `true`:
1. **Latency Injection:** If `delayMs > 0`, pause execution for `delayMs` milliseconds.
2. **Connection Drop:** If `dropConnection === true`, call `req.socket.destroy()`, emit `TrafficLog` with `source: 'CHAOS_DROP', status: 0`, and halt.
3. **Failure Rate Injection:** Generate `rand = Math.random()`. If `rand < state.chaos.failureRate`:
   - Respond with HTTP status `state.chaos.failureStatus` and JSON body:
     ```json
     {
       "_engine": "CHAOS_INJECTED",
       "status": 503,
       "message": "Simulated failure injected by Chaos Engine"
     }
     ```
   - Emit `TrafficLog` with `source: 'CHAOS_ERROR'`, and halt.

### Step 3: Mock Route Matching
Search `state.mocks` where:
- `mock.enabled === true`
- `mock.method === req.method.toUpperCase()`
- Normalized `mock.path === reqPath` (Exact string match only)

**If matched:**
- Respond with `mock.status` and JSON `mock.responseBody`.
- Emit `TrafficLog` with `source: 'MOCK'`, and halt.

### Step 4: Proxy Fallback (If `targetUrl` is configured)
Check if `state.targetUrl.trim() !== ""`.
**If configured:**
- Forward request to `state.targetUrl` using `http-proxy-middleware` (with `changeOrigin: true`).
- Capture response status code on completion, emit `TrafficLog` with `source: 'PROXY'`, and halt.
- If the proxy target is unreachable, return `502 Bad Gateway` with `{ "_engine": "PROXY_ERROR", "message": "Target server unreachable" }`.

### Step 5: Smart 404 & Fuzzy Hint (If no Mock and no `targetUrl`)
- Compute Levenshtein distance between `reqPath` and all `mock.path` strings in `state.mocks`.
- Filter paths where distance `<= 4` (or top 3 closest matches), sorted by distance ascending.
- Respond with HTTP `404` and JSON body:
  ```json
  {
    "_engine": "MOCK_ROUTE_NOT_FOUND",
    "message": "No mock found for GET /api/usrs and no targetUrl configured.",
    "did_you_mean": [
      "GET /api/users"
    ],
    "hint": "Open Dashboard at http://localhost:5173 to click 'Create Mock' from Live Inspector."
  }
  ```
- Emit `TrafficLog` with `source: 'UNMATCHED_404', status: 404`.

---

## 5. Control Plane API Specification (Port 3001)

### 5.1 REST Endpoints
All endpoints accept and return `application/json`.

| Method | Path | Request Body | Response (`200 OK`) | Description |
|---|---|---|---|---|
| `GET` | `/_api/config` | None | `AppConfig` | Returns entire current state |
| `PUT` | `/_api/chaos` | `ChaosConfig` | `ChaosConfig` | Updates chaos settings & saves to disk |
| `PUT` | `/_api/target` | `{ targetUrl: string }` | `{ targetUrl: string }` | Updates proxy target URL & saves to disk |
| `POST` | `/_api/mocks` | `Omit<MockRoute, 'id'>` | `MockRoute` | Creates new mock, generates `id`, saves to disk |
| `PUT` | `/_api/mocks/:id` | `Partial<MockRoute>` | `MockRoute` | Updates existing mock by ID, saves to disk |
| `DELETE` | `/_api/mocks/:id` | None | `{ success: true }` | Deletes mock by ID, saves to disk |
| `POST` | `/_api/logs/clear` | None | `{ success: true }` | Broadcasts clear event to clients |

### 5.2 Validation Rules on Control API
- `MockRoute.path` MUST start with `/`. If user submits `api/users`, auto-prepend `/`.
- `MockRoute.responseBody` MUST be valid JSON.
- `ChaosConfig.delayMs` clamped between `0` and `10000`.
- `ChaosConfig.failureRate` clamped between `0` and `1`.

### 5.3 WebSocket Events (`socket.io` on Port 3001)
- **Server -> Client Event:** `traffic_log`
  - Payload: `TrafficLog` object (emitted immediately after any request on Port 4000 finishes).

---

## 6. Frontend UI/UX Specification

Single-page dark-mode dashboard layout (`h-screen overflow-hidden flex flex-col bg-slate-950 text-slate-100`).

### 6.1 Top Header & Chaos Bar (`ChaosPanel.tsx`)
Fixed height bar containing:
1. **Server Status Indicator:** Shows `Proxy Ingress: http://localhost:4000` (with a copy button).
2. **Target Backend Input:** Text input for `targetUrl` with a "Save" button (placeholder: `https://api.example.com (Leave empty for Mock-only)`).
3. **Chaos Master Switch:** Prominent toggle button (`Chaos Active` in red glow when ON, gray when OFF).
4. **Chaos Controls (Immediate auto-save on change via `PUT /_api/chaos`):**
   - **Latency Slider:** `0ms` to `5000ms` (step `100ms`), displaying current value badge.
   - **Failure Rate Slider:** `0%` to `100%` (step `5%`), displaying percentage badge.
   - **Error Status Dropdown:** Select from `400, 401, 403, 404, 429, 500, 502, 503, 504`.
   - **Drop Connection Checkbox:** Boolean toggle.

### 6.2 Main Content Split View (2 Columns, `flex-1 overflow-hidden`)

#### Left Column (50% width): Mock Routes Manager (`MockList.tsx`)
- **Header:** Title "Mock Routes", Search filter input, and `+ New Mock` button.
- **List Items:** Each row displays:
  - Toggle switch (`enabled`).
  - Method Badge (`GET` = blue, `POST` = green, `PUT/PATCH` = amber, `DELETE` = red).
  - Path string in monospace font.
  - Status Code badge (e.g., `200`).
  - `Edit` and `Delete` icon buttons.

#### Right Column (50% width): Live Traffic Inspector (`LiveInspector.tsx`)
- **Header:** Title "Live Traffic (Port 4000)", item count, and `Clear` button.
- **Stream List (Newest at top, max 100 items in state):**
  - Each row shows: Timestamp, Method Badge, Path, Status Code, Duration (`ms`), and Source Badge:
    - `MOCK` (Green badge)
    - `PROXY` (Blue badge)
    - `CHAOS_ERROR` / `CHAOS_DROP` (Red pulsing badge)
    - `UNMATCHED_404` (Amber warning badge)
  - **1-Click Action:** If a log has `source === 'UNMATCHED_404'` or `source === 'PROXY'`, display a `+ Mock This` button on the row. Clicking it opens `MockModal` pre-filled with that log's `method` and `path`.

### 6.3 Create/Edit Mock Modal (`MockModal.tsx`)
- Form fields:
  - `Method`: Select (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
  - `Path`: Text input (e.g., `/api/users`).
  - `Status Code`: Number input (default `200`).
  - `Response Body (JSON)`: Textarea with monospace font. Must validate `JSON.parse()` before enabling the Save button; show inline red error text if invalid JSON.
  - Buttons: `Cancel` and `Save Mock`.

---

## 7. Default Seed Data (`server/data/config.json`)

If `server/data/config.json` does not exist on boot, initialize with:

```json
{
  "targetUrl": "",
  "chaos": {
    "enabled": false,
    "delayMs": 0,
    "failureRate": 0,
    "failureStatus": 500,
    "dropConnection": false
  },
  "mocks": [
    {
      "id": "mock_default_1",
      "enabled": true,
      "method": "GET",
      "path": "/api/health",
      "status": 200,
      "responseBody": {
        "status": "ok",
        "message": "Mock server is running smoothly"
      }
    }
  ]
}
```