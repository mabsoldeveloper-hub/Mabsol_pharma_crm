import { NextResponse } from "next/server";
import { getVfpStatus } from "@/lib/vfp/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getVfpStatus();

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
