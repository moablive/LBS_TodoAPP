import { createApp } from './app';
import { env } from '@todoapp/services';

async function main() {
  // Last-resort safety net: a stray promise rejection outside the request
  // lifecycle should be logged, not allowed to kill the process. Express
  // route errors are already handled by the error middleware in app.ts.
  process.on('unhandledRejection', (reason) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled promise rejection:', reason);
  });

  const app = createApp();
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`TodoAPP backend listening on :${env.PORT} (${env.NODE_ENV})`);
  });

  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sig, () => {
      server.close(() => process.exit(0));
    });
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
