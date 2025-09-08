import { supabase } from '@/integrations/supabase/client';

export type UserTier = 'explorer' | 'waitlist_player' | 'small_investor' | 'large_investor';

/**
 * Calculates the appropriate user tier based on their investment status
 * 
 * Tier Logic:
 * - explorer: Free trial users who haven't paid
 * - waitlist_player: Users who have paid for platform access but haven't invested yet
 * - small_investor: Users who have invested and own exactly 1 share of any property
 * - large_investor: Users who own more than 1 share of any property
 */
export async function calculateUserTier(userId: string): Promise<UserTier> {
  try {
    // First check if user has an active subscription
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('subscription_active, tier')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return 'explorer';
    }

    // If no active subscription, they remain an explorer
    if (!profile.subscription_active) {
      return 'explorer';
    }

    // Get all confirmed investments for the user
    const { data: investments, error: investmentError } = await supabase
      .from('investments')
      .select('shares_owned')
      .eq('user_id', userId)
      .eq('investment_status', 'confirmed');

    if (investmentError) {
      console.error('Error fetching investments:', investmentError);
      return 'waitlist_player'; // Default to waitlist if error but has subscription
    }

    // If no investments, they're a waitlist player (paid but not invested)
    if (!investments || investments.length === 0) {
      return 'waitlist_player';
    }

    // Check if any property has more than 1 share
    const hasMultipleShares = investments.some(investment => investment.shares_owned > 1);
    
    if (hasMultipleShares) {
      return 'large_investor';
    } else {
      return 'small_investor';
    }

  } catch (error) {
    console.error('Error calculating user tier:', error);
    return 'explorer';
  }
}

/**
 * Updates the user's tier in the database based on their current investment status
 * Respects admin overrides - will not update if tier_override_by_admin is true
 */
export async function updateUserTier(userId: string): Promise<{ success: boolean; newTier?: UserTier; error?: string; skipped?: boolean }> {
  try {
    // First try to check if the user has an admin override
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('tier')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile for tier update:', profileError);
      return { success: false, error: profileError.message };
    }

    // Try to check for override if column exists
    const { data: overrideCheck, error: overrideError } = await supabase
      .from('user_profiles')
      .select('tier_override_by_admin')
      .eq('user_id', userId)
      .single();
    
    // If override column exists and is set to true, skip update
    if (!overrideError && overrideCheck?.tier_override_by_admin) {
      console.log(`Skipping tier update for user ${userId} - admin override active`);
      return { success: true, skipped: true, newTier: profile.tier as UserTier };
    }

    const newTier = await calculateUserTier(userId);
    
    const { error } = await supabase
      .from('user_profiles')
      .update({ tier: newTier })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating user tier:', error);
      return { success: false, error: error.message };
    }

    return { success: true, newTier };
  } catch (error) {
    console.error('Error in updateUserTier:', error);
    return { success: false, error: 'Failed to update user tier' };
  }
}

/**
 * Admin function to manually set a user's tier, bypassing automatic calculations
 * This sets an override flag so the tier won't be automatically changed
 */
export async function setUserTierByAdmin(
  userId: string, 
  newTier: UserTier, 
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First check if override columns exist by attempting to read them
    const { data: testData, error: testError } = await supabase
      .from('user_profiles')
      .select('tier_override_by_admin')
      .eq('user_id', userId)
      .single();

    // If the column doesn't exist, just update the tier without override fields
    if (testError?.code === '42703') { // Column doesn't exist error
      console.log('Override columns not available, updating tier only');
      const { error } = await supabase
        .from('user_profiles')
        .update({ tier: newTier })
        .eq('user_id', userId);

      if (error) {
        console.error('Error setting user tier:', error);
        return { success: false, error: error.message };
      }

      console.log(`Admin ${adminUserId} set user ${userId} tier to: ${newTier} (no override tracking)`);
      return { success: true };
    }

    // If columns exist, update with override tracking
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        tier: newTier,
        tier_override_by_admin: true,
        tier_override_at: new Date().toISOString(),
        tier_override_by: adminUserId
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error setting user tier by admin:', error);
      return { success: false, error: error.message };
    }

    console.log(`Admin ${adminUserId} set user ${userId} tier to: ${newTier}`);
    return { success: true };
  } catch (error) {
    console.error('Error in setUserTierByAdmin:', error);
    return { success: false, error: 'Failed to set user tier' };
  }
}

/**
 * Admin function to remove tier override and allow automatic tier calculation
 */
export async function removeUserTierOverride(userId: string): Promise<{ success: boolean; newTier?: UserTier; error?: string }> {
  try {
    // Check if override columns exist
    const { error: testError } = await supabase
      .from('user_profiles')
      .select('tier_override_by_admin')
      .eq('user_id', userId)
      .single();

    // If columns exist, remove the override flag
    if (!testError || testError.code !== '42703') {
      const { error: removeOverrideError } = await supabase
        .from('user_profiles')
        .update({ 
          tier_override_by_admin: false,
          tier_override_at: null,
          tier_override_by: null
        })
        .eq('user_id', userId);

      if (removeOverrideError && removeOverrideError.code !== '42703') {
        console.error('Error removing user tier override:', removeOverrideError);
        return { success: false, error: removeOverrideError.message };
      }
    }

    // Now recalculate the tier based on their actual status
    const newTier = await calculateUserTier(userId);
    
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ tier: newTier })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating user tier after removing override:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`Removed tier override for user ${userId}, new calculated tier: ${newTier}`);
    return { success: true, newTier };
  } catch (error) {
    console.error('Error in removeUserTierOverride:', error);
    return { success: false, error: 'Failed to remove user tier override' };
  }
}

/**
 * Triggers tier recalculation for a user after an investment is made
 * This should be called whenever:
 * - A new investment is confirmed
 * - An investment status changes to confirmed
 * - A user activates their subscription
 * Note: Will respect admin overrides
 */
export async function recalculateUserTierAfterInvestment(userId: string): Promise<void> {
  const result = await updateUserTier(userId);
  
  if (result.success) {
    if (result.skipped) {
      console.log(`User ${userId} tier update skipped - admin override active`);
    } else {
      console.log(`User ${userId} tier updated to: ${result.newTier}`);
    }
  } else {
    console.error(`Failed to update tier for user ${userId}:`, result.error);
  }
}