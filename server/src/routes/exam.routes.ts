import { Router } from 'express';
import {
  createExam,
  getExams,
  getExamById,
  publishExam,
  submitExam,
  gradeExam,
} from '../controllers/exam.controller';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/:id', authMiddleware, getExamById);
router.get('/', authMiddleware, getExams);
router.post('/', authMiddleware, requireRoles(Role.ADMIN, Role.TEACHER), createExam);
router.post('/:id/publish', authMiddleware, requireRoles(Role.ADMIN, Role.TEACHER), publishExam);
router.post('/:examId/submit', authMiddleware, requireRoles(Role.STUDENT), submitExam);
router.patch('/submissions/:submissionId/grade', authMiddleware, requireRoles(Role.TEACHER), gradeExam);

export default router;
