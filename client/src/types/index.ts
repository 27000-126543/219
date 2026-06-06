export type Role = 'STUDENT' | 'TEACHER' | 'HEAD_TEACHER' | 'ADMIN' | 'PRINCIPAL';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PROFESSIONAL';
export type ClassStatus = 'ACTIVE' | 'FULL' | 'COMPLETED' | 'CANCELLED';
export type EnrollmentStatus = 'PENDING' | 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED' | 'COMPLETED';
export type SessionStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
export type AssignmentType = 'ONLINE' | 'UPLOAD' | 'MIXED';
export type SubmissionStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'GRADED' | 'LATE';
export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED' | 'GRADED';
export type AlertType = 'ABSENTEEISM' | 'SCORE_DROP' | 'BEHAVIOR' | 'OTHER';
export type AlertStatus = 'PENDING' | 'HANDLED' | 'RESOLVED';
export type NotificationType = 'CLASS_REMINDER' | 'SCORE_ALERT' | 'SCHEDULE_CHANGE' | 'REFUND_REQUEST' | 'ASSIGNMENT_REMINDER' | 'EXAM_REMINDER' | 'WAITLIST_NOTIFICATION' | 'SYSTEM_MESSAGE';
export type ScheduleChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type SemesterStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';

export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  realName: string;
  avatar?: string;
  role: Role;
  gender?: Gender;
  birthDate?: string;
  studentProfile?: StudentProfile;
  teacherProfile?: TeacherProfile;
}

export interface StudentProfile {
  id: string;
  userId: string;
  studentId: string;
  age?: number;
  grade?: string;
  school?: string;
  parentName?: string;
  parentPhone?: string;
  assessmentScore?: number;
  averageScore?: number;
  lastScore?: number;
}

export interface TeacherProfile {
  id: string;
  userId: string;
  teacherId: string;
  bio?: string;
  specialties: string[];
  yearsExperience?: number;
  avgSatisfaction?: number;
  user?: User;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface Course {
  id: string;
  subjectId: string;
  subject?: Subject;
  semesterId?: string;
  teacherId?: string;
  teacher?: TeacherProfile;
  name: string;
  code: string;
  description?: string;
  level: CourseLevel;
  minAge?: number;
  maxAge?: number;
  totalSessions: number;
  price?: number;
  popularity: number;
  classes?: Class[];
}

export interface Class {
  id: string;
  courseId: string;
  course?: Course;
  subjectId: string;
  subject?: Subject;
  teacherId?: string;
  teacher?: TeacherProfile;
  headTeacherId?: string;
  headTeacher?: User;
  name: string;
  code: string;
  status: ClassStatus;
  maxStudents: number;
  currentStudents: number;
  classroom?: string;
  startDate?: string;
  endDate?: string;
  avgScore?: number;
  renewalRate?: number;
  enrollments?: ClassEnrollment[];
  liveSessions?: LiveSession[];
  waitlist?: Waitlist[];
  _count?: { enrollments: number };
}

export interface ClassEnrollment {
  id: string;
  classId: string;
  class?: Class;
  studentId: string;
  student?: StudentProfile;
  status: EnrollmentStatus;
  enrolledAt: string;
}

export interface Waitlist {
  id: string;
  classId: string;
  class?: Class;
  studentId: string;
  student?: StudentProfile;
  position: number;
  addedAt: string;
  isActive: boolean;
}

export interface LiveSession {
  id: string;
  classId: string;
  class?: Class;
  teacherId: string;
  teacher?: TeacherProfile;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: SessionStatus;
  streamUrl?: string;
  meetingId?: string;
  attendanceCount: number;
  remindersSent: boolean;
}

export interface Assignment {
  id: string;
  courseId?: string;
  classId?: string;
  teacherId: string;
  teacher?: TeacherProfile;
  title: string;
  description?: string;
  type: AssignmentType;
  totalScore: number;
  dueDate: string;
  questions?: AssignmentQuestion[];
  submissions?: AssignmentSubmission[];
}

export interface AssignmentQuestion {
  id: string;
  assignmentId: string;
  questionText: string;
  questionType: string;
  options?: any;
  correctAnswer?: string;
  score: number;
  orderIndex: number;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  assignment?: Assignment;
  studentId: string;
  student?: StudentProfile;
  content?: any;
  fileUrl?: string;
  submittedAt?: string;
  status: SubmissionStatus;
  objectiveScore?: number;
  subjectiveScore?: number;
  totalScore?: number;
  feedback?: string;
  gradedAt?: string;
}

export interface Exam {
  id: string;
  courseId?: string;
  classId?: string;
  semesterId?: string;
  name: string;
  description?: string;
  examType: string;
  totalScore: number;
  startTime: string;
  endTime: string;
  status: ExamStatus;
  questions?: ExamQuestion[];
  statistics?: ExamStatistics;
}

export interface ExamQuestion {
  id: string;
  examId: string;
  questionText: string;
  questionType: string;
  options?: any;
  correctAnswer?: string;
  score: number;
  orderIndex: number;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  exam?: Exam;
  studentId: string;
  student?: StudentProfile;
  answers?: any;
  submittedAt?: string;
  score?: number;
  feedback?: string;
}

export interface ExamStatistics {
  id: string;
  examId: string;
  avgScore?: number;
  maxScore?: number;
  minScore?: number;
  passRate?: number;
  questionStats?: any;
  suggestions?: string;
}

export interface Alert {
  id: string;
  studentId: string;
  student?: StudentProfile;
  classId?: string;
  class?: Class;
  type: AlertType;
  title: string;
  description: string;
  severity: string;
  status: AlertStatus;
  handlerId?: string;
  handler?: User;
  handlingNote?: string;
  handledAt?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: any;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface ScheduleChange {
  id: string;
  sessionId?: string;
  session?: LiveSession;
  originalClassId?: string;
  newClassId?: string;
  applicantId: string;
  applicant?: User;
  originalStartTime?: string;
  originalEndTime?: string;
  newStartTime?: string;
  newEndTime?: string;
  classroom?: string;
  reason: string;
  status: ScheduleChangeStatus;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface TeacherPerformance {
  id: string;
  teacherId: string;
  teacher?: TeacherProfile;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  classCompletionRate: number;
  studentConversionRate?: number;
  refundRate?: number;
  avgSatisfaction?: number;
  totalClasses: number;
  totalStudents: number;
  avgScore?: number;
  rank?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
