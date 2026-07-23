import { NextResponse } from "next/server";
import { getVfpStatus } from "@/lib/vfp/status";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const status = await getVfpStatus({}, user.email);

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to load VFP status",
      },
      { status: 500 }
    );
  }
}
