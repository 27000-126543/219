import axios from 'axios';
import { ApiResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  registerStudent: (data: any) => api.post<ApiResponse>('/auth/register/student', data),
  registerUser: (data: any) => api.post<ApiResponse>('/auth/register', data),
  login: (data: any) => api.post<ApiResponse>('/auth/login', data),
  getCurrentUser: () => api.get<ApiResponse>('/auth/me'),
};

export const courseApi = {
  getSubjects: () => api.get<ApiResponse>('/courses/subjects'),
  createSubject: (data: any) => api.post<ApiResponse>('/courses/subjects', data),
  getCourses: (params?: any) => api.get<ApiResponse>('/courses', { params }),
  getCourseById: (id: string) => api.get<ApiResponse>(`/courses/${id}`),
  createCourse: (data: any) => api.post<ApiResponse>('/courses', data),
  getRecommendedCourses: () => api.get<ApiResponse>('/courses/recommended'),
};

export const classApi = {
  getClasses: (params?: any) => api.get<ApiResponse>('/classes', { params }),
  getClassById: (id: string) => api.get<ApiResponse>(`/classes/${id}`),
  getMyClasses: () => api.get<ApiResponse>('/classes/my'),
  createClass: (data: any) => api.post<ApiResponse>('/classes', data),
  enrollClass: (classId: string) => api.post<ApiResponse>(`/classes/${classId}/enroll`),
  dropClass: (classId: string) => api.post<ApiResponse>(`/classes/${classId}/drop`),
  getClassStatistics: (classId: string) => api.get<ApiResponse>(`/classes/${classId}/statistics`),
};

export const liveApi = {
  getLiveSessions: (params?: any) => api.get<ApiResponse>('/live', { params }),
  getSessionById: (id: string) => api.get<ApiResponse>(`/live/${id}`),
  createLiveSession: (data: any) => api.post<ApiResponse>('/live', data),
  updateSessionStatus: (id: string, status: string) => api.patch<ApiResponse>(`/live/${id}/status`, { status }),
  recordAttendance: (sessionId: string) => api.post<ApiResponse>(`/live/${sessionId}/attendance`),
};

export const assignmentApi = {
  getAssignments: (params?: any) => api.get<ApiResponse>('/assignments', { params }),
  getAssignmentById: (id: string) => api.get<ApiResponse>(`/assignments/${id}`),
  createAssignment: (data: any) => api.post<ApiResponse>('/assignments', data),
  submitAssignment: (assignmentId: string, data: any) => api.post<ApiResponse>(`/assignments/${assignmentId}/submit`, data),
  gradeAssignment: (submissionId: string, data: any) => api.patch<ApiResponse>(`/assignments/submissions/${submissionId}/grade`, data),
  getStudentProgress: (studentId: string, params?: any) => api.get<ApiResponse>(`/assignments/progress/${studentId}`, { params }),
};

export const examApi = {
  getExams: (params?: any) => api.get<ApiResponse>('/exams', { params }),
  getExamById: (id: string) => api.get<ApiResponse>(`/exams/${id}`),
  createExam: (data: any) => api.post<ApiResponse>('/exams', data),
  publishExam: (id: string) => api.post<ApiResponse>(`/exams/${id}/publish`),
  submitExam: (examId: string, data: any) => api.post<ApiResponse>(`/exams/${examId}/submit`, data),
  gradeExam: (submissionId: string, data: any) => api.patch<ApiResponse>(`/exams/submissions/${submissionId}/grade`, data),
};

export const alertApi = {
  getAlerts: (params?: any) => api.get<ApiResponse>('/alerts', { params }),
  handleAlert: (alertId: string, data: any) => api.patch<ApiResponse>(`/alerts/${alertId}/handle`, data),
};

export const scheduleApi = {
  getScheduleChanges: (params?: any) => api.get<ApiResponse>('/schedule-changes', { params }),
  createScheduleChange: (data: any) => api.post<ApiResponse>('/schedule-changes', data),
  reviewScheduleChange: (id: string, data: any) => api.patch<ApiResponse>(`/schedule-changes/${id}/review`, data),
};

export const statisticsApi = {
  getOverview: () => api.get<ApiResponse>('/overview'),
  getTeacherPerformance: (params?: any) => api.get<ApiResponse>('/teacher-performance', { params }),
  getNotifications: (params?: any) => api.get<ApiResponse>('/notifications', { params }),
  markNotificationRead: (id: string) => api.patch<ApiResponse>(`/notifications/${id}/read`),
  markAllNotificationsRead: () => api.patch<ApiResponse>('/notifications/read-all'),
};

export default api;
