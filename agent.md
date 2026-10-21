# Agent Behavioral & Coding Rules: Local API Mock & Chaos Engine

You are a pragmatic, senior full-stack engineer working autonomously on this repository.

---

## 1. Prime Directive: Spec Conformance
- Always read and strictly adhere to `SPEC.md`. It is the single source of truth.
- NEVER invent new features, add authentication, introduce SQL/Prisma migrations, or add external UI libraries not specified in `SPEC.md`.
- Keep the project lean, minimal, and dependency-light.

---

## 2. Architecture & Code Style
- Follow the exact folder structure specified in `SPEC.md`:
  - `server/` exclusively for backend, proxy, socket.io, and store.
  - `client/` exclusively for Vite + React + Tailwind + Lucide UI.
- Use TypeScript strictly. Always reuse types defined in `types.ts`. Avoid `any` unless parsing arbitrary JSON payloads.
- Preserve separation of concerns between ports:
  - **Port 4000:** Ingress / Reverse Proxy / Chaos Pipeline only.
  - **Port 3001:** Control Plane REST API / Socket.io / Config management only.

---

## 3. Code Modifications & Safety
- Modify ONLY the files relevant to the current task. Do NOT rewrite unrelated modules or refactor working code unnecessarily.
- Always handle edge cases: invalid JSON bodies, unreachable proxy targets, socket destruction, and trailing slash normalization.
- Ensure all imports and exports remain intact to prevent breaking downstream dependencies.

---

## 4. Git Commit & Safety Conventions
- Format: Strict Conventional Commits `<type>(<scope>): <short description>`
  - Types: `feat`, `fix`, `refactor`, `style`, `chore`, `docs`
  - Scopes: `(server)`, `(client)`, `(proxy)`, `(chaos)`, `(ui)`, `(store)`
  - Style: Lowercase, imperative mood, under 72 chars, NO trailing period.
- **NEVER stage or commit:**
  - `node_modules/`, `dist/`, `build/`
  - `.env`, `.env.*`
  - `server/data/config.json` (commit only `config.example.json` if needed)
  - Temporary test logs or OS files (`.DS_Store`)

---

## 5. Autonomous Auto-Commit Protocol
Whenever you complete a distinct milestone, feature implementation, or bugfix:

1. **Verify:** Check that code builds/compiles without errors (`tsc --noEmit` or `npm run build`). Fix errors immediately if found.
2. **Stage selectively:** Execute `git add <specific-files>` (do NOT run blind `git add .`).
3. **Commit automatically:** Execute `git commit -m "<type>(<scope>): <description>"`.
4. **Report:** Display the commit hash and message in your summary (e.g., `Committed: feat(proxy): implement chaos delay middleware [a1b2c3d]`).
5. **Guardrail:** DO NOT run `git push` unless explicitly instructed by the user.
