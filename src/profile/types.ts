
// User Profile Types for Multi-Form 1040 System

export interface UserProfileData {
  id?: string;
  userId: string;
  age?: number | null;
  dateOfBirth?: Date | null;
  residencyStatus: ResidencyStatus;
  primaryTaxYear: number;
  preferredFilingStatus?: FilingStatus | null;
  eligibleFor1040: boolean;
  eligibleFor1040SR: boolean;
  eligibleFor1040NR: boolean;
  preferredFormType: FormType;
  lastUsedFormType?: FormType | null;
  profileCompleteness: number;
  lastProfileUpdate: Date;
}

export interface FormEligibilityResult {
  eligibleForms: FormType[];
  recommendedForm: FormType;
  reasons: FormEligibilityReason[];
  warnings: string[];
}

export interface FormEligibilityReason {
  formType: FormType;
  reason: string;
  priority: number; // Higher number = higher priority
  isAutomatic: boolean; // True if automatically determined, false if user preference
}

export interface UserProfileValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  completeness: number; // 0.0 to 1.0
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

// Re-export enums from Prisma schema
export enum ResidencyStatus {
  US_CITIZEN = 'US_CITIZEN',
  US_RESIDENT_ALIEN = 'US_RESIDENT_ALIEN',
  NON_RESIDENT_ALIEN = 'NON_RESIDENT_ALIEN',
  DUAL_STATUS_ALIEN = 'DUAL_STATUS_ALIEN'
}

export enum FormType {
  FORM_1040 = 'FORM_1040',
  FORM_1040_SR = 'FORM_1040_SR',
  FORM_1040_NR = 'FORM_1040_NR',
  FORM_1040_EZ = 'FORM_1040_EZ'
}

export enum FilingStatus {
  SINGLE = 'SINGLE',
  MARRIED_FILING_JOINTLY = 'MARRIED_FILING_JOINTLY',
  MARRIED_FILING_SEPARATELY = 'MARRIED_FILING_SEPARATELY',
  HEAD_OF_HOUSEHOLD = 'HEAD_OF_HOUSEHOLD',
  QUALIFYING_SURVIVING_SPOUSE = 'QUALIFYING_SURVIVING_SPOUSE'
}

// Form-specific requirements
export interface FormRequirements {
  formType: FormType;
  minAge?: number;
  maxAge?: number;
  requiredResidencyStatus?: ResidencyStatus[];
  excludedResidencyStatus?: ResidencyStatus[];
  additionalCriteria?: string[];
}

// Constants for form eligibility
export const FORM_REQUIREMENTS: Record<FormType, FormRequirements> = {
  [FormType.FORM_1040]: {
    formType: FormType.FORM_1040,
    requiredResidencyStatus: [
      ResidencyStatus.US_CITIZEN,
      ResidencyStatus.US_RESIDENT_ALIEN,
      ResidencyStatus.DUAL_STATUS_ALIEN
    ],
    additionalCriteria: ['Standard form for most taxpayers']
  },
  [FormType.FORM_1040_SR]: {
    formType: FormType.FORM_1040_SR,
    minAge: 65,
    requiredResidencyStatus: [
      ResidencyStatus.US_CITIZEN,
      ResidencyStatus.US_RESIDENT_ALIEN,
      ResidencyStatus.DUAL_STATUS_ALIEN
    ],
    additionalCriteria: ['Designed for seniors 65 and older', 'Larger print and simplified layout']
  },
  [FormType.FORM_1040_NR]: {
    formType: FormType.FORM_1040_NR,
    requiredResidencyStatus: [
      ResidencyStatus.NON_RESIDENT_ALIEN
    ],
    additionalCriteria: ['For non-resident aliens', 'Different tax rules apply']
  },
  [FormType.FORM_1040_EZ]: {
    formType: FormType.FORM_1040_EZ,
    maxAge: 65,
    requiredResidencyStatus: [
      ResidencyStatus.US_CITIZEN,
      ResidencyStatus.US_RESIDENT_ALIEN
    ],
    additionalCriteria: ['Deprecated - use Form 1040 instead']
  }
};
