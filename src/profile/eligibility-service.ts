
// Form Eligibility Detection Service

import { 
  UserProfileData, 
  FormEligibilityResult, 
  FormEligibilityReason,
  FormType,
  ResidencyStatus,
  FORM_REQUIREMENTS
} from './types';

export class FormEligibilityService {
  
  /**
   * Determines which forms a user is eligible for based on their profile
   */
  static determineEligibility(profile: UserProfileData): FormEligibilityResult {
    const eligibleForms: FormType[] = [];
    const reasons: FormEligibilityReason[] = [];
    const warnings: string[] = [];
    
    // Check each form type
    for (const formType of Object.values(FormType)) {
      const eligibility = this.checkFormEligibility(profile, formType);
      
      if (eligibility.isEligible) {
        eligibleForms.push(formType);
        reasons.push(...eligibility.reasons);
      } else {
        // Add warnings for forms they're not eligible for
        if (eligibility.reasons.length > 0) {
          warnings.push(`Not eligible for ${formType}: ${eligibility.reasons[0].reason}`);
        }
      }
    }
    
    // Determine recommended form
    const recommendedForm = this.determineRecommendedForm(eligibleForms, reasons, profile);
    
    return {
      eligibleForms,
      recommendedForm,
      reasons: reasons.sort((a, b) => b.priority - a.priority),
      warnings
    };
  }
  
  /**
   * Checks eligibility for a specific form type
   */
  private static checkFormEligibility(
    profile: UserProfileData, 
    formType: FormType
  ): { isEligible: boolean; reasons: FormEligibilityReason[] } {
    
    const requirements = FORM_REQUIREMENTS[formType];
    const reasons: FormEligibilityReason[] = [];
    let isEligible = true;
    
    // Check age requirements
    if (requirements.minAge !== undefined && profile.age !== undefined && profile.age !== null) {
      if (profile.age < requirements.minAge) {
        isEligible = false;
        reasons.push({
          formType,
          reason: `Minimum age requirement not met (${requirements.minAge})`,
          priority: 10,
          isAutomatic: true
        });
      } else {
        reasons.push({
          formType,
          reason: `Meets minimum age requirement (${requirements.minAge}+)`,
          priority: 8,
          isAutomatic: true
        });
      }
    }
    
    if (requirements.maxAge !== undefined && profile.age !== undefined && profile.age !== null) {
      if (profile.age > requirements.maxAge) {
        isEligible = false;
        reasons.push({
          formType,
          reason: `Maximum age exceeded (${requirements.maxAge})`,
          priority: 10,
          isAutomatic: true
        });
      }
    }
    
    // Check residency status requirements
    if (requirements.requiredResidencyStatus) {
      if (!requirements.requiredResidencyStatus.includes(profile.residencyStatus)) {
        isEligible = false;
        reasons.push({
          formType,
          reason: `Residency status ${profile.residencyStatus} not eligible`,
          priority: 10,
          isAutomatic: true
        });
      } else {
        reasons.push({
          formType,
          reason: `Residency status ${profile.residencyStatus} is eligible`,
          priority: 7,
          isAutomatic: true
        });
      }
    }
    
    if (requirements.excludedResidencyStatus) {
      if (requirements.excludedResidencyStatus.includes(profile.residencyStatus)) {
        isEligible = false;
        reasons.push({
          formType,
          reason: `Residency status ${profile.residencyStatus} is excluded`,
          priority: 10,
          isAutomatic: true
        });
      }
    }
    
    // Add form-specific logic
    switch (formType) {
      case FormType.FORM_1040_SR:
        if (profile.age !== undefined && profile.age !== null && profile.age >= 65) {
          reasons.push({
            formType,
            reason: 'Senior form recommended for age 65+',
            priority: 9,
            isAutomatic: true
          });
        }
        break;
        
      case FormType.FORM_1040_NR:
        if (profile.residencyStatus === ResidencyStatus.NON_RESIDENT_ALIEN) {
          reasons.push({
            formType,
            reason: 'Required form for non-resident aliens',
            priority: 10,
            isAutomatic: true
          });
        }
        break;
        
      case FormType.FORM_1040:
        // Standard form is generally available to most taxpayers
        if (isEligible) {
          reasons.push({
            formType,
            reason: 'Standard form available to most taxpayers',
            priority: 5,
            isAutomatic: true
          });
        }
        break;
        
      case FormType.FORM_1040_EZ:
        // Deprecated form
        isEligible = false;
        reasons.push({
          formType,
          reason: 'Form 1040-EZ is no longer available (use Form 1040)',
          priority: 1,
          isAutomatic: true
        });
        break;
    }
    
    return { isEligible, reasons };
  }
  
  /**
   * Determines the recommended form from eligible forms
   */
  private static determineRecommendedForm(
    eligibleForms: FormType[],
    reasons: FormEligibilityReason[],
    profile: UserProfileData
  ): FormType {
    
    // If user has a preference and it's eligible, use it
    if (profile.preferredFormType && eligibleForms.includes(profile.preferredFormType)) {
      return profile.preferredFormType;
    }
    
    // If user previously used a form and it's still eligible, suggest it
    if (profile.lastUsedFormType && eligibleForms.includes(profile.lastUsedFormType)) {
      return profile.lastUsedFormType;
    }
    
    // Auto-recommend based on profile characteristics
    
    // Non-resident aliens must use 1040-NR
    if (profile.residencyStatus === ResidencyStatus.NON_RESIDENT_ALIEN && 
        eligibleForms.includes(FormType.FORM_1040_NR)) {
      return FormType.FORM_1040_NR;
    }
    
    // Seniors (65+) should consider 1040-SR
    if (profile.age !== undefined && profile.age !== null && profile.age >= 65 && 
        eligibleForms.includes(FormType.FORM_1040_SR)) {
      return FormType.FORM_1040_SR;
    }
    
    // Default to standard 1040 if available
    if (eligibleForms.includes(FormType.FORM_1040)) {
      return FormType.FORM_1040;
    }
    
    // Return the first eligible form if no other logic applies
    return eligibleForms[0] || FormType.FORM_1040;
  }
  
  /**
   * Updates user profile with calculated eligibility flags
   */
  static updateProfileEligibility(profile: UserProfileData): UserProfileData {
    const eligibility = this.determineEligibility(profile);
    
    return {
      ...profile,
      eligibleFor1040: eligibility.eligibleForms.includes(FormType.FORM_1040),
      eligibleFor1040SR: eligibility.eligibleForms.includes(FormType.FORM_1040_SR),
      eligibleFor1040NR: eligibility.eligibleForms.includes(FormType.FORM_1040_NR),
      preferredFormType: eligibility.recommendedForm,
      lastProfileUpdate: new Date()
    };
  }
  
  /**
   * Checks if a form switch is recommended based on profile changes
   */
  static shouldRecommendFormSwitch(
    oldProfile: UserProfileData,
    newProfile: UserProfileData
  ): { shouldSwitch: boolean; recommendedForm?: FormType; reason?: string } {
    
    const oldEligibility = this.determineEligibility(oldProfile);
    const newEligibility = this.determineEligibility(newProfile);
    
    // If recommended form changed, suggest switch
    if (oldEligibility.recommendedForm !== newEligibility.recommendedForm) {
      return {
        shouldSwitch: true,
        recommendedForm: newEligibility.recommendedForm,
        reason: `Profile changes suggest ${newEligibility.recommendedForm} would be more appropriate`
      };
    }
    
    // Check for specific scenarios that warrant a switch
    
    // User turned 65 - recommend 1040-SR
    if (oldProfile.age !== undefined && oldProfile.age !== null && 
        newProfile.age !== undefined && newProfile.age !== null &&
        oldProfile.age < 65 && newProfile.age >= 65 &&
        newEligibility.eligibleForms.includes(FormType.FORM_1040_SR)) {
      return {
        shouldSwitch: true,
        recommendedForm: FormType.FORM_1040_SR,
        reason: 'You are now eligible for Form 1040-SR (Senior form) with larger print and simplified layout'
      };
    }
    
    // Residency status changed to non-resident
    if (oldProfile.residencyStatus !== ResidencyStatus.NON_RESIDENT_ALIEN &&
        newProfile.residencyStatus === ResidencyStatus.NON_RESIDENT_ALIEN) {
      return {
        shouldSwitch: true,
        recommendedForm: FormType.FORM_1040_NR,
        reason: 'Non-resident aliens must use Form 1040-NR'
      };
    }
    
    return { shouldSwitch: false };
  }
}
