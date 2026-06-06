import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

export const getExams = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, subjectId, status } = req.query;
    const where: any = {};
    if (classId) where.classId = classId as string;
    if (subjectId) where.subjectId = subjectId as string;
    if (status) where.status = status as string;

    const exams = await prisma.exam.findMany({
      where,
      include: {
        class: { include: { course: true, subject: true } },
        subject: true,
        teacher: { include: { user: true } },
        questions: true,
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
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
        class: { include: { course: true, subject: true } },
        subject: true,
        teacher: { include: { user: true } },
        questions: true,
        submissions: { include: { student: { include: { user: true } }, answers: true } },
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

export const createExam = async (req: AuthRequest, res: Response) => {
  try {
    const { questions, ...rest } = req.body;
    const teacher = await prisma.teacherProfile.findUnique({ where: { userId: req.user!.userId } });

    const exam = await prisma.exam.create({
      data: {
        ...rest,
        teacherId: teacher?.id,
        questions: {
          create: (questions || []).map((q: any) => ({
            ...q,
            options: JSON.stringify(q.options),
          })),
        },
      },
    });

    return successResponse(res, exam, '考试创建成功');
  } catch (error) {
    return errorResponse(res, '创建考试失败: ' + (error as Error).message, 500);
  }
};

export const publishExam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await prisma.exam.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    return successResponse(res, exam, '考试已发布');
  } catch (error) {
    return errorResponse(res, '发布考试失败: ' + (error as Error).message, 500);
  }
};

export const submitExam = async (req: AuthRequest, res: Response) => {
  try {
    const { examId } = req.params;
    const { answers } = req.body;
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user!.userId } });

    if (!student) {
      return errorResponse(res, '学生信息不存在', 404);
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true },
    });

    if (!exam) {
      return errorResponse(res, '考试不存在', 404);
    }

    const existing = await prisma.examSubmission.findUnique({
      where: { examId_studentId: { examId, studentId: student.id } },
    });

    if (existing) {
      return errorResponse(res, '已提交考试', 400);
    }

    let objectiveScore = 0;
    const autoGraded = exam.questions.filter((q) => q.type === 'CHOICE' || q.type === 'TRUE_FALSE');
    for (const question of autoGraded) {
      const answer = answers.find((a: any) => a.questionId === question.id);
      if (answer && answer.answer === question.correctAnswer) {
        objectiveScore += question.score || 5;
      }
    }

    const submission = await prisma.examSubmission.create({
      data: {
        examId,
        studentId: student.id,
        objectiveScore,
        status: autoGraded.length === exam.questions.length ? 'GRADED' : 'SUBMITTED',
        totalScore: autoGraded.length === exam.questions.length ? objectiveScore : null,
        submittedAt: new Date(),
        answers: {
          create: (answers || []).map((a: any) => ({
            questionId: a.questionId,
            answer: a.answer,
            isCorrect: autoGraded.length > 0 ? a.answer === exam.questions.find((q) => q.id === a.questionId)?.correctAnswer : null,
          })),
        },
      },
    });

    if (autoGraded.length === exam.questions.length) {
      await prisma.examGrade.create({
        data: {
          examId,
          studentId: student.id,
          objectiveScore,
          totalScore: objectiveScore,
          grade: getGrade(objectiveScore),
        },
      });
    }

    return successResponse(res, { submission, objectiveScore }, '提交成功');
  } catch (error) {
    return errorResponse(res, '提交失败: ' + (error as Error).message, 500);
  }
};

function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export const gradeExam = async (req: AuthRequest, res: Response) => {
  try {
    const { submissionId } = req.params;
    const { subjectiveScore, teacherComment } = req.body;

    const submission = await prisma.examSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return errorResponse(res, '提交记录不存在', 404);
    }

    const totalScore = (submission.objectiveScore || 0) + (subjectiveScore || 0);

    const updated = await prisma.examSubmission.update({
      where: { id: submissionId },
      data: {
        subjectiveScore,
        totalScore,
        teacherComment,
        gradedAt: new Date(),
        status: 'GRADED',
        gradedById: req.user!.userId,
      },
    });

    await prisma.examGrade.upsert({
      where: { examId_studentId: { examId: submission.examId, studentId: submission.studentId } },
      update: {
        objectiveScore: submission.objectiveScore,
        subjectiveScore,
        totalScore,
        grade: getGrade(totalScore),
      },
      create: {
        examId: submission.examId,
        studentId: submission.studentId,
        objectiveScore: submission.objectiveScore,
        subjectiveScore,
        totalScore,
        grade: getGrade(totalScore),
      },
    });

    return successResponse(res, updated, '批改成功');
  } catch (error) {
    return errorResponse(res, '批改失败: ' + (error as Error).message, 500);
  }
};

export const getExamStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        questions: true,
        submissions: { where: { status: 'GRADED' }, include: { answers: true } },
      },
    });

    if (!exam) {
      return errorResponse(res, '考试不存在', 404);
    }

    const scores = exam.submissions.filter((s) => s.totalScore !== null).map((s) => s.totalScore!);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;

    const questionStats = exam.questions.map((q) => {
      const correctCount = exam.submissions.reduce((count, sub) => {
        const ans = sub.answers.find((a) => a.questionId === q.id);
        return count + (ans?.isCorrect ? 1 : 0);
      }, 0);
      const accuracy = exam.submissions.length > 0 ? Math.round((correctCount / exam.submissions.length) * 100) : 0;
      return { id: q.id, content: q.content, correctCount, totalCount: exam.submissions.length, accuracy };
    });

    const suggestions = generateTeachingSuggestions(questionStats, avgScore);

    return successResponse(res, {
      exam: { id: exam.id, title: exam.title },
      totalStudents: exam.submissions.length,
      avgScore,
      maxScore,
      minScore,
      questionStats,
      suggestions,
    });
  } catch (error) {
    return errorResponse(res, '获取考试统计失败: ' + (error as Error).message, 500);
  }
};

function generateTeachingSuggestions(questionStats: any[], avgScore: number) {
  const suggestions: string[] = [];

  if (avgScore < 70) {
    suggestions.push('整体平均分偏低，建议重新讲解核心知识点');
  }

  const lowAccuracyQuestions = questionStats.filter((q) => q.accuracy < 50);
  lowAccuracyQuestions.forEach((q) => {
    suggestions.push(`第${q.id}题正确率仅${q.accuracy}%，建议加强相关知识点训练`);
  });

  if (suggestions.length === 0) {
    suggestions.push('本次考试整体表现良好，继续保持当前教学节奏');
  }

  return suggestions;
}
