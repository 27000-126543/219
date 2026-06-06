import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
import { sendNotification } from '../services/notification.service';

export const getScheduleChanges = async (req: AuthRequest, res: Response) => {
  try {
    const { status, teacherId } = req.query;
    const where: any = {};
    if (status) where.status = status as string;
    if (teacherId) where.teacherId = teacherId as string;

    if (req.user?.role === 'TEACHER') {
      const teacher = await prisma.teacherProfile.findUnique({ where: { userId: req.user.userId } });
      if (teacher) where.teacherId = teacher.id;
    }

    const changes = await prisma.scheduleChange.findMany({
      where,
      include: {
        class: { include: { course: true, subject: true } },
        teacher: { include: { user: true } },
        liveSession: true,
        reviewedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(res, changes);
  } catch (error) {
    return errorResponse(res, '获取调课列表失败: ' + (error as Error).message, 500);
  }
};

export const getScheduleChangeById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const change = await prisma.scheduleChange.findUnique({
      where: { id },
      include: {
        class: { include: { course: true, subject: true } },
        teacher: { include: { user: true } },
        liveSession: true,
        reviewedBy: true,
      },
    });

    if (!change) {
      return errorResponse(res, '调课申请不存在', 404);
    }

    return successResponse(res, change);
  } catch (error) {
    return errorResponse(res, '获取调课详情失败: ' + (error as Error).message, 500);
  }
};

export const createScheduleChange = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, liveSessionId, newStartTime, newEndTime, reason, newClassroom } = req.body;
    const teacher = await prisma.teacherProfile.findUnique({ where: { userId: req.user!.userId } });

    if (!teacher) {
      return errorResponse(res, '教师信息不存在', 404);
    }

    const change = await prisma.scheduleChange.create({
      data: {
        classId,
        teacherId: teacher.id,
        liveSessionId,
        newStartTime: new Date(newStartTime),
        newEndTime: new Date(newEndTime),
        newClassroom,
        reason,
        status: 'PENDING',
      },
    });

    return successResponse(res, change, '调课申请提交成功');
  } catch (error) {
    return errorResponse(res, '提交调课申请失败: ' + (error as Error).message, 500);
  }
};

export const reviewScheduleChange = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reviewComment } = req.body;

    const change = await prisma.scheduleChange.findUnique({
      where: { id },
      include: {
        class: { include: { headTeacher: true } },
        teacher: { include: { user: true } },
        liveSession: true,
      },
    });

    if (!change) {
      return errorResponse(res, '调课申请不存在', 404);
    }

    const updated = await prisma.scheduleChange.update({
      where: { id },
      data: {
        status,
        reviewComment,
        reviewedById: req.user!.userId,
        reviewedAt: new Date(),
      },
    });

    if (status === 'APPROVED' && change.liveSession) {
      await prisma.liveSession.update({
        where: { id: change.liveSessionId! },
        data: {
          startTime: change.newStartTime,
          endTime: change.newEndTime,
        },
      });

      const enrollments = await prisma.classEnrollment.findMany({
        where: { classId: change.classId, status: 'CONFIRMED' },
        include: { student: { include: { user: true } } },
      });
      for (const enrollment of enrollments) {
        if (enrollment.student?.userId) {
          await sendNotification(
            enrollment.student.userId,
            'SCHEDULE_CHANGED',
            '课程时间调整',
            `您的课程时间已调整为：${change.newStartTime.toLocaleString()}`
          );
        }
      }

      if (change.class.headTeacher) {
        await sendNotification(
          change.class.headTeacher.id,
          'SCHEDULE_CHANGED',
          '班级课程调整',
          `${change.class.course?.name}的课程时间已调整`
        );
      }
    }

    if (status === 'APPROVED' || status === 'REJECTED') {
      await sendNotification(
        change.teacher.userId,
        'SCHEDULE_REVIEWED',
        status === 'APPROVED' ? '调课已批准' : '调课已拒绝',
        reviewComment || '请查看调课审核结果'
      );
    }

    return successResponse(res, updated, '审核完成');
  } catch (error) {
    return errorResponse(res, '审核失败: ' + (error as Error).message, 500);
  }
};
