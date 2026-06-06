export interface JwtPayload {
  userId: string;
  role: string;
  username: string;
}

export interface RegisterStudentDto {
  username: string;
  email: string;
  password: string;
  realName: string;
  phone?: string;
  gender?: string;
  birthDate?: Date;
  age?: number;
  grade?: string;
  school?: string;
  parentName?: string;
  parentPhone?: string;
  assessmentScore?: number;
}

export interface RegisterUserDto {
  username: string;
  email: string;
  password: string;
  realName: string;
  role: string;
  phone?: string;
  gender?: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface CreateCourseDto {
  subjectId: string;
  semesterId?: string;
  teacherId?: string;
  name: string;
  description?: string;
  level: string;
  minAge?: number;
  maxAge?: number;
  totalSessions?: number;
  price?: number;
}

export interface CreateClassDto {
  courseId: string;
  subjectId: string;
  teacherId?: string;
  headTeacherId?: string;
  semesterId?: string;
  name: string;
  maxStudents?: number;
  classroom?: string;
  schedule?: any;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateLiveSessionDto {
  classId: string;
  teacherId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
}

export interface CreateAssignmentDto {
  courseId?: string;
  classId?: string;
  teacherId: string;
  title: string;
  description?: string;
  type: string;
  totalScore?: number;
  dueDate: Date;
  questions?: Array<{
    questionText: string;
    questionType: string;
    options?: any;
    correctAnswer?: string;
    score?: number;
    orderIndex?: number;
  }>;
}

export interface SubmitAssignmentDto {
  content?: any;
  fileUrl?: string;
}

export interface CreateExamDto {
  courseId?: string;
  classId?: string;
  semesterId?: string;
  name: string;
  description?: string;
  examType: string;
  totalScore?: number;
  startTime: Date;
  endTime: Date;
  questions?: Array<{
    questionText: string;
    questionType: string;
    options?: any;
    correctAnswer?: string;
    score?: number;
    orderIndex?: number;
  }>;
}

export interface SubmitExamDto {
  answers: any;
}

export interface CreateScheduleChangeDto {
  sessionId?: string;
  originalClassId?: string;
  newClassId?: string;
  originalStartTime?: Date;
  originalEndTime?: Date;
  newStartTime?: Date;
  newEndTime?: Date;
  classroom?: string;
  reason: string;
}

export interface FilterCoursesDto {
  subjectId?: string;
  level?: string;
  minAge?: number;
  maxAge?: number;
  search?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
