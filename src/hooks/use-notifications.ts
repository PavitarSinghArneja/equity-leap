import { useState, useCallback } from 'react';

interface NotificationItem {
  name: string;
  description: string;
  icon: string;
  color: string;
  time: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = useCallback((notification: Omit<NotificationItem, 'time'>) => {
    const newNotification = {
      ...notification,
      time: 'now'
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep only last 5 notifications
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    clearNotifications
  };
};