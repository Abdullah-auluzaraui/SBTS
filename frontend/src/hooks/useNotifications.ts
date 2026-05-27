import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '../services/apiService';
import { useAuth } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Notification {
  _id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  [key: string]: unknown;
}

interface UseNotificationsOptions {
  onRefreshRequired?: () => void;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
  toastData: Notification | null;
  setToastData: React.Dispatch<React.SetStateAction<Notification | null>>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getSocketUrl = (): string => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL as string;
  return import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useNotifications = (
  { onRefreshRequired }: UseNotificationsOptions = {}
): UseNotificationsReturn => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [toastData, setToastData]         = useState<Notification | null>(null);

  const fetchNotifications = useCallback(async (): Promise<void> => {
    try {
      const { data } = await api.get<Notification[]>('/notifications');
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  const onRefreshRequiredRef = useRef(onRefreshRequired);
  useEffect(() => {
    onRefreshRequiredRef.current = onRefreshRequired;
  }, [onRefreshRequired]);

  useEffect(() => {
    if (user?.role !== 'parent') return;

    fetchNotifications();

    const token = localStorage.getItem('token');
    if (!token) return;

    const socket: Socket = io(getSocketUrl(), { auth: { token } });

    socket.on('notification:new', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      setToastData(notification);
      setTimeout(() => setToastData(null), 5000);

      if (
        ['admin_notice', 'status_update', 'urgent_alert'].includes(notification.type) &&
        onRefreshRequiredRef.current
      ) {
        onRefreshRequiredRef.current();
      }
    });

    return () => { socket.disconnect(); };
  }, [user?.role, fetchNotifications]);

  const markAsRead = async (id: string): Promise<void> => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async (): Promise<void> => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
    toastData,
    setToastData,
  };
};

export default useNotifications;
