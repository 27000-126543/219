import { Router } from 'express';
import { getAssignments, getAssignmentById, createAssignment, submitAssignment, gradeAssignment, getStudentProgress } from '../controllers/assignment.controller';
import { authMiddleware, requireRoles } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, getAssignments);
router.get('/:id', authMiddleware, getAssignmentById);
router.get('/student/:studentId/progress', authMiddleware, getStudentProgress);
router.post('/', authMiddleware, requireRoles('TEACHER', 'ADMIN'), createAssignment);
router.post('/:assignmentId/submit', authMiddleware, requireRoles('STUDENT'), submitAssignment);
router.patch('/submissions/:submissionId/grade', authMiddleware, requireRoles('TEACHER'), gradeAssignment);

export default router;
