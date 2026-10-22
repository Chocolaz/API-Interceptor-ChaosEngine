# Product Roadmap & Feature Backlog

## Phase 1: MVP Core Engine (Completed ✅)
- [x] Control Plane REST API & WebSocket on Port 3001
- [x] Reverse Proxy Ingress & Chaos Engine Pipeline on Port 4000
- [x] Exact String Route Matching with Trailing Slash Normalization
- [x] Levenshtein Distance Smart 404 Suggestions (`did_you_mean`)
- [x] Dark-Mode Web Dashboard (Vite + React + Tailwind + Lucide)
- [x] Real-time Traffic Inspector with Socket.io
- [x] 1-Click "Mock This" Action
- [x] Smart Record & Replay Mocking (Auto-capture Proxy Response Body)
- [x] Graceful Shutdown & Smart Port Collision Handling
- [x] Visual JSON Builder & Quick Templates (Completed in Phase 1.5 ✅)

---

## Phase 2: Advanced Capabilities (Backlog ⏳)

### 1. Dynamic Path Parameters & Wildcard Matching
- **Syntax:** `/api/users/:id`, `/api/orders/:orderId/items`, `/api/files/*`
- **Behavior:** Match parameterized URLs and extract route parameters.
- **Priority:** High

### 2. Mock Response Delay Per Route
- **Feature:** Configure custom latency on individual mock routes (independent of global chaos delay).
- **Priority:** Medium

### 3. Header & Query Parameter Matching
- **Feature:** Match mock routes not just by Path and Method, but also by specific Request Headers or Query Parameters.
- **Priority:** Low
