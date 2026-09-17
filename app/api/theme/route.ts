import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import UserTheme from "@/models/UserTheme";

export async function GET() {
  try {
    await dbConnect();
    const doc = await UserTheme.findOne({ themeKey: "mabsol_global_theme" });
    if (!doc) {
      return NextResponse.json({ success: true, theme: null });
    }
    return NextResponse.json({
      success: true,
      selectedTheme: doc.selectedTheme,
      customColors: doc.customColors,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { selectedTheme, customColors } = body;

    const updated = await UserTheme.findOneAndUpdate(
      { themeKey: "mabsol_global_theme" },
      { selectedTheme, customColors },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, theme: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
