import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ArrowLeft,
  FileCheck
} from 'lucide-react';
import { toast } from 'sonner';

interface KYCDocument {
  id: string;
  document_type: string;
  file_name: string;
  verification_status: string;
  created_at: string;
}

const documentTypes = [
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'id_card', label: 'National ID Card' },
  { value: 'proof_of_address', label: 'Proof of Address' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'other', label: 'Other' }
];

const KYC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    date_of_birth: '',
    address: '',
    country: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        phone: '',
        date_of_birth: '',
        address: '',
        country: ''
      });
    }

    fetchDocuments();
  }, [user, profile, navigate]);

  const fetchDocuments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast.success('Profile updated successfully');
      await refreshProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedDocType || !user) return;

    setLoading(true);
    try {
      // Upload file to Supabase Storage
      const fileName = `${user.id}/${selectedDocType}_${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(fileName);

      // Save document record to database
      const { error: dbError } = await supabase
        .from('kyc_documents')
        .insert({
          user_id: user.id,
          document_type: selectedDocType as any,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.type
        });

      if (dbError) throw dbError;

      toast.success('Document uploaded successfully');
      setFile(null);
      setSelectedDocType('');
      fetchDocuments();
      
      // Update KYC submitted status if this is the first document
      if (documents.length === 0) {
        await supabase
          .from('user_profiles')
          .update({
            kyc_status: 'under_review',
            kyc_submitted_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        
        await refreshProfile();
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'under_review':
        return <Clock className="w-5 h-5 text-warning" />;
      case 'rejected':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-success';
      case 'under_review':
        return 'text-warning';
      case 'rejected':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <div className="flex items-center space-x-3">
            <FileCheck className="w-6 h-6 text-primary" />
            <span className="text-xl font-semibold">KYC Verification</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Profile Information</span>
            <span>Document Upload</span>
            <span>Verification</span>
          </div>
          <div className="flex items-center">
            <div className="flex-1 h-2 bg-primary rounded-l-full" />
            <div className={`flex-1 h-2 ${documents.length > 0 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex-1 h-2 ${profile?.kyc_status === 'approved' ? 'bg-success' : 'bg-muted'} rounded-r-full`} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <Card className="investment-card">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Please provide accurate information for verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                    placeholder="Enter your full legal name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    placeholder="+1234567890"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={profileData.date_of_birth}
                    onChange={(e) => setProfileData({...profileData, date_of_birth: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={profileData.address}
                    onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                    placeholder="Enter your full address"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={profileData.country}
                    onChange={(e) => setProfileData({...profileData, country: e.target.value})}
                    placeholder="Enter your country"
                    required
                  />
                </div>
                
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Updating...' : 'Update Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Document Upload */}
          <div className="space-y-6">
            <Card className="investment-card">
              <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
                <CardDescription>
                  Upload required identity and address verification documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <Label>Document Type</Label>
                    <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="document">Select File</Label>
                    <Input
                      id="document"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Accepted formats: PDF, JPG, PNG (Max 10MB)
                    </p>
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={loading || !file || !selectedDocType}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {loading ? 'Uploading...' : 'Upload Document'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Uploaded Documents */}
            <Card className="investment-card">
              <CardHeader>
                <CardTitle>Uploaded Documents</CardTitle>
                <CardDescription>
                  Track the status of your submitted documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No documents uploaded yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(doc.verification_status)}
                          <div>
                            <p className="font-medium text-sm">
                              {documentTypes.find(t => t.value === doc.document_type)?.label}
                            </p>
                            <p className="text-xs text-muted-foreground">{doc.file_name}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-medium ${getStatusColor(doc.verification_status)}`}>
                          {doc.verification_status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Status Message */}
        {profile?.kyc_status && (
          <Card className={`mt-8 ${
            profile.kyc_status === 'approved' ? 'border-success/20 bg-success/5' :
            profile.kyc_status === 'under_review' ? 'border-warning/20 bg-warning/5' :
            profile.kyc_status === 'rejected' ? 'border-destructive/20 bg-destructive/5' :
            'border-border'
          }`}>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                {getStatusIcon(profile.kyc_status)}
                <div>
                  <h3 className={`font-semibold ${getStatusColor(profile.kyc_status)}`}>
                    KYC Status: {profile.kyc_status.replace('_', ' ').toUpperCase()}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {profile.kyc_status === 'approved' && 'Your account is fully verified. You can now access all platform features.'}
                    {profile.kyc_status === 'under_review' && 'Your documents are being reviewed. This typically takes 1-3 business days.'}
                    {profile.kyc_status === 'rejected' && 'Some documents were rejected. Please upload new documents or contact support.'}
                    {profile.kyc_status === 'pending' && 'Please complete your profile and upload required documents to begin verification.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default KYC;