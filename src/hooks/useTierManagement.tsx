import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserTier, recalculateUserTierAfterInvestment } from '@/utils/tierManagement';

export const useTierManagement = () => {
  const { user } = useAuth();

  const updateCurrentUserTier = useCallback(async () => {
    if (!user) return;
    
    const result = await updateUserTier(user.id);
    if (result.success) {
      console.log('User tier updated to:', result.newTier);
      // You could trigger a context refresh here if needed
      return result.newTier;
    } else {
      console.error('Failed to update user tier:', result.error);
      return null;
    }
  }, [user]);

  const recalculateAfterInvestment = useCallback(async () => {
    if (!user) return;
    await recalculateUserTierAfterInvestment(user.id);
  }, [user]);

  return {
    updateCurrentUserTier,
    recalculateAfterInvestment
  };
};