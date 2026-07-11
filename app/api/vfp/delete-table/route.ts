import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VfpTableMap from "@/models/VfpTableMap";
import VfpSyncState from "@/models/VfpSyncState";
import { getCurrentUser } from "@/lib/auth";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { tableName } = await request.json();

    if (!tableName) {
      return NextResponse.json(
        { success: false, error: "tableName is required" },
        { status: 400 }
      );
    }

    // Find the TableMap to get the correct targetCollection name
    const tableMap = (await VfpTableMap.findOne({
      $or: [{ fileName: `${tableName}.dbf` }, { fileName: tableName }],
      email: user.email,
    }).lean()) as any;

    let droppedCollection = "";
    if (tableMap && tableMap.targetCollection) {
      droppedCollection = tableMap.targetCollection;
      try {
        const db = mongoose.connection.db;
        if (db) {
          await db.collection(tableMap.targetCollection).drop();
        }
      } catch (err: any) {
        // Collection might not exist or already dropped, ignore error
      }
    }

    // Delete matching records from metadata collections
    await VfpTableMap.deleteOne({
      $or: [{ fileName: `${tableName}.dbf` }, { fileName: tableName }],
      email: user.email,
    });

    await VfpSyncState.deleteOne({ tableName, email: user.email });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted sync data and dropped collection '${droppedCollection}' for table '${tableName}'.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
