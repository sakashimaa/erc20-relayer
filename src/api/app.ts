import express, { Router, type Response } from 'express';

const app = express();
app.use(express.json());

const apiRouter = Router();
const v1Router = Router();

app.use('/api', apiRouter);
apiRouter.use('/v1', v1Router);

v1Router.get('/health', (_, res: Response) => res.json({ status: 'ok' }));

export { app };
