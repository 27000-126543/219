import { create } from 'zustand';
import { User, Notification } from '../types';

interface AppState {
  user: User | null;
  token: string | null;
  notifications: Notification[];
  unreadCount: number;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  addNotification: (notification: Notification) => void;
  setNotifications: (notifications: Notification[], unreadCount: number) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  notifications: [],
  unreadCount: 0,

  setUser: (user) => {
    set({ user });
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  },

  setToken: (token) => {
    set({ token });
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  },

  logout: () => {
    set({ user: null, token: null, notifications: [], unreadCount: 0 });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  setNotifications: (notifications, unreadCount) => {
    set({ notifications, unreadCount });
  },

  markNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },
}));
