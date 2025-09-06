
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserProfileValidator } from '@/src/profile/validation';
import { FormEligibilityService } from '@/src/profile/eligibility-service';
import { UserProfileData } from '@/src/profile/types';

// Helper function to check if UserProfile table exists
async function checkUserProfileTableExists() {
  try {
    await prisma.$queryRaw`SELECT to_regclass('public."UserProfile"')`;
    return true;
  } catch (error) {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if UserProfile table exists (backward compatibility)
    const tableExists = await checkUserProfileTableExists();
    if (!tableExists) {
      return NextResponse.json({ 
        profile: null,
        message: 'User profile feature not available - database migration required',
        migrationRequired: true
      });
    }
    
    // Get user profile
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        formEligibilityHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
    
    if (!userProfile) {
      return NextResponse.json({ 
        profile: null,
        message: 'No profile found - please create one'
      });
    }
    
    // Get current form eligibility
    const eligibility = FormEligibilityService.determineEligibility(userProfile as UserProfileData);
    
    return NextResponse.json({
      profile: userProfile,
      eligibility,
      validation: UserProfileValidator.validateProfile(userProfile as UserProfileData)
    });
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    
    // Check if error is related to missing table
    if (error instanceof Error && error.message.includes('relation "UserProfile" does not exist')) {
      return NextResponse.json({ 
        profile: null,
        message: 'User profile feature not available - database migration required',
        migrationRequired: true
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if UserProfile table exists (backward compatibility)
    const tableExists = await checkUserProfileTableExists();
    if (!tableExists) {
      return NextResponse.json({ 
        error: 'User profile feature not available - database migration required',
        migrationRequired: true
      }, { status: 503 });
    }
    
    const body = await request.json();
    const profileData = { ...body, userId: session.user.id };
    
    // Validate profile data
    const validation = UserProfileValidator.validateProfile(profileData);
    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Validation failed',
        validation
      }, { status: 400 });
    }
    
    // Normalize and update eligibility
    const normalizedProfile = UserProfileValidator.normalizeProfile(profileData);
    const updatedProfile = FormEligibilityService.updateProfileEligibility(normalizedProfile as UserProfileData);
    
    // Upsert user profile
    const savedProfile = await prisma.userProfile.upsert({
      where: { userId: session.user.id },
      update: {
        age: updatedProfile.age,
        dateOfBirth: updatedProfile.dateOfBirth,
        residencyStatus: updatedProfile.residencyStatus,
        primaryTaxYear: updatedProfile.primaryTaxYear,
        preferredFilingStatus: updatedProfile.preferredFilingStatus,
        eligibleFor1040: updatedProfile.eligibleFor1040,
        eligibleFor1040SR: updatedProfile.eligibleFor1040SR,
        eligibleFor1040NR: updatedProfile.eligibleFor1040NR,
        preferredFormType: updatedProfile.preferredFormType,
        lastUsedFormType: updatedProfile.lastUsedFormType,
        profileCompleteness: updatedProfile.profileCompleteness,
        lastProfileUpdate: new Date()
      },
      create: {
        userId: session.user.id,
        age: updatedProfile.age,
        dateOfBirth: updatedProfile.dateOfBirth,
        residencyStatus: updatedProfile.residencyStatus,
        primaryTaxYear: updatedProfile.primaryTaxYear,
        preferredFilingStatus: updatedProfile.preferredFilingStatus,
        eligibleFor1040: updatedProfile.eligibleFor1040,
        eligibleFor1040SR: updatedProfile.eligibleFor1040SR,
        eligibleFor1040NR: updatedProfile.eligibleFor1040NR,
        preferredFormType: updatedProfile.preferredFormType,
        lastUsedFormType: updatedProfile.lastUsedFormType,
        profileCompleteness: updatedProfile.profileCompleteness,
        lastProfileUpdate: new Date()
      }
    });
    
    // Record eligibility history
    const eligibility = FormEligibilityService.determineEligibility(savedProfile as UserProfileData);
    
    // Create eligibility history entries for each eligible form
    const historyEntries = eligibility.eligibleForms.map(formType => ({
      userProfileId: savedProfile.id,
      taxYear: savedProfile.primaryTaxYear,
      formType,
      isEligible: true,
      reason: eligibility.reasons
        .filter(r => r.formType === formType)
        .map(r => r.reason)
        .join('; ')
    }));
    
    if (historyEntries.length > 0) {
      await prisma.formEligibilityHistory.createMany({
        data: historyEntries,
        skipDuplicates: true
      });
    }
    
    return NextResponse.json({
      profile: savedProfile,
      eligibility,
      validation: UserProfileValidator.validateProfile(savedProfile as UserProfileData)
    });
    
  } catch (error) {
    console.error('Error saving user profile:', error);
    
    // Check if error is related to missing table
    if (error instanceof Error && error.message.includes('relation "UserProfile" does not exist')) {
      return NextResponse.json({ 
        error: 'User profile feature not available - database migration required',
        migrationRequired: true
      }, { status: 503 });
    }
    
    return NextResponse.json(
      { error: 'Failed to save user profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if UserProfile table exists (backward compatibility)
    const tableExists = await checkUserProfileTableExists();
    if (!tableExists) {
      return NextResponse.json({ 
        error: 'User profile feature not available - database migration required',
        migrationRequired: true
      }, { status: 503 });
    }
    
    const body = await request.json();
    const { formType } = body;
    
    if (!formType) {
      return NextResponse.json({ error: 'Form type is required' }, { status: 400 });
    }
    
    // Update last used form type
    const updatedProfile = await prisma.userProfile.update({
      where: { userId: session.user.id },
      data: {
        lastUsedFormType: formType,
        lastProfileUpdate: new Date()
      }
    });
    
    return NextResponse.json({ profile: updatedProfile });
    
  } catch (error) {
    console.error('Error updating user profile:', error);
    
    // Check if error is related to missing table
    if (error instanceof Error && error.message.includes('relation "UserProfile" does not exist')) {
      return NextResponse.json({ 
        error: 'User profile feature not available - database migration required',
        migrationRequired: true
      }, { status: 503 });
    }
    
    return NextResponse.json(
      { error: 'Failed to update user profile' },
      { status: 500 }
    );
  }
}
