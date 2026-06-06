import { Router } from 'express';
import {
  createSubject,
  getSubjects,
  createCourse,
  getCourses,
  getCourseById,
  getRecommendedCourses,
} from '../controllers/course.controller';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/subjects', authMiddleware, getSubjects);
router.post('/subjects', authMiddleware, requireRoles(Role.ADMIN, Role.PRINCIPAL), createSubject);

router.get('/recommended', authMiddleware, requireRoles(Role.STUDENT), getRecommendedCourses);
router.get('/:id', authMiddleware, getCourseById);
router.get('/', authMiddleware, getCourses);
router.post('/', authMiddleware, requireRoles(Role.ADMIN, Role.TEACHER), createCourse);

export default router;
