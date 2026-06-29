// Must be imported before any router is defined: it patches Express 4 so that
// rejections thrown inside `async` route handlers are forwarded to the error
// middleware below instead of becoming an unhandledRejection that crashes the
// whole process (which previously turned a single bad query into a 502 outage).
import 'express-async-errors';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from '@todoapp/services';
import { apiRouter } from './routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(pinoHttp());

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', apiRouter);

  // Final error handler — keep responses small and don't leak stack traces.
  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      // eslint-disable-next-line no-console
      console.error(err);
      res.status(500).json({ error: 'internal_error' });
    },
  );

  return app;
}
