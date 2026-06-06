import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
import { checkTimeConflict } from '../utils/conflict';
import { sendNotification } from '../services/notification.service';

export const getLiveSessions = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, teacherId, date } = req.query;
    const where: any = {};
    if (classId) where.classId = classId as string;
    if (teacherId) where.teacherId = teacherId as string;

    const sessions = await prisma.liveSession.findMany({
      where,
      include: {
        class: { include: { course: true, subject: true } },
        teacher: { include: { user: true } },
        attendanceRecords: true,
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
        class: { include: { course: true, subject: true } },
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

export const createLiveSession = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, teacherId, startTime, endTime, title, description } = req.body;

    const hasConflict = await checkTimeConflict(teacherId, new Date(startTime), new Date(endTime));
    if (hasConflict) {
      return errorResponse(res, '该时段教师有其他课程安排，存在冲突', 400);
    }

    const class_ = await prisma.class.findUnique({ where: { id: classId } });
    const meetingId = `live_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const joinUrl = `https://meeting.example.com/${meetingId}`;

    const session = await prisma.liveSession.create({
      data: {
        classId,
        teacherId,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: 'SCHEDULED',
        meetingId,
        joinUrl,
        maxParticipants: class_?.maxStudents || 30,
      },
    });

    if (class_?.headTeacherId) {
      await sendNotification(class_.headTeacherId, 'LIVE_SCHEDULED', '直播课已安排', `课程"${title}"已安排，时间：${new Date(startTime).toLocaleString()}`);
    }

    return successResponse(res, session, '直播课创建成功');
  } catch (error) {
    return errorResponse(res, '创建直播课失败: ' + (error as Error).message, 500);
  }
};

export const updateSessionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const session = await prisma.liveSession.findUnique({
      where: { id },
      include: { class: { include: { enrollments: { include: { student: true } } } } },
    });

    if (!session) {
      return errorResponse(res, '直播课不存在', 404);
    }

    const updated = await prisma.liveSession.update({
      where: { id },
      data: { status, actualStart: status === 'LIVE' ? new Date() : session.actualStart, actualEnd: status === 'ENDED' ? new Date() : session.actualEnd },
    });

    if (status === 'LIVE' || status === 'CANCELLED') {
      const msg = status === 'LIVE' ? '直播课已开始' : '直播课已取消';
      for (const enrollment of (session as any).class.enrollments) {
        if (enrollment.student && enrollment.student.userId) {
          await sendNotification(enrollment.student.userId, 'LIVE_STARTED', msg, session.title);
        }
      }
    }

    return successResponse(res, updated, '状态更新成功');
  } catch (error) {
    return errorResponse(res, '更新状态失败: ' + (error as Error).message, 500);
  }
};

export const recordAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.userId } });

    if (!student) {
      return errorResponse(res, '学生信息不存在', 404);
    }

    const existing = await prisma.attendanceRecord.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: student.id } },
    });

    if (existing) {
      return errorResponse(res, '已签到', 400);
    }

    const record = await prisma.attendanceRecord.create({
      data: { sessionId, studentId: student.id, joinTime: new Date(), status: 'PRESENT' },
    });

    await prisma.liveSession.update({
      where: { id: sessionId },
      data: { attendanceCount: { increment: 1 } },
    });

    return successResponse(res, record, '签到成功');
  } catch (error) {
    return errorResponse(res, '签到失败: ' + (error as Error).message, 500);
  }
};
