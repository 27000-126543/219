import { Router } from 'express';
import { getPrincipalOverview, getTeacherPerformanceList, generateMonthlyTeacherPerformance } from '../controllers/statistics.controller';
import { authMiddleware, requireRoles } from '../middleware/auth';

const router = Router();

router.get('/overview', authMiddleware, requireRoles('PRINCIPAL', 'ADMIN'), getPrincipalOverview);
router.get('/teacher-performance', authMiddleware, requireRoles('PRINCIPAL', 'ADMIN'), getTeacherPerformanceList);
router.post('/generate-performance', authMiddleware, requireRoles('PRINCIPAL', 'ADMIN'), generateMonthlyTeacherPerformance);

export default router;
