import { useAuth } from '@/contexts/NewAuthContext';

export const useAdmin = () => {
  const { user, profile, loading } = useAuth();

  const isAdmin = Boolean(profile?.is_admin);
  const isAuthenticated = Boolean(user);

  return {
    isAdmin,
    isAuthenticated,
    user,
    profile,
    loading
  };
};