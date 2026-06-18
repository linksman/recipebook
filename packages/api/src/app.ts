import express from 'express';
import session from 'express-session';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? 'dev-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    })
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
