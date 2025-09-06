
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { TaxFilingInterface } from "@/components/tax-filing-interface"

export default async function TaxFilingPage({ params }: { params: { id: string } }) {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    redirect("/auth/login")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    redirect("/auth/login")
  }

  const taxReturn = await prisma.taxReturn.findFirst({
    where: { 
      id: params.id,
      userId: user.id 
    },
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

  if (!taxReturn) {
    redirect("/dashboard")
  }

  return <TaxFilingInterface taxReturn={taxReturn} />
}
