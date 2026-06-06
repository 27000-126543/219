import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
import { AlertType, AlertStatus, NotificationType, Role } from '@prisma/client';
import { createNotification } from '../services/notification.service';

export const checkAndCreateAlerts = async (classId: string, studentId: string) => {
  const attendanceRecords = await prisma.sessionAttendance.findMany({
    where: {
      studentId,
      session: { classId },
      isPresent: false,
    },
    orderBy: { session: { startTime: 'desc' } },
    take: 3,
  });

  if (attendanceRecords.length >= 3) {
    const existingAlert = await prisma.alert.findFirst({
      where: {
        studentId,
        classId,
        type: AlertType.ABSENTEEISM,
        status: { in: [AlertStatus.PENDING, AlertStatus.HANDLED] },
      },
    });

    if (!existingAlert) {
      const class_ = await prisma.class.findUnique({
        where: { id: classId },
        include: { headTeacher: true, course: true },
      });

      const alert = await prisma.alert.create({
        data: {
          studentId,
          classId,
          type: AlertType.ABSENTEEISM,
          title: '连续缺课预警',
          description: `学生已连续3次缺课，请及时关注并沟通`,
          severity: 'high',
        },
        include: {
          student: { include: { user: true } },
          class: { include: { headTeacher: true } },
        },
      });

      if (class_?.headTeacherId) {
        await createNotification(
          class_.headTeacherId,
          NotificationType.SCORE_ALERT,
          '学生缺课预警',
          `班级 "${class_.course?.name || class_.name}" 学生 "${alert.student.user.realName}" 已连续3次缺课`,
          { alertId: alert.id, studentId, classId }
        );
      }
    }
  }

  const recentScores = await prisma.assignmentSubmission.findMany({
    where: {
      studentId,
      status: 'GRADED',
      totalScore: { not: null },
      assignment: { classId },
    },
    include: { assignment: true },
    orderBy: { gradedAt: 'desc' },
    take: 2,
  });

  if (recentScores.length >= 2) {
    const [latest, previous] = recentScores;
    const latestScore = latest.totalScore!;
    const previousScore = previous.totalScore!;
    const maxScore = latest.assignment.totalScore;
    const dropPercent = ((previousScore - latestScore) / maxScore) * 100;

    if (dropPercent >= 10) {
      const existingAlert = await prisma.alert.findFirst({
        where: {
          studentId,
          classId,
          type: AlertType.SCORE_DROP,
          status: { in: [AlertStatus.PENDING, AlertStatus.HANDLED] },
        },
      });

      if (!existingAlert) {
        const class_ = await prisma.class.findUnique({
          where: { id: classId },
          include: { headTeacher: true },
        });

        const alert = await prisma.alert.create({
          data: {
            studentId,
            classId,
            type: AlertType.SCORE_DROP,
            title: '成绩下降预警',
            description: `学生成绩下降超过10%，上次：${previousScore}分，本次：${latestScore}分`,
            severity: 'medium',
          },
          include: {
            student: { include: { user: true } },
          },
        });

        if (class_?.headTeacherId) {
          await createNotification(
            class_.headTeacherId,
            NotificationType.SCORE_ALERT,
            '学生成绩预警',
            `学生 "${alert.student.user.realName}" 成绩下降超过10%`,
            { alertId: alert.id, studentId, classId }
          );
        }
      }
    }
  }
};

export const getAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, studentId, status, type } = req.query;
    const where: any = {};
    if (classId) where.classId = classId;
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;
    if (type) where.type = type;

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        student: { include: { user: true } },
        class: { include: { course: true } },
        handler: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(res, alerts);
  } catch (error) {
    return errorResponse(res, '获取预警列表失败: ' + (error as Error).message, 500);
  }
};

export const handleAlert = async (req: AuthRequest, res: Response) => {
  try {
    const { alertId } = req.params;
    const userId = req.user?.userId;
    const { handlingNote, status } = req.body;

    const alert = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: status || AlertStatus.HANDLED,
        handlerId: userId,
        handlingNote,
        handledAt: new Date(),
      },
      include: {
        student: { include: { user: true } },
        class: true,
      },
    });

    return successResponse(res, alert, '预警已处理');
  } catch (error) {
    return errorResponse(res, '处理预警失败: ' + (error as Error).message, 500);
  }
};

export const getClassStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { classId } = req.params;

    const class_ = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        enrollments: { include: { student: { include: { user: true } } } },
        liveSessions: true,
      },
    });

    if (!class_) {
      return errorResponse(res, '班级不存在', 404);
    }

    const totalSessions = class_.liveSessions.length;
    const studentIds = class_.enrollments.filter(e => e.status === 'CONFIRMED').map(e => e.studentId);

    const attendanceRecords = await prisma.sessionAttendance.findMany({
      where: { session: { classId }, studentId: { in: studentIds } },
    });

    const totalPossible = totalSessions * studentIds.length;
    const totalAttended = attendanceRecords.filter(a => a.isPresent).length;
    const attendanceRate = totalPossible > 0 ? (totalAttended / totalPossible) * 100 : 0;

    const assignments = await prisma.assignment.findMany({
      where: { classId },
      include: { submissions: true },
    });

    const totalAssignments = assignments.length;
    const totalSubmissions = assignments.reduce((sum, a) => sum + a.submissions.filter(s => s.status !== 'NOT_SUBMITTED').length, 0);
    const totalPossibleSubmissions = totalAssignments * studentIds.length;
    const submissionRate = totalPossibleSubmissions > 0 ? (totalSubmissions / totalPossibleSubmissions) * 100 : 0;

    const gradedSubmissions = await prisma.assignmentSubmission.findMany({
      where: {
        assignment: { classId },
        status: 'GRADED',
        totalScore: { not: null },
      },
    });

    const avgScore = gradedSubmissions.length > 0
      ? gradedSubmissions.reduce((sum, s) => sum + s.totalScore!, 0) / gradedSubmissions.length
      : 0;

    const scoreTrend: any[] = [];
    for (const studentId of studentIds) {
      const studentSubmissions = gradedSubmissions.filter(s => s.studentId === studentId);
      if (studentSubmissions.length > 0) {
        scoreTrend.push({
          studentId,
          scores: studentSubmissions.map(s => s.totalScore),
          avg: studentSubmissions.reduce((sum, s) => sum + s.totalScore!, 0) / studentSubmissions.length,
        });
      }
    }

    return successResponse(res, {
      class: class_,
      totalSessions,
      totalStudents: studentIds.length,
      attendanceRate,
      submissionRate,
      avgScore,
      scoreTrend,
    });
  } catch (error) {
    return errorResponse(res, '获取班级统计失败: ' + (error as Error).message, 500);
  }
};
