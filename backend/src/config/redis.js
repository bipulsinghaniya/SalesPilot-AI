import IORedis from 'ioredis';
import { env } from './env.js';

let redisClient = null;
let redisAvailable = false;

export function getRedisConnection() {
  if (redisClient) return redisClient;
  redisClient = new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
  });

  redisClient.on('ready', () => {
    redisAvailable = true;
    console.log('[Redis] Connected');
  });

  redisClient.on('error', (err) => {
    redisAvailable = false;
    if (env.nodeEnv !== 'test') {
      console.warn('[Redis] Unavailable:', err.message);
    }
  });

  return redisClient;
}

export async function isRedisReady() {
  const client = getRedisConnection();
  if (redisAvailable && client.status === 'ready') return true;
  try {
    if (client.status === 'wait') {
      await client.connect();
    }
    const pong = await client.ping();
    redisAvailable = pong === 'PONG';
    return redisAvailable;
  } catch {
    redisAvailable = false;
    return false;
  }
}

export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit().catch(() => {});
    redisClient = null;
    redisAvailable = false;
  }
}
