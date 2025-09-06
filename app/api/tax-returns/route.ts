
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { taxYear, filingStatus } = await request.json()

    // Check if user already has a tax return for this year
    const existingReturn = await prisma.taxReturn.findUnique({
      where: {
        userId_taxYear: {
          userId: user.id,
          taxYear: taxYear
        }
      }
    })

    if (existingReturn) {
      return NextResponse.json({ 
        id: existingReturn.id,
        message: "Tax return already exists for this year" 
      })
    }

    // Create new tax return
    const taxReturn = await prisma.taxReturn.create({
      data: {
        userId: user.id,
        taxYear: taxYear,
        filingStatus: filingStatus,
        currentStep: 1
      }
    })

    return NextResponse.json(taxReturn)
  } catch (error) {
    console.error("Error creating tax return:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const taxReturns = await prisma.taxReturn.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        taxYear: true,
        filingStatus: true,
        firstName: true,
        lastName: true,
        ssn: true,
        spouseFirstName: true,
        spouseLastName: true,
        spouseSsn: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        totalIncome: true,
        adjustedGrossIncome: true,
        standardDeduction: true,
        itemizedDeduction: true,
        taxableIncome: true,
        taxLiability: true,
        totalCredits: true,
        totalWithholdings: true,
        refundAmount: true,
        amountOwed: true,
        currentStep: true,
        completedSteps: true,
        lastSavedAt: true,
        isCompleted: true,
        isFiled: true,
        createdAt: true,
        updatedAt: true,
        // Excluding formType and selectedFormType to avoid database errors
        incomeEntries: true,
        deductionEntries: true,
        dependents: true
      }
    })

    return NextResponse.json(taxReturns)
  } catch (error) {
    console.error("Error fetching tax returns:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
