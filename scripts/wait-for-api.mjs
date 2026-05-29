#!/usr/bin/env node
import net from 'node:net';

const host = process.env.SIMPLE_API_HOST ?? '127.0.0.1';
const port = Number(process.env.SIMPLE_API_PORT ?? 4000);
const timeout = Number(process.env.SIMPLE_API_WAIT_TIMEOUT ?? 30000);
const interval = 200;

function waitForPort() {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const tryConnect = () => {
      const socket = net.connect({ host, port }, () => {
        socket.destroy();
        resolve();
      });

      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeout) {
          reject(new Error(`Timeout waiting for API at ${host}:${port}`));
          return;
        }
        setTimeout(tryConnect, interval);
      });
    };

    tryConnect();
  });
}

try {
  await waitForPort();
  // eslint-disable-next-line no-console
  console.log(`API disponible en ${host}:${port}`);
  process.exit(0);
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : 'Error esperando la API');
  process.exit(1);
}
