import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { clientName = "Default Client", validityDays = 365 } = body;

    // Generate standard key format: MABSOL-2026-XXXX-XXXX
    const segment1 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const segment2 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const key = `MABSOL-2026-${segment1}-${segment2}`;

    const createdAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(validityDays));

    return NextResponse.json({
      success: true,
      key,
      clientName,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      validityDays,
      masterSecret: process.env.ACTIVATION_SECRET_KEY || "MABSOL-2026-PHARMA-CRM-KEY",
    });
  } catch (error: any) {
    console.error("Error generating activation key:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to generate key" },
      { status: 500 }
    );
  }
}
