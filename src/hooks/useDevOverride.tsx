import { useState, useEffect } from 'react';

export const useDevOverride = () => {
  const [devStatus, setDevStatus] = useState<string>('trial_active');

  useEffect(() => {
    // Load dev status from localStorage if available
    const savedStatus = localStorage.getItem('dev_status');
    if (savedStatus) {
      setDevStatus(savedStatus);
    }
  }, []);

  useEffect(() => {
    // Save dev status to localStorage
    localStorage.setItem('dev_status', devStatus);
  }, [devStatus]);

  const getOverriddenProfile = (originalProfile: any) => {
    if (process.env.NODE_ENV === 'production') {
      return originalProfile;
    }

    const now = new Date();
    const futureDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now
    const pastDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

    const baseProfile = originalProfile || {};

    switch (devStatus) {
      case 'trial_active':
        return {
          ...baseProfile,
          tier: 'explorer',
          subscription_active: false,
          trial_expires_at: futureDate.toISOString(),
          kyc_status: 'pending'
        };
      
      case 'trial_expired':
        return {
          ...baseProfile,
          tier: 'explorer',
          subscription_active: false,
          trial_expires_at: pastDate.toISOString(),
          kyc_status: 'pending'
        };
      
      case 'waitlist_player':
        return {
          ...baseProfile,
          tier: 'waitlist_player',
          subscription_active: true,
          trial_expires_at: futureDate.toISOString(),
          kyc_status: 'approved'
        };
      
      case 'premium_user':
        return {
          ...baseProfile,
          tier: 'investor',
          subscription_active: true,
          trial_expires_at: futureDate.toISOString(),
          kyc_status: 'approved'
        };
      
      default:
        return originalProfile;
    }
  };

  return { devStatus, setDevStatus, getOverriddenProfile };
};