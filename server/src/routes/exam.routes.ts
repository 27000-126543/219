import { Router } from 'express';
import { getExams, getExamById, createExam, publishExam, submitExam, gradeExam, getExamStatistics } from '../controllers/exam.controller';
import { authMiddleware, requireRoles } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, getExams);
router.get('/:id', authMiddleware, getExamById);
router.get('/:id/statistics', authMiddleware, getExamStatistics);
router.post('/', authMiddleware, requireRoles('ADMIN', 'TEACHER'), createExam);
router.post('/:id/publish', authMiddleware, requireRoles('ADMIN', 'TEACHER'), publishExam);
router.post('/:examId/submit', authMiddleware, requireRoles('STUDENT'), submitExam);
router.patch('/submissions/:submissionId/grade', authMiddleware, requireRoles('TEACHER'), gradeExam);

export default router;
