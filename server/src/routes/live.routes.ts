import { Router } from 'express';
import {
  createLiveSession,
  getLiveSessions,
  getSessionById,
  updateSessionStatus,
  recordAttendance,
} from '../controllers/live.controller';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/:id', authMiddleware, getSessionById);
router.get('/', authMiddleware, getLiveSessions);
router.post('/', authMiddleware, requireRoles(Role.TEACHER, Role.ADMIN), createLiveSession);
router.patch('/:id/status', authMiddleware, requireRoles(Role.TEACHER, Role.ADMIN), updateSessionStatus);
router.post('/:sessionId/attendance', authMiddleware, requireRoles(Role.STUDENT), recordAttendance);

export default router;
