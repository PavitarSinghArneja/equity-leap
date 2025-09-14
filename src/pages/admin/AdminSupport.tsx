import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, 
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Calendar,
  DollarSign
} from 'lucide-react';

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  amount_requested: number | null;
  status: string;
  priority: string;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  user_profiles: {
    full_name: string | null;
    email: string;
    phone: string | null;
  } | null;
}

const AdminSupport = () => {
  const { addNotification } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          user_profiles (
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      addNotification({
        name: "Failed to Load Tickets",
        description: "Unable to load support tickets",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTicket = async (ticketId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) throw error;

      addNotification({
        name: "Ticket Updated",
        description: "Support ticket has been updated successfully",
        icon: "CHECK_CIRCLE",
        color: "#059669",
        isLogo: true
      });

      fetchTickets();
      setSelectedTicket(null);
      setAdminResponse('');
      setNewStatus('');
    } catch (error) {
      console.error('Error updating ticket:', error);
      addNotification({
        name: "Update Failed",
        description: "Failed to update support ticket",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'in_progress':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'resolved':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'closed':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-accent/10 text-accent border-accent/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'low':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading support tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Support Tickets</h1>
            <p className="text-muted-foreground">Manage customer support requests and fund addition requests</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tickets List */}
          <div className="space-y-4">
            {tickets.length > 0 ? (
              tickets.map((ticket) => (
                <Card 
                  key={ticket.id} 
                  className={`hover:shadow-lg transition-shadow cursor-pointer ${
                    selectedTicket?.id === ticket.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                        <CardDescription className="flex items-center mt-1">
                          <User className="w-4 h-4 mr-1" />
                          {ticket.user_profiles?.full_name || ticket.user_profiles?.email || 'Unknown User'}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status}
                        </Badge>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {ticket.description}
                    </p>
                    
                    {ticket.amount_requested && (
                      <div className="flex items-center text-sm text-muted-foreground mb-2">
                        <DollarSign className="w-4 h-4 mr-1" />
                        Amount Requested: ₹{ticket.amount_requested.toLocaleString()}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                      <span>#{ticket.id.slice(-8)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Support Tickets</h3>
                  <p className="text-muted-foreground">
                    No support tickets have been submitted yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Ticket Details */}
          <div>
            {selectedTicket ? (
              <Card>
                <CardHeader>
                  <CardTitle>Ticket Details</CardTitle>
                  <CardDescription>#{selectedTicket.id.slice(-8)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Subject</h4>
                    <p className="text-sm">{selectedTicket.subject}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedTicket.description}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">User Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Name:</strong> {selectedTicket.user_profiles?.full_name || 'Not provided'}</p>
                      <p><strong>Email:</strong> {selectedTicket.user_profiles?.email}</p>
                      <p><strong>Phone:</strong> {selectedTicket.user_profiles?.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  {selectedTicket.amount_requested && (
                    <div>
                      <h4 className="font-semibold mb-2">Amount Requested</h4>
                      <p className="text-sm">₹{selectedTicket.amount_requested.toLocaleString()}</p>
                    </div>
                  )}
                  
                  {selectedTicket.admin_response && (
                    <div>
                      <h4 className="font-semibold mb-2">Previous Admin Response</h4>
                      <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded">
                        {selectedTicket.admin_response}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-semibold mb-2">Update Status</h4>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select new status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Admin Response</h4>
                    <Textarea
                      value={adminResponse}
                      onChange={(e) => setAdminResponse(e.target.value)}
                      placeholder="Enter your response to the user..."
                      rows={4}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateTicket(selectedTicket.id, {
                        status: newStatus || selectedTicket.status,
                        admin_response: adminResponse || selectedTicket.admin_response,
                        updated_at: new Date().toISOString()
                      })}
                      disabled={!newStatus && !adminResponse}
                      className="flex-1"
                    >
                      Update Ticket
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedTicket(null);
                        setAdminResponse('');
                        setNewStatus('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a Ticket</h3>
                  <p className="text-muted-foreground">
                    Choose a support ticket from the list to view details and respond.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSupport;
