import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/NewAuthContext';
import {
  FileText,
  Download,
  Upload,
  Shield,
  Building2,
  CreditCard,
  File,
  Eye,
  Trash2
} from 'lucide-react';

interface PropertyDocument {
  id: string;
  property_id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string;
  uploaded_at: string;
  is_public: boolean;
  description?: string;
}

interface PropertyDocumentsProps {
  propertyId: string;
  isAdmin?: boolean;
}

const DocumentTypeConfig = {
  legal_certificate: { label: 'Legal Certificate', icon: Shield, color: 'bg-green-100 text-green-800' },
  rera_approval: { label: 'RERA Approval', icon: Building2, color: 'bg-blue-100 text-blue-800' },
  property_deed: { label: 'Property Deed', icon: FileText, color: 'bg-purple-100 text-purple-800' },
  tax_document: { label: 'Tax Document', icon: CreditCard, color: 'bg-yellow-100 text-yellow-800' },
  insurance: { label: 'Insurance', icon: Shield, color: 'bg-orange-100 text-orange-800' },
  management_agreement: { label: 'Management Agreement', icon: File, color: 'bg-indigo-100 text-indigo-800' },
  other: { label: 'Other', icon: File, color: 'bg-gray-100 text-gray-800' }
};

const PropertyDocuments: React.FC<PropertyDocumentsProps> = ({ propertyId, isAdmin = false }) => {
  const { user, addNotification } = useAuth();
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    document_type: '',
    document_name: '',
    description: '',
    is_public: true,
    file: null as File | null
  });

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('property_documents')
        .select('*')
        .eq('property_id', propertyId)
        .eq('is_public', true) // Only show public documents to regular users
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching property documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propertyId) {
      fetchDocuments();
    }
  }, [propertyId]);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file || !user || !isAdmin) return;

    try {
      setUploading(true);

      // Upload file to Supabase Storage
      const fileExt = uploadForm.file.name.split('.').pop();
      const fileName = `${propertyId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('property-documents')
        .upload(fileName, uploadForm.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('property-documents')
        .getPublicUrl(fileName);

      // Save document metadata to database
      const { data: docData, error: docError } = await supabase
        .from('property_documents')
        .insert([{
          property_id: propertyId,
          document_type: uploadForm.document_type,
          document_name: uploadForm.document_name,
          file_url: publicUrl,
          file_size: uploadForm.file.size,
          mime_type: uploadForm.file.type,
          uploaded_by: user.id,
          is_public: uploadForm.is_public,
          description: uploadForm.description
        }])
        .select()
        .single();

      if (docError) throw docError;

      addNotification({
        name: "Document Uploaded",
        description: `${uploadForm.document_name} has been uploaded successfully`,
        icon: "CHECK_CIRCLE",
        color: "#059669",
        time: new Date().toLocaleTimeString()
      });

      // Reset form and refresh documents
      setUploadForm({
        document_type: '',
        document_name: '',
        description: '',
        is_public: true,
        file: null
      });
      setIsUploadModalOpen(false);
      fetchDocuments();

    } catch (error) {
      console.error('Error uploading document:', error);
      addNotification({
        name: "Upload Failed",
        description: "Failed to upload document. Please try again.",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        time: new Date().toLocaleTimeString()
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document: PropertyDocument) => {
    try {
      const link = document.createElement('a');
      link.href = document.file_url;
      link.download = document.document_name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Property Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading documents...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Property Documents
        </CardTitle>
        {isAdmin && (
          <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Property Document</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div>
                  <Label htmlFor="document_type">Document Type</Label>
                  <Select
                    value={uploadForm.document_type}
                    onValueChange={(value) => setUploadForm(prev => ({ ...prev, document_type: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DocumentTypeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center">
                            <config.icon className="w-4 h-4 mr-2" />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="document_name">Document Name</Label>
                  <Input
                    id="document_name"
                    value={uploadForm.document_name}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, document_name: e.target.value }))}
                    placeholder="Enter document name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the document"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="file">File</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setUploadForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No documents available</p>
            <p className="text-xs text-muted-foreground">Legal documents and certificates will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((document) => {
              const config = DocumentTypeConfig[document.document_type as keyof typeof DocumentTypeConfig] 
                || DocumentTypeConfig.other;
              const IconComponent = config.icon;

              return (
                <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{document.document_name}</h4>
                        <Badge className={config.color} variant="secondary">
                          {config.label}
                        </Badge>
                      </div>
                      {document.description && (
                        <p className="text-xs text-muted-foreground mb-1">{document.description}</p>
                      )}
                      <div className="flex items-center text-xs text-muted-foreground space-x-3">
                        <span>{formatDate(document.uploaded_at)}</span>
                        <span>{formatFileSize(document.file_size)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(document)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PropertyDocuments;