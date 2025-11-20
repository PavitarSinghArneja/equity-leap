/**
 * Validation utility for KYC form fields
 * Implements regex patterns and validation logic for Indian identity documents
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates full name - only letters and spaces, 2-100 characters
 */
export const validateFullName = (name: string): ValidationResult => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Full name is required' };
  }

  const nameRegex = /^[a-zA-Z\s]{2,100}$/;
  if (!nameRegex.test(name)) {
    return {
      isValid: false,
      error: 'Name should only contain letters and spaces (2-100 characters)'
    };
  }

  return { isValid: true };
};

/**
 * Validates date of birth and checks minimum age of 18 years
 */
export const validateDateOfBirth = (dob: string): ValidationResult => {
  if (!dob) {
    return { isValid: false, error: 'Date of birth is required' };
  }

  const dobDate = new Date(dob);
  const today = new Date();
  const age = today.getFullYear() - dobDate.getFullYear();
  const monthDiff = today.getMonth() - dobDate.getMonth();

  // Adjust age if birthday hasn't occurred yet this year
  const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())
    ? age - 1
    : age;

  if (adjustedAge < 18) {
    return { isValid: false, error: 'You must be at least 18 years old to register' };
  }

  if (adjustedAge > 120) {
    return { isValid: false, error: 'Please enter a valid date of birth' };
  }

  return { isValid: true };
};

/**
 * Validates Indian mobile number - should start with 6-9 and have 10 digits
 */
export const validatePhoneNumber = (phone: string): ValidationResult => {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove any spaces, dashes, or parentheses
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

  // Check if it starts with country code
  const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
  if (!phoneRegex.test(cleanPhone)) {
    return {
      isValid: false,
      error: 'Invalid Indian mobile number. Should start with 6-9 and have 10 digits'
    };
  }

  return { isValid: true };
};

/**
 * Validates Indian postal code (PIN code) - exactly 6 digits
 */
export const validatePostalCode = (pincode: string): ValidationResult => {
  if (!pincode) {
    return { isValid: false, error: 'Postal code is required' };
  }

  const pincodeRegex = /^\d{6}$/;
  if (!pincodeRegex.test(pincode)) {
    return {
      isValid: false,
      error: 'Invalid PIN code. Must be exactly 6 digits'
    };
  }

  return { isValid: true };
};

/**
 * Validates PAN card number - Format: ABCDE1234F
 * 5 letters, 4 digits, 1 letter (all uppercase)
 */
export const validatePANCard = (pan: string): ValidationResult => {
  if (!pan) {
    return { isValid: false, error: 'PAN card number is required' };
  }

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(pan.toUpperCase())) {
    return {
      isValid: false,
      error: 'Invalid PAN format. Should be like ABCDE1234F'
    };
  }

  return { isValid: true };
};

/**
 * Validates Aadhaar number - exactly 12 digits
 */
export const validateAadhaarNumber = (aadhaar: string): ValidationResult => {
  if (!aadhaar) {
    return { isValid: false, error: 'Aadhaar number is required' };
  }

  // Remove any spaces
  const cleanAadhaar = aadhaar.replace(/\s/g, '');

  const aadhaarRegex = /^\d{12}$/;
  if (!aadhaarRegex.test(cleanAadhaar)) {
    return {
      isValid: false,
      error: 'Invalid Aadhaar number. Must be exactly 12 digits'
    };
  }

  return { isValid: true };
};

/**
 * Validates IFSC code - Format: ABCD0123456
 * 4 letters, 0, 6 alphanumeric characters (all uppercase)
 */
export const validateIFSCCode = (ifsc: string): ValidationResult => {
  if (!ifsc) {
    return { isValid: false, error: 'IFSC code is required' };
  }

  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscRegex.test(ifsc.toUpperCase())) {
    return {
      isValid: false,
      error: 'Invalid IFSC code. Should be like ABCD0123456 (4 letters + 0 + 6 characters)'
    };
  }

  return { isValid: true };
};

/**
 * Validates bank account number - 9-18 digits
 */
export const validateAccountNumber = (accountNumber: string): ValidationResult => {
  if (!accountNumber) {
    return { isValid: false, error: 'Account number is required' };
  }

  // Remove any spaces
  const cleanAccount = accountNumber.replace(/\s/g, '');

  const accountRegex = /^\d{9,18}$/;
  if (!accountRegex.test(cleanAccount)) {
    return {
      isValid: false,
      error: 'Invalid account number. Must be 9-18 digits'
    };
  }

  return { isValid: true };
};

/**
 * Validates address field - minimum 10 characters
 */
export const validateAddress = (address: string): ValidationResult => {
  if (!address || address.trim().length === 0) {
    return { isValid: false, error: 'Address is required' };
  }

  if (address.trim().length < 10) {
    return {
      isValid: false,
      error: 'Please provide a complete address (minimum 10 characters)'
    };
  }

  return { isValid: true };
};

/**
 * Validates city name - only letters and spaces, 2-50 characters
 */
export const validateCity = (city: string): ValidationResult => {
  if (!city || city.trim().length === 0) {
    return { isValid: false, error: 'City is required' };
  }

  const cityRegex = /^[a-zA-Z\s]{2,50}$/;
  if (!cityRegex.test(city)) {
    return {
      isValid: false,
      error: 'City should only contain letters and spaces (2-50 characters)'
    };
  }

  return { isValid: true };
};

/**
 * Validates state name - only letters and spaces, 2-50 characters
 */
export const validateState = (state: string): ValidationResult => {
  if (!state || state.trim().length === 0) {
    return { isValid: false, error: 'State is required' };
  }

  const stateRegex = /^[a-zA-Z\s]{2,50}$/;
  if (!stateRegex.test(state)) {
    return {
      isValid: false,
      error: 'State should only contain letters and spaces (2-50 characters)'
    };
  }

  return { isValid: true };
};

/**
 * Validates bank name - minimum 3 characters
 */
export const validateBankName = (bankName: string): ValidationResult => {
  if (!bankName || bankName.trim().length === 0) {
    return { isValid: false, error: 'Bank name is required' };
  }

  if (bankName.trim().length < 3) {
    return {
      isValid: false,
      error: 'Please enter a valid bank name (minimum 3 characters)'
    };
  }

  return { isValid: true };
};

/**
 * File validation for uploads
 */
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateFile = (file: File | null): FileValidationResult => {
  if (!file) {
    return { isValid: false, error: 'Please select a file' };
  }

  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size must be under 5MB'
    };
  }

  // Check MIME type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Only JPG, PNG, and PDF files are allowed'
    };
  }

  return { isValid: true };
};

/**
 * Helper function to format phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};

/**
 * Helper function to format Aadhaar for display (with spaces)
 */
export const formatAadhaar = (aadhaar: string): string => {
  const cleaned = aadhaar.replace(/\D/g, '');
  if (cleaned.length === 12) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8)}`;
  }
  return aadhaar;
};
