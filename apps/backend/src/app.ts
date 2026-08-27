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

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': ["'self'", "data:", "https:"],
      },
    },
  }));
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(pinoHttp());

  // Versão do build, injetada pelo docker-compose a partir do arquivo VERSION.
  // O front compara este par com o que ficou congelado no bundle dele para
  // saber que saiu deploy novo — ver frontend/src/composables/useVersionCheck.ts.
  app.get('/health', (_req, res) =>
    res.json({
      ok: true,
      version: process.env.APP_VERSION || '0.0.0',
      buildDate: process.env.APP_BUILD_DATE || null,
    }),
  );
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
