import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesHierarchy from "@/models/SalesHierarchy";
import User from "@/models/User";

export const dynamic = "force-dynamic";

// =======================
// PUT - Update Hierarchy Assignment
// =======================
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const body = await req.json();
    const {
      roleLevel,
      state,
      zone,
      region,
      territory,
      reportsTo,
      assignedCompanyCodes,
      assignedDivisionCodes,
      notes,
      status,
    } = body;

    const existing = await SalesHierarchy.findById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Hierarchy record not found." },
        { status: 404 }
      );
    }

    let reportsToName = existing.reportsToName;
    if (reportsTo !== undefined) {
      if (reportsTo) {
        const parentManager = await User.findById(reportsTo);
        reportsToName = parentManager ? parentManager.name : "";
      } else {
        reportsToName = "";
      }
    }

    const updated = await SalesHierarchy.findByIdAndUpdate(
      id,
      {
        ...(roleLevel && { roleLevel }),
        ...(state !== undefined && { state: state.trim() }),
        ...(zone !== undefined && { zone: zone.trim() }),
        ...(region !== undefined && { region: region.trim() }),
        ...(territory !== undefined && { territory: territory.trim() }),
        ...(reportsTo !== undefined && { reportsTo: reportsTo || null, reportsToName }),
        ...(assignedCompanyCodes && { assignedCompanyCodes }),
        ...(assignedDivisionCodes && { assignedDivisionCodes }),
        ...(notes !== undefined && { notes: notes.trim() }),
        ...(status && { status }),
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Hierarchy record updated successfully.",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update hierarchy record" },
      { status: 500 }
    );
  }
}

// =======================
// DELETE - Remove Hierarchy Assignment
// =======================
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const deleted = await SalesHierarchy.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Hierarchy record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Hierarchy record deleted successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete hierarchy record" },
      { status: 500 }
    );
  }
}
