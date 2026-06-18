import { Router } from 'express';
import { loginHandler, logoutHandler, meHandler, requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', loginHandler);
router.post('/logout', logoutHandler);
router.get('/me', requireAuth, meHandler);

export default router;
