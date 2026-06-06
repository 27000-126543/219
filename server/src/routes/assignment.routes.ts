import { Router } from 'express';
import {
  createAssignment,
  getAssignments,
  getAssignmentById,
  submitAssignment,
  gradeAssignment,
  getStudentProgress,
} from '../controllers/assignment.controller';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/progress/:studentId', authMiddleware, getStudentProgress);
router.get('/:id', authMiddleware, getAssignmentById);
router.get('/', authMiddleware, getAssignments);
router.post('/', authMiddleware, requireRoles(Role.TEACHER, Role.ADMIN), createAssignment);
router.post('/:assignmentId/submit', authMiddleware, requireRoles(Role.STUDENT), submitAssignment);
router.patch('/submissions/:submissionId/grade', authMiddleware, requireRoles(Role.TEACHER), gradeAssignment);

export default router;
