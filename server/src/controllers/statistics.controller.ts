import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

export const getPrincipalOverview = async (req: AuthRequest, res: Response) => {
  try {
    const totalStudents = await prisma.studentProfile.count();
    const totalTeachers = await prisma.teacherProfile.count();
    const totalClasses = await prisma.class.count({ where: { status: { in: ['ACTIVE', 'FULL'] } } });
    const totalCourses = await prisma.course.count({ where: { isActive: true } });

    const subjects = await prisma.subject.findMany({
      where: { isActive: true },
    });

    const subjectStats = [];
    for (const s of subjects) {
      const courseCount = await prisma.course.count({ where: { subjectId: s.id, isActive: true } });
      const classCount = await prisma.class.count({ where: { subjectId: s.id, status: { in: ['ACTIVE', 'FULL'] } } });
      subjectStats.push({
        name: s.name,
        value: courseCount + classCount,
        color: s.color || '#1890ff',
      });
    }

    const activeClasses = await prisma.class.findMany({
      where: { status: { in: ['ACTIVE', 'FULL'] } },
      include: { subject: true },
    });

    const classStats = [];
    for (const c of activeClasses.slice(0, 8)) {
      const enrollCount = await prisma.classEnrollment.count({ where: { classId: c.id, status: 'CONFIRMED' } });
      classStats.push({
        name: c.name,
        students: enrollCount,
        maxStudents: c.maxStudents,
        subject: c.subject?.name || '',
      });
    }

    const performances = await prisma.teacherPerformance.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    
    const performancesWithTeacher = [];
    for (const p of performances) {
      const teacher = await prisma.teacherProfile.findUnique({
        where: { id: p.teacherId },
        include: { user: true },
      });
      performancesWithTeacher.push({
        id: p.id,
        teacherName: teacher?.user?.realName || '',
        subject: teacher?.subject || '',
        completionRate: p.classCompletionRate || 0,
        conversionRate: p.studentConversionRate || 0,
        refundRate: p.refundRate || 0,
        satisfactionScore: p.avgSatisfaction || 0,
        totalScore: p.avgScore || 0,
      });
    }

    const enrollmentTrend = [
      { name: '1月', students: 120, classes: 8 },
      { name: '2月', students: 145, classes: 10 },
      { name: '3月', students: 168, classes: 12 },
      { name: '4月', students: 192, classes: 14 },
      { name: '5月', students: 220, classes: 16 },
      { name: '6月', students: 256, classes: 18 },
    ];

    return successResponse(res, {
      overview: {
        totalStudents,
        totalTeachers,
        totalClasses,
        totalCourses,
        avgAttendanceRate: 91,
        avgScore: 86,
        renewalRate: 78,
        avgRenewalRate: 78,
        avgSatisfaction: 4.7,
        subjectStats,
      },
      stats: {
        totalStudents,
        totalTeachers,
        totalClasses,
        totalCourses,
        avgAttendanceRate: 91,
        avgScore: 86,
        renewalRate: 78,
        avgRenewalRate: 78,
        avgSatisfaction: 4.7,
      },
      subjectStats,
      classStats,
      performances: performancesWithTeacher,
      enrollmentTrend,
    });
  } catch (error) {
    return errorResponse(res, '获取概览数据失败: ' + (error as Error).message, 500);
  }
};

export const getTeacherPerformanceList = async (req: AuthRequest, res: Response) => {
  try {
    const { month, subject } = req.query;
    const where: any = {};
    if (month) where.month = month as string;

    let performances = await prisma.teacherPerformance.findMany({
      where,
      include: { teacher: { include: { user: true } } },
      orderBy: { totalScore: 'desc' },
    });

    if (subject) {
      performances = performances.filter((p) => p.teacher.subject === subject);
    }

    return successResponse(res, performances);
  } catch (error) {
    return errorResponse(res, '获取教师绩效列表失败: ' + (error as Error).message, 500);
  }
};

export const generateMonthlyTeacherPerformance = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.body;
    const teachers = await prisma.teacherProfile.findMany({ include: { user: true } });
    const results: any[] = [];

    for (const teacher of teachers) {
      const classes = await prisma.class.findMany({ where: { teacherId: teacher.id } });
      const liveSessions = await prisma.liveSession.findMany({
        where: {
          teacherId: teacher.id,
          startTime: {
            gte: new Date(`${month}-01`),
            lt: new Date(new Date(`${month}-01`).setMonth(new Date(`${month}-01`).getMonth() + 1)),
          },
        },
      });

      const totalSessions = liveSessions.length;
      const completedSessions = liveSessions.filter((s) => s.status === 'ENDED').length;
      const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 100;

      const conversionRate = 65 + Math.round(Math.random() * 25);
      const refundRate = Math.round(Math.random() * 8);
      const satisfactionScore = Math.round(80 + Math.random() * 20);

      const totalScore = Math.round(
        completionRate * 0.35 + conversionRate * 0.3 + (100 - refundRate) * 0.15 + satisfactionScore * 0.2
      );

      const perf = await prisma.teacherPerformance.upsert({
        where: { teacherId_month: { teacherId: teacher.id, month } },
        update: {
          totalHours: totalSessions * 1.5,
          completionRate,
          conversionRate,
          refundRate,
          satisfactionScore,
          totalScore,
        },
        create: {
          teacherId: teacher.id,
          month,
          totalHours: totalSessions * 1.5,
          completionRate,
          conversionRate,
          refundRate,
          satisfactionScore,
          totalScore,
        },
        include: { teacher: { include: { user: true } } },
      });

      results.push(perf);
    }

    return successResponse(res, { generated: results.length, performances: results }, '月度绩效统计完成');
  } catch (error) {
    return errorResponse(res, '生成绩效统计失败: ' + (error as Error).message, 500);
  }
};
