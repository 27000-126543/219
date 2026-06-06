import { Router } from 'express';
import { getLiveSessions, getSessionById, createLiveSession, updateSessionStatus, recordAttendance } from '../controllers/live.controller';
import { authMiddleware, requireRoles } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, getLiveSessions);
router.get('/:id', authMiddleware, getSessionById);
router.post('/', authMiddleware, requireRoles('TEACHER', 'ADMIN'), createLiveSession);
router.patch('/:id/status', authMiddleware, requireRoles('TEACHER', 'ADMIN'), updateSessionStatus);
router.post('/:sessionId/attendance', authMiddleware, requireRoles('STUDENT'), recordAttendance);

export default router;
