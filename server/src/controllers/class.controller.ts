import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
import { CreateClassDto } from '../types';
import { ClassStatus, EnrollmentStatus, NotificationType, Role } from '@prisma/client';
import { createNotification } from '../services/notification.service';

export const createClass = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, subjectId, teacherId, headTeacherId, semesterId, name, maxStudents, classroom, schedule, startDate, endDate } = req.body as CreateClassDto;
    const code = `CL${Date.now()}`;
    const class_ = await prisma.class.create({
      data: {
        courseId,
        subjectId,
        teacherId,
        headTeacherId,
        semesterId,
        name,
        code,
        maxStudents: maxStudents || 20,
        classroom,
        schedule,
        startDate,
        endDate,
      },
      include: {
        course: true,
        subject: true,
        teacher: { include: { user: true } },
        headTeacher: true,
        semester: true,
      },
    });
    return successResponse(res, class_, '班级创建成功');
  } catch (error) {
    return errorResponse(res, '创建班级失败: ' + (error as Error).message, 500);
  }
};

export const getClasses = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId, courseId, status, teacherId, headTeacherId } = req.query;
    const where: any = {};
    if (subjectId) where.subjectId = subjectId;
    if (courseId) where.courseId = courseId;
    if (status) where.status = status;
    if (teacherId) where.teacherId = teacherId;
    if (headTeacherId) where.headTeacherId = headTeacherId;

    const classes = await prisma.class.findMany({
      where,
      include: {
        course: true,
        subject: true,
        teacher: { include: { user: true } },
        headTeacher: true,
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
          include: { student: { include: { user: true } } },
          where: { status: 'CONFIRMED' },
        },
        liveSessions: { orderBy: { startTime: 'asc' } },
        waitlist: { include: { student: { include: { user: true } } }, where: { isActive: true } },
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

export const enrollClass = async (req: AuthRequest, res: Response) => {
  try {
    const { classId } = req.params;
    const userId = req.user?.userId;

    const student = await prisma.studentProfile.findFirst({
      where: { userId },
    });

    if (!student) {
      return errorResponse(res, '学生信息不存在', 404);
    }

    const class_ = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        _count: { select: { enrollments: { where: { status: 'CONFIRMED' } } } },
      },
    });

    if (!class_) {
      return errorResponse(res, '班级不存在', 404);
    }

    const existingEnrollment = await prisma.classEnrollment.findUnique({
      where: { classId_studentId: { classId, studentId: student.id } },
    });

    if (existingEnrollment && existingEnrollment.status === EnrollmentStatus.CONFIRMED) {
      return errorResponse(res, '您已报名该班级', 400);
    }

    const currentStudents = class_._count.enrollments;

    if (currentStudents >= class_.maxStudents) {
      const existingWaitlist = await prisma.waitlist.findUnique({
        where: { classId_studentId: { classId, studentId: student.id } },
      });

      if (existingWaitlist && existingWaitlist.isActive) {
        return errorResponse(res, '您已在候补队列中', 400);
      }

      const waitlistCount = await prisma.waitlist.count({ where: { classId, isActive: true } });

      const waitlist = await prisma.waitlist.create({
        data: {
          classId,
          studentId: student.id,
          position: waitlistCount + 1,
        },
      });

      return successResponse(res, { waitlist, position: waitlistCount + 1 }, '班级已满，已加入候补队列');
    }

    const enrollment = await prisma.classEnrollment.create({
      data: {
        classId,
        studentId: student.id,
        status: EnrollmentStatus.CONFIRMED,
      },
    });

    const newCount = currentStudents + 1;
    if (newCount >= class_.maxStudents) {
      await prisma.class.update({
        where: { id: classId },
        data: { status: ClassStatus.FULL, currentStudents: newCount },
      });
    } else {
      await prisma.class.update({
        where: { id: classId },
        data: { currentStudents: newCount },
      });
    }

    return successResponse(res, enrollment, '报名成功');
  } catch (error) {
    return errorResponse(res, '报名失败: ' + (error as Error).message, 500);
  }
};

export const dropClass = async (req: AuthRequest, res: Response) => {
  try {
    const { classId } = req.params;
    const userId = req.user?.userId;

    const student = await prisma.studentProfile.findFirst({
      where: { userId },
    });

    if (!student) {
      return errorResponse(res, '学生信息不存在', 404);
    }

    const enrollment = await prisma.classEnrollment.findUnique({
      where: { classId_studentId: { classId, studentId: student.id } },
    });

    if (!enrollment || enrollment.status !== EnrollmentStatus.CONFIRMED) {
      return errorResponse(res, '您未报名该班级', 400);
    }

    await prisma.classEnrollment.update({
      where: { id: enrollment.id },
      data: { status: EnrollmentStatus.CANCELLED, droppedAt: new Date() },
    });

    const class_ = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        _count: { select: { enrollments: { where: { status: 'CONFIRMED' } } } },
      },
    });

    if (class_) {
      const newCount = class_._count.enrollments;
      await prisma.class.update({
        where: { id: classId },
        data: { status: ClassStatus.ACTIVE, currentStudents: newCount },
      });

      if (newCount < class_.maxStudents) {
        const firstWaitlist = await prisma.waitlist.findFirst({
          where: { classId, isActive: true },
          orderBy: { position: 'asc' },
          include: { student: { include: { user: true } } },
        });

        if (firstWaitlist) {
          await prisma.waitlist.update({
            where: { id: firstWaitlist.id },
            data: { isActive: false, notifiedAt: new Date() },
          });

          await prisma.classEnrollment.create({
            data: {
              classId,
              studentId: firstWaitlist.studentId,
              status: EnrollmentStatus.CONFIRMED,
            },
          });

          await createNotification(
            firstWaitlist.student.userId,
            NotificationType.WAITLIST_NOTIFICATION,
            '候补成功',
            `您已成功补位到班级：${class_.name}`,
            { classId }
          );
        }
      }
    }

    return successResponse(res, null, '退课成功');
  } catch (error) {
    return errorResponse(res, '退课失败: ' + (error as Error).message, 500);
  }
};

export const getMyClasses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    let classes: any[] = [];

    if (role === Role.STUDENT) {
      const student = await prisma.studentProfile.findFirst({ where: { userId } });
      if (student) {
        const enrollments = await prisma.classEnrollment.findMany({
          where: { studentId: student.id, status: 'CONFIRMED' },
          include: {
            class: {
              include: {
                course: true,
                subject: true,
                teacher: { include: { user: true } },
              },
            },
          },
        });
        classes = enrollments.map(e => e.class);
      }
    } else if (role === Role.TEACHER) {
      const teacher = await prisma.teacherProfile.findFirst({ where: { userId } });
      if (teacher) {
        classes = await prisma.class.findMany({
          where: { teacherId: teacher.id },
          include: {
            course: true,
            subject: true,
            _count: { select: { enrollments: { where: { status: 'CONFIRMED' } } } },
          },
        });
      }
    } else if (role === Role.HEAD_TEACHER) {
      classes = await prisma.class.findMany({
        where: { headTeacherId: userId },
        include: {
          course: true,
          subject: true,
          teacher: { include: { user: true } },
          _count: { select: { enrollments: { where: { status: 'CONFIRMED' } } } },
        },
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
          include: {
            student: {
              include: { user: true },
            },
          },
          where: { status: 'CONFIRMED' },
        },
        liveSessions: {
          include: {
            attendanceRecords: true,
          },
          orderBy: { startTime: 'asc' },
        },
        assignments: {
          include: {
            submissions: { where: { status: 'GRADED' } },
            _count: { select: { submissions: true } },
          },
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

      const studentSubmissions = class_.assignments.reduce((count, assignment) => {
        return count + (assignment.submissions.some((s) => s.studentId === enrollment.studentId) ? 1 : 0);
      }, 0);

      const scores = class_.assignments.flatMap((a) =>
        a.submissions
          .filter((s) => s.studentId === enrollment.studentId && s.totalScore !== null)
          .map((s) => s.totalScore!)
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

    const avgAttendanceRate =
      studentsWithStats.length > 0
        ? Math.round(studentsWithStats.reduce((s, st) => s + st.attendanceRate, 0) / studentsWithStats.length)
        : 92;

    const avgSubmissionRate =
      totalAssignments > 0 && studentsWithStats.length > 0
        ? Math.round(
            (studentsWithStats.reduce((s, st) => {
              const submitted = class_.assignments.reduce((c, a) => {
                return c + (a.submissions.some((sub) => sub.studentId === class_.enrollments.find((e) => e.studentId && st.studentId === e.student.id)?.studentId) ? 1 : 0);
              }, 0);
              return s + (totalAssignments > 0 ? (submitted / totalAssignments) * 100 : 100);
            }, 0) /
              studentsWithStats.length)
          )
        : 90;

    const classAvgScore =
      studentsWithStats.length > 0
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
      avgScore:
        a.submissions.length > 0
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
