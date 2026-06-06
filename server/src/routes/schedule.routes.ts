import { Router } from 'express';
import { getScheduleChanges, getScheduleChangeById, createScheduleChange, reviewScheduleChange } from '../controllers/schedule.controller';
import { authMiddleware, requireRoles } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, getScheduleChanges);
router.get('/:id', authMiddleware, getScheduleChangeById);
router.post('/', authMiddleware, requireRoles('TEACHER'), createScheduleChange);
router.patch('/:id/review', authMiddleware, requireRoles('ADMIN', 'PRINCIPAL'), reviewScheduleChange);

export default router;
