
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, User, AlertCircle, CheckCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { 
  UserProfileData, 
  ResidencyStatus, 
  FormType, 
  FilingStatus,
  UserProfileValidation 
} from "@/src/profile/types";
import { UserProfileValidator } from "@/src/profile/validation";
import { FormEligibilityService } from "@/src/profile/eligibility-service";

interface UserProfileFormProps {
  initialData?: Partial<UserProfileData>;
  onSave: (profile: UserProfileData) => Promise<void>;
  onCancel?: () => void;
  userId: string;
  readonly?: boolean;
}

export function UserProfileForm({
  initialData = {},
  onSave,
  onCancel,
  userId,
  readonly = false
}: UserProfileFormProps) {
  
  const [profileData, setProfileData] = useState<Partial<UserProfileData>>({
    userId,
    residencyStatus: ResidencyStatus.US_CITIZEN,
    primaryTaxYear: new Date().getFullYear(),
    preferredFormType: FormType.FORM_1040,
    eligibleFor1040: true,
    eligibleFor1040SR: false,
    eligibleFor1040NR: false,
    profileCompleteness: 0,
    lastProfileUpdate: new Date(),
    ...initialData
  });
  
  const [validation, setValidation] = useState<UserProfileValidation>({
    isValid: true,
    errors: [],
    warnings: [],
    completeness: 0
  });
  
  const [eligibility, setEligibility] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Validate profile whenever data changes
  useEffect(() => {
    const validationResult = UserProfileValidator.validateProfile(profileData);
    setValidation(validationResult);
    
    // Update eligibility if we have enough data
    if (profileData.residencyStatus && profileData.age !== undefined) {
      const eligibilityResult = FormEligibilityService.determineEligibility(profileData as UserProfileData);
      setEligibility(eligibilityResult);
      
      // Update eligibility flags
      setProfileData(prev => ({
        ...prev,
        eligibleFor1040: eligibilityResult.eligibleForms.includes(FormType.FORM_1040),
        eligibleFor1040SR: eligibilityResult.eligibleForms.includes(FormType.FORM_1040_SR),
        eligibleFor1040NR: eligibilityResult.eligibleForms.includes(FormType.FORM_1040_NR),
        preferredFormType: eligibilityResult.recommendedForm
      }));
    }
  }, [profileData]);
  
  const handleFieldChange = (field: keyof UserProfileData, value: any) => {
    setProfileData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate age from date of birth
      if (field === 'dateOfBirth' && value) {
        const birthDate = new Date(value);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        updated.age = age;
      }
      
      return updated;
    });
  };
  
  const handleSave = async () => {
    if (!validation.isValid) {
      toast.error("Please fix validation errors before saving");
      return;
    }
    
    setIsSaving(true);
    try {
      const normalizedProfile = UserProfileValidator.normalizeProfile(profileData);
      await onSave(normalizedProfile as UserProfileData);
      toast.success("Profile saved successfully");
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };
  
  const getResidencyStatusDescription = (status: ResidencyStatus): string => {
    switch (status) {
      case ResidencyStatus.US_CITIZEN:
        return "U.S. citizen by birth or naturalization";
      case ResidencyStatus.US_RESIDENT_ALIEN:
        return "Non-citizen who meets substantial presence test";
      case ResidencyStatus.NON_RESIDENT_ALIEN:
        return "Non-citizen who does not meet substantial presence test";
      case ResidencyStatus.DUAL_STATUS_ALIEN:
        return "Both resident and non-resident alien during the tax year";
      default:
        return "";
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Tax Profile Setup</h2>
        <p className="text-gray-600">
          Help us determine the best tax forms for your situation
        </p>
      </div>
      
      {/* Profile Completeness */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Profile Completeness</span>
            <Badge variant={validation.completeness >= 0.8 ? "default" : "secondary"}>
              {Math.round(validation.completeness * 100)}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={validation.completeness * 100} className="mb-2" />
          <p className="text-sm text-gray-600">
            Complete your profile to get personalized form recommendations
          </p>
        </CardContent>
      </Card>
      
      {/* Validation Alerts */}
      {validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validation.errors.map((error, index) => (
                <div key={index}>• {error.message}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {validation.warnings.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validation.warnings.map((warning, index) => (
                <div key={index}>• {warning.message}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            Basic Information
          </CardTitle>
          <CardDescription>
            Your age and residency status help determine form eligibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                min="0"
                max="150"
                value={profileData.age || ''}
                onChange={(e) => handleFieldChange('age', parseInt(e.target.value) || undefined)}
                disabled={readonly}
                placeholder="Enter your age"
              />
            </div>
            
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !profileData.dateOfBirth && "text-muted-foreground"
                    )}
                    disabled={readonly}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {profileData.dateOfBirth ? (
                      format(new Date(profileData.dateOfBirth), "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : undefined}
                    onSelect={(date) => {
                      handleFieldChange('dateOfBirth', date);
                      setShowCalendar(false);
                    }}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div>
            <Label htmlFor="residencyStatus">Residency Status</Label>
            <Select 
              value={profileData.residencyStatus} 
              onValueChange={(value) => handleFieldChange('residencyStatus', value)}
              disabled={readonly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your residency status" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ResidencyStatus).map((status) => (
                  <SelectItem key={status} value={status}>
                    <div>
                      <div className="font-medium">
                        {status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      <div className="text-xs text-gray-600">
                        {getResidencyStatusDescription(status)}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Tax Information */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Information</CardTitle>
          <CardDescription>
            Your tax preferences and filing details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primaryTaxYear">Primary Tax Year</Label>
              <Select 
                value={profileData.primaryTaxYear?.toString()} 
                onValueChange={(value) => handleFieldChange('primaryTaxYear', parseInt(value))}
                disabled={readonly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2022, 2021, 2020].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="preferredFilingStatus">Preferred Filing Status</Label>
              <Select 
                value={profileData.preferredFilingStatus} 
                onValueChange={(value) => handleFieldChange('preferredFilingStatus', value)}
                disabled={readonly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select filing status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(FilingStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Form Eligibility Results */}
      {eligibility && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Form Recommendations
            </CardTitle>
            <CardDescription>
              Based on your profile, here are your eligible tax forms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-base font-medium">Recommended Form</Label>
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-green-800">
                    {eligibility.recommendedForm.replace(/_/g, '-')}
                  </span>
                  <Badge className="bg-green-600">Recommended</Badge>
                </div>
                <div className="mt-1 text-sm text-green-700">
                  {eligibility.reasons
                    .filter((r: any) => r.formType === eligibility.recommendedForm)
                    .map((r: any) => r.reason)
                    .join(', ')}
                </div>
              </div>
            </div>
            
            {eligibility.eligibleForms.length > 1 && (
              <div>
                <Label className="text-base font-medium">Other Eligible Forms</Label>
                <div className="mt-2 space-y-2">
                  {eligibility.eligibleForms
                    .filter((form: FormType) => form !== eligibility.recommendedForm)
                    .map((form: FormType) => (
                      <div key={form} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {form.replace(/_/g, '-')}
                          </span>
                          <Badge variant="secondary">Alternative</Badge>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          {eligibility.reasons
                            .filter((r: any) => r.formType === form)
                            .map((r: any) => r.reason)
                            .join(', ')}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Action Buttons */}
      {!readonly && (
        <div className="flex justify-between pt-6 border-t">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
          )}
          
          <Button
            type="button"
            onClick={handleSave}
            disabled={!validation.isValid || isSaving}
            className="ml-auto"
          >
            {isSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      )}
    </div>
  );
}
