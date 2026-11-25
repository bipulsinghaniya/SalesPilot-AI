import http from 'http';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { closeRedis } from './config/redis.js';
import { createApp } from './app.js';
import { initSocketIO } from './sockets/index.js';
import { attachVoiceWebSockets } from './sockets/voiceWsServer.js';
import { closeAllQueues } from './queues/queueRegistry.js';

async function bootstrap() {
  await connectDB();

  const app = createApp();
  const httpServer = http.createServer(app);

  initSocketIO(httpServer);
  attachVoiceWebSockets(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`[Server] ${env.appName} listening on port ${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async () => {
    console.log('[Server] Graceful shutdown initiated...');
    httpServer.close();
    await closeAllQueues();
    await closeRedis();
    await disconnectDB();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
