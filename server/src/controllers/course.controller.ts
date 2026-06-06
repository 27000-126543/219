import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
import { CreateCourseDto, FilterCoursesDto } from '../types';
import { CourseLevel, Role } from '@prisma/client';

export const createSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, description, icon, color } = req.body;
    const subject = await prisma.subject.create({
      data: { name, code, description, icon, color },
    });
    return successResponse(res, subject, '学科创建成功');
  } catch (error) {
    return errorResponse(res, '创建学科失败: ' + (error as Error).message, 500);
  }
};

export const getSubjects = async (req: AuthRequest, res: Response) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { isActive: true },
      include: { _count: { select: { courses: true, classes: true } } },
    });
    return successResponse(res, subjects);
  } catch (error) {
    return errorResponse(res, '获取学科列表失败: ' + (error as Error).message, 500);
  }
};

export const createCourse = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId, semesterId, teacherId, name, description, level, minAge, maxAge, totalSessions, price } = req.body as CreateCourseDto;
    const code = `C${Date.now()}`;
    const course = await prisma.course.create({
      data: {
        subjectId,
        semesterId,
        teacherId,
        name,
        code,
        description,
        level,
        minAge,
        maxAge,
        totalSessions,
        price,
      },
      include: {
        subject: true,
        teacher: { include: { user: true } },
        semester: true,
      },
    });
    return successResponse(res, course, '课程创建成功');
  } catch (error) {
    return errorResponse(res, '创建课程失败: ' + (error as Error).message, 500);
  }
};

export const getCourses = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId, level, minAge, maxAge, search } = req.query as FilterCoursesDto;
    const where: any = { isActive: true };
    if (subjectId) where.subjectId = subjectId;
    if (level) where.level = level as CourseLevel;
    if (minAge) where.minAge = { lte: Number(minAge) };
    if (maxAge) where.maxAge = { gte: Number(maxAge) };
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const courses = await prisma.course.findMany({
      where,
      include: {
        subject: true,
        teacher: { include: { user: true } },
        semester: true,
        _count: { select: { classes: true } },
      },
      orderBy: [{ popularity: 'desc' }, { createdAt: 'desc' }],
    });
    return successResponse(res, courses);
  } catch (error) {
    return errorResponse(res, '获取课程列表失败: ' + (error as Error).message, 500);
  }
};

export const getCourseById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        subject: true,
        teacher: { include: { user: true } },
        semester: true,
        classes: true,
        assignments: true,
        exams: true,
      },
    });
    if (!course) {
      return errorResponse(res, '课程不存在', 404);
    }
    return successResponse(res, course);
  } catch (error) {
    return errorResponse(res, '获取课程详情失败: ' + (error as Error).message, 500);
  }
};

export const getRecommendedCourses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const student = await prisma.studentProfile.findFirst({
      where: { userId },
    });

    if (!student) {
      return errorResponse(res, '学生信息不存在', 404);
    }

    const where: any = { isActive: true };
    if (student.age) {
      where.AND = [
        { minAge: { lte: student.age } },
        { maxAge: { gte: student.age } },
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        subject: true,
        teacher: { include: { user: true } },
        classes: { where: { status: 'ACTIVE' } },
      },
      orderBy: [{ popularity: 'desc' }, { createdAt: 'desc' }],
      take: 10,
    });

    return successResponse(res, courses);
  } catch (error) {
    return errorResponse(res, '获取推荐课程失败: ' + (error as Error).message, 500);
  }
};
