import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PERMISSIONS, AllPermissions } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: "ROLE_PERMISSIONS" },
    });

    if (setting && setting.value) {
      return NextResponse.json(JSON.parse(setting.value));
    }

    return NextResponse.json(DEFAULT_PERMISSIONS);
  } catch (error: any) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const newPermissions = (await req.json()) as AllPermissions;

    const setting = await prisma.systemSetting.upsert({
      where: { key: "ROLE_PERMISSIONS" },
      update: {
        value: JSON.stringify(newPermissions),
      },
      create: {
        key: "ROLE_PERMISSIONS",
        value: JSON.stringify(newPermissions),
      },
    });

    return NextResponse.json({ success: true, setting });
  } catch (error: any) {
    console.error("Error updating permissions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
