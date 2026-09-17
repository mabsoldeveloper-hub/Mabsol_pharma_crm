import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const sanitizedEmail = user.email.replace(/[^a-zA-Z0-9_-]/g, "_");
    const uploadDir = path.join(process.cwd(), "data", "vfp_uploads", sanitizedEmail);

    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
      return NextResponse.json({ success: true, message: "Upload folder cleared successfully." });
    }

    return NextResponse.json({ success: true, message: "Upload folder did not exist." });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to clear upload folder" },
      { status: 500 }
    );
  }
}
