import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

export const getAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, status, type } = req.query;
    const where: any = {};
    if (studentId) where.studentId = studentId as string;
    if (status) where.status = status as string;
    if (type) where.type = type as string;

    if (req.user?.role === 'HEAD_TEACHER') {
      const classIds = (await prisma.class.findMany({ where: { headTeacherId: req.user.userId } })).map((c) => c.id);
      if (classIds.length > 0) {
        where.classId = { in: classIds };
      }
    }

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        student: { include: { user: true } },
        class: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(res, alerts);
  } catch (error) {
    return errorResponse(res, '获取预警列表失败: ' + (error as Error).message, 500);
  }
};

export const getAlertById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        student: { include: { user: true } },
        class: true,
        handledBy: true,
      },
    });

    if (!alert) {
      return errorResponse(res, '预警不存在', 404);
    }

    return successResponse(res, alert);
  } catch (error) {
    return errorResponse(res, '获取预警详情失败: ' + (error as Error).message, 500);
  }
};

export const handleAlert = async (req: AuthRequest, res: Response) => {
  try {
    const { alertId } = req.params;
    const { resolution, communicationNote } = req.body;

    const alert = await prisma.alert.findUnique({ where: { id: alertId } });
    if (!alert) {
      return errorResponse(res, '预警不存在', 404);
    }

    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'HANDLED',
        resolution,
        communicationNote,
        handledAt: new Date(),
        handledById: req.user!.userId,
      },
    });

    return successResponse(res, updated, '预警处理成功');
  } catch (error) {
    return errorResponse(res, '处理预警失败: ' + (error as Error).message, 500);
  }
};

export const checkAbsenteeismAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const enrollments = await prisma.classEnrollment.findMany({
      where: { status: 'CONFIRMED' },
      include: {
        student: { include: { user: true } },
        class: {
          include: {
            liveSessions: {
              include: { attendanceRecords: true },
              orderBy: { startTime: 'desc' },
              take: 10,
            },
          },
        },
      },
    });

    const alertsCreated: any[] = [];
    for (const enrollment of enrollments) {
      const sessions = enrollment.class.liveSessions;
      if (sessions.length >= 3) {
        const consecutiveAbsent = sessions.slice(0, 3).every(
          (session) => !session.attendanceRecords.some((r) => r.studentId === enrollment.studentId)
        );

        if (consecutiveAbsent) {
          const existing = await prisma.alert.findFirst({
            where: {
              studentId: enrollment.studentId,
              classId: enrollment.classId,
              type: 'ABSENTEEISM',
              status: 'PENDING',
            },
          });

          if (!existing) {
            const alert = await prisma.alert.create({
              data: {
                studentId: enrollment.studentId,
                classId: enrollment.classId,
                type: 'ABSENTEEISM',
                severity: 'HIGH',
                description: `${enrollment.student.user.realName}连续3次缺课`,
                message: '学生连续3次缺课，请及时联系家长了解情况',
              },
            });
            alertsCreated.push(alert);
          }
        }
      }
    }

    return successResponse(res, { created: alertsCreated.length, alerts: alertsCreated }, '考勤预警检查完成');
  } catch (error) {
    return errorResponse(res, '检查考勤预警失败: ' + (error as Error).message, 500);
  }
};

export const checkScoreAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const students = await prisma.studentProfile.findMany({
      include: {
        user: true,
        enrollments: {
          include: {
            class: true,
            student: {
              include: {
                examGrades: {
                  orderBy: { createdAt: 'desc' },
                  take: 2,
                },
              },
            },
          },
        },
      },
    });

    const alertsCreated: any[] = [];
    for (const student of students) {
      const grades = student.examGrades;
      if (grades.length >= 2) {
        const latest = grades[0];
        const previous = grades[1];
        if (latest.totalScore && previous.totalScore) {
          const drop = previous.totalScore - latest.totalScore;
          const dropPercent = (drop / previous.totalScore) * 100;

          if (dropPercent > 10) {
            const existing = await prisma.alert.findFirst({
              where: {
                studentId: student.id,
                type: 'SCORE',
                status: 'PENDING',
              },
            });

            if (!existing) {
              const alert = await prisma.alert.create({
                data: {
                  studentId: student.id,
                  type: 'SCORE',
                  severity: 'MEDIUM',
                  description: `${student.user.realName}成绩下降${dropPercent.toFixed(1)}%`,
                  message: '学生成绩明显下降，请关注并进行针对性辅导',
                },
              });
              alertsCreated.push(alert);
            }
          }
        }
      }
    }

    return successResponse(res, { created: alertsCreated.length, alerts: alertsCreated }, '成绩预警检查完成');
  } catch (error) {
    return errorResponse(res, '检查成绩预警失败: ' + (error as Error).message, 500);
  }
};
