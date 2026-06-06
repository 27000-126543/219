import { Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
import { generateToken } from '../utils/jwt';
import { RegisterStudentDto, RegisterUserDto, LoginDto } from '../types';

export const registerStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, password, realName, phone, gender, age, grade, school, parentName, parentPhone, assessmentScore } = req.body as RegisterStudentDto;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });

    if (existingUser) {
      return errorResponse(res, '用户名或邮箱已存在', 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        realName,
        phone,
        gender,
        role: 'STUDENT',
        studentProfile: {
          create: {
            studentId: `S${Date.now()}`,
            age,
            grade,
            school,
            parentName,
            parentPhone,
            assessmentScore,
          },
        },
      },
      include: {
        studentProfile: true,
      },
    });

    const token = generateToken(user.id, user.role, user.username);

    return successResponse(res, {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        realName: user.realName,
        role: user.role,
        studentProfile: user.studentProfile,
      },
      token,
    }, '注册成功');
  } catch (error) {
    return errorResponse(res, '注册失败: ' + (error as Error).message, 500);
  }
};

export const registerUser = async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, password, realName, role, phone, gender } = req.body as RegisterUserDto;

    const allowedRoles = ['TEACHER', 'HEAD_TEACHER', 'ADMIN', 'PRINCIPAL'];
    if (!allowedRoles.includes(role)) {
      return errorResponse(res, '无效的角色类型', 400);
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });

    if (existingUser) {
      return errorResponse(res, '用户名或邮箱已存在', 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userData: any = {
      username,
      email,
      passwordHash,
      realName,
      phone,
      gender,
      role,
    };

    if (role === 'TEACHER') {
      userData.teacherProfile = {
        create: {
          teacherId: `T${Date.now()}`,
        },
      };
    }

    const user = await prisma.user.create({
      data: userData,
      include: {
        teacherProfile: true,
      },
    });

    return successResponse(res, {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        realName: user.realName,
        role: user.role,
        teacherProfile: user.teacherProfile,
      },
    }, '创建用户成功');
  } catch (error) {
    return errorResponse(res, '创建用户失败: ' + (error as Error).message, 500);
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body as LoginDto;

    const user = await prisma.user.findFirst({
      where: { OR: [{ username }, { email: username }] },
      include: {
        studentProfile: true,
        teacherProfile: true,
      },
    });

    if (!user) {
      return errorResponse(res, '用户名或密码错误', 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return errorResponse(res, '用户名或密码错误', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, '账号已被禁用', 403);
    }

    const token = generateToken(user.id, user.role, user.username);

    return successResponse(res, {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        realName: user.realName,
        role: user.role,
        avatar: user.avatar,
        studentProfile: user.studentProfile,
        teacherProfile: user.teacherProfile,
      },
      token,
    }, '登录成功');
  } catch (error) {
    return errorResponse(res, '登录失败: ' + (error as Error).message, 500);
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      include: {
        studentProfile: true,
        teacherProfile: true,
      },
    });

    if (!user) {
      return errorResponse(res, '用户不存在', 404);
    }

    return successResponse(res, {
      id: user.id,
      username: user.username,
      email: user.email,
      realName: user.realName,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      gender: user.gender,
      studentProfile: user.studentProfile,
      teacherProfile: user.teacherProfile,
    });
  } catch (error) {
    return errorResponse(res, '获取用户信息失败: ' + (error as Error).message, 500);
  }
};
