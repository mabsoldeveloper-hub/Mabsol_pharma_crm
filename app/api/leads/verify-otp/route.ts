import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── Shared in-memory OTP store ───────────────────────────────────────────────
// NOTE: Since Next.js API routes can run in the same process, we keep a global
// Map on the global object so it persists across hot-reloads in dev.
declare global {
  // eslint-disable-next-line no-var
  var _leadOtpStore: Map<string, { otp: string; expiry: number }> | undefined;
}

if (!global._leadOtpStore) {
  global._leadOtpStore = new Map();
}

const otpStore: Map<string, { otp: string; expiry: number }> = global._leadOtpStore;

function storeKey(type: string, value: string) {
  return `${type}:${value.trim().toLowerCase()}`;
}

// ─── POST /api/leads/verify-otp ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, value, otp } = body;

    if (!type || !value || !otp) {
      return NextResponse.json(
        { error: "type, value and otp are required" },
        { status: 400 }
      );
    }

    const key = storeKey(type, value);
    const stored = otpStore.get(key);

    if (!stored) {
      return NextResponse.json(
        { error: "OTP not found. Please request a new OTP." },
        { status: 400 }
      );
    }

    if (Date.now() > stored.expiry) {
      otpStore.delete(key);
      return NextResponse.json(
        { error: "OTP expired. Please request a new OTP." },
        { status: 400 }
      );
    }

    if (stored.otp !== String(otp).trim()) {
      return NextResponse.json(
        { error: "Incorrect OTP. Please try again." },
        { status: 400 }
      );
    }

    // Valid! Remove it so it can't be reused
    otpStore.delete(key);

    return NextResponse.json({ success: true, message: "OTP verified successfully" });
  } catch (error: any) {
    console.error("[VERIFY OTP]", error);
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 500 }
    );
  }
}
