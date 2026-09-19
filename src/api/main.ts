import http from 'http';
import { app as expressApp } from './app.js';
import logger from '../lib/logger.js';
import { queryClient } from '../db/index.js';
import env from '../config/env.js';

const server = http.createServer(expressApp);

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    logger.info(`${signal} received, shutting down...`);

    server.close(() => {
      void queryClient.end().then(() => process.exit(0));

      setTimeout(() => process.exit(1), 10_000).unref();
    });
  });
}

server.listen(env.HTTP_PORT, () => {
  logger.info(`listening on ${env.HTTP_PORT}`);
});
