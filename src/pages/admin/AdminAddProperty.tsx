import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  ArrowLeft,
  Plus,
  Save,
  MapPin,
  DollarSign,
  FileText,
  Camera
} from 'lucide-react';

interface PropertyForm {
  title: string;
  description: string;
  address: string;
  city: string;
  country: string;
  property_type: string;
  total_value: string;
  share_price: string;
  minimum_investment: string;
  maximum_investment: string;
  expected_annual_return: string;
  funding_goal: string;
  property_status: string;
}

const AdminAddProperty = () => {
  const { user, profile, addNotification } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [formData, setFormData] = useState<PropertyForm>({
    title: '',
    description: '',
    address: '',
    city: '',
    country: 'India',
    property_type: 'residential',
    total_value: '',
    share_price: '',
    minimum_investment: '',
    maximum_investment: '',
    expected_annual_return: '',
    funding_goal: '',
    property_status: 'draft'
  });

  const handleInputChange = (field: keyof PropertyForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const uploadedImages: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          addNotification({
            name: "Invalid File Type",
            description: `${file.name} is not an image file`,
            icon: "ALERT_TRIANGLE",
            color: "#DC2626",
            isLogo: true
          });
          continue;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          addNotification({
            name: "File Too Large",
            description: `${file.name} is larger than 5MB`,
            icon: "ALERT_TRIANGLE",
            color: "#DC2626",
            isLogo: true
          });
          continue;
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `properties/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from('property-images')
          .upload(fileName, file);

        if (error) {
          console.error('Storage upload error:', error);
          addNotification({
            name: "Storage Error",
            description: `Upload failed: ${error.message}. Please check storage bucket setup.`,
            icon: "ALERT_TRIANGLE",
            color: "#DC2626",
            isLogo: true
          });
          continue;
        }

        // Get public URL
        const { data: publicUrl } = supabase.storage
          .from('property-images')
          .getPublicUrl(data.path);

        uploadedImages.push(publicUrl.publicUrl);
      }

      setImages(prev => [...prev, ...uploadedImages]);
      
      addNotification({
        name: "Images Uploaded",
        description: `${uploadedImages.length} image(s) uploaded successfully`,
        icon: "CHECK_CIRCLE",
        color: "#059669",
        isLogo: true
      });

    } catch (error) {
      console.error('Error uploading images:', error);
      addNotification({
        name: "Upload Failed",
        description: "Failed to upload images. Please try again.",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const requiredFields = ['title', 'description', 'address', 'city', 'total_value', 'share_price', 'funding_goal'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof PropertyForm]);
    
    if (missingFields.length > 0) {
      addNotification({
        name: "Missing Required Fields",
        description: `Please fill in: ${missingFields.join(', ')}`,
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
      return false;
    }

    // Validate numeric fields
    const numericFields = ['total_value', 'share_price', 'funding_goal'];
    for (const field of numericFields) {
      const value = formData[field as keyof PropertyForm];
      if (value && isNaN(Number(value))) {
        addNotification({
          name: "Invalid Number",
          description: `${field.replace('_', ' ')} must be a valid number`,
          icon: "ALERT_TRIANGLE",
          color: "#DC2626",
          isLogo: true
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Verify admin access
    if (!user || !profile?.is_admin) {
      addNotification({
        name: "Access Denied",
        description: "Only administrators can create properties",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
      return;
    }

    try {
      setLoading(true);

      const propertyData = {
        title: formData.title,
        description: formData.description,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        property_type: formData.property_type,
        total_value: Number(formData.total_value),
        share_price: Number(formData.share_price),
        minimum_investment: formData.minimum_investment ? Number(formData.minimum_investment) : Number(formData.share_price),
        maximum_investment: formData.maximum_investment ? Number(formData.maximum_investment) : null,
        expected_annual_return: formData.expected_annual_return ? Number(formData.expected_annual_return) : null,
        funding_goal: Number(formData.funding_goal),
        funded_amount: 0,
        available_shares: Math.floor(Number(formData.funding_goal) / Number(formData.share_price)),
        property_status: formData.property_status,
        featured: false,
        images: images,
        created_by: user.id
      };

      const { error } = await supabase
        .from('properties')
        .insert([propertyData]);

      if (error) throw error;

      addNotification({
        name: "Property Created Successfully",
        description: "The property has been added to the platform",
        icon: "CHECK_CIRCLE",
        color: "#059669",
        isLogo: true
      });

      navigate('/admin/properties');
    } catch (error) {
      console.error('Error creating property:', error);
      addNotification({
        name: "Creation Failed",
        description: "Failed to create property. Please try again.",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 hero-gradient rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Add New Property</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/properties')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Properties
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Basic Information
                </CardTitle>
                <CardDescription>Essential property details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Property Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g., Luxury Residential Complex - Phase 1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Detailed description of the property, amenities, and investment opportunity..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="address">Property Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="e.g., Sector 45, Golf Course Road"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="e.g., Gurgaon"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <Select value={formData.country} onValueChange={(value) => handleInputChange('country', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="India">India</SelectItem>
                        <SelectItem value="USA">USA</SelectItem>
                        <SelectItem value="UK">UK</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="property_type">Property Type</Label>
                  <Select value={formData.property_type} onValueChange={(value) => handleInputChange('property_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="mixed-use">Mixed-Use</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Financial Details
                </CardTitle>
                <CardDescription>Investment and pricing information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="total_value">Total Property Value (₹) *</Label>
                    <Input
                      id="total_value"
                      type="number"
                      value={formData.total_value}
                      onChange={(e) => handleInputChange('total_value', e.target.value)}
                      placeholder="25000000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="share_price">Price per Share (₹) *</Label>
                    <Input
                      id="share_price"
                      type="number"
                      value={formData.share_price}
                      onChange={(e) => handleInputChange('share_price', e.target.value)}
                      placeholder="100000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minimum_investment">Minimum Investment (₹)</Label>
                    <Input
                      id="minimum_investment"
                      type="number"
                      value={formData.minimum_investment}
                      onChange={(e) => handleInputChange('minimum_investment', e.target.value)}
                      placeholder="100000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maximum_investment">Maximum Investment (₹)</Label>
                    <Input
                      id="maximum_investment"
                      type="number"
                      value={formData.maximum_investment}
                      onChange={(e) => handleInputChange('maximum_investment', e.target.value)}
                      placeholder="5000000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="funding_goal">Funding Goal (₹) *</Label>
                    <Input
                      id="funding_goal"
                      type="number"
                      value={formData.funding_goal}
                      onChange={(e) => handleInputChange('funding_goal', e.target.value)}
                      placeholder="20000000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="expected_annual_return">Expected Annual Return (%)</Label>
                    <Input
                      id="expected_annual_return"
                      type="number"
                      step="0.1"
                      value={formData.expected_annual_return}
                      onChange={(e) => handleInputChange('expected_annual_return', e.target.value)}
                      placeholder="12.5"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property Images */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="w-5 h-5 mr-2" />
                  Property Images
                </CardTitle>
                <CardDescription>Upload images to showcase the property</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Image Upload */}
                <div>
                  <Label>Upload Images</Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files)}
                      disabled={uploadingImages}
                      className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Support: JPG, PNG, WebP. Max size: 5MB per image.
                    </p>
                  </div>
                  {uploadingImages && (
                    <div className="flex items-center mt-2 text-sm text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
                      Uploading images...
                    </div>
                  )}
                </div>

                {/* Image Preview */}
                {images.length > 0 && (
                  <div>
                    <Label>Uploaded Images ({images.length})</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                      {images.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image}
                            alt={`Property ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status and Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Status & Publish</CardTitle>
                <CardDescription>Set the property status and publish settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="property_status">Property Status</Label>
                  <Select value={formData.property_status} onValueChange={(value) => handleInputChange('property_status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="open">Open for Investment</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/admin/properties')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {loading ? (
                      'Creating...'
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Create Property
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminAddProperty;