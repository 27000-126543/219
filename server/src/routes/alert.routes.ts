import { Router } from 'express';
import {
  getAlerts,
  handleAlert,
} from '../controllers/alert.controller';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authMiddleware, getAlerts);
router.patch('/:alertId/handle', authMiddleware, requireRoles(Role.HEAD_TEACHER, Role.ADMIN), handleAlert);

export default router;
