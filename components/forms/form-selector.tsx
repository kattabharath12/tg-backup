
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FileText, CheckCircle, AlertTriangle, Info, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { FormType, UserProfileData } from "@/src/profile/types";
import { Form1040Factory } from "@/src/forms/factory/form-factory";

interface FormSelectorProps {
  userProfile: UserProfileData;
  currentFormType?: FormType;
  onFormSelect: (formType: FormType) => void;
  onContinue: () => void;
  disabled?: boolean;
}

interface FormOption {
  formType: FormType;
  name: string;
  title: string;
  description: string;
  features: string[];
  isRecommended: boolean;
  isEligible: boolean;
  warnings: string[];
}

export function FormSelector({
  userProfile,
  currentFormType,
  onFormSelect,
  onContinue,
  disabled = false
}: FormSelectorProps) {
  
  const [selectedForm, setSelectedForm] = useState<FormType>(currentFormType || FormType.FORM_1040);
  const [formOptions, setFormOptions] = useState<FormOption[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadFormOptions();
  }, [userProfile]);
  
  const loadFormOptions = async () => {
    try {
      setLoading(true);
      
      // Get form recommendations
      const recommendation = Form1040Factory.recommendFormType(userProfile);
      
      // Create form options
      const options: FormOption[] = [
        {
          formType: FormType.FORM_1040,
          name: "Form 1040",
          title: "U.S. Individual Income Tax Return",
          description: "Standard form for most individual taxpayers",
          features: [
            "All income types supported",
            "Complete tax calculation",
            "Itemized and standard deductions",
            "All credits and payments"
          ],
          isRecommended: recommendation.recommendedForm === FormType.FORM_1040,
          isEligible: recommendation.eligibleForms.includes(FormType.FORM_1040),
          warnings: []
        },
        {
          formType: FormType.FORM_1040_SR,
          name: "Form 1040-SR",
          title: "U.S. Tax Return for Seniors",
          description: "Designed for taxpayers age 65 and older",
          features: [
            "Larger print for easier reading",
            "Simplified layout",
            "Same tax rules as Form 1040",
            "Senior-friendly design"
          ],
          isRecommended: recommendation.recommendedForm === FormType.FORM_1040_SR,
          isEligible: recommendation.eligibleForms.includes(FormType.FORM_1040_SR),
          warnings: userProfile.age && userProfile.age < 65 ? 
            ["Form 1040-SR is designed for taxpayers 65 and older"] : []
        },
        {
          formType: FormType.FORM_1040_NR,
          name: "Form 1040-NR",
          title: "U.S. Nonresident Alien Income Tax Return",
          description: "Required for non-resident aliens",
          features: [
            "Special tax rules for non-residents",
            "Limited deductions and credits",
            "Different tax rates may apply",
            "Required for visa holders"
          ],
          isRecommended: recommendation.recommendedForm === FormType.FORM_1040_NR,
          isEligible: recommendation.eligibleForms.includes(FormType.FORM_1040_NR),
          warnings: userProfile.residencyStatus !== 'NON_RESIDENT_ALIEN' ? 
            ["Form 1040-NR is only for non-resident aliens"] : []
        }
      ];
      
      // Filter to only show eligible forms, but always show at least the standard form
      const eligibleOptions = options.filter(option => 
        option.isEligible || option.formType === FormType.FORM_1040
      );
      
      setFormOptions(eligibleOptions);
      
      // Set default selection to recommended form if not already set
      if (!currentFormType && recommendation.recommendedForm) {
        setSelectedForm(recommendation.recommendedForm);
        onFormSelect(recommendation.recommendedForm);
      }
      
    } catch (error) {
      console.error('Error loading form options:', error);
      toast.error('Failed to load form options');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFormSelect = (formType: FormType) => {
    setSelectedForm(formType);
    onFormSelect(formType);
  };
  
  const handleContinue = () => {
    if (!selectedForm) {
      toast.error('Please select a form type');
      return;
    }
    
    // Validate form compatibility
    const compatibility = Form1040Factory.validateFormCompatibility(selectedForm, userProfile);
    
    if (!compatibility.isCompatible) {
      toast.error(`Cannot use ${selectedForm}: ${compatibility.issues.join(', ')}`);
      return;
    }
    
    onContinue();
  };
  
  const getFormStatusBadge = (option: FormOption) => {
    if (option.isRecommended) {
      return <Badge className="bg-green-600">Recommended</Badge>;
    }
    if (!option.isEligible) {
      return <Badge variant="destructive">Not Eligible</Badge>;
    }
    if (option.warnings.length > 0) {
      return <Badge variant="secondary">Review Required</Badge>;
    }
    return <Badge variant="outline">Available</Badge>;
  };
  
  const getFormIcon = (option: FormOption) => {
    if (option.isRecommended) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    if (!option.isEligible) {
      return <AlertTriangle className="w-5 h-5 text-red-600" />;
    }
    if (option.warnings.length > 0) {
      return <Info className="w-5 h-5 text-yellow-600" />;
    }
    return <FileText className="w-5 h-5 text-blue-600" />;
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading form options...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Select Your Tax Form</h2>
        <p className="text-gray-600">
          Choose the form that best fits your tax situation
        </p>
      </div>
      
      {/* Form Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Available Forms</CardTitle>
          <CardDescription>
            Based on your profile, here are the forms you can use
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={selectedForm} 
            onValueChange={handleFormSelect}
            disabled={disabled}
            className="space-y-4"
          >
            {formOptions.map((option) => (
              <div key={option.formType} className="space-y-2">
                <div className={`
                  flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors
                  ${selectedForm === option.formType 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                  ${!option.isEligible ? 'opacity-60' : ''}
                `}>
                  <RadioGroupItem 
                    value={option.formType} 
                    id={option.formType}
                    disabled={!option.isEligible || disabled}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getFormIcon(option)}
                        <Label 
                          htmlFor={option.formType} 
                          className="text-base font-medium cursor-pointer"
                        >
                          {option.name}
                        </Label>
                      </div>
                      {getFormStatusBadge(option)}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      {option.title}
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-3">
                      {option.description}
                    </p>
                    
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Key Features:
                      </div>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {option.features.map((feature, index) => (
                          <li key={index} className="flex items-center">
                            <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                
                {/* Warnings for this form */}
                {option.warnings.length > 0 && (
                  <Alert className="ml-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        {option.warnings.map((warning, index) => (
                          <div key={index}>• {warning}</div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
      
      {/* Selected Form Summary */}
      {selectedForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Selected Form: {selectedForm.replace(/_/g, '-')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              {formOptions.find(opt => opt.formType === selectedForm)?.description}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Continue Button */}
      <div className="flex justify-end pt-6 border-t">
        <Button
          onClick={handleContinue}
          disabled={!selectedForm || disabled}
          size="lg"
        >
          Continue with {selectedForm?.replace(/_/g, '-')}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
