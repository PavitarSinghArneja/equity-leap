import { supabase } from '@/integrations/supabase/client';
import { updateUserTier } from './tierManagement';

/**
 * Utility function to recalculate tiers for all users in the system
 * This should be run after updating the database enum and implementing the new tier logic
 * 
 * Usage (from browser console or admin script):
 * import { recalculateAllUserTiers } from '@/utils/recalculateAllTiers';
 * recalculateAllUserTiers();
 */
export async function recalculateAllUserTiers(): Promise<void> {
  console.log('Starting tier recalculation for all users...');
  
  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('user_id, email, tier');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('No users found');
      return;
    }

    console.log(`Found ${users.length} users to process`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process users in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (user) => {
        try {
          const result = await updateUserTier(user.user_id);
          if (result.success) {
            console.log(`✅ Updated ${user.email}: ${user.tier} → ${result.newTier}`);
            successCount++;
          } else {
            console.error(`❌ Failed to update ${user.email}:`, result.error);
            errorCount++;
          }
        } catch (error) {
          console.error(`❌ Error updating ${user.email}:`, error);
          errorCount++;
        }
      });

      await Promise.all(batchPromises);
      
      // Small delay between batches
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`\n📊 Tier recalculation completed:`);
    console.log(`✅ Successful updates: ${successCount}`);
    console.log(`❌ Failed updates: ${errorCount}`);
    console.log(`📈 Total processed: ${users.length}`);
    
  } catch (error) {
    console.error('Error in recalculateAllUserTiers:', error);
  }
}

/**
 * Utility to show current tier distribution
 */
export async function showTierDistribution(): Promise<void> {
  try {
    const { data: distribution, error } = await supabase
      .from('user_profiles')
      .select('tier')
      .then(result => {
        if (result.error) throw result.error;
        
        const counts: Record<string, number> = {};
        result.data?.forEach(user => {
          const tier = user.tier || 'null';
          counts[tier] = (counts[tier] || 0) + 1;
        });
        
        return { data: counts, error: null };
      });

    if (error) {
      console.error('Error fetching tier distribution:', error);
      return;
    }

    console.log('\n📊 Current Tier Distribution:');
    Object.entries(distribution).forEach(([tier, count]) => {
      console.log(`  ${tier}: ${count} users`);
    });
    
  } catch (error) {
    console.error('Error in showTierDistribution:', error);
  }
}