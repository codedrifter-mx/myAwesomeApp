import { Request, Response, Router } from 'express';

const router = Router();
const startTime = Date.now();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    service: 'auth-microservice',
    timestamp: new Date().toISOString(),
  });
});

export default router;