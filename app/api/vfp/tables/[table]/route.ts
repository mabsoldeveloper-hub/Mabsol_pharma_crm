import { NextResponse } from "next/server";
import { getVfpTableRows } from "@/lib/vfp/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const data = await getVfpTableRows(table, searchParams);

    if (!data.table) {
      return NextResponse.json(
        {
          success: false,
          message: "VFP table not found. Run the sync worker first.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch VFP table rows",
      },
      { status: 500 }
    );
  }
}
