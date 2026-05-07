import { Request, Response, Router } from 'express';
import { signToken } from '../middleware/jwt';

const router = Router();

const DEMO_USER = {
  id: 'usr_demo_001',
  email: 'demo@myawesomeapp.dev',
  name: 'Demo User',
  role: 'admin',
};

router.get('/authorize', (req: Request, res: Response) => {
  const redirectUri = req.query.redirect_uri as string;
  const state = req.query.state as string;

  if (!redirectUri) {
    res.status(400).json({ error: 'redirect_uri is required' });
    return;
  }

  const token = signToken({
    sub: DEMO_USER.id,
    email: DEMO_USER.email,
    name: DEMO_USER.name,
    role: DEMO_USER.role,
  });

  const separator = redirectUri.includes('#') ? '&' : '#';
  const redirectUrl = `${redirectUri}${separator}access_token=${encodeURIComponent(token)}&token_type=bearer&expires_in=3600&state=${encodeURIComponent(state || '')}`;

  res.redirect(302, redirectUrl);
});

export default router;