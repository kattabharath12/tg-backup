
// Standard Form 1040 Implementation

import { 
  AbstractForm1040, 
  FormCalculationResult, 
  FormValidationResult, 
  FormMetadata,
  TaxBracket,
  FormConfiguration
} from '../base/abstract-form';
import { Form1040Data, FilingStatus } from '@/lib/form-1040-types';
import { FormType } from '@/src/profile/types';

export class Standard1040Form extends AbstractForm1040 {
  private config: FormConfiguration;
  
  constructor(formData: Form1040Data, taxYear: number = 2023) {
    const metadata: FormMetadata = {
      formType: FormType.FORM_1040,
      formName: 'Form 1040',
      formTitle: 'U.S. Individual Income Tax Return',
      taxYear,
      version: '2023',
      description: 'Standard form for most individual taxpayers',
      eligibilityCriteria: [
        'U.S. citizens and resident aliens',
        'All income levels',
        'All filing statuses'
      ],
      specialFeatures: [
        'Complete tax calculation',
        'All income types supported',
        'Itemized and standard deductions'
      ]
    };
    
    super(formData, metadata);
    this.config = this.getFormConfiguration(taxYear);
  }
  
  calculateTax(): FormCalculationResult {
    const totalIncome = this.calculateTotalIncome();
    const adjustedGrossIncome = this.calculateAGI();
    const taxableIncome = this.calculateTaxableIncome();
    
    // Calculate tax liability
    const baseTaxLiability = this.calculateTaxLiability(taxableIncome, this.formData.filingStatus);
    const additionalTax = this.formData.line17 || 0;
    const grossTaxLiability = baseTaxLiability + additionalTax;
    
    // Calculate credits
    const childTaxCredit = this.calculateChildTaxCredit();
    const otherCredits = this.formData.line20 || 0;
    const totalCredits = childTaxCredit + otherCredits;
    
    // Net tax after credits
    const netTaxLiability = Math.max(0, grossTaxLiability - totalCredits);
    const otherTaxes = this.formData.line23 || 0;
    const totalTax = netTaxLiability + otherTaxes;
    
    // Calculate payments and withholdings
    const totalWithholdings = (this.formData.line25a || 0) + 
                             (this.formData.line25b || 0) + 
                             (this.formData.line25c || 0) + 
                             (this.formData.line25d || 0);
    
    // Calculate refund or amount owed
    const overpaid = Math.max(0, totalWithholdings - totalTax);
    const amountOwed = Math.max(0, totalTax - totalWithholdings);
    
    return {
      totalIncome,
      adjustedGrossIncome,
      taxableIncome,
      taxLiability: totalTax,
      totalCredits,
      totalWithholdings,
      refundAmount: overpaid,
      amountOwed
    };
  }
  
  validateForm(): FormValidationResult {
    const commonValidation = this.validateCommonFields();
    const specificValidation = this.validateStandardFormFields();
    
    return {
      isValid: commonValidation.isValid && specificValidation.isValid,
      errors: [...commonValidation.errors, ...specificValidation.errors],
      warnings: [...commonValidation.warnings, ...specificValidation.warnings]
    };
  }
  
  getStandardDeduction(filingStatus: FilingStatus): number {
    return this.config.standardDeductions[filingStatus] || this.config.standardDeductions[FilingStatus.SINGLE];
  }
  
  getTaxBrackets(filingStatus: FilingStatus): TaxBracket[] {
    return this.config.taxBrackets[filingStatus] || this.config.taxBrackets[FilingStatus.SINGLE];
  }
  
  getFormSpecificFields(): string[] {
    return [
      'line1', 'line2a', 'line2b', 'line3a', 'line3b', 'line4a', 'line4b',
      'line5a', 'line5b', 'line6a', 'line6b', 'line7', 'line8', 'line9',
      'line10', 'line11', 'line12', 'line13', 'line14', 'line15',
      'line16', 'line17', 'line18', 'line19', 'line20', 'line21', 'line22',
      'line23', 'line24', 'line25a', 'line25b', 'line25c', 'line25d',
      'line32', 'line33', 'line34', 'line35a', 'line35b', 'line35c',
      'line36', 'line37'
    ];
  }
  
  private validateStandardFormFields(): FormValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];
    
    // Validate that required income fields are present
    const hasIncome = (this.formData.line1 || 0) > 0 || 
                     (this.formData.line2b || 0) > 0 || 
                     (this.formData.line3b || 0) > 0 ||
                     (this.formData.line7 || 0) > 0;
    
    if (!hasIncome) {
      warnings.push({
        field: 'income',
        message: 'No income reported - please verify this is correct',
        code: 'NO_INCOME_WARNING'
      });
    }
    
    // Validate refund information if refund is expected
    if ((this.formData.line33 || 0) > 0 && (this.formData.line34 || 0) > 0) {
      if (!this.formData.line35a || !this.formData.line35c) {
        errors.push({
          field: 'refund',
          message: 'Bank account information required for direct deposit',
          code: 'MISSING_BANK_INFO'
        });
      }
    }
    
    // Validate spouse information for joint filers
    if (this.formData.filingStatus === FilingStatus.MARRIED_FILING_JOINTLY) {
      if (!this.formData.spouseFirstName?.trim()) {
        errors.push({
          field: 'spouseFirstName',
          message: 'Spouse first name required for joint filing',
          code: 'REQUIRED_SPOUSE_INFO'
        });
      }
      
      if (!this.formData.spouseLastName?.trim()) {
        errors.push({
          field: 'spouseLastName',
          message: 'Spouse last name required for joint filing',
          code: 'REQUIRED_SPOUSE_INFO'
        });
      }
      
      if (!this.formData.spouseSSN?.trim()) {
        errors.push({
          field: 'spouseSSN',
          message: 'Spouse SSN required for joint filing',
          code: 'REQUIRED_SPOUSE_INFO'
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  private calculateChildTaxCredit(): number {
    // Simplified child tax credit calculation
    const agi = this.calculateAGI();
    const phaseoutThreshold = this.config.childTaxCredit.phaseoutThreshold[this.formData.filingStatus];
    
    if (agi > phaseoutThreshold) {
      // Phase out calculation would go here
      return 0;
    }
    
    // Count qualifying children (simplified - would need dependent data)
    const qualifyingChildren = this.formData.dependents?.filter(dep => dep.qualifiesForCTC).length || 0;
    
    return Math.min(qualifyingChildren * this.config.childTaxCredit.maxCredit, this.config.childTaxCredit.maxCredit * 3);
  }
  
  private getFormConfiguration(taxYear: number): FormConfiguration {
    // 2023 tax year configuration
    return {
      formType: FormType.FORM_1040,
      taxYear,
      standardDeductions: {
        [FilingStatus.SINGLE]: 13850,
        [FilingStatus.MARRIED_FILING_JOINTLY]: 27700,
        [FilingStatus.MARRIED_FILING_SEPARATELY]: 13850,
        [FilingStatus.HEAD_OF_HOUSEHOLD]: 20800,
        [FilingStatus.QUALIFYING_SURVIVING_SPOUSE]: 27700
      },
      taxBrackets: {
        [FilingStatus.SINGLE]: [
          { min: 0, max: 11000, rate: 0.10 },
          { min: 11000, max: 44725, rate: 0.12 },
          { min: 44725, max: 95375, rate: 0.22 },
          { min: 95375, max: 182050, rate: 0.24 },
          { min: 182050, max: 231250, rate: 0.32 },
          { min: 231250, max: 578125, rate: 0.35 },
          { min: 578125, max: Infinity, rate: 0.37 }
        ],
        [FilingStatus.MARRIED_FILING_JOINTLY]: [
          { min: 0, max: 22000, rate: 0.10 },
          { min: 22000, max: 89450, rate: 0.12 },
          { min: 89450, max: 190750, rate: 0.22 },
          { min: 190750, max: 364200, rate: 0.24 },
          { min: 364200, max: 462500, rate: 0.32 },
          { min: 462500, max: 693750, rate: 0.35 },
          { min: 693750, max: Infinity, rate: 0.37 }
        ],
        [FilingStatus.MARRIED_FILING_SEPARATELY]: [
          { min: 0, max: 11000, rate: 0.10 },
          { min: 11000, max: 44725, rate: 0.12 },
          { min: 44725, max: 95375, rate: 0.22 },
          { min: 95375, max: 182050, rate: 0.24 },
          { min: 182050, max: 231250, rate: 0.32 },
          { min: 231250, max: 346875, rate: 0.35 },
          { min: 346875, max: Infinity, rate: 0.37 }
        ],
        [FilingStatus.HEAD_OF_HOUSEHOLD]: [
          { min: 0, max: 15700, rate: 0.10 },
          { min: 15700, max: 59850, rate: 0.12 },
          { min: 59850, max: 95350, rate: 0.22 },
          { min: 95350, max: 182050, rate: 0.24 },
          { min: 182050, max: 231250, rate: 0.32 },
          { min: 231250, max: 578100, rate: 0.35 },
          { min: 578100, max: Infinity, rate: 0.37 }
        ],
        [FilingStatus.QUALIFYING_SURVIVING_SPOUSE]: [
          { min: 0, max: 22000, rate: 0.10 },
          { min: 22000, max: 89450, rate: 0.12 },
          { min: 89450, max: 190750, rate: 0.22 },
          { min: 190750, max: 364200, rate: 0.24 },
          { min: 364200, max: 462500, rate: 0.32 },
          { min: 462500, max: 693750, rate: 0.35 },
          { min: 693750, max: Infinity, rate: 0.37 }
        ]
      },
      childTaxCredit: {
        maxCredit: 2000,
        phaseoutThreshold: {
          [FilingStatus.SINGLE]: 200000,
          [FilingStatus.MARRIED_FILING_JOINTLY]: 400000,
          [FilingStatus.MARRIED_FILING_SEPARATELY]: 200000,
          [FilingStatus.HEAD_OF_HOUSEHOLD]: 200000,
          [FilingStatus.QUALIFYING_SURVIVING_SPOUSE]: 400000
        }
      }
    };
  }
}
