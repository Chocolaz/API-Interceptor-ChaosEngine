import { store } from './store';
import { ControlPlaneServer } from './controlServer';
import { ProxyIngressServer } from './proxyServer';

const CONTROL_PORT = 3001;
const PROXY_PORT = 4000;

async function bootstrap() {
  try {
    // 1. Initialize in-memory configuration store from disk
    await store.init();
    console.log('[Store] Configuration loaded successfully.');

    // 2. Initialize Control Plane Server (Port 3001)
    const controlServer = new ControlPlaneServer(CONTROL_PORT);

    // 3. Initialize Ingress Proxy Server (Port 4000)
    const proxyServer = new ProxyIngressServer({
      port: PROXY_PORT,
      onTrafficLog: (log) => controlServer.emitTrafficLog(log),
    });

    // 4. Start both servers
    await controlServer.start();
    console.log(`[Control Plane] Running on http://localhost:${CONTROL_PORT}`);

    await proxyServer.start();
    console.log(`[Proxy Ingress] Running on http://localhost:${PROXY_PORT}`);
  } catch (error) {
    console.error('Fatal error during server startup:', error);
    process.exit(1);
  }
}

bootstrap();
