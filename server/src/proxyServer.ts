import express, { Request, Response, NextFunction } from 'express';
import http, { IncomingMessage, ServerResponse } from 'http';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { store } from './store';
import { findFuzzyHints } from './fuzzy';
import { TrafficLog } from './types';

export interface ProxyServerOptions {
  port?: number;
  onTrafficLog?: (log: TrafficLog) => void;
}

function normalizePath(p: string): string {
  if (!p || p === '/') return '/';
  const stripped = p.replace(/\/+$/, '');
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export class ProxyIngressServer {
  private app: express.Express;
  private server: http.Server;
  private port: number;
  private onTrafficLog?: (log: TrafficLog) => void;

  constructor(options: ProxyServerOptions = {}) {
    this.port = options.port || 4000;
    this.onTrafficLog = options.onTrafficLog;
    this.app = express();
    this.server = http.createServer(this.app);

    this.setupPipeline();
  }

  public setLogEmitter(emitter: (log: TrafficLog) => void): void {
    this.onTrafficLog = emitter;
  }

  private emitLog(log: TrafficLog): void {
    if (this.onTrafficLog) {
      try {
        this.onTrafficLog(log);
      } catch (err) {
        console.error('Failed to emit traffic log:', err);
      }
    }
  }

  private setupPipeline(): void {
    // Step 1: CORS & Preflight handling
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');

      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
      next();
    });

    // Parse JSON body with error handling for malformed JSON
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (err instanceof SyntaxError && 'body' in err) {
        res.status(400).json({ _engine: 'INVALID_JSON', message: 'Malformed JSON payload' });
        return;
      }
      next(err);
    });

    // Main Ingress Request Pipeline
    this.app.use(async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const state = store.getConfig();
      const reqMethod = req.method.toUpperCase();
      const reqPath = normalizePath(req.path);
      const query = (req.query || {}) as Record<string, any>;
      const requestBody = req.body && Object.keys(req.body).length > 0 ? req.body : undefined;

      // Step 2: Chaos Evaluation
      if (state.chaos && state.chaos.enabled) {
        // 1. Latency Injection
        if (state.chaos.delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, state.chaos.delayMs));
        }

        // 2. Connection Drop
        if (state.chaos.dropConnection) {
          const durationMs = Date.now() - startTime;
          this.emitLog({
            id: generateLogId(),
            timestamp: new Date().toISOString(),
            method: reqMethod,
            path: reqPath,
            query,
            status: 0,
            durationMs,
            source: 'CHAOS_DROP',
            requestBody,
          });
          req.socket.destroy();
          return;
        }

        // 3. Failure Rate Injection
        if (state.chaos.failureRate > 0 && Math.random() < state.chaos.failureRate) {
          const failureStatus = state.chaos.failureStatus || 500;
          const durationMs = Date.now() - startTime;
          this.emitLog({
            id: generateLogId(),
            timestamp: new Date().toISOString(),
            method: reqMethod,
            path: reqPath,
            query,
            status: failureStatus,
            durationMs,
            source: 'CHAOS_ERROR',
            requestBody,
          });

          res.status(failureStatus).json({
            _engine: 'CHAOS_INJECTED',
            status: failureStatus,
            message: 'Simulated failure injected by Chaos Engine',
          });
          return;
        }
      }

      // Step 3: Mock Route Matching
      const matchedMock = state.mocks.find((mock) => {
        if (!mock.enabled) return false;
        if (mock.method !== reqMethod) return false;
        return normalizePath(mock.path) === reqPath;
      });

      if (matchedMock) {
        const durationMs = Date.now() - startTime;
        this.emitLog({
          id: generateLogId(),
          timestamp: new Date().toISOString(),
          method: reqMethod,
          path: reqPath,
          query,
          status: matchedMock.status || 200,
          durationMs,
          source: 'MOCK',
          requestBody,
        });

        res.status(matchedMock.status || 200).json(matchedMock.responseBody);
        return;
      }

      // Step 4: Proxy Fallback (If targetUrl is configured)
      const targetUrl = state.targetUrl ? state.targetUrl.trim() : '';
      if (targetUrl !== '') {
        const proxyHandler = createProxyMiddleware({
          target: targetUrl,
          changeOrigin: true,
          on: {
            proxyReq: fixRequestBody,
            proxyRes: (proxyRes: IncomingMessage) => {
              const durationMs = Date.now() - startTime;
              this.emitLog({
                id: generateLogId(),
                timestamp: new Date().toISOString(),
                method: reqMethod,
                path: reqPath,
                query,
                status: proxyRes.statusCode || 200,
                durationMs,
                source: 'PROXY',
                requestBody,
              });
            },
            error: (_err: Error, _pReq: IncomingMessage, pRes: ServerResponse | any) => {
              const durationMs = Date.now() - startTime;
              this.emitLog({
                id: generateLogId(),
                timestamp: new Date().toISOString(),
                method: reqMethod,
                path: reqPath,
                query,
                status: 502,
                durationMs,
                source: 'PROXY',
                requestBody,
              });

              const serverRes = pRes as Response;
              if (serverRes && !serverRes.headersSent && typeof serverRes.status === 'function') {
                serverRes.status(502).json({
                  _engine: 'PROXY_ERROR',
                  message: 'Target server unreachable',
                });
              }
            },
          },
        });

        return proxyHandler(req, res, next);
      }

      // Step 5: Smart 404 & Fuzzy Hint (If no Mock and no targetUrl)
      const didYouMean = findFuzzyHints(reqMethod, reqPath, state.mocks);
      const durationMs = Date.now() - startTime;

      this.emitLog({
        id: generateLogId(),
        timestamp: new Date().toISOString(),
        method: reqMethod,
        path: reqPath,
        query,
        status: 404,
        durationMs,
        source: 'UNMATCHED_404',
        requestBody,
      });

      res.status(404).json({
        _engine: 'MOCK_ROUTE_NOT_FOUND',
        message: `No mock found for ${reqMethod} ${reqPath} and no targetUrl configured.`,
        did_you_mean: didYouMean,
        hint: "Open Dashboard at http://localhost:5173 to click 'Create Mock' from Live Inspector.",
      });
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }
}
