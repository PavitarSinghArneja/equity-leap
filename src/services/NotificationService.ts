/**
 * NotificationService - Centralized notification management
 * Clean service for managing all app notifications
 */

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // milliseconds, 0 = persistent
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface NotificationConfig {
  defaultDuration: number;
  maxNotifications: number;
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

class NotificationServiceClass {
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  private notifications: Notification[] = [];
  private config: NotificationConfig = {
    defaultDuration: 5000,
    maxNotifications: 3,
    position: 'top-right'
  };

  /**
   * Subscribe to notification changes
   */
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current notifications
    listener(this.notifications);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notify() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  /**
   * Add a notification
   */
  add(notification: Omit<Notification, 'id'>): string {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newNotification: Notification = {
      id,
      duration: this.config.defaultDuration,
      ...notification
    };

    // Add to beginning of array
    this.notifications = [newNotification, ...this.notifications].slice(0, this.config.maxNotifications);
    this.notify();

    // Auto-remove after duration (if not persistent)
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, newNotification.duration);
    }

    return id;
  }

  /**
   * Remove a notification
   */
  remove(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notify();
  }

  /**
   * Clear all notifications
   */
  clear() {
    this.notifications = [];
    this.notify();
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Convenience methods for different notification types
   */
  success(title: string, message?: string, duration?: number): string {
    return this.add({ type: 'success', title, message, duration });
  }

  error(title: string, message?: string, duration?: number): string {
    return this.add({ type: 'error', title, message, duration: duration || 0 }); // Errors persist by default
  }

  info(title: string, message?: string, duration?: number): string {
    return this.add({ type: 'info', title, message, duration });
  }

  warning(title: string, message?: string, duration?: number): string {
    return this.add({ type: 'warning', title, message, duration });
  }

  /**
   * Auth-specific notifications
   */
  authSuccess(action: 'signin' | 'signout' | 'signup', userName?: string) {
    switch (action) {
      case 'signin':
        return this.success(
          '👋 Welcome back!',
          userName ? `Good to see you again, ${userName}` : 'Successfully signed in',
          6000
        );
      case 'signout':
        return this.success(
          '👋 Goodbye!',
          'You have been signed out successfully',
          4000
        );
      case 'signup':
        return this.success(
          '🎉 Welcome aboard!',
          userName ? `Welcome to Retreat Slice, ${userName}!` : 'Account created successfully',
          6000
        );
    }
  }

  authError(error: string) {
    // Parse common auth errors for better messages
    let title = '❌ Authentication Error';
    let message = error;

    if (error.includes('Invalid login')) {
      title = '❌ Sign In Failed';
      message = 'Invalid email or password. Please try again.';
    } else if (error.includes('Email not confirmed')) {
      title = '📧 Email Verification Required';
      message = 'Please check your email and verify your account.';
    } else if (error.includes('User already registered')) {
      title = '❌ Account Exists';
      message = 'An account with this email already exists.';
    } else if (error.includes('refresh_token')) {
      title = '🔄 Session Expired';
      message = 'Your session has expired. Please sign in again.';
    } else if (error.includes('network') || error.includes('fetch')) {
      title = '🌐 Connection Error';
      message = 'Unable to connect to server. Please check your internet connection.';
    }

    return this.error(title, message);
  }

  profileUpdate(success: boolean, action?: string) {
    if (success) {
      return this.success(
        '✅ Profile Updated',
        action || 'Your profile has been updated successfully',
        4000
      );
    } else {
      return this.error(
        '❌ Update Failed',
        'Unable to update profile. Please try again.'
      );
    }
  }

  kycStatus(status: 'submitted' | 'approved' | 'rejected' | 'pending') {
    switch (status) {
      case 'submitted':
        return this.success(
          '📋 KYC Submitted',
          'Your KYC documents have been submitted for review',
          5000
        );
      case 'approved':
        return this.success(
          '✅ KYC Approved',
          'Your KYC has been approved! You can now invest in properties.',
          0 // Persistent
        );
      case 'rejected':
        return this.error(
          '❌ KYC Rejected',
          'Your KYC was rejected. Please review and resubmit.',
          0 // Persistent
        );
      case 'pending':
        return this.info(
          '⏳ KYC Pending',
          'Your KYC is under review. We\'ll notify you once it\'s processed.',
          6000
        );
    }
  }

  investmentStatus(success: boolean, propertyName?: string, amount?: number) {
    if (success) {
      return this.success(
        '🎉 Investment Successful',
        propertyName
          ? `You've invested ${amount ? `₹${amount.toLocaleString()}` : ''} in ${propertyName}`
          : 'Your investment has been processed successfully',
        0 // Persistent for important transactions
      );
    } else {
      return this.error(
        '❌ Investment Failed',
        'Unable to process your investment. Please try again or contact support.'
      );
    }
  }

  walletTransaction(type: 'deposit' | 'withdrawal', success: boolean, amount?: number) {
    if (success) {
      const title = type === 'deposit' ? '💰 Deposit Successful' : '💸 Withdrawal Successful';
      const message = amount
        ? `₹${amount.toLocaleString()} has been ${type === 'deposit' ? 'added to' : 'withdrawn from'} your wallet`
        : `Your ${type} has been processed`;
      return this.success(title, message, 6000);
    } else {
      return this.error(
        `❌ ${type === 'deposit' ? 'Deposit' : 'Withdrawal'} Failed`,
        'Transaction could not be processed. Please try again.'
      );
    }
  }

  networkStatus(online: boolean) {
    if (online) {
      return this.success(
        '🌐 Back Online',
        'Connection restored',
        3000
      );
    } else {
      return this.warning(
        '🔌 Connection Lost',
        'You are currently offline. Some features may be unavailable.',
        0 // Persistent while offline
      );
    }
  }
}

// Export singleton instance
export const NotificationService = new NotificationServiceClass();