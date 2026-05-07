import { Request, Response, Router } from 'express';
import { verifyToken, extractBearerToken } from '../middleware/jwt';

const router = Router();

router.get('/userinfo', (req: Request, res: Response) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({ error: 'unauthorized', error_description: 'Missing bearer token' });
    return;
  }

  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'invalid_token', error_description: 'Token is invalid or expired' });
    return;
  }

  res.json({
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  });
});

export default router;