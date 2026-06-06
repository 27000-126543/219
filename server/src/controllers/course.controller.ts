import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

export const getSubjects = async (req: AuthRequest, res: Response) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return successResponse(res, subjects);
  } catch (error) {
    return errorResponse(res, '获取学科列表失败: ' + (error as Error).message, 500);
  }
};

export const getCourses = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId, level, minAge, maxAge, keyword } = req.query;

    const where: any = { isActive: true };
    if (subjectId) where.subjectId = subjectId as string;
    if (level) where.level = level as string;
    if (minAge) where.maxAge = { gte: parseInt(minAge as string) };
    if (maxAge) where.minAge = { lte: parseInt(maxAge as string) };
    if (keyword) {
      where.OR = [
        { name: { contains: keyword as string } },
        { description: { contains: keyword as string } },
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        subject: true,
        teacher: { include: { user: true } },
        semester: true,
      },
      orderBy: { popularity: 'desc' },
    });

    return successResponse(res, courses);
  } catch (error) {
    return errorResponse(res, '获取课程列表失败: ' + (error as Error).message, 500);
  }
};

export const getRecommendedCourses = async (req: AuthRequest, res: Response) => {
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!student) {
      return errorResponse(res, '学生信息不存在', 404);
    }

    const courses = await prisma.course.findMany({
      where: {
        isActive: true,
        AND: [
          { minAge: { lte: student.age || 10 } },
          { maxAge: { gte: student.age || 10 } },
        ],
      },
      include: {
        subject: true,
        teacher: { include: { user: true } },
        semester: true,
      },
      orderBy: [{ popularity: 'desc' }, { createdAt: 'desc' }],
      take: 6,
    });

    return successResponse(res, courses);
  } catch (error) {
    return errorResponse(res, '获取推荐课程失败: ' + (error as Error).message, 500);
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
        classes: { where: { status: 'ACTIVE' } },
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

export const createCourse = async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    const course = await prisma.course.create({ data });
    return successResponse(res, course, '课程创建成功');
  } catch (error) {
    return errorResponse(res, '创建课程失败: ' + (error as Error).message, 500);
  }
};
