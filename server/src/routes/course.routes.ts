import { Router } from 'express';
import { getSubjects, getCourses, getRecommendedCourses, getCourseById, createCourse, createSubject } from '../controllers/course.controller';
import { authMiddleware, requireRoles } from '../middleware/auth';

const router = Router();

router.get('/subjects', getSubjects);
router.get('/', getCourses);
router.get('/recommended', authMiddleware, requireRoles('STUDENT'), getRecommendedCourses);
router.get('/:id', getCourseById);
router.post('/subjects', authMiddleware, requireRoles('ADMIN', 'PRINCIPAL'), createSubject);
router.post('/', authMiddleware, requireRoles('ADMIN', 'TEACHER'), createCourse);

export default router;
