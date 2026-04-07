import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    
    const user = await db.user.upsert({
      where: { email: session.user.email },
      update: {
        gender: data.gender,
        aiVoice: data.aiVoice,
        role: data.role,
        level: data.level,
      },
      create: {
        email: session.user.email,
        name: session.user.name || null,
        image: session.user.image || null,
        gender: data.gender,
        aiVoice: data.aiVoice,
        role: data.role,
        level: data.level,
      }
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}