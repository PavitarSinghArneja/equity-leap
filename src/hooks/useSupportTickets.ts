import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SupportTicket {
  id: string;
  user_id: string;
  ticket_type: 'fund_addition' | 'fund_withdrawal' | 'kyc_support' | 'investment_query' | 'general';
  subject: string;
  description: string;
  amount: number | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: string | null;
  user_contact_info: {
    name: string;
    phone: string;
    email: string;
    request_type: string;
    requested_amount?: number;
    current_balance?: number;
  };
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  user_profiles?: {
    full_name: string;
    email: string;
    tier: string;
  };
}

export const useSupportTickets = (adminView = false) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          user_profiles!inner(
            full_name,
            email,
            tier
          )
        `)
        .order('created_at', { ascending: false });

      // If not admin view, only get current user's tickets
      if (!adminView) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      console.error('Error fetching support tickets:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [adminView]);

  const updateTicketStatus = useCallback(async (
    ticketId: string, 
    status: SupportTicket['status'],
    adminNotes?: string
  ) => {
    setLoading(true);
    try {
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
      }

      if (adminNotes) {
        updateData.admin_notes = adminNotes;
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      // Refresh tickets
      await fetchTickets();
      return { success: true };
    } catch (err) {
      console.error('Error updating ticket:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    } finally {
      setLoading(false);
    }
  }, [fetchTickets]);

  const assignTicket = useCallback(async (ticketId: string, assignedTo: string | null) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          assigned_to: assignedTo,
          status: assignedTo ? 'in_progress' : 'open',
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      await fetchTickets();
      return { success: true };
    } catch (err) {
      console.error('Error assigning ticket:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    } finally {
      setLoading(false);
    }
  }, [fetchTickets]);

  const createTicket = useCallback(async (ticketData: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert([ticketData])
        .select()
        .single();

      if (error) throw error;

      await fetchTickets();
      return { success: true, data };
    } catch (err) {
      console.error('Error creating ticket:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    } finally {
      setLoading(false);
    }
  }, [fetchTickets]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return {
    tickets,
    loading,
    error,
    fetchTickets,
    updateTicketStatus,
    assignTicket,
    createTicket
  };
};