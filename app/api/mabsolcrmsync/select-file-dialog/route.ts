import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({
    success: false,
    error: "Native OS dialog commands are disabled. Use browser file inputs for cross-platform live website compatibility.",
  });
}
