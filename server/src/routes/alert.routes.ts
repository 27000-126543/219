import { Router } from 'express';
import { getAlerts, getAlertById, handleAlert, checkAbsenteeismAlerts, checkScoreAlerts } from '../controllers/alert.controller';
import { authMiddleware, requireRoles } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, getAlerts);
router.get('/:id', authMiddleware, getAlertById);
router.patch('/:alertId/handle', authMiddleware, requireRoles('HEAD_TEACHER', 'ADMIN'), handleAlert);
router.post('/check-absenteeism', authMiddleware, requireRoles('HEAD_TEACHER', 'ADMIN'), checkAbsenteeismAlerts);
router.post('/check-scores', authMiddleware, requireRoles('HEAD_TEACHER', 'ADMIN'), checkScoreAlerts);

export default router;
