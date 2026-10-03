import express, { Router, type Response, type Request, type NextFunction } from 'express';
import { router as transfersRouter } from './routes/transfers.js';
import { HttpError, NotFoundError } from './lib/http-error.js';
import logger from '../lib/logger.js';

const app = express();
app.use(express.json());

const apiRouter = Router();
const v1Router = Router();

app.use('/api', apiRouter);
apiRouter.use('/v1', v1Router);

v1Router.get('/health', (_, res: Response) => res.json({ status: 'ok' }));

v1Router.use('/transfers', transfersRouter);

app.use((_, __, next) => next(new NotFoundError('route not found')));

app.use((err: unknown, req: Request, res: Response, _: NextFunction) => {
  if (err instanceof HttpError) {
    logger.warn({ status: err.httpCode, code: err.code }, 'http error occured');
    return res
      .status(err.httpCode)
      .json({ message: err.message, code: err.code, errors: err.errors });
  }

  if (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    err.type === 'entity.parse.failed'
  ) {
    return res.status(400).json({ message: 'invalid payload' });
  }

  logger.error({ err }, 'unknown error occured');
  res.status(500).json({ message: 'unknown error occured' });
});

export { app };
