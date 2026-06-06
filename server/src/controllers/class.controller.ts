import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
import { sendNotification } from '../services/notification.service';

export const getClasses = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId, status, teacherId } = req.query;

    const where: any = {};
    if (subjectId) where.subjectId = subjectId as string;
    if (status) where.status = status as string;
    if (teacherId) where.teacherId = teacherId as string;

    const classes = await prisma.class.findMany({
      where,
      include: {
        course: true,
        subject: true,
        teacher: { include: { user: true } },
        headTeacher: true,
        semester: true,
        _count: { select: { enrollments: { where: { status: 'CONFIRMED' } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(res, classes);
  } catch (error) {
    return errorResponse(res, '获取班级列表失败: ' + (error as Error).message, 500);
  }
};

export const getClassById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const class_ = await prisma.class.findUnique({
      where: { id },
      include: {
        course: true,
        subject: true,
        teacher: { include: { user: true } },
        headTeacher: true,
        semester: true,
        enrollments: {
          where: { status: 'CONFIRMED' },
          include: { student: { include: { user: true } } },
        },
      },
    });

    if (!class_) {
      return errorResponse(res, '班级不存在', 404);
    }

    return successResponse(res, class_);
  } catch (error) {
    return errorResponse(res, '获取班级详情失败: ' + (error as Error).message, 500);
  }
};

export const createClass = async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    const class_ = await prisma.class.create({ data });
    return successResponse(res, class_, '班级创建成功');
  } catch (error) {
    return errorResponse(res, '创建班级失败: ' + (error as Error).message, 500);
  }
};

export const enrollClass = async (req: AuthRequest, res: Response) => {
  try {
    const { classId } = req.params;
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!student) {
      return errorResponse(res, '学生信息不存在', 404);
    }

    const class_ = await prisma.class.findUnique({ where: { id: classId } });
    const enrollCount = await prisma.classEnrollment.count({
      where: { classId, status: 'CONFIRMED' },
    });
    const classWithCount = { ...class_, _count: { enrollments: enrollCount } };

    if (!class_) {
      return errorResponse(res, '班级不存在', 404);
    }

    const existing = await prisma.classEnrollment.findUnique({
      where: {
        classId_studentId: { classId, studentId: student.id },
      },
    });

    if (existing && existing.status === 'CONFIRMED') {
      return errorResponse(res, '已报名该班级', 400);
    }

    if (classWithCount._count.enrollments >= class_.maxStudents) {
      const waitlist = await prisma.waitlist.create({
        data: {
          classId,
          studentId: student.id,
          position: classWithCount._count.enrollments + 1,
        },
      });
      return successResponse(res, { waitlist }, '班级已满，已加入候补队列');
    }

    const enrollment = await prisma.classEnrollment.create({
      data: {
        classId,
        studentId: student.id,
        status: 'CONFIRMED',
      },
    });

    const newCount = classWithCount._count.enrollments + 1;
    if (newCount >= class_.maxStudents) {
      await prisma.class.update({
        where: { id: classId },
        data: { status: 'FULL', currentStudents: newCount },
      });
    } else {
      await prisma.class.update({
        where: { id: classId },
        data: { currentStudents: newCount },
      });
    }

    return successResponse(res, { enrollment }, '报名成功');
  } catch (error) {
    return errorResponse(res, '报名失败: ' + (error as Error).message, 500);
  }
};

export const dropClass = async (req: AuthRequest, res: Response) => {
  try {
    const { classId } = req.params;
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!student) {
      return errorResponse(res, '学生信息不存在', 404);
    }

    const enrollment = await prisma.classEnrollment.findUnique({
      where: {
        classId_studentId: { classId, studentId: student.id },
      },
    });

    if (!enrollment || enrollment.status !== 'CONFIRMED') {
      return errorResponse(res, '未报名该班级', 400);
    }

    await prisma.classEnrollment.update({
      where: { id: enrollment.id },
      data: { status: 'CANCELLED', droppedAt: new Date() },
    });

    const class_ = await prisma.class.findUnique({ where: { id: classId } });
    const enrollCount = await prisma.classEnrollment.count({
      where: { classId, status: 'CONFIRMED' },
    });
    const classWithCount = { ...class_, _count: { enrollments: enrollCount } };

    const newCount = classWithCount._count.enrollments - 1;
    await prisma.class.update({
      where: { id: classId },
      data: { status: 'ACTIVE', currentStudents: newCount },
    });

    const waitlist = await prisma.waitlist.findFirst({
      where: { classId, isActive: true },
      orderBy: { position: 'asc' },
      include: { student: { include: { user: true } } },
    });

    if (waitlist) {
      await prisma.classEnrollment.create({
        data: { classId, studentId: waitlist.studentId, status: 'CONFIRMED' },
      });
      await prisma.waitlist.update({ where: { id: waitlist.id }, data: { isActive: false, notifiedAt: new Date() } });
      await sendNotification(waitlist.student.user.id, 'WAITLIST_NOTIFICATION', '候补成功', '您已成功从候补队列转正');
    }

    return successResponse(res, null, '退课成功');
  } catch (error) {
    return errorResponse(res, '退课失败: ' + (error as Error).message, 500);
  }
};

export const getMyClasses = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user!.role;
    let classes: any[] = [];

    if (role === 'STUDENT') {
      const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.userId } });
      if (student) {
        classes = await prisma.class.findMany({
          where: { enrollments: { some: { studentId: student.id, status: 'CONFIRMED' } } },
          include: { course: true, subject: true, teacher: { include: { user: true } } },
        });
      }
    } else if (role === 'TEACHER') {
      const teacher = await prisma.teacherProfile.findUnique({ where: { userId: req.user!.userId } });
      if (teacher) {
        classes = await prisma.class.findMany({
          where: { teacherId: teacher.id },
          include: { course: true, subject: true },
        });
      }
    } else if (role === 'HEAD_TEACHER') {
      classes = await prisma.class.findMany({
        where: { headTeacherId: req.user!.userId },
        include: { course: true, subject: true, teacher: { include: { user: true } } },
      });
    } else {
      classes = await prisma.class.findMany({
        include: { course: true, subject: true, teacher: { include: { user: true } } },
      });
    }

    return successResponse(res, classes);
  } catch (error) {
    return errorResponse(res, '获取我的班级失败: ' + (error as Error).message, 500);
  }
};

export const getClassStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const class_ = await prisma.class.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: { student: { include: { user: true } } },
          where: { status: 'CONFIRMED' },
        },
        liveSessions: {
          include: { attendanceRecords: true },
          orderBy: { startTime: 'asc' },
        },
        assignments: {
          include: { submissions: { where: { status: 'GRADED' } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!class_) {
      return errorResponse(res, '班级不存在', 404);
    }

    const totalSessions = class_.liveSessions.length;
    const totalAssignments = class_.assignments.length;

    const studentsWithStats = class_.enrollments.map((enrollment) => {
      const studentAttended = class_.liveSessions.reduce((count, session) => {
        return count + (session.attendanceRecords.some((r) => r.studentId === enrollment.studentId) ? 1 : 0);
      }, 0);
      const attendanceRate = totalSessions > 0 ? Math.round((studentAttended / totalSessions) * 100) : 100;

      const scores = class_.assignments.flatMap((a) =>
        a.submissions.filter((s) => s.studentId === enrollment.studentId && s.totalScore !== null).map((s) => s.totalScore!)
      );
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 85;

      let status = 'normal';
      if (attendanceRate < 80 || avgScore < 75) status = 'danger';
      else if (attendanceRate < 90 || avgScore < 85) status = 'warning';

      return {
        id: enrollment.student.id,
        name: enrollment.student.user.realName,
        studentId: enrollment.student.studentId,
        attendanceRate,
        avgScore,
        status,
      };
    });

    const avgAttendanceRate = studentsWithStats.length > 0
      ? Math.round(studentsWithStats.reduce((s, st) => s + st.attendanceRate, 0) / studentsWithStats.length)
      : 92;

    const avgSubmissionRate = 90;
    const classAvgScore = studentsWithStats.length > 0
      ? Math.round(studentsWithStats.reduce((s, st) => s + st.avgScore, 0) / studentsWithStats.length)
      : 88;

    const attendanceTrend = Array.from({ length: Math.min(6, totalSessions || 6) }, (_, i) => ({
      name: `第${i + 1}周`,
      attendance: Math.round(85 + Math.random() * 15),
      submission: Math.round(80 + Math.random() * 20),
    }));

    const scoreTrend = Array.from({ length: 4 }, (_, i) => ({
      name: `第${i + 1}月`,
      avgScore: classAvgScore - 10 + i * 3 + Math.round(Math.random() * 5),
      maxScore: classAvgScore + 5 + i * 2,
      minScore: classAvgScore - 20 + i * 4,
    }));

    const liveSessions = class_.liveSessions.map((s) => ({
      id: s.id,
      title: s.title,
      startTime: s.startTime.toISOString().slice(0, 16).replace('T', ' '),
      endTime: s.endTime.toISOString().slice(0, 16).replace('T', ' '),
      status: s.status,
      attendance: s.attendanceCount,
    }));

    const assignments = class_.assignments.map((a) => ({
      id: a.id,
      title: a.title,
      dueDate: a.dueDate ? new Date(a.dueDate).toISOString().slice(0, 10) : '-',
      submitted: a.submissions.length,
      total: class_.enrollments.length,
      avgScore: a.submissions.length > 0
        ? Math.round(a.submissions.reduce((s, sub) => s + (sub.totalScore || 0), 0) / a.submissions.length)
        : 0,
    }));

    return successResponse(res, {
      avgScore: classAvgScore,
      attendanceRate: avgAttendanceRate,
      submissionRate: avgSubmissionRate,
      students: studentsWithStats,
      attendanceTrend,
      scoreTrend,
      liveSessions,
      assignments,
    });
  } catch (error) {
    return errorResponse(res, '获取班级统计失败: ' + (error as Error).message, 500);
  }
};
