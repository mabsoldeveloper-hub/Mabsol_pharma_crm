import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import FinancialYear from "@/models/FinancialYear";

function getIndianFY(dateStr: any) {
  if (!dateStr || dateStr === "null" || dateStr === "undefined") return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  if (year < 1990 || year > 2100) return null;
  const month = d.getMonth() + 1;
  let fyStartYear: number, fyEndYear: number;
  if (month >= 4) {
    fyStartYear = year;
    fyEndYear = year + 1;
  } else {
    fyStartYear = year - 1;
    fyEndYear = year;
  }
  const endYearShort = String(fyEndYear).slice(-2);
  return {
    fyName: `${fyStartYear}-${endYearShort}`,
    startDate: new Date(`${fyStartYear}-04-01T00:00:00.000Z`),
    endDate: new Date(`${fyEndYear}-03-31T23:59:59.999Z`),
  };
}

export async function GET(req: Request) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  try {
    const db = mongoose.connection.db;
    if (db) {
      const collectionsWithDate = [
        { name: "vfp_new_folder_mdis", field: "DATE" },
        { name: "vfp_new_folder_dis", field: "DATE" },
        { name: "vfp_new_folder_gledger", field: "DATE" },
        { name: "vfp_new_folder_pend", field: "DDATE" },
      ];

      const detectedFYs = new Map<string, { fyName: string; startDate: Date; endDate: Date }>();

      for (const item of collectionsWithDate) {
        try {
          const col = db.collection(item.name);
          const dates = await col.distinct(item.field, { [item.field]: { $nin: [null, "", "null"] } });
          for (const dStr of dates) {
            const fy = getIndianFY(dStr);
            if (fy && !detectedFYs.has(fy.fyName)) {
              detectedFYs.set(fy.fyName, fy);
            }
          }
        } catch (e) {
          // Ignore if collection doesn't exist yet
        }
      }

      // Upsert detected FYs into DB if missing
      for (const [fyName, fyData] of detectedFYs.entries()) {
        const existing = await FinancialYear.findOne({ fyName });
        if (!existing) {
          await FinancialYear.create({
            tenantId: "TENANT001",
            fyName: fyData.fyName,
            startDate: fyData.startDate,
            endDate: fyData.endDate,
            isCurrent: false,
            status: "Active",
          });
        }
      }

      // If no FY is marked current, set the detected FY with data (or latest) as current
      const currentExists = await FinancialYear.findOne({ isCurrent: true });
      if (!currentExists) {
        const detectedArray = Array.from(detectedFYs.keys());
        if (detectedArray.length > 0) {
          // Set detected FY with data as current (e.g. 2021-22)
          await FinancialYear.findOneAndUpdate({ fyName: detectedArray[0] }, { isCurrent: true });
        } else {
          const firstAny = await FinancialYear.findOne({}).sort({ startDate: -1 });
          if (firstAny) {
            await FinancialYear.findOneAndUpdate({ _id: firstAny._id }, { isCurrent: true });
          }
        }
      }
    }
  } catch (err) {
    console.error("Error auto-detecting financial years:", err);
  }

  const query = companyId ? { companyId } : {};
  const years = await FinancialYear.find(query)
    .populate("companyId", "companyName")
    .sort({ startDate: -1 });

  return NextResponse.json(years);
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const data = await req.json();

    if (data.isCurrent) {
      await FinancialYear.updateMany(
        data.companyId ? { companyId: data.companyId } : {},
        { isCurrent: false }
      );
    }

    const fy = await FinancialYear.create(data);
    return NextResponse.json(fy);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}