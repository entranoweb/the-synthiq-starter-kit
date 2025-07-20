import AdminDashboard from "@/components/admin/admin-dashboard";
import { authOptions } from "@/lib/auth";
import { isUserAdmin } from "@/lib/subscription";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PrismaClient } from "@/lib/db/_legacy-prisma-stubs"; // TEMP: redirected from broken "../generated/prisma"

const prisma = new PrismaClient();

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const isAdmin = await isUserAdmin(session.user.id);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const [users, subscriptions, totalUsersCount, totalRevenue] =
    await Promise.all([
      prisma.user.findMany({
        include: {
          subscriptions: {
            where: { status: { in: ["active", "trialing"] } },
            include: { stripeProduct: true },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
          _count: {
            select: {
              subscriptions: true,
              paymentHistory: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.userSubscription.findMany({
        where: { status: { in: ["active", "trialing"] } },
        include: {
          user: { select: { name: true, email: true } },
          stripeProduct: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count(),
      prisma.paymentHistory.aggregate({
        _sum: { amount: true },
      }),
    ]);

  const stats = {
    totalUsers: totalUsersCount,
    activeSubscriptions: subscriptions.length,
    totalRevenue: totalRevenue._sum.amount || 0,
  };

  return (
    <AdminDashboard users={users} subscriptions={subscriptions} stats={stats} />
  );
}
