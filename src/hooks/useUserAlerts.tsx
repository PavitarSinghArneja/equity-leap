import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/NewAuthContext';

export interface UserAlert {
  id: string;
  user_id: string;
  alert_type: string;
  title: string;
  message: string;
  property_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export const useUserAlerts = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<UserAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_alerts')
        .select('id,user_id,alert_type,title,message,property_id,is_read,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setAlerts(data || []);
    } catch (e) {
      console.warn('Failed to fetch alerts', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markRead = useCallback(async (id: string) => {
    await supabase.from('user_alerts').update({ is_read: true }).eq('id', id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase.from('user_alerts').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
  }, [user]);

  useEffect(() => {
    fetchAlerts();
    // Realtime updates for alerts
    if (user) {
      const channel = supabase
        .channel(`alerts_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_alerts', filter: `user_id=eq.${user.id}` },
          () => fetchAlerts()
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
    return;
  }, [fetchAlerts]);

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return { alerts, unreadCount, loading, fetchAlerts, markRead, markAllRead };
};
