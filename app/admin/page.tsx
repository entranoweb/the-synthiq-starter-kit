import AdminDashboard from "@/components/admin/admin-dashboard";
import { db } from "@/lib/db";
import { users, userSubscriptions, paymentHistory } from "@/lib/db/schema";
import { eq, inArray, desc, count, sum } from "drizzle-orm";
import { isUserAdmin } from "@/lib/subscription";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function AdminPage() {
  const session = await getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const isAdmin = await isUserAdmin(session.user.id);
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const [usersData, subscriptions, totalUsersCount, totalRevenue] =
    await Promise.all([
      db.query.users.findMany({
        with: {
          subscriptions: {
            where: inArray(userSubscriptions.status, ["active", "trialing"]),
            with: { stripeProduct: true },
            limit: 1,
            orderBy: [desc(userSubscriptions.createdAt)],
          },
        },
        orderBy: [desc(users.createdAt)],
      }),
      db.query.userSubscriptions.findMany({
        where: inArray(userSubscriptions.status, ["active", "trialing"]),
        with: {
          user: {
            columns: { name: true, email: true }
          },
          stripeProduct: {
            columns: { name: true }
          },
        },
        orderBy: [desc(userSubscriptions.createdAt)],
      }),
      db.select({ count: count() }).from(users),
      db.select({ sum: sum(paymentHistory.amount) }).from(paymentHistory),
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
