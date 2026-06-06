import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始填充种子数据...');

  const hashedPassword = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: hashedPassword,
      realName: '系统管理员',
      role: 'ADMIN',
      phone: '13800138000',
      isActive: true,
    },
  });

  const principal = await prisma.user.upsert({
    where: { username: 'principal' },
    update: {},
    create: {
      username: 'principal',
      email: 'principal@example.com',
      passwordHash: hashedPassword,
      realName: '张校长',
      role: 'PRINCIPAL',
      phone: '13800138001',
      isActive: true,
    },
  });

  const headTeacher = await prisma.user.upsert({
    where: { username: 'headteacher' },
    update: {},
    create: {
      username: 'headteacher',
      email: 'headteacher@example.com',
      passwordHash: hashedPassword,
      realName: '李主任',
      role: 'HEAD_TEACHER',
      phone: '13800138002',
      isActive: true,
    },
  });

  const teacher1 = await prisma.user.upsert({
    where: { username: 'teacher1' },
    update: {},
    create: {
      username: 'teacher1',
      email: 'teacher1@example.com',
      passwordHash: hashedPassword,
      realName: '王老师',
      role: 'TEACHER',
      phone: '13800138003',
      isActive: true,
    },
  });

  await prisma.teacherProfile.upsert({
    where: { userId: teacher1.id },
    update: {},
    create: {
      userId: teacher1.id,
      teacherId: 'T001',
      bio: '资深钢琴教师，10年教学经验',
      specialties: JSON.stringify(['钢琴', '乐理']),
      yearsExperience: 10,
      certification: '中央音乐学院认证',
      avgSatisfaction: 4.8,
    },
  });

  const teacher2 = await prisma.user.upsert({
    where: { username: 'teacher2' },
    update: {},
    create: {
      username: 'teacher2',
      email: 'teacher2@example.com',
      passwordHash: hashedPassword,
      realName: '陈老师',
      role: 'TEACHER',
      phone: '13800138004',
      isActive: true,
    },
  });

  await prisma.teacherProfile.upsert({
    where: { userId: teacher2.id },
    update: {},
    create: {
      userId: teacher2.id,
      teacherId: 'T002',
      bio: '声乐教师，多次获国家级奖项',
      specialties: JSON.stringify(['声乐', '视唱练耳']),
      yearsExperience: 8,
      certification: '中国音乐学院认证',
      avgSatisfaction: 4.9,
    },
  });

  const student1 = await prisma.user.upsert({
    where: { username: 'student1' },
    update: {},
    create: {
      username: 'student1',
      email: 'student1@example.com',
      passwordHash: hashedPassword,
      realName: '小明',
      role: 'STUDENT',
      phone: '13900139001',
      isActive: true,
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: student1.id },
    update: {},
    create: {
      userId: student1.id,
      studentId: 'S001',
      age: 10,
      grade: '四年级',
      school: '阳光小学',
      parentName: '明爸爸',
      parentPhone: '13900139010',
      assessmentScore: 85,
      averageScore: 88,
    },
  });

  const student2 = await prisma.user.upsert({
    where: { username: 'student2' },
    update: {},
    create: {
      username: 'student2',
      email: 'student2@example.com',
      passwordHash: hashedPassword,
      realName: '小红',
      role: 'STUDENT',
      phone: '13900139002',
      isActive: true,
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: student2.id },
    update: {},
    create: {
      userId: student2.id,
      studentId: 'S002',
      age: 12,
      grade: '六年级',
      school: '阳光小学',
      parentName: '红妈妈',
      parentPhone: '13900139020',
      assessmentScore: 90,
      averageScore: 92,
    },
  });

  const subject1 = await prisma.subject.upsert({
    where: { code: 'PIANO' },
    update: {},
    create: {
      name: '钢琴',
      code: 'PIANO',
      description: '钢琴演奏教学',
      icon: '🎹',
      color: '#1890ff',
    },
  });

  const subject2 = await prisma.subject.upsert({
    where: { code: 'VOCAL' },
    update: {},
    create: {
      name: '声乐',
      code: 'VOCAL',
      description: '声乐演唱教学',
      icon: '🎤',
      color: '#52c41a',
    },
  });

  const subject3 = await prisma.subject.upsert({
    where: { code: 'DANCE' },
    update: {},
    create: {
      name: '舞蹈',
      code: 'DANCE',
      description: '舞蹈教学',
      icon: '💃',
      color: '#eb2f96',
    },
  });

  const semester = await prisma.semester.upsert({
    where: { code: '2024-SPRING' },
    update: {},
    create: {
      name: '2024年春季学期',
      code: '2024-SPRING',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-06-30'),
      status: 'ACTIVE',
      isActive: true,
    },
  });

  const t1Profile = await prisma.teacherProfile.findUnique({ where: { userId: teacher1.id } });
  const t2Profile = await prisma.teacherProfile.findUnique({ where: { userId: teacher2.id } });

  const course1 = await prisma.course.upsert({
    where: { code: 'C001' },
    update: {},
    create: {
      subjectId: subject1.id,
      semesterId: semester.id,
      teacherId: t1Profile!.id,
      name: '钢琴基础入门',
      code: 'C001',
      description: '适合零基础的钢琴初学者，学习基本指法和乐理知识',
      level: 'BEGINNER',
      minAge: 6,
      maxAge: 12,
      totalSessions: 24,
      price: 2400,
      popularity: 95,
      isActive: true,
    },
  });

  const course2 = await prisma.course.upsert({
    where: { code: 'C002' },
    update: {},
    create: {
      subjectId: subject1.id,
      semesterId: semester.id,
      teacherId: t1Profile!.id,
      name: '钢琴进阶提高',
      code: 'C002',
      description: '适合有一定基础的学员，提升演奏技巧',
      level: 'INTERMEDIATE',
      minAge: 10,
      maxAge: 16,
      totalSessions: 32,
      price: 3200,
      popularity: 88,
      isActive: true,
    },
  });

  const course3 = await prisma.course.upsert({
    where: { code: 'C003' },
    update: {},
    create: {
      subjectId: subject2.id,
      semesterId: semester.id,
      teacherId: t2Profile!.id,
      name: '声乐基础班',
      code: 'C003',
      description: '学习正确的发声方法和演唱技巧',
      level: 'BEGINNER',
      minAge: 8,
      maxAge: 15,
      totalSessions: 20,
      price: 2000,
      popularity: 92,
      isActive: true,
    },
  });

  const class1 = await prisma.class.upsert({
    where: { code: 'CL001' },
    update: {},
    create: {
      courseId: course1.id,
      subjectId: subject1.id,
      teacherId: t1Profile!.id,
      headTeacherId: headTeacher.id,
      semesterId: semester.id,
      name: '钢琴启蒙A班',
      code: 'CL001',
      maxStudents: 8,
      currentStudents: 2,
      status: 'ACTIVE',
      classroom: '钢琴教室101',
    },
  });

  const class2 = await prisma.class.upsert({
    where: { code: 'CL002' },
    update: {},
    create: {
      courseId: course3.id,
      subjectId: subject2.id,
      teacherId: t2Profile!.id,
      headTeacherId: headTeacher.id,
      semesterId: semester.id,
      name: '声乐基础A班',
      code: 'CL002',
      maxStudents: 10,
      currentStudents: 1,
      status: 'ACTIVE',
      classroom: '声乐教室201',
    },
  });

  const s1Profile = await prisma.studentProfile.findUnique({ where: { userId: student1.id } });
  const s2Profile = await prisma.studentProfile.findUnique({ where: { userId: student2.id } });

  await prisma.classEnrollment.upsert({
    where: {
      classId_studentId: {
        classId: class1.id,
        studentId: s1Profile!.id,
      },
    },
    update: {},
    create: {
      classId: class1.id,
      studentId: s1Profile!.id,
      status: 'CONFIRMED',
    },
  });

  await prisma.classEnrollment.upsert({
    where: {
      classId_studentId: {
        classId: class1.id,
        studentId: s2Profile!.id,
      },
    },
    update: {},
    create: {
      classId: class1.id,
      studentId: s2Profile!.id,
      status: 'CONFIRMED',
    },
  });

  await prisma.classEnrollment.upsert({
    where: {
      classId_studentId: {
        classId: class2.id,
        studentId: s1Profile!.id,
      },
    },
    update: {},
    create: {
      classId: class2.id,
      studentId: s1Profile!.id,
      status: 'CONFIRMED',
    },
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(15, 30, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(14, 0, 0, 0);
  const nextWeekEnd = new Date(nextWeek);
  nextWeekEnd.setHours(15, 30, 0, 0);

  await prisma.liveSession.upsert({
    where: { id: 'session1' },
    update: {},
    create: {
      id: 'session1',
      classId: class1.id,
      teacherId: t1Profile!.id,
      title: '钢琴基础第1课 - 认识琴键',
      description: '学习钢琴基本构造和中央C位置',
      startTime: tomorrow,
      endTime: tomorrowEnd,
      status: 'SCHEDULED',
      streamUrl: 'https://meeting.example.com/abc123',
      meetingId: 'abc123',
    },
  });

  await prisma.liveSession.upsert({
    where: { id: 'session2' },
    update: {},
    create: {
      id: 'session2',
      classId: class1.id,
      teacherId: t1Profile!.id,
      title: '钢琴基础第2课 - 基本指法',
      description: '学习正确的手型和基本指法练习',
      startTime: nextWeek,
      endTime: nextWeekEnd,
      status: 'SCHEDULED',
      streamUrl: 'https://meeting.example.com/def456',
      meetingId: 'def456',
    },
  });

  const assignment1 = await prisma.assignment.upsert({
    where: { id: 'assign1' },
    update: {},
    create: {
      id: 'assign1',
      courseId: course1.id,
      classId: class1.id,
      teacherId: t1Profile!.id,
      title: '第1课课后作业',
      description: '练习中央C位置的指法，每天练习15分钟',
      type: 'MIXED',
      totalScore: 100,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.assignmentQuestion.createMany({
    data: [
      {
        assignmentId: 'assign1',
        questionText: '钢琴有多少个白键？',
        questionType: 'SINGLE_CHOICE',
        options: JSON.stringify({ A: '52个', B: '56个', C: '60个', D: '88个' }),
        correctAnswer: 'A',
        score: 20,
        orderIndex: 1,
      },
      {
        assignmentId: 'assign1',
        questionText: '中央C在钢琴的哪个位置？',
        questionType: 'SINGLE_CHOICE',
        options: JSON.stringify({ A: '最左边', B: '正中间', C: '最右边', D: '没有固定位置' }),
        correctAnswer: 'B',
        score: 20,
        orderIndex: 2,
      },
      {
        assignmentId: 'assign1',
        questionText: '请上传你的练习视频或音频',
        questionType: 'FILE_UPLOAD',
        score: 60,
        orderIndex: 3,
      },
    ],
  });

  const exam1 = await prisma.exam.upsert({
    where: { id: 'exam1' },
    update: {},
    create: {
      id: 'exam1',
      courseId: course1.id,
      classId: class1.id,
      semesterId: semester.id,
      teacherId: t1Profile!.id,
      name: '钢琴基础期中考试',
      description: '检验前半学期的学习成果',
      examType: 'MIDTERM',
      totalScore: 100,
      startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      status: 'PUBLISHED',
    },
  });

  await prisma.examQuestion.createMany({
    data: [
      {
        examId: 'exam1',
        questionText: '全音符等于几个四分音符？',
        questionType: 'SINGLE_CHOICE',
        options: JSON.stringify({ A: '2个', B: '3个', C: '4个', D: '6个' }),
        correctAnswer: 'C',
        score: 25,
        orderIndex: 1,
      },
      {
        examId: 'exam1',
        questionText: '4/4拍表示每小节有几拍？',
        questionType: 'SINGLE_CHOICE',
        options: JSON.stringify({ A: '2拍', B: '3拍', C: '4拍', D: '6拍' }),
        correctAnswer: 'C',
        score: 25,
        orderIndex: 2,
      },
    ],
  });

  const classroom1 = await prisma.classroom.upsert({
    where: { code: 'RM101' },
    update: {},
    create: {
      name: '钢琴教室101',
      code: 'RM101',
      capacity: 10,
      equipment: JSON.stringify(['钢琴', '音响', '投影仪']),
      isActive: true,
    },
  });

  const classroom2 = await prisma.classroom.upsert({
    where: { code: 'RM201' },
    update: {},
    create: {
      name: '声乐教室201',
      code: 'RM201',
      capacity: 15,
      equipment: JSON.stringify(['麦克风', '音响', '钢琴']),
      isActive: true,
    },
  });

  console.log('种子数据填充完成！');
  console.log('');
  console.log('测试账号：');
  console.log('  管理员: admin / 123456');
  console.log('  校长: principal / 123456');
  console.log('  班主任: headteacher / 123456');
  console.log('  教师1: teacher1 / 123456');
  console.log('  教师2: teacher2 / 123456');
  console.log('  学生1: student1 / 123456');
  console.log('  学生2: student2 / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
