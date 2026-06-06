import { Router } from 'express';
import {
  createClass,
  getClasses,
  getClassById,
  enrollClass,
  dropClass,
  getMyClasses,
  getClassStatistics,
} from '../controllers/class.controller';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/my', authMiddleware, getMyClasses);
router.get('/:id/statistics', authMiddleware, requireRoles(Role.HEAD_TEACHER, Role.ADMIN, Role.PRINCIPAL), getClassStatistics);
router.get('/:id', authMiddleware, getClassById);
router.get('/', authMiddleware, getClasses);
router.post('/', authMiddleware, requireRoles(Role.ADMIN), createClass);

router.post('/:classId/enroll', authMiddleware, requireRoles(Role.STUDENT), enrollClass);
router.post('/:classId/drop', authMiddleware, requireRoles(Role.STUDENT), dropClass);

export default router;
