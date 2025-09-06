
// Abstract Base Classes for Form 1040 Variations

import { Form1040Data, FilingStatus } from '@/lib/form-1040-types';
import { FormType } from '@/src/profile/types';

export interface FormCalculationResult {
  totalIncome: number;
  adjustedGrossIncome: number;
  taxableIncome: number;
  taxLiability: number;
  totalCredits: number;
  totalWithholdings: number;
  refundAmount: number;
  amountOwed: number;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: FormValidationError[];
  warnings: FormValidationWarning[];
}

export interface FormValidationError {
  field: string;
  message: string;
  code: string;
}

export interface FormValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface FormMetadata {
  formType: FormType;
  formName: string;
  formTitle: string;
  taxYear: number;
  version: string;
  description: string;
  eligibilityCriteria: string[];
  specialFeatures: string[];
}

/**
 * Abstract base class for all Form 1040 variations
 */
export abstract class AbstractForm1040 {
  protected formData: Form1040Data;
  protected metadata: FormMetadata;
  
  constructor(formData: Form1040Data, metadata: FormMetadata) {
    this.formData = formData;
    this.metadata = metadata;
  }
  
  // Abstract methods that must be implemented by concrete forms
  abstract calculateTax(): FormCalculationResult;
  abstract validateForm(): FormValidationResult;
  abstract getStandardDeduction(filingStatus: FilingStatus): number;
  abstract getTaxBrackets(filingStatus: FilingStatus): TaxBracket[];
  abstract getFormSpecificFields(): string[];
  
  // Common methods shared by all forms
  getFormType(): FormType {
    return this.metadata.formType;
  }
  
  getFormData(): Form1040Data {
    return { ...this.formData };
  }
  
  updateFormData(updates: Partial<Form1040Data>): void {
    this.formData = { ...this.formData, ...updates };
  }
  
  getMetadata(): FormMetadata {
    return { ...this.metadata };
  }
  
  /**
   * Common income calculation logic
   */
  protected calculateTotalIncome(): number {
    return (this.formData.line1 || 0) + 
           (this.formData.line2b || 0) + 
           (this.formData.line3b || 0) + 
           (this.formData.line4b || 0) + 
           (this.formData.line5b || 0) + 
           (this.formData.line6b || 0) + 
           (this.formData.line7 || 0) + 
           (this.formData.line8 || 0);
  }
  
  /**
   * Common AGI calculation logic
   */
  protected calculateAGI(): number {
    const totalIncome = this.calculateTotalIncome();
    return totalIncome - (this.formData.line10 || 0);
  }
  
  /**
   * Common taxable income calculation logic
   */
  protected calculateTaxableIncome(): number {
    const agi = this.calculateAGI();
    const standardDeduction = this.getStandardDeduction(this.formData.filingStatus);
    const deductions = Math.max(standardDeduction, this.formData.line12 || 0);
    const qbiDeduction = this.formData.line13 || 0;
    
    return Math.max(0, agi - deductions - qbiDeduction);
  }
  
  /**
   * Common tax liability calculation using brackets
   */
  protected calculateTaxLiability(taxableIncome: number, filingStatus: FilingStatus): number {
    const brackets = this.getTaxBrackets(filingStatus);
    let tax = 0;
    let remainingIncome = taxableIncome;
    
    for (const bracket of brackets) {
      if (remainingIncome <= 0) break;
      
      const taxableAtThisBracket = Math.min(remainingIncome, bracket.max - bracket.min);
      tax += taxableAtThisBracket * bracket.rate;
      remainingIncome -= taxableAtThisBracket;
    }
    
    return Math.round(tax * 100) / 100;
  }
  
  /**
   * Common validation logic
   */
  protected validateCommonFields(): FormValidationResult {
    const errors: FormValidationError[] = [];
    const warnings: FormValidationWarning[] = [];
    
    // Required personal information
    if (!this.formData.firstName?.trim()) {
      errors.push({
        field: 'firstName',
        message: 'First name is required',
        code: 'REQUIRED_FIELD'
      });
    }
    
    if (!this.formData.lastName?.trim()) {
      errors.push({
        field: 'lastName',
        message: 'Last name is required',
        code: 'REQUIRED_FIELD'
      });
    }
    
    if (!this.formData.ssn?.trim()) {
      errors.push({
        field: 'ssn',
        message: 'Social Security Number is required',
        code: 'REQUIRED_FIELD'
      });
    } else if (!/^\d{3}-?\d{2}-?\d{4}$/.test(this.formData.ssn)) {
      errors.push({
        field: 'ssn',
        message: 'Invalid Social Security Number format',
        code: 'INVALID_FORMAT'
      });
    }
    
    // Address validation
    if (!this.formData.address?.trim()) {
      warnings.push({
        field: 'address',
        message: 'Address is recommended for tax filing',
        code: 'RECOMMENDED_FIELD'
      });
    }
    
    // Income validation
    if ((this.formData.line1 || 0) < 0) {
      errors.push({
        field: 'line1',
        message: 'Wages cannot be negative',
        code: 'INVALID_VALUE'
      });
    }
    
    // Large income warning
    if ((this.formData.line1 || 0) > 1000000) {
      warnings.push({
        field: 'line1',
        message: 'High income may require additional forms or professional review',
        code: 'HIGH_VALUE_WARNING'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Export form data for PDF generation or API submission
   */
  exportFormData(): any {
    return {
      formType: this.metadata.formType,
      formData: this.formData,
      metadata: this.metadata,
      calculations: this.calculateTax(),
      validation: this.validateForm()
    };
  }
}

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

/**
 * Interface for form-specific configuration
 */
export interface FormConfiguration {
  formType: FormType;
  taxYear: number;
  standardDeductions: Record<FilingStatus, number>;
  taxBrackets: Record<FilingStatus, TaxBracket[]>;
  childTaxCredit: {
    maxCredit: number;
    phaseoutThreshold: Record<FilingStatus, number>;
  };
  specialRules?: any;
}
