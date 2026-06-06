import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
import { CreateAssignmentDto, SubmitAssignmentDto } from '../types';
import { SubmissionStatus, Role } from '@prisma/client';
import { createNotification } from '../services/notification.service';

export const createAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, classId, teacherId, title, description, type, totalScore, dueDate, questions } = req.body as CreateAssignmentDto;

    const assignment = await prisma.assignment.create({
      data: {
        courseId,
        classId,
        teacherId,
        title,
        description,
        type,
        totalScore: totalScore || 100,
        dueDate: new Date(dueDate),
        questions: questions
          ? {
              create: questions.map((q, index) => ({
                questionText: q.questionText,
                questionType: q.questionType,
                options: q.options,
                correctAnswer: q.correctAnswer,
                score: q.score || 10,
                orderIndex: q.orderIndex ?? index,
              })),
            }
          : undefined,
      },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        teacher: { include: { user: true } },
        course: true,
        class: true,
      },
    });

    return successResponse(res, assignment, '作业创建成功');
  } catch (error) {
    return errorResponse(res, '创建作业失败: ' + (error as Error).message, 500);
  }
};

export const getAssignments = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, classId, teacherId } = req.query;
    const where: any = {};
    if (courseId) where.courseId = courseId;
    if (classId) where.classId = classId;
    if (teacherId) where.teacherId = teacherId;

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        teacher: { include: { user: true } },
        course: true,
        class: true,
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(res, assignments);
  } catch (error) {
    return errorResponse(res, '获取作业列表失败: ' + (error as Error).message, 500);
  }
};

export const getAssignmentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        teacher: { include: { user: true } },
        course: true,
        class: true,
        submissions: { include: { student: { include: { user: true } } } },
      },
    });
    if (!assignment) {
      return errorResponse(res, '作业不存在', 404);
    }
    return successResponse(res, assignment);
  } catch (error) {
    return errorResponse(res, '获取作业详情失败: ' + (error as Error).message, 500);
  }
};

export const submitAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.user?.userId;
    const { content, fileUrl } = req.body as SubmitAssignmentDto;

    const student = await prisma.studentProfile.findFirst({
      where: { userId },
    });

    if (!student) {
      return errorResponse(res, '学生信息不存在', 404);
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!assignment) {
      return errorResponse(res, '作业不存在', 404);
    }

    let objectiveScore = 0;
    const hasObjectiveQuestions = assignment.questions.some(q => q.correctAnswer);

    if (hasObjectiveQuestions && content) {
      assignment.questions.forEach((question) => {
        if (question.correctAnswer && content[question.id]) {
          const userAnswer = content[question.id];
          if (userAnswer === question.correctAnswer) {
            objectiveScore += question.score;
          }
        }
      });
    }

    const submission = await prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
      update: {
        content,
        fileUrl,
        submittedAt: new Date(),
        status: SubmissionStatus.SUBMITTED,
        objectiveScore: hasObjectiveQuestions ? objectiveScore : undefined,
        totalScore: hasObjectiveQuestions ? objectiveScore : undefined,
      },
      create: {
        assignmentId,
        studentId: student.id,
        content,
        fileUrl,
        submittedAt: new Date(),
        status: SubmissionStatus.SUBMITTED,
        objectiveScore: hasObjectiveQuestions ? objectiveScore : undefined,
        totalScore: hasObjectiveQuestions ? objectiveScore : undefined,
      },
      include: {
        assignment: true,
        student: { include: { user: true } },
      },
    });

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { studentId: student.id, status: { in: ['SUBMITTED', 'GRADED'] } },
    });

    await prisma.studentProfile.update({
      where: { id: student.id },
      data: {
        submittedAssignments: submissions.length,
        lastScore: submission.totalScore || undefined,
      },
    });

    return successResponse(res, submission, hasObjectiveQuestions ? '提交成功，客观题已自动批改' : '提交成功');
  } catch (error) {
    return errorResponse(res, '提交作业失败: ' + (error as Error).message, 500);
  }
};

export const gradeAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user?.userId;
    const { subjectiveScore, feedback } = req.body;

    const teacher = await prisma.teacherProfile.findFirst({
      where: { userId },
    });

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: true, student: true },
    });

    if (!submission) {
      return errorResponse(res, '提交记录不存在', 404);
    }

    const objectiveScore = submission.objectiveScore || 0;
    const totalScore = objectiveScore + (subjectiveScore || 0);

    const updatedSubmission = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        subjectiveScore,
        totalScore,
        feedback,
        graderId: teacher?.id,
        gradedAt: new Date(),
        status: SubmissionStatus.GRADED,
      },
      include: {
        student: { include: { user: true } },
        assignment: true,
      },
    });

    await createNotification(
      updatedSubmission.student.userId,
      'ASSIGNMENT_REMINDER' as any,
      '作业已批改',
      `您的作业 "${submission.assignment.title}" 已批改完成，得分：${totalScore}`,
      { submissionId, assignmentId: submission.assignmentId }
    );

    return successResponse(res, updatedSubmission, '批改成功');
  } catch (error) {
    return errorResponse(res, '批改失败: ' + (error as Error).message, 500);
  }
};

export const getStudentProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { periodType, subjectId } = req.query;

    const where: any = { studentId };
    if (periodType) where.periodType = periodType;
    if (subjectId) where.subjectId = subjectId;

    const progress = await prisma.studentProgress.findMany({
      where,
      orderBy: { periodStart: 'asc' },
    });

    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        studentId,
        status: 'GRADED',
        totalScore: { not: null },
      },
      include: { assignment: { include: { course: true, class: true } } },
      orderBy: { gradedAt: 'asc' },
    });

    return successResponse(res, { progress, submissions });
  } catch (error) {
    return errorResponse(res, '获取学习进度失败: ' + (error as Error).message, 500);
  }
};
