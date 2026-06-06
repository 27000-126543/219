import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
import { CreateScheduleChangeDto } from '../types';
import { ScheduleChangeStatus, SessionStatus, NotificationType, Role } from '@prisma/client';
import { createBulkNotifications, createNotification } from '../services/notification.service';

export const createScheduleChange = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { sessionId, originalClassId, newClassId, originalStartTime, originalEndTime, newStartTime, newEndTime, classroom, reason } = req.body as CreateScheduleChangeDto;

    const scheduleChange = await prisma.scheduleChange.create({
      data: {
        sessionId,
        originalClassId,
        newClassId,
        applicantId: userId!,
        originalStartTime: originalStartTime ? new Date(originalStartTime) : undefined,
        originalEndTime: originalEndTime ? new Date(originalEndTime) : undefined,
        newStartTime: newStartTime ? new Date(newStartTime) : undefined,
        newEndTime: newEndTime ? new Date(newEndTime) : undefined,
        classroom,
        reason,
      },
      include: {
        applicant: true,
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.PRINCIPAL] } },
    });

    await createBulkNotifications(
      admins.map(a => a.id),
      NotificationType.SCHEDULE_CHANGE,
      '新的调课申请',
      `收到新的调课申请，请及时处理`,
      { scheduleChangeId: scheduleChange.id }
    );

    return successResponse(res, scheduleChange, '调课申请已提交');
  } catch (error) {
    return errorResponse(res, '提交调课申请失败: ' + (error as Error).message, 500);
  }
};

export const getScheduleChanges = async (req: AuthRequest, res: Response) => {
  try {
    const { status, applicantId } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (applicantId) where.applicantId = applicantId;

    const changes = await prisma.scheduleChange.findMany({
      where,
      include: {
        applicant: true,
        session: { include: { class: { include: { course: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(res, changes);
  } catch (error) {
    return errorResponse(res, '获取调课申请失败: ' + (error as Error).message, 500);
  }
};

export const reviewScheduleChange = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { status, reviewNote } = req.body;

    if (status === ScheduleChangeStatus.APPROVED) {
      const scheduleChange = await prisma.scheduleChange.findUnique({
        where: { id },
        include: {
          session: {
            include: {
              class: {
                include: {
                  enrollments: { include: { student: { include: { user: true } } },
                  headTeacher: true,
                },
              },
              teacher: { include: { user: true } },
            },
          },
        },
      });

      if (!scheduleChange?.session) {
        return errorResponse(res, '调课申请或课程不存在', 404);
      }

      if (scheduleChange.newStartTime && scheduleChange.newEndTime) {
        const conflictingSessions = await prisma.liveSession.findMany({
          where: {
            teacherId: scheduleChange.session.teacherId,
            id: { not: scheduleChange.sessionId! },
            status: { in: [SessionStatus.SCHEDULED, SessionStatus.LIVE] },
            OR: [
              {
                AND: [
                  { startTime: { lte: new Date(scheduleChange.newStartTime) } },
                  { endTime: { gt: new Date(scheduleChange.newStartTime) } },
                ],
              },
              {
                AND: [
                  { startTime: { lt: new Date(scheduleChange.newEndTime) } },
                  { endTime: { gte: new Date(scheduleChange.newEndTime) } },
                ],
              },
              {
                AND: [
                  { startTime: { gte: new Date(scheduleChange.newStartTime) } },
                  { endTime: { lte: new Date(scheduleChange.newEndTime) } },
                ],
              },
            ],
          },
        });

        if (conflictingSessions.length > 0) {
          return errorResponse(res, '新时段教师有课程冲突，无法通过审批', 400);
        }

        await prisma.liveSession.update({
          where: { id: scheduleChange.sessionId! },
          data: {
            startTime: new Date(scheduleChange.newStartTime),
            endTime: new Date(scheduleChange.newEndTime),
            status: SessionStatus.RESCHEDULED,
          },
        });

        const userIds = scheduleChange.session.class.enrollments
          .filter(e => e.status === 'CONFIRMED')
          .map(e => e.student.userId);

        if (scheduleChange.session.class.headTeacherId) {
          userIds.push(scheduleChange.session.class.headTeacherId);
        }

        await createBulkNotifications(
          userIds,
          NotificationType.SCHEDULE_CHANGE,
          '课程时间调整通知',
          `课程 "${scheduleChange.session.title}" 时间已调整为：${new Date(scheduleChange.newStartTime).toLocaleString()}`,
          { sessionId: scheduleChange.sessionId }
        );
      }
    }

    const updated = await prisma.scheduleChange.update({
      where: { id },
      data: {
        status,
        reviewNote,
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
      include: {
        applicant: true,
        session: { include: { class: { include: { course: true } } } },
      },
    });

    await createNotification(
      updated.applicantId,
      NotificationType.SCHEDULE_CHANGE,
      `调课申请已${status === 'APPROVED' ? '通过' : '拒绝'}`,
      `您的调课申请已${status === 'APPROVED' ? '通过' : '拒绝'}，${reviewNote || ''}`,
      { scheduleChangeId: id }
    );

    return successResponse(res, updated, '审核完成');
  } catch (error) {
    return errorResponse(res, '审核失败: ' + (error as Error).message, 500);
  }
};
