
import { isUserAdmin } from "@/lib/subscription";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, userRoleEnum } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Type alias for compatibility
type UserRole = (typeof userRoleEnum.enumValues)[number];

// Constants for enum validation
const UserRoleEnum = {
  USER: 'USER' as const,
  PREMIUM: 'PREMIUM' as const, 
  ADMIN: 'ADMIN' as const,
  BANNED: 'BANNED' as const
};

export async function POST(req: NextRequest) {
  try {
    const session = await getSession({ headers: req.headers });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, role, tokens, tokensExpiresAt } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const updateData: any = {};

    if (role && Object.values(UserRoleEnum).includes(role)) {
      updateData.role = role;
    }

    if (typeof tokens === "number" && tokens >= 0) {
      updateData.tokens = tokens;

      // If tokensExpiresAt is provided, use it; otherwise default to 30 days from now
      if (tokensExpiresAt) {
        updateData.tokensExpiresAt = new Date(tokensExpiresAt);
      } else {
        updateData.tokensExpiresAt = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        );
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid updates provided" },
        { status: 400 }
      );
    }

    const updatedUser = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        tokens: users.tokens,
        tokensExpiresAt: users.tokensExpiresAt,
      });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Admin update user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
