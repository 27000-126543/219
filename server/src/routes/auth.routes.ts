import { Router } from 'express';
import { registerStudent, registerUser, login, getCurrentUser } from '../controllers/auth.controller';
import { authMiddleware, requireRoles } from '../middleware/auth';

const router = Router();

router.post('/register/student', registerStudent);
router.post('/register', authMiddleware, requireRoles('ADMIN', 'PRINCIPAL'), registerUser);
router.post('/login', login);
router.get('/me', authMiddleware, getCurrentUser);

export default router;
