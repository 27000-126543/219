import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
import { Role } from '@prisma/client';

export const getPrincipalOverview = async (req: AuthRequest, res: Response) => {
  try {
    const totalStudents = await prisma.studentProfile.count();
    const totalTeachers = await prisma.teacherProfile.count();
    const totalClasses = await prisma.class.count({ where: { status: 'ACTIVE' } });
    const totalCourses = await prisma.course.count({ where: { isActive: true } });

    const classes = await prisma.class.findMany({
      include: {
        subject: true,
        enrollments: { where: { status: 'CONFIRMED' } },
      },
    });

    const subjectStats: any = {};
    classes.forEach((class_) => {
      const subjectName = class_.subject.name;
      if (!subjectStats[subjectName]) {
        subjectStats[subjectName] = {
          subject: subjectName,
          classCount: 0,
          studentCount: 0,
          renewalRate: 0,
          avgScore: 0,
        };
      }
      subjectStats[subjectName].classCount++;
      subjectStats[subjectName].studentCount += class_.enrollments.length;
    });

    return successResponse(res, {
      overview: {
        totalStudents,
        totalTeachers,
        totalClasses,
        totalCourses,
      },
      subjectStats: Object.values(subjectStats),
    });
  } catch (error) {
    return errorResponse(res, '获取概览数据失败: ' + (error as Error).message, 500);
  }
};

export const getTeacherPerformanceList = async (req: AuthRequest, res: Response) => {
  try {
    const { periodType, semesterId } = req.query;

    const performances = await prisma.teacherPerformance.findMany({
      where: {
        ...(periodType && { periodType: periodType as string }),
        ...(semesterId && { semesterId: semesterId as string }),
      },
      include: {
        teacher: { include: { user: true } },
        semester: true,
      },
      orderBy: [{ rank: 'asc' }, { classCompletionRate: 'desc' }],
    });

    return successResponse(res, performances);
  } catch (error) {
    return errorResponse(res, '获取教师绩效失败: ' + (error as Error).message, 500);
  }
};

export const generateMonthlyTeacherPerformance = async () => {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const teachers = await prisma.teacherProfile.findMany({
    include: { user: true, classes: true },
  });

  const performances: any[] = [];

  for (const teacher of teachers) {
    const sessions = await prisma.liveSession.findMany({
      where: {
        teacherId: teacher.id,
        startTime: { gte: firstDayOfMonth, lte: lastDayOfMonth },
      },
    });

    const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;
    const classCompletionRate = sessions.length > 0 ? completedSessions / sessions.length : 1;

    const enrollments = await prisma.classEnrollment.findMany({
      where: {
        class: { teacherId: teacher.id },
        enrolledAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
      },
    });

    const totalStudents = new Set(enrollments.map(e => e.studentId)).size;
    const newStudents = enrollments.filter(e => e.status === 'CONFIRMED').length;
    const studentConversionRate = totalStudents > 0 ? newStudents / totalStudents : 0;

    const dropped = enrollments.filter(e => e.status === 'CANCELLED' && e.droppedAt);
    const refundRate = enrollments.length > 0 ? dropped.length / enrollments.length : 0;

    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        assignment: { teacherId: teacher.id },
        status: 'GRADED',
        totalScore: { not: null },
        gradedAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
      },
    });

    const avgScore = submissions.length > 0
      ? submissions.reduce((sum, s) => sum + s.totalScore!, 0) / submissions.length
      : 0;

    performances.push({
      teacherId: teacher.id,
      periodType: 'monthly',
      periodStart: firstDayOfMonth,
      periodEnd: lastDayOfMonth,
      classCompletionRate,
      studentConversionRate,
      refundRate,
      avgSatisfaction: teacher.avgSatisfaction,
      totalClasses: sessions.length,
      totalStudents,
      avgScore,
    });
  }

  performances.sort((a, b) => {
    const scoreA = a.classCompletionRate * 0.4 + a.studentConversionRate * 0.3 + (1 - a.refundRate) * 0.3;
    const scoreB = b.classCompletionRate * 0.4 + b.studentConversionRate * 0.3 + (1 - b.refundRate) * 0.3;
    return scoreB - scoreA;
  });

  for (let i = 0; i < performances.length; i++) {
    performances[i].rank = i + 1;
    await prisma.teacherPerformance.create({
      data: performances[i],
    });
  }

  return performances;
};

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { isRead, type } = req.query;

    const where: any = { userId };
    if (isRead !== undefined) where.isRead = isRead === 'true';
    if (type) where.type = type;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return successResponse(res, { notifications, unreadCount });
  } catch (error) {
    return errorResponse(res, '获取通知失败: ' + (error as Error).message, 500);
  }
};

export const markNotificationRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const notification = await prisma.notification.update({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });

    return successResponse(res, notification, '已标记为已读');
  } catch (error) {
    return errorResponse(res, '标记失败: ' + (error as Error).message, 500);
  }
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return successResponse(res, null, '全部标记为已读');
  } catch (error) {
    return errorResponse(res, '标记失败: ' + (error as Error).message, 500);
  }
};
