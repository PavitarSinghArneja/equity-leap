import { useState, useCallback } from 'react';

interface NotificationItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  time: string;
  isLogo?: boolean;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const addNotification = useCallback((notification: Omit<NotificationItem, 'time' | 'id'>) => {
    const newNotification = {
      ...notification,
      id: Date.now().toString(),
      time: 'now'
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep only last 5 notifications
    
    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 5000);
  }, [removeNotification]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    clearNotifications,
    removeNotification
  };
};