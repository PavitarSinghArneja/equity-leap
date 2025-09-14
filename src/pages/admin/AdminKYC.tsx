import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft,
  FileCheck,
  Search,
  Eye,
  CheckCircle2,
  X,
  Clock,
  AlertTriangle,
  Download,
  User
} from 'lucide-react';

interface KYCUser {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  kyc_status: 'pending' | 'under_review' | 'approved' | 'rejected';
  kyc_submitted_at: string | null;
  created_at: string;
}

interface KYCDocument {
  id: string;
  user_id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
}

const AdminKYC = () => {
  const { addNotification } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<KYCUser[]>([]);
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [selectedUser, setSelectedUser] = useState<KYCUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [processingReview, setProcessingReview] = useState(false);

  useEffect(() => {
    fetchKYCUsers();
  }, []);

  const fetchKYCUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, email, full_name, phone, kyc_status, kyc_submitted_at, created_at')
        .in('kyc_status', ['pending', 'under_review'])
        .order('kyc_submitted_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching KYC users:', error);
      addNotification({
        name: "Failed to Load KYC Data",
        description: "Unable to fetch KYC submissions",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const fetchUserDocuments = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      addNotification({
        name: "Failed to Load Documents",
        description: "Unable to fetch user documents",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    }
  };

  const updateKYCStatus = async (userId: string, status: 'approved' | 'rejected') => {
    setProcessingReview(true);
    try {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          kyc_status: status,
          kyc_approved_at: status === 'approved' ? new Date().toISOString() : null
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Update all documents with admin notes
      if (reviewNotes.trim()) {
        const { error: docsError } = await supabase
          .from('kyc_documents')
          .update({
            verification_status: status,
            admin_notes: reviewNotes,
            reviewed_by: userId,
            reviewed_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (docsError) throw docsError;
      }

      addNotification({
        name: "KYC Status Updated",
        description: `KYC has been ${status} successfully`,
        icon: "CHECK_CIRCLE",
        color: "#059669",
        isLogo: true
      });

      // Remove from pending list
      setUsers(prev => prev.filter(u => u.user_id !== userId));
      setSelectedUser(null);
      setReviewNotes('');

    } catch (error) {
      console.error('Error updating KYC status:', error);
      addNotification({
        name: "Update Failed",
        description: "Failed to update KYC status",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    } finally {
      setProcessingReview(false);
    }
  };

  const openDocumentViewer = (user: KYCUser) => {
    setSelectedUser(user);
    fetchUserDocuments(user.user_id);
  };

  const filteredUsers = users.filter(user => {
    return !searchQuery || 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getStatusBadge = (status: KYCUser['kyc_status']) => {
    const config = {
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      under_review: { icon: AlertTriangle, color: 'bg-blue-100 text-blue-800', label: 'Under Review' },
      approved: { icon: CheckCircle2, color: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { icon: X, color: 'bg-red-100 text-red-800', label: 'Rejected' }
    };

    const { icon: Icon, color, label } = config[status];
    return (
      <Badge className={`${color} hover:${color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mx-auto mb-4">
            <FileCheck className="w-7 h-7 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading KYC submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 hero-gradient rounded-lg flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold">KYC Management</h1>
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
        <div className="space-y-6">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle>KYC Queue ({filteredUsers.length})</CardTitle>
              <CardDescription>Review and approve user verification documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* KYC List */}
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <Card key={user.user_id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      
                      <div>
                        <p className="font-medium">{user.full_name || 'No Name'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {user.kyc_submitted_at ? 
                            new Date(user.kyc_submitted_at).toLocaleDateString() : 
                            'Not submitted'
                          }
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {getStatusBadge(user.kyc_status)}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDocumentViewer(user)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Review Documents
                          </Button>
                        </DialogTrigger>
                        
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                          <DialogHeader>
                            <DialogTitle>KYC Review - {selectedUser?.full_name || selectedUser?.email}</DialogTitle>
                            <DialogDescription>
                              Review and approve or reject KYC documents
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedUser && (
                            <div className="space-y-6">
                              {/* User Info */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">User Information</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">Name</p>
                                      <p className="text-sm text-muted-foreground">
                                        {selectedUser.full_name || 'Not provided'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Email</p>
                                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Phone</p>
                                      <p className="text-sm text-muted-foreground">
                                        {selectedUser.phone || 'Not provided'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Status</p>
                                      {getStatusBadge(selectedUser.kyc_status)}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Documents */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">Submitted Documents</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-4">
                                    {documents.map((doc) => (
                                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                                        <div>
                                          <p className="font-medium">{doc.file_name}</p>
                                          <p className="text-sm text-muted-foreground">
                                            Type: {doc.document_type} • 
                                            Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                                          </p>
                                        </div>
                                        
                                        <div className="flex items-center space-x-2">
                                          <Badge variant="outline">
                                            {doc.verification_status}
                                          </Badge>
                                          {doc.file_url && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => window.open(doc.file_url, '_blank')}
                                            >
                                              <Download className="w-4 h-4" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Review Section */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">Review Decision</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">Admin Notes</label>
                                    <Textarea
                                      placeholder="Add notes about this KYC review..."
                                      value={reviewNotes}
                                      onChange={(e) => setReviewNotes(e.target.value)}
                                      className="mt-2"
                                    />
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => updateKYCStatus(selectedUser.user_id, 'approved')}
                                      disabled={processingReview}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      Approve KYC
                                    </Button>
                                    
                                    <Button
                                      variant="destructive"
                                      onClick={() => updateKYCStatus(selectedUser.user_id, 'rejected')}
                                      disabled={processingReview}
                                    >
                                      <X className="w-4 h-4 mr-2" />
                                      Reject KYC
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredUsers.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-semibold mb-2">No Pending KYC Submissions</p>
                  <p className="text-muted-foreground">
                    All KYC submissions have been reviewed.
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

export default AdminKYC;
