import { Router } from 'express';
import { getClasses, getClassById, createClass, enrollClass, dropClass, getMyClasses, getClassStatistics } from '../controllers/class.controller';
import { authMiddleware, requireRoles } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, getClasses);
router.get('/my', authMiddleware, getMyClasses);
router.get('/:id', authMiddleware, getClassById);
router.get('/:id/statistics', authMiddleware, requireRoles('HEAD_TEACHER', 'ADMIN', 'PRINCIPAL'), getClassStatistics);
router.post('/', authMiddleware, requireRoles('ADMIN'), createClass);
router.post('/:classId/enroll', authMiddleware, requireRoles('STUDENT'), enrollClass);
router.post('/:classId/drop', authMiddleware, requireRoles('STUDENT'), dropClass);

export default router;
