import { useAuth } from '@/contexts/AuthContext';

export const useAdmin = () => {
  const { user, profile } = useAuth();
  
  const isAdmin = Boolean(profile?.is_admin);
  const isAuthenticated = Boolean(user);

  return {
    isAdmin,
    isAuthenticated,
    user,
    profile
  };
};