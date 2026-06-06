import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { authApi, statisticsApi } from './services/api';
import Login from './pages/Login';
import Register from './pages/Register';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Classes from './pages/Classes';
import LiveSessions from './pages/LiveSessions';
import Assignments from './pages/Assignments';
import Exams from './pages/Exams';
import Alerts from './pages/Alerts';
import ScheduleChanges from './pages/ScheduleChanges';
import Notifications from './pages/Notifications';
import Statistics from './pages/Statistics';
import StudentProgress from './pages/StudentProgress';
import ClassDetail from './pages/ClassDetail';
import io from 'socket.io-client';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  const { user, setUser, token, addNotification } = useStore();

  useEffect(() => {
    if (token && !user) {
      authApi.getCurrentUser().then((res) => {
        if (res.data.success) {
          setUser(res.data.data);
        }
      }).catch(() => {});
    }
  }, [token, user, setUser]);

  useEffect(() => {
    if (token && user) {
      const socket = io('/', { transports: ['websocket'] });
      
      socket.on('connect', () => {
        socket.emit('join', user.id);
      });

      socket.on('notification', (notification) => {
        addNotification(notification);
      });

      statisticsApi.getNotifications().then((res) => {
        if (res.data.success) {
          useStore.getState().setNotifications(
            res.data.data.notifications,
            res.data.data.unreadCount
          );
        }
      });

      return () => {
        socket.emit('leave', user.id);
        socket.disconnect();
      };
    }
  }, [token, user, addNotification]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="courses" element={<Courses />} />
        <Route path="classes" element={<Classes />} />
        <Route path="classes/:id" element={<ClassDetail />} />
        <Route path="live" element={<LiveSessions />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="exams" element={<Exams />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="schedule-changes" element={<ScheduleChanges />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="progress/:studentId" element={<StudentProgress />} />
      </Route>
    </Routes>
  );
}

export default App;
