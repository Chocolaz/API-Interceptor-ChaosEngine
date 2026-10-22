import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { store } from './store';
import { ChaosConfig, HttpMethod, MockRoute, TrafficLog } from './types';

export class ControlPlaneServer {
  private app: express.Express;
  private server: http.Server;
  private io: SocketIOServer;
  private port: number;

  constructor(port: number = 3001) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      },
    });

    this.setupMiddlewares();
    this.setupRoutes();
  }

  private setupMiddlewares(): void {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    // GET /_api/config
    this.app.get('/_api/config', (_req: Request, res: Response) => {
      res.json(store.getConfig());
    });

    // PUT /_api/chaos
    this.app.put('/_api/chaos', async (req: Request, res: Response) => {
      try {
        const body = req.body || {};
        const delayMs = Math.max(0, Math.min(10000, Number(body.delayMs) || 0));
        const failureRate = Math.max(0, Math.min(1.0, Number(body.failureRate) || 0));
        const failureStatus = Number(body.failureStatus) || 500;
        const enabled = Boolean(body.enabled);
        const dropConnection = Boolean(body.dropConnection);

        const updatedChaos: ChaosConfig = {
          enabled,
          delayMs,
          failureRate,
          failureStatus,
          dropConnection,
        };

        const saved = await store.updateChaos(updatedChaos);
        res.json(saved);
      } catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to update chaos config' });
      }
    });

    // PUT /_api/target
    this.app.put('/_api/target', async (req: Request, res: Response) => {
      try {
        const targetUrl = typeof req.body?.targetUrl === 'string' ? req.body.targetUrl.trim() : '';
        const saved = await store.updateTargetUrl(targetUrl);
        res.json({ targetUrl: saved });
      } catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to update target URL' });
      }
    });

    // POST /_api/mocks
    this.app.post('/_api/mocks', async (req: Request, res: Response) => {
      try {
        const { method, path: rawPath, status, responseBody, enabled, delayMs, queryParams, headers } = req.body;

        if (!method || !rawPath) {
          res.status(400).json({ error: 'method and path are required' });
          return;
        }

        // Section 5.2: path MUST start with '/'
        let normalizedPath = String(rawPath).trim();
        if (!normalizedPath.startsWith('/')) {
          normalizedPath = `/${normalizedPath}`;
        }

        // Section 5.2: Validate responseBody JSON
        let parsedBody = responseBody;
        if (typeof responseBody === 'string') {
          try {
            parsedBody = JSON.parse(responseBody);
          } catch {
            res.status(400).json({ error: 'responseBody must be valid JSON' });
            return;
          }
        }

        const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
        const upperMethod = String(method).toUpperCase() as HttpMethod;
        if (!validMethods.includes(upperMethod)) {
          res.status(400).json({ error: `Invalid HTTP method: ${method}` });
          return;
        }

        const newMock = await store.addMock({
          enabled: enabled !== undefined ? Boolean(enabled) : true,
          method: upperMethod,
          path: normalizedPath,
          status: Number(status) || 200,
          responseBody: parsedBody ?? {},
          delayMs: delayMs !== undefined ? Math.max(0, Number(delayMs) || 0) : undefined,
          queryParams: typeof queryParams === 'object' && queryParams !== null ? queryParams : undefined,
          headers: typeof headers === 'object' && headers !== null ? headers : undefined,
        });

        res.json(newMock);
      } catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to create mock route' });
      }
    });

    // PUT /_api/mocks/:id
    this.app.put('/_api/mocks/:id', async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const updates: Partial<MockRoute> = {};

        if (req.body.method !== undefined) {
          const upper = String(req.body.method).toUpperCase() as HttpMethod;
          const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
          if (!validMethods.includes(upper)) {
            res.status(400).json({ error: `Invalid HTTP method: ${req.body.method}` });
            return;
          }
          updates.method = upper;
        }

        if (req.body.path !== undefined) {
          let p = String(req.body.path).trim();
          if (!p.startsWith('/')) {
            p = `/${p}`;
          }
          updates.path = p;
        }

        if (req.body.status !== undefined) {
          updates.status = Number(req.body.status) || 200;
        }

        if (req.body.enabled !== undefined) {
          updates.enabled = Boolean(req.body.enabled);
        }

        if (req.body.responseBody !== undefined) {
          let parsed = req.body.responseBody;
          if (typeof parsed === 'string') {
            try {
              parsed = JSON.parse(parsed);
            } catch {
              res.status(400).json({ error: 'responseBody must be valid JSON' });
              return;
            }
          }
          updates.responseBody = parsed;
        }

        if (req.body.delayMs !== undefined) {
          updates.delayMs = Math.max(0, Number(req.body.delayMs) || 0);
        }

        if (req.body.queryParams !== undefined) {
          updates.queryParams = typeof req.body.queryParams === 'object' && req.body.queryParams !== null ? req.body.queryParams : undefined;
        }

        if (req.body.headers !== undefined) {
          updates.headers = typeof req.body.headers === 'object' && req.body.headers !== null ? req.body.headers : undefined;
        }

        const updated = await store.updateMock(id, updates);
        if (!updated) {
          res.status(404).json({ error: `Mock route with id ${id} not found` });
          return;
        }

        res.json(updated);
      } catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to update mock route' });
      }
    });

    // DELETE /_api/mocks/:id
    this.app.delete('/_api/mocks/:id', async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const deleted = await store.deleteMock(id);
        if (!deleted) {
          res.status(404).json({ error: `Mock route with id ${id} not found` });
          return;
        }
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to delete mock route' });
      }
    });

    // POST /_api/logs/clear
    this.app.post('/_api/logs/clear', (_req: Request, res: Response) => {
      this.io.emit('logs_cleared');
      res.json({ success: true });
    });

    // Production: serve built client assets if available
    const clientDistPath = path.resolve(__dirname, '../../client/dist');
    if (fs.existsSync(clientDistPath)) {
      this.app.use(
        express.static(clientDistPath, {
          setHeaders: (res) => {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          },
        })
      );
      this.app.get('*', (req: Request, res: Response, next: NextFunction) => {
        if (req.path.startsWith('/_api') || req.path.startsWith('/socket.io')) {
          return next();
        }
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(path.join(clientDistPath, 'index.html'));
      });
    }
  }

  public emitTrafficLog(log: TrafficLog): void {
    this.io.emit('traffic_log', log);
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`\n❌ [Control Plane] Port ${this.port} is already in use by another process!`);
          console.error(`👉 Run this in PowerShell to free it:`);
          console.error(`   Get-Process -Id (Get-NetTCPConnection -LocalPort ${this.port}).OwningProcess | Stop-Process -Force\n`);
        }
        reject(err);
      });
      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }
}
