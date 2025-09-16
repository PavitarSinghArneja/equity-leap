import { useAuth } from '@/contexts/NewAuthContext';

export const useAdmin = () => {
  const { user, profile, phase } = useAuth();

  const isAdmin = Boolean(profile?.is_admin);
  const isAuthenticated = phase === 'AUTHENTICATED';
  const loading = phase === 'INITIALIZING' || phase === 'LOADING';

  return {
    isAdmin,
    isAuthenticated,
    user,
    profile,
    loading,
    phase
  };
};