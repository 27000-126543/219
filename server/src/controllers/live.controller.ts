import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
import { CreateLiveSessionDto } from '../types';
import { SessionStatus, NotificationType, Role } from '@prisma/client';
import { createBulkNotifications, createNotification } from '../services/notification.service';
import { v4 as uuidv4 } from 'uuid';

export const createLiveSession = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, teacherId, title, description, startTime, endTime } = req.body as CreateLiveSessionDto;

    const conflictingSessions = await prisma.liveSession.findMany({
      where: {
        teacherId,
        status: { in: [SessionStatus.SCHEDULED, SessionStatus.LIVE] },
        OR: [
          {
            AND: [
              { startTime: { lte: new Date(startTime) } },
              { endTime: { gt: new Date(startTime) } },
            ],
          },
          {
            AND: [
              { startTime: { lt: new Date(endTime) } },
              { endTime: { gte: new Date(endTime) } },
            ],
          },
          {
            AND: [
              { startTime: { gte: new Date(startTime) } },
              { endTime: { lte: new Date(endTime) } },
            ],
          },
        ],
      },
    });

    if (conflictingSessions.length > 0) {
      return errorResponse(res, '该时段教师已有课程安排，请选择其他时间', 400);
    }

    const streamUrl = `https://meeting.example.com/${uuidv4()}`;
    const meetingId = uuidv4();

    const session = await prisma.liveSession.create({
      data: {
        classId,
        teacherId,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        streamUrl,
        meetingId,
      },
      include: {
        class: { include: { course: true, subject: true } },
        teacher: { include: { user: true } },
      },
    });

    return successResponse(res, session, '直播课创建成功');
  } catch (error) {
    return errorResponse(res, '创建直播课失败: ' + (error as Error).message, 500);
  }
};

export const getLiveSessions = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, teacherId, status, startDate, endDate } = req.query;
    const where: any = {};
    if (classId) where.classId = classId;
    if (teacherId) where.teacherId = teacherId;
    if (status) where.status = status;
    if (startDate) where.startTime = { gte: new Date(startDate as string) };
    if (endDate) where.endTime = { lte: new Date(endDate as string) };

    const sessions = await prisma.liveSession.findMany({
      where,
      include: {
        class: { include: { course: true, subject: true } },
        teacher: { include: { user: true } },
        _count: { select: { attendanceRecords: true } },
      },
      orderBy: { startTime: 'asc' },
    });
    return successResponse(res, sessions);
  } catch (error) {
    return errorResponse(res, '获取直播课列表失败: ' + (error as Error).message, 500);
  }
};

export const getSessionById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const session = await prisma.liveSession.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            course: true,
            subject: true,
            enrollments: { include: { student: { include: { user: true } } } },
          },
        },
        teacher: { include: { user: true } },
        attendanceRecords: { include: { student: { include: { user: true } } } },
      },
    });
    if (!session) {
      return errorResponse(res, '直播课不存在', 404);
    }
    return successResponse(res, session);
  } catch (error) {
    return errorResponse(res, '获取直播课详情失败: ' + (error as Error).message, 500);
  }
};

export const updateSessionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const session = await prisma.liveSession.update({
      where: { id },
      data: { status },
      include: {
        class: {
          include: {
            enrollments: {
              include: {
                student: {
                  include: { user: true }
                }
              }
            }
          }
        }
      }
    });

    if (status === SessionStatus.LIVE) {
      const userIds = session.class.enrollments
        .filter(e => e.status === 'CONFIRMED')
        .map(e => e.student.userId);

      if (session.class.headTeacherId) {
        userIds.push(session.class.headTeacherId);
      }

      await createBulkNotifications(
        userIds,
        NotificationType.CLASS_REMINDER,
        '直播课开始提醒',
        `课程 "${session.title}" 已开始，请及时进入课堂`,
        { sessionId: session.id, streamUrl: session.streamUrl }
      );
    }

    return successResponse(res, session, '状态更新成功');
  } catch (error) {
    return errorResponse(res, '更新状态失败: ' + (error as Error).message, 500);
  }
};

export const recordAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    const student = await prisma.studentProfile.findFirst({
      where: { userId },
    });

    if (!student) {
      return errorResponse(res, '学生信息不存在', 404);
    }

    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return errorResponse(res, '直播课不存在', 404);
    }

    const attendance = await prisma.sessionAttendance.upsert({
      where: { sessionId_studentId: { sessionId, studentId: student.id } },
      update: { isPresent: true, joinedAt: new Date() },
      create: {
        sessionId,
        studentId: student.id,
        isPresent: true,
        joinedAt: new Date(),
      },
    });

    const attendanceCount = await prisma.sessionAttendance.count({
      where: { sessionId, isPresent: true },
    });

    await prisma.liveSession.update({
      where: { id: sessionId },
      data: { attendanceCount },
    });

    return successResponse(res, attendance, '签到成功');
  } catch (error) {
    return errorResponse(res, '签到失败: ' + (error as Error).message, 500);
  }
};

export const sendClassReminders = async (sessionId: string) => {
  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    include: {
      class: {
        include: {
          enrollments: { include: { student: { include: { user: true } } } },
          headTeacher: true,
        },
      },
    },
  });

  if (!session || session.remindersSent) return;

  const userIds = session.class.enrollments
    .filter(e => e.status === 'CONFIRMED')
    .map(e => e.student.userId);

  if (session.class.headTeacherId) {
    userIds.push(session.class.headTeacherId);
  }

  await createBulkNotifications(
    userIds,
    NotificationType.CLASS_REMINDER,
    '课程开始提醒',
    `课程 "${session.title}" 将在30分钟后开始，请做好准备`,
    { sessionId: session.id, startTime: session.startTime, streamUrl: session.streamUrl }
  );

  await prisma.liveSession.update({
    where: { id: sessionId },
    data: { remindersSent: true },
  });
};
