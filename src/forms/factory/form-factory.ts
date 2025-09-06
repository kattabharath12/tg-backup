
// Form Factory for Creating Form 1040 Variations

import { Form1040Data } from '@/lib/form-1040-types';
import { FormType, UserProfileData } from '@/src/profile/types';
import { AbstractForm1040 } from '../base/abstract-form';
import { Standard1040Form } from '../implementations/standard-1040';
import { FormEligibilityService } from '@/src/profile/eligibility-service';

export interface FormCreationOptions {
  formType?: FormType;
  taxYear?: number;
  userProfile?: UserProfileData;
  autoDetectForm?: boolean;
}

export interface FormCreationResult {
  form: AbstractForm1040;
  formType: FormType;
  isRecommended: boolean;
  alternativeForms: FormType[];
  warnings: string[];
}

export class Form1040Factory {
  
  /**
   * Creates a Form 1040 instance based on the specified type or user profile
   */
  static createForm(
    formData: Form1040Data, 
    options: FormCreationOptions = {}
  ): FormCreationResult {
    
    const {
      formType,
      taxYear = 2023,
      userProfile,
      autoDetectForm = true
    } = options;
    
    let selectedFormType = formType;
    let isRecommended = false;
    let alternativeForms: FormType[] = [];
    const warnings: string[] = [];
    
    // Auto-detect form type if not specified and user profile is available
    if (!selectedFormType && userProfile && autoDetectForm) {
      const eligibility = FormEligibilityService.determineEligibility(userProfile);
      selectedFormType = eligibility.recommendedForm;
      isRecommended = true;
      alternativeForms = eligibility.eligibleForms.filter(f => f !== selectedFormType);
      
      if (eligibility.warnings.length > 0) {
        warnings.push(...eligibility.warnings);
      }
    }
    
    // Default to standard 1040 if no type specified
    if (!selectedFormType) {
      selectedFormType = FormType.FORM_1040;
      warnings.push('No form type specified, defaulting to standard Form 1040');
    }
    
    // Validate form type availability
    if (!this.isFormTypeSupported(selectedFormType)) {
      warnings.push(`Form type ${selectedFormType} not yet implemented, using standard Form 1040`);
      selectedFormType = FormType.FORM_1040;
    }
    
    // Create the appropriate form instance
    const form = this.createFormInstance(selectedFormType, formData, taxYear);
    
    // Validate that the user is eligible for the selected form
    if (userProfile) {
      const eligibility = FormEligibilityService.determineEligibility(userProfile);
      if (!eligibility.eligibleForms.includes(selectedFormType)) {
        warnings.push(`User may not be eligible for ${selectedFormType}, please review form selection`);
      }
    }
    
    return {
      form,
      formType: selectedFormType,
      isRecommended,
      alternativeForms,
      warnings
    };
  }
  
  /**
   * Creates a specific form instance
   */
  private static createFormInstance(
    formType: FormType, 
    formData: Form1040Data, 
    taxYear: number
  ): AbstractForm1040 {
    
    switch (formType) {
      case FormType.FORM_1040:
        return new Standard1040Form(formData, taxYear);
        
      case FormType.FORM_1040_SR:
        // TODO: Implement in Phase 2
        console.warn('Form 1040-SR not yet implemented, using standard 1040');
        return new Standard1040Form(formData, taxYear);
        
      case FormType.FORM_1040_NR:
        // TODO: Implement in Phase 2
        console.warn('Form 1040-NR not yet implemented, using standard 1040');
        return new Standard1040Form(formData, taxYear);
        
      case FormType.FORM_1040_EZ:
        // Deprecated form
        console.warn('Form 1040-EZ is deprecated, using standard 1040');
        return new Standard1040Form(formData, taxYear);
        
      default:
        console.warn(`Unknown form type ${formType}, using standard 1040`);
        return new Standard1040Form(formData, taxYear);
    }
  }
  
  /**
   * Checks if a form type is currently supported
   */
  static isFormTypeSupported(formType: FormType): boolean {
    const supportedForms = [
      FormType.FORM_1040
      // TODO: Add FormType.FORM_1040_SR and FormType.FORM_1040_NR in Phase 2
    ];
    
    return supportedForms.includes(formType);
  }
  
  /**
   * Gets all supported form types
   */
  static getSupportedFormTypes(): FormType[] {
    return [
      FormType.FORM_1040
      // TODO: Add more forms in Phase 2
    ];
  }
  
  /**
   * Recommends a form type based on user profile
   */
  static recommendFormType(userProfile: UserProfileData): {
    recommendedForm: FormType;
    eligibleForms: FormType[];
    reasons: string[];
  } {
    const eligibility = FormEligibilityService.determineEligibility(userProfile);
    
    // Filter to only supported forms
    const supportedEligibleForms = eligibility.eligibleForms.filter(form => 
      this.isFormTypeSupported(form)
    );
    
    let recommendedForm = eligibility.recommendedForm;
    if (!this.isFormTypeSupported(recommendedForm)) {
      recommendedForm = supportedEligibleForms[0] || FormType.FORM_1040;
    }
    
    const reasons = eligibility.reasons
      .filter(reason => reason.formType === recommendedForm)
      .map(reason => reason.reason);
    
    return {
      recommendedForm,
      eligibleForms: supportedEligibleForms,
      reasons
    };
  }
  
  /**
   * Migrates form data from one form type to another
   */
  static migrateFormData(
    sourceForm: AbstractForm1040,
    targetFormType: FormType,
    taxYear: number = 2023
  ): FormCreationResult {
    
    const sourceData = sourceForm.getFormData();
    
    // Create new form with existing data
    const result = this.createForm(sourceData, {
      formType: targetFormType,
      taxYear,
      autoDetectForm: false
    });
    
    // Add migration warning
    result.warnings.push(
      `Form data migrated from ${sourceForm.getFormType()} to ${targetFormType}`
    );
    
    return result;
  }
  
  /**
   * Validates form compatibility with user profile
   */
  static validateFormCompatibility(
    formType: FormType,
    userProfile: UserProfileData
  ): {
    isCompatible: boolean;
    issues: string[];
    recommendations: string[];
  } {
    
    const eligibility = FormEligibilityService.determineEligibility(userProfile);
    const isCompatible = eligibility.eligibleForms.includes(formType);
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    if (!isCompatible) {
      issues.push(`User is not eligible for ${formType}`);
      
      if (eligibility.eligibleForms.length > 0) {
        recommendations.push(
          `Consider using ${eligibility.recommendedForm} instead`
        );
      }
    }
    
    // Check for specific compatibility issues
    if (formType === FormType.FORM_1040_SR && (userProfile.age || 0) < 65) {
      issues.push('Form 1040-SR is designed for taxpayers 65 and older');
    }
    
    if (formType === FormType.FORM_1040_NR && 
        userProfile.residencyStatus !== 'NON_RESIDENT_ALIEN') {
      issues.push('Form 1040-NR is only for non-resident aliens');
    }
    
    return {
      isCompatible,
      issues,
      recommendations
    };
  }
}
