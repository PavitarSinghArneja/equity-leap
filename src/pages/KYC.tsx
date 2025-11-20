import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/NewAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAdmin } from '@/hooks/useNewAdmin';
import { supabase } from '@/integrations/supabase/client';
import {
  ChevronRight,
  ChevronLeft,
  Upload,
  FileText,
  User,
  CreditCard,
  Camera,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import {
  validateFullName,
  validateDateOfBirth,
  validatePhoneNumber,
  validatePostalCode,
  validateAddress,
  validateCity,
  validateState,
  validateBankName,
  validateIFSCCode,
  validateAccountNumber,
  validateFile
} from '@/utils/validators';

interface PersonalInfo {
  fullName: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

interface Documents {
  panCard: File | null;
  aadhaarFront: File | null;
  aadhaarBack: File | null;
  addressProof: File | null;
}

interface BankDetails {
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  bankName: string;
  accountType: 'savings' | 'current';
}

const KYC = () => {
  const { user, profile, addNotification, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form data states
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    fullName: profile?.full_name || '',
    dateOfBirth: profile?.date_of_birth || '',
    address: profile?.address || '',
    city: '',
    state: '',
    postalCode: '',
    country: profile?.country || 'India',
    phone: profile?.phone || ''
  });

  const [documents, setDocuments] = useState<Documents>({
    panCard: null,
    aadhaarFront: null,
    aadhaarBack: null,
    addressProof: null
  });

  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    bankName: '',
    accountType: 'savings'
  });

  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  // Validation error states
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // If KYC is already approved, redirect to appropriate dashboard
    if (profile?.kyc_status === 'approved') {
      addNotification({
        name: "KYC Already Completed",
        description: "Your KYC verification is already approved",
        icon: "CHECK_CIRCLE",
        color: "#059669",
        isLogo: true
      });
      
      if (profile.tier === 'waitlist_player') {
        navigate('/waitlist-dashboard/overview');
      } else {
        navigate('/dashboard/overview');
      }
    }
  }, [user, profile, navigate, addNotification]);

  const steps = [
    { id: 1, title: 'Personal Information', icon: User, description: 'Basic personal details' },
    { id: 2, title: 'Document Upload', icon: FileText, description: 'Identity documents' },
    { id: 3, title: 'Bank Details', icon: CreditCard, description: 'Banking information' },
    { id: 4, title: 'Photo Verification', icon: Camera, description: 'Selfie verification' },
    { id: 5, title: 'Review & Submit', icon: CheckCircle2, description: 'Final review' }
  ];

  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {};

    switch (step) {
      case 1:
        // Validate personal information
        const nameValidation = validateFullName(personalInfo.fullName);
        if (!nameValidation.isValid) newErrors.fullName = nameValidation.error!;

        const dobValidation = validateDateOfBirth(personalInfo.dateOfBirth);
        if (!dobValidation.isValid) newErrors.dateOfBirth = dobValidation.error!;

        const addressValidation = validateAddress(personalInfo.address);
        if (!addressValidation.isValid) newErrors.address = addressValidation.error!;

        const cityValidation = validateCity(personalInfo.city);
        if (!cityValidation.isValid) newErrors.city = cityValidation.error!;

        const stateValidation = validateState(personalInfo.state);
        if (!stateValidation.isValid) newErrors.state = stateValidation.error!;

        const postalCodeValidation = validatePostalCode(personalInfo.postalCode);
        if (!postalCodeValidation.isValid) newErrors.postalCode = postalCodeValidation.error!;

        const phoneValidation = validatePhoneNumber(personalInfo.phone);
        if (!phoneValidation.isValid) newErrors.phone = phoneValidation.error!;

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
          addNotification({
            name: "Validation Errors",
            description: "Please fix the errors in the form before proceeding",
            icon: "ALERT_TRIANGLE",
            color: "#DC2626",
            isLogo: true
          });
          return false;
        }
        return true;

      case 2:
        // Validate document uploads
        const panValidation = validateFile(documents.panCard);
        if (!panValidation.isValid) newErrors.panCard = panValidation.error!;

        const aadhaarFrontValidation = validateFile(documents.aadhaarFront);
        if (!aadhaarFrontValidation.isValid) newErrors.aadhaarFront = aadhaarFrontValidation.error!;

        const aadhaarBackValidation = validateFile(documents.aadhaarBack);
        if (!aadhaarBackValidation.isValid) newErrors.aadhaarBack = aadhaarBackValidation.error!;

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
          addNotification({
            name: "Document Validation Failed",
            description: "Please upload all required documents with valid file types and sizes",
            icon: "ALERT_TRIANGLE",
            color: "#DC2626",
            isLogo: true
          });
          return false;
        }
        return true;

      case 3:
        // Validate bank details
        const bankNameValidation = validateBankName(bankDetails.bankName);
        if (!bankNameValidation.isValid) newErrors.bankName = bankNameValidation.error!;

        const accountValidation = validateAccountNumber(bankDetails.accountNumber);
        if (!accountValidation.isValid) newErrors.accountNumber = accountValidation.error!;

        const confirmAccountValidation = validateAccountNumber(bankDetails.confirmAccountNumber);
        if (!confirmAccountValidation.isValid) newErrors.confirmAccountNumber = confirmAccountValidation.error!;

        if (bankDetails.accountNumber !== bankDetails.confirmAccountNumber) {
          newErrors.confirmAccountNumber = "Account numbers don't match";
        }

        const ifscValidation = validateIFSCCode(bankDetails.ifscCode);
        if (!ifscValidation.isValid) newErrors.ifscCode = ifscValidation.error!;

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
          addNotification({
            name: "Bank Details Invalid",
            description: "Please fix the errors in bank details before proceeding",
            icon: "ALERT_TRIANGLE",
            color: "#DC2626",
            isLogo: true
          });
          return false;
        }
        return true;

      case 4:
        // Validate selfie file
        const selfieValidation = validateFile(selfieFile);
        if (!selfieValidation.isValid) {
          newErrors.selfie = selfieValidation.error!;
          setErrors(newErrors);
          addNotification({
            name: "Selfie Required",
            description: selfieValidation.error || "Please upload a clear selfie for verification",
            icon: "ALERT_TRIANGLE",
            color: "#DC2626",
            isLogo: true
          });
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleFileUpload = async (file: File, documentType: keyof Documents | 'selfie') => {
    try {
      // Validate file before upload
      const validation = validateFile(file);
      if (!validation.isValid) {
        addNotification({
          name: "Invalid File",
          description: validation.error || "File validation failed",
          icon: "ALERT_TRIANGLE",
          color: "#DC2626",
          isLogo: true
        });
        return null;
      }

      // Generate UUID-based filename for security
      const fileExt = file.name.split('.').pop();
      const uuid = crypto.randomUUID();
      const fileName = `${user?.id}/${documentType}_${uuid}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      addNotification({
        name: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
      return null;
    }
  };

  const submitKYC = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Upload all documents
      const documentUrls: { [key: string]: string } = {};
      
      for (const [key, file] of Object.entries(documents)) {
        if (file) {
          const url = await handleFileUpload(file, key as keyof Documents);
          if (url) documentUrls[key] = url;
        }
      }
      
      if (selfieFile) {
        const selfieUrl = await handleFileUpload(selfieFile, 'selfie');
        if (selfieUrl) documentUrls.selfie = selfieUrl;
      }

      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          full_name: personalInfo.fullName,
          phone: personalInfo.phone,
          date_of_birth: personalInfo.dateOfBirth,
          address: `${personalInfo.address}, ${personalInfo.city}, ${personalInfo.state} ${personalInfo.postalCode}`,
          country: personalInfo.country,
          kyc_status: 'under_review',
          kyc_submitted_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Save KYC documents
      const documentEntries = Object.entries(documentUrls).map(([type, url]) => ({
        user_id: user.id,
        document_type: type === 'panCard' ? 'passport' : 
                     type === 'aadhaarFront' ? 'id_card' :
                     type === 'aadhaarBack' ? 'id_card' :
                     type === 'addressProof' ? 'proof_of_address' :
                     type === 'selfie' ? 'other' : 'other',
        file_url: url,
        file_name: type,
        verification_status: 'pending'
      }));

      const { error: docError } = await supabase
        .from('kyc_documents')
        .insert(documentEntries);

      if (docError) throw docError;

      // Create metadata document for bank details
      const bankDetailsDoc = {
        user_id: user.id,
        document_type: 'bank_statement',
        file_url: '', // No file, just metadata
        file_name: 'bank_details',
        verification_status: 'pending',
        metadata: {
          account_number: bankDetails.accountNumber,
          ifsc_code: bankDetails.ifscCode,
          bank_name: bankDetails.bankName,
          account_type: bankDetails.accountType
        }
      };

      const { error: bankError } = await supabase
        .from('kyc_documents')
        .insert([bankDetailsDoc]);

      if (bankError) throw bankError;

      await refreshProfile();

      addNotification({
        name: "KYC Submitted Successfully",
        description: "Your documents are under review. We'll notify you once approved.",
        icon: "CHECK_CIRCLE",
        color: "#059669",
        isLogo: true
      });

      // Redirect to appropriate dashboard
      setTimeout(() => {
        if (profile?.tier === 'waitlist_player') {
          navigate('/waitlist-dashboard/overview');
        } else {
          navigate('/dashboard/overview');
        }
      }, 2000);

    } catch (error) {
      addNotification({
        name: "Submission Failed",
        description: "Failed to submit KYC. Please try again.",
        icon: "ALERT_TRIANGLE",
        color: "#DC2626",
        isLogo: true
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={personalInfo.fullName}
                  onChange={(e) => {
                    setPersonalInfo(prev => ({ ...prev, fullName: e.target.value }));
                    if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
                  }}
                  placeholder="Enter your full name"
                  className={errors.fullName ? 'border-red-500' : ''}
                />
                {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
                <p className="text-xs text-muted-foreground">Only letters and spaces (2-100 characters)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={personalInfo.dateOfBirth}
                  onChange={(e) => {
                    setPersonalInfo(prev => ({ ...prev, dateOfBirth: e.target.value }));
                    if (errors.dateOfBirth) setErrors(prev => ({ ...prev, dateOfBirth: '' }));
                  }}
                  className={errors.dateOfBirth ? 'border-red-500' : ''}
                />
                {errors.dateOfBirth && <p className="text-xs text-red-500">{errors.dateOfBirth}</p>}
                <p className="text-xs text-muted-foreground">Must be at least 18 years old</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                value={personalInfo.address}
                onChange={(e) => {
                  setPersonalInfo(prev => ({ ...prev, address: e.target.value }));
                  if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
                }}
                placeholder="Enter your complete address"
                rows={3}
                className={errors.address ? 'border-red-500' : ''}
              />
              {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
              <p className="text-xs text-muted-foreground">Full address (minimum 10 characters)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={personalInfo.city}
                  onChange={(e) => {
                    setPersonalInfo(prev => ({ ...prev, city: e.target.value }));
                    if (errors.city) setErrors(prev => ({ ...prev, city: '' }));
                  }}
                  placeholder="City"
                  className={errors.city ? 'border-red-500' : ''}
                />
                {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={personalInfo.state}
                  onChange={(e) => {
                    setPersonalInfo(prev => ({ ...prev, state: e.target.value }));
                    if (errors.state) setErrors(prev => ({ ...prev, state: '' }));
                  }}
                  placeholder="State"
                  className={errors.state ? 'border-red-500' : ''}
                />
                {errors.state && <p className="text-xs text-red-500">{errors.state}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code *</Label>
                <Input
                  id="postalCode"
                  value={personalInfo.postalCode}
                  onChange={(e) => {
                    setPersonalInfo(prev => ({ ...prev, postalCode: e.target.value }));
                    if (errors.postalCode) setErrors(prev => ({ ...prev, postalCode: '' }));
                  }}
                  placeholder="Postal Code"
                  className={errors.postalCode ? 'border-red-500' : ''}
                />
                {errors.postalCode && <p className="text-xs text-red-500">{errors.postalCode}</p>}
                <p className="text-xs text-muted-foreground">6 digits (e.g., 110001)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={personalInfo.phone}
                  onChange={(e) => {
                    setPersonalInfo(prev => ({ ...prev, phone: e.target.value }));
                    if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                  }}
                  placeholder="Enter your phone number"
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                <p className="text-xs text-muted-foreground">10 digits starting with 6-9</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Select value={personalInfo.country} onValueChange={(value) => setPersonalInfo(prev => ({ ...prev, country: value }))}>
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
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            {[
              { key: 'panCard', label: 'PAN Card', required: true },
              { key: 'aadhaarFront', label: 'Aadhaar Card (Front)', required: true },
              { key: 'aadhaarBack', label: 'Aadhaar Card (Back)', required: true },
              { key: 'addressProof', label: 'Address Proof (Optional)', required: false }
            ].map(({ key, label, required }) => (
              <div key={key} className="space-y-2">
                <Label>{label} {required && '*'}</Label>
                <div className={`border-2 border-dashed rounded-lg p-6 text-center hover:border-gray-400 transition-colors ${
                  errors[key] ? 'border-red-500' : 'border-gray-300'
                }`}>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const validation = validateFile(file);
                        if (!validation.isValid) {
                          setErrors(prev => ({ ...prev, [key]: validation.error! }));
                        } else {
                          setDocuments(prev => ({ ...prev, [key]: file }));
                          setErrors(prev => ({ ...prev, [key]: '' }));
                        }
                      }
                    }}
                    className="hidden"
                    id={`file-${key}`}
                  />
                  <label htmlFor={`file-${key}`} className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {documents[key as keyof Documents]?.name || 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG or PDF (max 5MB)</p>
                  </label>
                </div>
                {errors[key] && <p className="text-xs text-red-500">{errors[key]}</p>}
              </div>
            ))}
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name *</Label>
              <Input
                id="bankName"
                value={bankDetails.bankName}
                onChange={(e) => {
                  setBankDetails(prev => ({ ...prev, bankName: e.target.value }));
                  if (errors.bankName) setErrors(prev => ({ ...prev, bankName: '' }));
                }}
                placeholder="Enter your bank name"
                className={errors.bankName ? 'border-red-500' : ''}
              />
              {errors.bankName && <p className="text-xs text-red-500">{errors.bankName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                type="text"
                value={bankDetails.accountNumber}
                onChange={(e) => {
                  setBankDetails(prev => ({ ...prev, accountNumber: e.target.value.replace(/\D/g, '') }));
                  if (errors.accountNumber) setErrors(prev => ({ ...prev, accountNumber: '' }));
                }}
                placeholder="Enter your account number"
                className={errors.accountNumber ? 'border-red-500' : ''}
              />
              {errors.accountNumber && <p className="text-xs text-red-500">{errors.accountNumber}</p>}
              <p className="text-xs text-muted-foreground">9-18 digits only</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmAccountNumber">Confirm Account Number *</Label>
              <Input
                id="confirmAccountNumber"
                type="text"
                value={bankDetails.confirmAccountNumber}
                onChange={(e) => {
                  setBankDetails(prev => ({ ...prev, confirmAccountNumber: e.target.value.replace(/\D/g, '') }));
                  if (errors.confirmAccountNumber) setErrors(prev => ({ ...prev, confirmAccountNumber: '' }));
                }}
                placeholder="Re-enter your account number"
                className={errors.confirmAccountNumber ? 'border-red-500' : ''}
              />
              {errors.confirmAccountNumber && <p className="text-xs text-red-500">{errors.confirmAccountNumber}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ifscCode">IFSC Code *</Label>
                <Input
                  id="ifscCode"
                  value={bankDetails.ifscCode}
                  onChange={(e) => {
                    setBankDetails(prev => ({ ...prev, ifscCode: e.target.value.toUpperCase() }));
                    if (errors.ifscCode) setErrors(prev => ({ ...prev, ifscCode: '' }));
                  }}
                  placeholder="Enter IFSC code"
                  className={errors.ifscCode ? 'border-red-500' : ''}
                />
                {errors.ifscCode && <p className="text-xs text-red-500">{errors.ifscCode}</p>}
                <p className="text-xs text-muted-foreground">Format: ABCD0123456</p>
              </div>
              <div className="space-y-2">
                <Label>Account Type *</Label>
                <Select value={bankDetails.accountType} onValueChange={(value) => setBankDetails(prev => ({ ...prev, accountType: value as 'savings' | 'current' }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Upload Your Selfie</h3>
              <p className="text-gray-600 mb-6">Please upload a clear selfie for identity verification</p>
            </div>

            <div className="space-y-2">
              <Label>Selfie Photo *</Label>
              <div className={`border-2 border-dashed rounded-lg p-6 text-center hover:border-gray-400 transition-colors ${
                errors.selfie ? 'border-red-500' : 'border-gray-300'
              }`}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const validation = validateFile(file);
                      if (!validation.isValid) {
                        setErrors(prev => ({ ...prev, selfie: validation.error! }));
                      } else {
                        setSelfieFile(file);
                        setErrors(prev => ({ ...prev, selfie: '' }));
                      }
                    }
                  }}
                  className="hidden"
                  id="selfie-upload"
                />
                <label htmlFor="selfie-upload" className="cursor-pointer">
                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {selfieFile?.name || 'Click to upload your selfie'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PNG or JPG (max 5MB)</p>
                </label>
              </div>
              {errors.selfie && <p className="text-xs text-red-500">{errors.selfie}</p>}
            </div>
          </div>
        );
      
      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Review Your Information</h3>
              <p className="text-gray-600">Please review all information before submitting</p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Personal Information</h4>
                <p className="text-sm text-gray-600">Name: {personalInfo.fullName}</p>
                <p className="text-sm text-gray-600">Phone: {personalInfo.phone}</p>
                <p className="text-sm text-gray-600">Address: {personalInfo.address}, {personalInfo.city}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Documents</h4>
                <p className="text-sm text-gray-600">PAN Card: {documents.panCard ? '✓ Uploaded' : '✗ Missing'}</p>
                <p className="text-sm text-gray-600">Aadhaar Front: {documents.aadhaarFront ? '✓ Uploaded' : '✗ Missing'}</p>
                <p className="text-sm text-gray-600">Aadhaar Back: {documents.aadhaarBack ? '✓ Uploaded' : '✗ Missing'}</p>
                <p className="text-sm text-gray-600">Selfie: {selfieFile ? '✓ Uploaded' : '✗ Missing'}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Bank Details</h4>
                <p className="text-sm text-gray-600">Bank: {bankDetails.bankName}</p>
                <p className="text-sm text-gray-600">Account: ****{bankDetails.accountNumber.slice(-4)}</p>
                <p className="text-sm text-gray-600">IFSC: {bankDetails.ifscCode}</p>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">KYC Verification</h1>
            <p className="text-muted-foreground">Complete your Know Your Customer verification to start investing</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-full border-2 
                      ${currentStep >= step.id 
                        ? 'bg-primary border-primary text-primary-foreground' 
                        : 'border-gray-300 text-gray-500'
                      }
                    `}
                  >
                    {(() => {
                      const IconComponent = step.icon;
                      return <IconComponent className="w-5 h-5" />;
                    })()}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${currentStep > step.id ? 'bg-primary' : 'bg-gray-300'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">{steps[currentStep - 1].title}</p>
              <p className="text-xs text-muted-foreground">{steps[currentStep - 1].description}</p>
            </div>
          </div>

          {/* Main Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                {(() => {
                  const IconComponent = steps[currentStep - 1].icon;
                  return <IconComponent className="w-5 h-5 mr-2" />;
                })()}
                Step {currentStep} of 5: {steps[currentStep - 1].title}
              </CardTitle>
              <CardDescription>
                {steps[currentStep - 1].description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderStepContent()}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < 5 ? (
              <Button
                onClick={nextStep}
                className="flex items-center"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={submitKYC}
                disabled={loading}
                className="flex items-center bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Submitting...' : 'Submit KYC'}
                <CheckCircle2 className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KYC;
