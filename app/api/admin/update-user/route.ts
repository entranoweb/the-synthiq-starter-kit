import { authOptions } from "@/lib/auth";
import { isUserAdmin } from "@/lib/subscription";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, UserRole } from "@/lib/db/_legacy-prisma-stubs"; // TEMP: redirected from broken "../../../generated/prisma"

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

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

    if (role && Object.values(UserRole).includes(role)) {
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

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tokens: true,
        tokensExpiresAt: true,
      },
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
