import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/NewAuthContext';
import { supabase } from '@/integrations/supabase/client';

interface WatchlistItem {
  id: string;
  user_id: string;
  property_id: string;
  added_at: string;
  notes?: string;
  properties: {
    id: string;
    title: string;
    city: string;
    country: string;
    property_type: string;
    share_price: number;
    expected_annual_return: number;
    images: string[];
    property_status: string;
  };
}

export const useWatchlist = () => {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [watchedPropertyIds, setWatchedPropertyIds] = useState<Set<string>>(new Set());

  // Fetch user's watchlist
  const fetchWatchlist = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select(`
          id,
          user_id,
          property_id,
          added_at,
          notes,
          properties (
            id,
            title,
            city,
            country,
            property_type,
            share_price,
            expected_annual_return,
            images,
            property_status
          )
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) throw error;

      const watchlistItems = (data || []) as WatchlistItem[];
      setWatchlist(watchlistItems);
      
      // Create a set of watched property IDs for quick lookup
      const propertyIds = new Set(watchlistItems.map(item => item.property_id));
      setWatchedPropertyIds(propertyIds);

    } catch (error) {
      console.error('Error fetching watchlist:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Add property to watchlist
  const addToWatchlist = useCallback(async (propertyId: string, notes?: string) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const { data, error } = await supabase
        .from('watchlist')
        .insert([{
          user_id: user.id,
          property_id: propertyId,
          notes: notes || null
        }])
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setWatchedPropertyIds(prev => new Set(prev).add(propertyId));
      
      // Refresh watchlist
      await fetchWatchlist();

      return { success: true, data };
    } catch (error: any) {
      console.error('Error adding to watchlist:', error);
      return { 
        success: false, 
        error: error.code === '23505' ? 'Property already in watchlist' : 'Failed to add to watchlist'
      };
    }
  }, [user, fetchWatchlist]);

  // Remove property from watchlist
  const removeFromWatchlist = useCallback(async (propertyId: string) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('property_id', propertyId);

      if (error) throw error;

      // Update local state
      setWatchedPropertyIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(propertyId);
        return newSet;
      });

      // Refresh watchlist
      await fetchWatchlist();

      return { success: true };
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      return { success: false, error: 'Failed to remove from watchlist' };
    }
  }, [user, fetchWatchlist]);

  // Toggle watchlist status
  const toggleWatchlist = useCallback(async (propertyId: string, notes?: string) => {
    if (watchedPropertyIds.has(propertyId)) {
      return await removeFromWatchlist(propertyId);
    } else {
      return await addToWatchlist(propertyId, notes);
    }
  }, [watchedPropertyIds, addToWatchlist, removeFromWatchlist]);

  // Check if a property is in watchlist
  const isInWatchlist = useCallback((propertyId: string) => {
    return watchedPropertyIds.has(propertyId);
  }, [watchedPropertyIds]);

  // Update watchlist item notes
  const updateWatchlistNotes = useCallback(async (propertyId: string, notes: string) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('watchlist')
        .update({ notes })
        .eq('user_id', user.id)
        .eq('property_id', propertyId);

      if (error) throw error;

      // Refresh watchlist
      await fetchWatchlist();

      return { success: true };
    } catch (error) {
      console.error('Error updating watchlist notes:', error);
      return { success: false, error: 'Failed to update notes' };
    }
  }, [user, fetchWatchlist]);

  // Load watchlist on component mount
  useEffect(() => {
    if (user) {
      fetchWatchlist();
    }
  }, [user, fetchWatchlist]);

  return {
    watchlist,
    loading,
    watchedPropertyIds,
    fetchWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    isInWatchlist,
    updateWatchlistNotes,
    watchlistCount: watchlist.length
  };
};