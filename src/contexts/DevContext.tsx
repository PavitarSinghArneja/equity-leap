import React, { createContext, useContext, useState, useEffect } from 'react';

interface DevContextType {
  devStatus: string;
  setDevStatus: (status: string) => void;
  getOverriddenProfile: () => any;
}

const DevContext = createContext<DevContextType | undefined>(undefined);

export const useDevContext = () => {
  const context = useContext(DevContext);
  if (context === undefined) {
    throw new Error('useDevContext must be used within a DevProvider');
  }
  return context;
};

interface DevProviderProps {
  children: React.ReactNode;
}

export const DevProvider = ({ children }: DevProviderProps) => {
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

  const getOverriddenProfile = () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now
    const pastDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

    switch (devStatus) {
      case 'trial_active':
        return {
          tier: 'explorer',
          subscription_active: false,
          trial_expires_at: futureDate.toISOString(),
          kyc_status: 'pending'
        };
      
      case 'trial_expired':
        return {
          tier: 'explorer',
          subscription_active: false,
          trial_expires_at: pastDate.toISOString(),
          kyc_status: 'pending'
        };
      
      case 'waitlist_player':
        return {
          tier: 'waitlist_player',
          subscription_active: true,
          trial_expires_at: futureDate.toISOString(),
          kyc_status: 'approved'
        };
      
      case 'premium_user':
        return {
          tier: 'investor',
          subscription_active: true,
          trial_expires_at: futureDate.toISOString(),
          kyc_status: 'approved'
        };
      
      default:
        return null;
    }
  };

  return (
    <DevContext.Provider value={{ devStatus, setDevStatus, getOverriddenProfile }}>
      {children}
    </DevContext.Provider>
  );
};