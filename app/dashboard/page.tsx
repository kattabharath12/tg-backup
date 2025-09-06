
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { DashboardClient } from "@/components/dashboard-client"

export default async function DashboardPage() {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    redirect("/auth/login")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      taxReturns: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          taxYear: true,
          filingStatus: true,
          currentStep: true,
          isCompleted: true,
          isFiled: true,
          refundAmount: true,
          amountOwed: true,
          createdAt: true,
          updatedAt: true
          // Note: Excluding formType and selectedFormType to avoid database errors
          // These will be added back after migration is run in production
        }
      }
    }
  })

  if (!user) {
    redirect("/auth/login")
  }

  return <DashboardClient user={user} />
}
