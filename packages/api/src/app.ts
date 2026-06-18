import express, { Router } from 'express';
import session from 'express-session';
import { requireAuth } from './middleware/auth';
import authRouter from './routes/auth';
import ingredientsRouter from './routes/ingredients';
import recipesRouter from './routes/recipes';

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

  app.use('/api/auth', authRouter);

  const apiRouter = Router();
  apiRouter.use(requireAuth);
  apiRouter.use('/ingredients', ingredientsRouter);
  apiRouter.use('/recipes', recipesRouter);
  app.use('/api', apiRouter);

  return app;
}
