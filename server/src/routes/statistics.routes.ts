import { Router } from 'express';
import {
  getPrincipalOverview,
  getTeacherPerformanceList,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/statistics.controller';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/overview', authMiddleware, requireRoles(Role.PRINCIPAL, Role.ADMIN), getPrincipalOverview);
router.get('/teacher-performance', authMiddleware, requireRoles(Role.PRINCIPAL, Role.ADMIN), getTeacherPerformanceList);

router.get('/notifications', authMiddleware, getNotifications);
router.patch('/notifications/read-all', authMiddleware, markAllNotificationsRead);
router.patch('/notifications/:id/read', authMiddleware, markNotificationRead);

export default router;
