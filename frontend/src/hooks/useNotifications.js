import { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import api from '../services/apiService';
import { useAuth } from '../context/AuthContext';

const getSocketUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    return import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin;
};

export const useNotifications = ({ onRefreshRequired } = {}) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toastData, setToastData] = useState(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const { data } = await api.get('/notifications');
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

        const socket = io(getSocketUrl(), {
            auth: { token }
        });

        socket.on('notification:new', (notification) => {
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Show toast
            setToastData(notification);
            setTimeout(() => {
                setToastData(null);
            }, 5000);

            // Refetch data if needed
            if ((notification.type === 'admin_notice' || notification.type === 'status_update' || notification.type === 'urgent_alert') && onRefreshRequiredRef.current) {
                onRefreshRequiredRef.current();
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [user?.role, fetchNotifications]); // Removed onRefreshRequired to prevent disconnect loops

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
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
        setToastData
    };
};

export default useNotifications;
