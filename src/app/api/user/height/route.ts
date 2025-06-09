/**
 * ユーザーの身長を取得・更新するAPIエンドポイント
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { height: true }
    });

    return NextResponse.json({ height: dbUser?.height || null });
  } catch (error) {
    console.error("Failed to fetch height:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { height } = await request.json();

    if (typeof height !== "number" || height <= 0 || height > 300) {
      return NextResponse.json({ error: "Invalid height value" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { email: user.email! },
      data: { height },
      select: { height: true }
    });

    return NextResponse.json({ height: updatedUser.height });
  } catch (error) {
    console.error("Failed to update height:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}