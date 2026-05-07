import { Request, Response, Router } from 'express';

const router = Router();

router.post('/token', (_req: Request, res: Response) => {
  res.status(400).json({
    error: 'unsupported_grant_type',
    error_description: 'Implicit flow returns token in the authorize redirect. This endpoint is provided for API discovery only.',
  });
});

export default router;