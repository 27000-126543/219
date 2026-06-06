import { Router } from 'express';
import {
  createScheduleChange,
  getScheduleChanges,
  reviewScheduleChange,
} from '../controllers/schedule.controller';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authMiddleware, getScheduleChanges);
router.post('/', authMiddleware, requireRoles(Role.TEACHER), createScheduleChange);
router.patch('/:id/review', authMiddleware, requireRoles(Role.ADMIN, Role.PRINCIPAL), reviewScheduleChange);

export default router;
