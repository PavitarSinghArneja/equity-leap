import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/NewAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  Edit, 
  Trash2, 
  Plus, 
  ArrowLeft,
  Upload,
  X,
  Eye,
  DollarSign,
  Calendar,
  MapPin,
  Users,
  TrendingUp,
  Camera,
  Save,
  AlertTriangle
} from 'lucide-react';

interface Property {
  id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  country: string;
  property_type: string;
  total_value: number;
  available_shares: number;
  share_price: number;
  minimum_investment: number;
  maximum_investment: number;
  funded_amount: number;
  funding_goal: number;
  expected_annual_return: number;
  property_status: string;
  images: string[];
  documents: string[];
  investment_start_date: string;
  investment_end_date: string;
  featured: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const AdminProperties = () => {
  const { user, addNotification } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Property>>({});
  const [newImages, setNewImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      addNotification({
        name: "Error",
        description: "Failed to load properties",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditProperty = (property: Property) => {
    setSelectedProperty(property);
    setEditForm(property);
    setIsEditDialogOpen(true);
    setNewImages([]);
  };

  const handleImageUpload = async (files: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    setUploadingImages(true);

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `properties/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('property-images')
          .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(data.path);

        uploadedUrls.push(publicUrl);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      addNotification({
        name: "Upload Failed",
        description: "Failed to upload images",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    } finally {
      setUploadingImages(false);
    }

    return uploadedUrls;
  };

  const handleRemoveImage = async (imageUrl: string) => {
    if (!selectedProperty) return;
    
    try {
      const updatedImages = (editForm.images || []).filter(url => url !== imageUrl);
      setEditForm({ ...editForm, images: updatedImages });

      // Delete from storage
      const imagePath = imageUrl.split('/').slice(-2).join('/');
      await supabase.storage
        .from('property-images')
        .remove([imagePath]);
    } catch (error) {
      console.error('Error removing image:', error);
    }
  };

  const handleSaveProperty = async () => {
    if (!selectedProperty || !editForm) return;

    try {
      setLoading(true);

      // Upload new images
      let newImageUrls: string[] = [];
      if (newImages.length > 0) {
        newImageUrls = await handleImageUpload(newImages);
      }

      // Combine existing and new images
      const allImages = [...(editForm.images || []), ...newImageUrls];

      const updateData = {
        ...editForm,
        images: allImages,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', selectedProperty.id);

      if (error) throw error;

      addNotification({
        name: "Success",
        description: "Property updated successfully",
        icon: "CHECK_CIRCLE",
        color: "#10B981",
        isLogo: true
      });

      setIsEditDialogOpen(false);
      fetchProperties();
    } catch (error) {
      console.error('Error updating property:', error);
      addNotification({
        name: "Update Failed",
        description: "Failed to update property",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDeleteProperty = async (propertyId: string) => {
    const confirmation = window.confirm(
      'Are you sure you want to PERMANENTLY delete this property? This will:\n' +
      '- Delete all property data from the database\n' +
      '- Delete all associated images from storage\n' +
      '- Remove all investment records\n' +
      '- This action CANNOT be undone!\n\n' +
      'Type "DELETE" in the next prompt to confirm.'
    );
    
    if (!confirmation) return;
    
    const finalConfirmation = window.prompt('Type "DELETE" to permanently delete this property:');
    if (finalConfirmation !== 'DELETE') {
      addNotification({
        name: "Deletion Cancelled",
        description: "Property deletion was cancelled",
        icon: "INFO",
        color: "#3B82F6",
        isLogo: true
      });
      return;
    }

    try {
      const property = properties.find(p => p.id === propertyId);
      
      // Delete associated images from storage
      if (property?.images && property.images.length > 0) {
        const imagePaths = property.images.map(url => {
          return url.split('/').slice(-2).join('/');
        });
        
        const { error: storageError } = await supabase.storage
          .from('property-images')
          .remove(imagePaths);
          
        if (storageError) {
          console.warn('Error deleting images from storage:', storageError);
        }
      }

      // Delete all investments for this property
      const { error: investmentError } = await supabase
        .from('investments')
        .delete()
        .eq('property_id', propertyId);

      if (investmentError) throw investmentError;

      // Delete all transactions for this property
      const { error: transactionError } = await supabase
        .from('transactions')
        .delete()
        .eq('property_id', propertyId);

      if (transactionError) throw transactionError;

      // Finally delete the property
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;

      addNotification({
        name: "Permanently Deleted",
        description: "Property and all associated data have been permanently deleted",
        icon: "CHECK_CIRCLE",
        color: "#10B981",
        isLogo: true
      });

      fetchProperties();
    } catch (error) {
      console.error('Error permanently deleting property:', error);
      addNotification({
        name: "Delete Failed",
        description: "Failed to permanently delete property",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    }
  };

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '₹0';
    }
    return value.toLocaleString('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'text-blue-600 bg-blue-100';
      case 'open': return 'text-green-600 bg-green-100';
      case 'closed': return 'text-red-600 bg-red-100';
      case 'funded': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading properties...</p>
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
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Property Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <Button onClick={() => navigate('/admin/properties/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Property
            </Button>
          </div>
        </div>
        <div className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Properties</p>
                    <p className="text-2xl font-bold">{properties.length}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Open for Investment</p>
                    <p className="text-2xl font-bold text-green-600">
                      {properties.filter(p => p.property_status === 'open').length}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Closed/Funded</p>
                    <p className="text-2xl font-bold text-red-600">
                      {properties.filter(p => ['closed', 'funded'].includes(p.property_status)).length}
                    </p>
                  </div>
                  <X className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(properties.reduce((sum, p) => sum + (p.total_value || 0), 0))}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Properties List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {properties.map((property) => (
              <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-48 bg-gray-200">
                  {property.images && property.images.length > 0 ? (
                    <img 
                      src={property.images[0]} 
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Camera className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <Badge 
                    className={`absolute top-2 right-2 ${getStatusColor(property.property_status || 'open')}`}
                  >
                    {(property.property_status || 'open').replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                
                <CardHeader>
                  <CardTitle className="text-lg">{property.title}</CardTitle>
                  <CardDescription className="flex items-center text-sm">
                    <MapPin className="w-4 h-4 mr-1" />
                    {property.city}, {property.country}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Value</span>
                      <span className="font-medium">{formatCurrency(property.total_value)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Share Price</span>
                      <span className="font-medium">{formatCurrency(property.share_price)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Available Shares</span>
                      <span className="font-medium">{property.available_shares}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Expected Returns</span>
                      <span className="font-medium text-green-600">{property.expected_annual_return || 0}% p.a.</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditProperty(property)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handlePermanentDeleteProperty(property.id)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Permanent Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {properties.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Properties Found</h3>
                <p className="text-muted-foreground mb-4">Start by adding your first property</p>
                <Button onClick={() => navigate('/admin/properties/new')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Property
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Property Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>
              Update property details, images, and status
            </DialogDescription>
          </DialogHeader>
          
          {selectedProperty && (
            <div className="space-y-6 py-4">
              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Property Title</Label>
                  <Input
                    id="title"
                    value={editForm.title || ''}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={editForm.city || ''}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={editForm.address || ''}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={editForm.country || ''}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Financial Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="total_value">Total Value (₹)</Label>
                  <Input
                    id="total_value"
                    type="number"
                    value={editForm.total_value || ''}
                    onChange={(e) => setEditForm({ ...editForm, total_value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="share_price">Share Price (₹)</Label>
                  <Input
                    id="share_price"
                    type="number"
                    value={editForm.share_price || ''}
                    onChange={(e) => setEditForm({ ...editForm, share_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="expected_annual_return">Expected Returns (%)</Label>
                  <Input
                    id="expected_annual_return"
                    type="number"
                    step="0.1"
                    value={editForm.expected_annual_return || ''}
                    onChange={(e) => setEditForm({ ...editForm, expected_annual_return: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Investment Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="available_shares">Available Shares</Label>
                  <Input
                    id="available_shares"
                    type="number"
                    value={editForm.available_shares || ''}
                    onChange={(e) => setEditForm({ ...editForm, available_shares: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="minimum_investment">Minimum Investment (₹)</Label>
                  <Input
                    id="minimum_investment"
                    type="number"
                    value={editForm.minimum_investment || ''}
                    onChange={(e) => setEditForm({ ...editForm, minimum_investment: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="maximum_investment">Maximum Investment (₹)</Label>
                  <Input
                    id="maximum_investment"
                    type="number"
                    value={editForm.maximum_investment || ''}
                    onChange={(e) => setEditForm({ ...editForm, maximum_investment: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Funding Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="funding_goal">Funding Goal (₹)</Label>
                  <Input
                    id="funding_goal"
                    type="number"
                    value={editForm.funding_goal || ''}
                    onChange={(e) => setEditForm({ ...editForm, funding_goal: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="funded_amount">Current Funded Amount (₹)</Label>
                  <Input
                    id="funded_amount"
                    type="number"
                    value={editForm.funded_amount || ''}
                    onChange={(e) => setEditForm({ ...editForm, funded_amount: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Usually auto-calculated from investments</p>
                </div>
              </div>

              {/* Status and Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="property_status">Status</Label>
                  <Select 
                    value={editForm.property_status || ''} 
                    onValueChange={(value) => setEditForm({ ...editForm, property_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="open">Open for Investment</SelectItem>
                      <SelectItem value="closed">Closed for Investment</SelectItem>
                      <SelectItem value="funded">Funded/Sold Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="property_type">Property Type</Label>
                  <Select 
                    value={editForm.property_type || ''} 
                    onValueChange={(value) => setEditForm({ ...editForm, property_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="mixed">Mixed Use</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Investment Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="investment_start_date">Investment Start Date</Label>
                  <Input
                    id="investment_start_date"
                    type="date"
                    value={editForm.investment_start_date ? new Date(editForm.investment_start_date).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditForm({ ...editForm, investment_start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="investment_end_date">Investment End Date</Label>
                  <Input
                    id="investment_end_date"
                    type="date"
                    value={editForm.investment_end_date ? new Date(editForm.investment_end_date).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditForm({ ...editForm, investment_end_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Featured Property Toggle */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="featured"
                  checked={editForm.featured || false}
                  onChange={(e) => setEditForm({ ...editForm, featured: e.target.checked })}
                  className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <Label htmlFor="featured" className="text-sm font-medium">
                  Featured Property
                </Label>
                <p className="text-xs text-muted-foreground">Featured properties appear prominently on the homepage</p>
              </div>

              {/* Images Section */}
              <div>
                <Label className="text-base font-semibold">Property Images</Label>
                
                {/* Current Images */}
                {editForm.images && editForm.images.length > 0 && (
                  <div className="mt-2 mb-4">
                    <p className="text-sm text-muted-foreground mb-2">Current Images</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {editForm.images.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={imageUrl} 
                            alt={`Property ${index + 1}`}
                            className="w-full h-24 object-cover rounded border"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveImage(imageUrl)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add New Images */}
                <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">Add more images</p>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setNewImages(files);
                    }}
                    className="max-w-sm mx-auto"
                  />
                  {newImages.length > 0 && (
                    <p className="text-xs text-green-600 mt-2">
                      {newImages.length} new image(s) selected
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveProperty} disabled={loading || uploadingImages}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading || uploadingImages ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProperties;
