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

## Phase 2: Advanced Capabilities (Completed ✅)

- [x] **Dynamic Path Parameters & Wildcard Matching**
  - Syntax: `/api/users/:id`, `/api/orders/:orderId/items`, `/api/files/*`
  - Zero-dependency regex extraction with static exact-match priority.
- [x] **Mock Response Delay Per Route**
  - Configure custom latency on individual mock routes (`delayMs`), independent of global chaos settings.
- [x] **Header & Query Parameter Matching**
  - Match mock routes conditionally by expected Request Headers and/or Query Parameters.
  - Interactive rule builder in web dashboard modal with visual indicators in route list.
