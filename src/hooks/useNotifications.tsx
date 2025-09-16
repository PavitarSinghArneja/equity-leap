import { useEffect, useState } from 'react';
import { NotificationService, Notification } from '@/services/NotificationService';

/**
 * Hook to use notifications in React components
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Subscribe to notification changes
    const unsubscribe = NotificationService.subscribe(setNotifications);

    // Cleanup on unmount
    return unsubscribe;
  }, []);

  return {
    notifications,
    addNotification: NotificationService.add.bind(NotificationService),
    removeNotification: NotificationService.remove.bind(NotificationService),
    clearNotifications: NotificationService.clear.bind(NotificationService),

    // Convenience methods
    success: NotificationService.success.bind(NotificationService),
    error: NotificationService.error.bind(NotificationService),
    info: NotificationService.info.bind(NotificationService),
    warning: NotificationService.warning.bind(NotificationService),

    // Auth-specific
    authSuccess: NotificationService.authSuccess.bind(NotificationService),
    authError: NotificationService.authError.bind(NotificationService),

    // Other specific notifications
    profileUpdate: NotificationService.profileUpdate.bind(NotificationService),
    kycStatus: NotificationService.kycStatus.bind(NotificationService),
    investmentStatus: NotificationService.investmentStatus.bind(NotificationService),
    walletTransaction: NotificationService.walletTransaction.bind(NotificationService),
    networkStatus: NotificationService.networkStatus.bind(NotificationService)
  };
};