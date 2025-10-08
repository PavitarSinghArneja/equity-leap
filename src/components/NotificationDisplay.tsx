import { useEffect, useState } from 'react';
import { Notification, NotificationType } from '@/services/NotificationService';
import { X, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationDisplayProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const NotificationDisplay = ({ notification, onDismiss }: NotificationDisplayProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300); // Match animation duration
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStyles = () => {
    const baseStyles = "bg-white dark:bg-gray-800 border";
    switch (notification.type) {
      case 'success':
        return `${baseStyles} border-green-200 dark:border-green-800`;
      case 'error':
        return `${baseStyles} border-red-200 dark:border-red-800`;
      case 'warning':
        return `${baseStyles} border-yellow-200 dark:border-yellow-800`;
      case 'info':
      default:
        return `${baseStyles} border-blue-200 dark:border-blue-800`;
    }
  };

  return (
    <div
      className={cn(
        "relative w-full max-w-sm sm:max-w-md min-w-80 rounded-lg shadow-lg overflow-hidden transition-all duration-300 transform",
        getStyles(),
        isVisible && !isExiting ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
              {notification.title}
            </p>
            {notification.message && (
              <p className="text-sm text-gray-500 dark:text-gray-400 break-words mt-1">
                {notification.message}
              </p>
            )}
            {notification.action && (
              <button
                onClick={notification.action.onClick}
                className="mt-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {notification.action.label}
              </button>
            )}
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="inline-flex text-gray-400 hover:text-gray-500 transition-colors p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar for auto-dismiss */}
      {notification.duration && notification.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-primary transition-all"
            style={{
              animation: `shrink ${notification.duration}ms linear forwards`
            }}
          />
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shrink {
            from {
              width: 100%;
            }
            to {
              width: 0%;
            }
          }
        `
      }} />
    </div>
  );
};

interface NotificationContainerProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

export const NotificationContainer = ({
  notifications,
  onDismiss,
  position = 'top-right'
}: NotificationContainerProps) => {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 -translate-x-1/2';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <div
      className={cn(
        "fixed z-50 pointer-events-none",
        getPositionClasses()
      )}
    >
      <div className="space-y-2 pointer-events-auto">
        {notifications.map((notification) => (
          <NotificationDisplay
            key={notification.id}
            notification={notification}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  );
};

export default NotificationContainer;