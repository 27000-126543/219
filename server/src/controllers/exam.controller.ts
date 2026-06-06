import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
import { CreateExamDto, SubmitExamDto } from '../types';
import { ExamStatus, Role } from '@prisma/client';
import { createBulkNotifications, createNotification } from '../services/notification.service';

export const createExam = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, classId, semesterId, name, description, examType, totalScore, startTime, endTime, questions } = req.body as CreateExamDto;

    const exam = await prisma.exam.create({
      data: {
        courseId,
        classId,
        semesterId,
        name,
        description,
        examType,
        totalScore: totalScore || 100,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
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
        course: true,
        class: true,
        semester: true,
      },
    });

    return successResponse(res, exam, '考试创建成功');
  } catch (error) {
    return errorResponse(res, '创建考试失败: ' + (error as Error).message, 500);
  }
};

export const getExams = async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, classId, semesterId, status } = req.query;
    const where: any = {};
    if (courseId) where.courseId = courseId;
    if (classId) where.classId = classId;
    if (semesterId) where.semesterId = semesterId;
    if (status) where.status = status;

    const exams = await prisma.exam.findMany({
      where,
      include: {
        course: true,
        class: true,
        semester: true,
        _count: { select: { submissions: true } },
      },
      orderBy: { startTime: 'desc' },
    });
    return successResponse(res, exams);
  } catch (error) {
    return errorResponse(res, '获取考试列表失败: ' + (error as Error).message, 500);
  }
};

export const getExamById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        course: true,
        class: true,
        semester: true,
        submissions: { include: { student: { include: { user: true } } } },
        statistics: true,
      },
    });
    if (!exam) {
      return errorResponse(res, '考试不存在', 404);
    }
    return successResponse(res, exam);
  } catch (error) {
    return errorResponse(res, '获取考试详情失败: ' + (error as Error).message, 500);
  }
};

export const publishExam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const exam = await prisma.exam.update({
      where: { id },
      data: { status: ExamStatus.PUBLISHED },
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

    if (exam.class) {
      const userIds = exam.class.enrollments
        .filter(e => e.status === 'CONFIRMED')
        .map(e => e.student.userId);

      await createBulkNotifications(
        userIds,
        'EXAM_REMINDER' as any,
        '考试发布提醒',
        `考试 "${exam.name}" 已发布，考试时间：${exam.startTime.toLocaleString()}`,
        { examId: exam.id }
      );
    }

    return successResponse(res, exam, '考试已发布');
  } catch (error) {
    return errorResponse(res, '发布考试失败: ' + (error as Error).message, 500);
  }
};

export const submitExam = async (req: AuthRequest, res: Response) => {
  try {
    const { examId } = req.params;
    const userId = req.user?.userId;
    const { answers } = req.body as SubmitExamDto;

    const student = await prisma.studentProfile.findFirst({
      where: { userId },
    });

    if (!student) {
      return errorResponse(res, '学生信息不存在', 404);
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!exam) {
      return errorResponse(res, '考试不存在', 404);
    }

    let score = 0;
    const questionStats: any[] = [];

    exam.questions.forEach((question) => {
      const userAnswer = answers?.[question.id];
      const isCorrect = question.correctAnswer && userAnswer === question.correctAnswer;
      if (isCorrect) {
        score += question.score;
      }
      questionStats.push({
        questionId: question.id,
        correct: isCorrect,
        userAnswer,
        correctAnswer: question.correctAnswer,
      });
    });

    const hasSubjective = exam.questions.some(q => !q.correctAnswer);
    const status = hasSubjective ? 'SUBMITTED' : 'GRADED';

    const submission = await prisma.examSubmission.upsert({
      where: { examId_studentId: { examId, studentId: student.id } },
      update: {
        answers,
        submittedAt: new Date(),
        score: hasSubjective ? undefined : score,
      },
      create: {
        examId,
        studentId: student.id,
        answers,
        submittedAt: new Date(),
        score: hasSubjective ? undefined : score,
      },
      include: {
        exam: true,
        student: { include: { user: true } },
      },
    });

    return successResponse(res, { submission, score }, '提交成功');
  } catch (error) {
    return errorResponse(res, '提交考试失败: ' + (error as Error).message, 500);
  }
};

export const generateExamStatistics = async (examId: string) => {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      questions: true,
      submissions: { where: { score: { not: null } } },
    },
  });

  if (!exam || exam.submissions.length === 0) return;

  const scores = exam.submissions.map(s => s.score!).filter(s => s !== null);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const passRate = (scores.filter(s => s >= 60).length / scores.length) * 100;

  const questionStats: any[] = exam.questions.map((q) => {
    const correctCount = exam.submissions.filter((s) => {
      const answer = s.answers?.[q.id];
      return answer === q.correctAnswer;
    }).length;
    return {
      questionId: q.id,
      questionText: q.questionText,
      correctRate: exam.submissions.length > 0 ? correctCount / exam.submissions.length : 0,
      correctCount,
      totalCount: exam.submissions.length,
    };
  });

  const lowCorrectRateQuestions = questionStats.filter(q => q.correctRate < 0.5);
  const suggestions = lowCorrectRateQuestions.length > 0
    ? `以下题目正确率较低，建议重点讲解：${lowCorrectRateQuestions.map(q => q.questionText).join('; ')}`
    : '整体表现良好，建议继续保持。';

  await prisma.examStatistics.upsert({
    where: { examId },
    update: {
      avgScore,
      maxScore,
      minScore,
      passRate,
      questionStats,
      suggestions,
    },
    create: {
      examId,
      avgScore,
      maxScore,
      minScore,
      passRate,
      questionStats,
      suggestions,
    },
  });

  await prisma.exam.update({
    where: { id: examId },
    data: { status: ExamStatus.GRADED },
  });
};

export const gradeExam = async (req: AuthRequest, res: Response) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user?.userId;
    const { score, feedback } = req.body;

    const teacher = await prisma.teacherProfile.findFirst({
      where: { userId },
    });

    const submission = await prisma.examSubmission.update({
      where: { id: submissionId },
      data: {
        score,
        feedback,
        graderId: teacher?.id,
        gradedAt: new Date(),
      },
      include: {
        exam: true,
        student: { include: { user: true } },
      },
    });

    await createNotification(
      submission.student.userId,
      'EXAM_REMINDER' as any,
      '考试成绩已公布',
      `您的考试 "${submission.exam.name}" 成绩已公布，得分：${score}`,
      { submissionId, examId: submission.examId }
    );

    const allGraded = await prisma.examSubmission.findMany({
      where: { examId: submission.examId, score: null },
    });

    if (allGraded.length === 0) {
      await generateExamStatistics(submission.examId);
    }

    return successResponse(res, submission, '批改成功');
  } catch (error) {
    return errorResponse(res, '批改失败: ' + (error as Error).message, 500);
  }
};
