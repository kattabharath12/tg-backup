
// User Profile Validation Logic

import { 
  UserProfileData, 
  UserProfileValidation, 
  ValidationError, 
  ValidationWarning,
  ResidencyStatus,
  FormType,
  FilingStatus
} from './types';

export class UserProfileValidator {
  
  /**
   * Validates a user profile and returns validation results
   */
  static validateProfile(profile: Partial<UserProfileData>): UserProfileValidation {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Required field validations
    if (!profile.userId) {
      errors.push({
        field: 'userId',
        message: 'User ID is required',
        code: 'REQUIRED_FIELD'
      });
    }
    
    if (!profile.residencyStatus) {
      errors.push({
        field: 'residencyStatus',
        message: 'Residency status is required',
        code: 'REQUIRED_FIELD'
      });
    }
    
    if (!profile.primaryTaxYear) {
      errors.push({
        field: 'primaryTaxYear',
        message: 'Primary tax year is required',
        code: 'REQUIRED_FIELD'
      });
    }
    
    // Age validation
    if (profile.age !== undefined && profile.age !== null) {
      if (profile.age < 0 || profile.age > 150) {
        errors.push({
          field: 'age',
          message: 'Age must be between 0 and 150',
          code: 'INVALID_RANGE'
        });
      }
    }
    
    // Date of birth validation
    if (profile.dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(profile.dateOfBirth);
      
      if (birthDate > today) {
        errors.push({
          field: 'dateOfBirth',
          message: 'Date of birth cannot be in the future',
          code: 'INVALID_DATE'
        });
      }
      
      // Calculate age from date of birth and check consistency
      if (profile.age !== undefined && profile.age !== null) {
        const calculatedAge = this.calculateAge(birthDate);
        if (Math.abs(calculatedAge - profile.age) > 1) {
          warnings.push({
            field: 'age',
            message: 'Age does not match date of birth',
            code: 'INCONSISTENT_DATA'
          });
        }
      }
    }
    
    // Tax year validation
    if (profile.primaryTaxYear) {
      const currentYear = new Date().getFullYear();
      if (profile.primaryTaxYear < 2020 || profile.primaryTaxYear > currentYear + 1) {
        warnings.push({
          field: 'primaryTaxYear',
          message: `Tax year ${profile.primaryTaxYear} is outside typical range`,
          code: 'UNUSUAL_TAX_YEAR'
        });
      }
    }
    
    // Residency status validation
    if (profile.residencyStatus && !Object.values(ResidencyStatus).includes(profile.residencyStatus)) {
      errors.push({
        field: 'residencyStatus',
        message: 'Invalid residency status',
        code: 'INVALID_ENUM_VALUE'
      });
    }
    
    // Form type validation
    if (profile.preferredFormType && !Object.values(FormType).includes(profile.preferredFormType)) {
      errors.push({
        field: 'preferredFormType',
        message: 'Invalid form type',
        code: 'INVALID_ENUM_VALUE'
      });
    }
    
    // Filing status validation
    if (profile.preferredFilingStatus && !Object.values(FilingStatus).includes(profile.preferredFilingStatus)) {
      errors.push({
        field: 'preferredFilingStatus',
        message: 'Invalid filing status',
        code: 'INVALID_ENUM_VALUE'
      });
    }
    
    // Cross-field validations
    this.validateCrossFieldConsistency(profile, errors, warnings);
    
    // Calculate completeness
    const completeness = this.calculateCompleteness(profile);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      completeness
    };
  }
  
  /**
   * Validates consistency between related fields
   */
  private static validateCrossFieldConsistency(
    profile: Partial<UserProfileData>,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    
    // Check if preferred form type is consistent with eligibility flags
    if (profile.preferredFormType === FormType.FORM_1040_SR && profile.eligibleFor1040SR === false) {
      warnings.push({
        field: 'preferredFormType',
        message: 'Preferred form type 1040-SR but not marked as eligible',
        code: 'INCONSISTENT_ELIGIBILITY'
      });
    }
    
    if (profile.preferredFormType === FormType.FORM_1040_NR && profile.eligibleFor1040NR === false) {
      warnings.push({
        field: 'preferredFormType',
        message: 'Preferred form type 1040-NR but not marked as eligible',
        code: 'INCONSISTENT_ELIGIBILITY'
      });
    }
    
    // Check age consistency with 1040-SR eligibility
    if (profile.age !== undefined && profile.age !== null && profile.age >= 65 && profile.eligibleFor1040SR === false) {
      warnings.push({
        field: 'eligibleFor1040SR',
        message: 'Age 65+ but not marked as eligible for 1040-SR',
        code: 'MISSING_SR_ELIGIBILITY'
      });
    }
    
    // Check residency status consistency with 1040-NR eligibility
    if (profile.residencyStatus === ResidencyStatus.NON_RESIDENT_ALIEN && profile.eligibleFor1040NR === false) {
      warnings.push({
        field: 'eligibleFor1040NR',
        message: 'Non-resident alien but not marked as eligible for 1040-NR',
        code: 'MISSING_NR_ELIGIBILITY'
      });
    }
  }
  
  /**
   * Calculates profile completeness as a percentage
   */
  private static calculateCompleteness(profile: Partial<UserProfileData>): number {
    const fields = [
      'userId',
      'age',
      'dateOfBirth',
      'residencyStatus',
      'primaryTaxYear',
      'preferredFilingStatus',
      'preferredFormType'
    ];
    
    const completedFields = fields.filter(field => {
      const value = profile[field as keyof UserProfileData];
      return value !== undefined && value !== null && value !== '';
    });
    
    return completedFields.length / fields.length;
  }
  
  /**
   * Calculates age from date of birth
   */
  private static calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
  
  /**
   * Validates and normalizes user input
   */
  static normalizeProfile(profile: Partial<UserProfileData>): Partial<UserProfileData> {
    const normalized = { ...profile };
    
    // Normalize age from date of birth if both are provided
    if (normalized.dateOfBirth && !normalized.age) {
      normalized.age = this.calculateAge(new Date(normalized.dateOfBirth));
    }
    
    // Set default values
    if (!normalized.primaryTaxYear) {
      normalized.primaryTaxYear = new Date().getFullYear();
    }
    
    if (!normalized.preferredFormType) {
      normalized.preferredFormType = FormType.FORM_1040;
    }
    
    if (!normalized.residencyStatus) {
      normalized.residencyStatus = ResidencyStatus.US_CITIZEN;
    }
    
    // Update profile completeness
    normalized.profileCompleteness = this.calculateCompleteness(normalized);
    normalized.lastProfileUpdate = new Date();
    
    return normalized;
  }
}
