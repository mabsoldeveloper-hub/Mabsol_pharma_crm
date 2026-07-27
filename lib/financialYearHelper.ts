import connectDB from "@/lib/mongodb";
import FinancialYear from "@/models/FinancialYear";

export interface FYRangeResult {
  isAll: boolean;
  fyId: string | null;
  startDate: string | null; // "YYYY-MM-DD"
  endDate: string | null;   // "YYYY-MM-DD"
}

export async function getFYDateRange(searchParams: URLSearchParams): Promise<FYRangeResult> {
  let startDate = searchParams.get("startDate");
  let endDate = searchParams.get("endDate");
  const fyId = searchParams.get("fyId");

  if (fyId === "ALL") {
    return { isAll: true, fyId: "ALL", startDate: null, endDate: null };
  }

  if (startDate && endDate) {
    return { isAll: false, fyId, startDate: startDate.slice(0, 10), endDate: endDate.slice(0, 10) };
  }

  await connectDB();

  let fyDoc = null;
  if (fyId && fyId !== "ALL") {
    fyDoc = await FinancialYear.findById(fyId).lean();
  } else {
    fyDoc = await FinancialYear.findOne({ isCurrent: true }).lean();
  }

  if (fyDoc && fyDoc.startDate && fyDoc.endDate) {
    const s = new Date(fyDoc.startDate).toISOString().slice(0, 10);
    const e = new Date(fyDoc.endDate).toISOString().slice(0, 10);
    return { isAll: false, fyId: String(fyDoc._id), startDate: s, endDate: e };
  }

  return { isAll: false, fyId: null, startDate: null, endDate: null };
}

/**
 * Builds a robust MongoDB match query for a date field.
 * Handles string date representations ("2021-04-01", "2021-04-01T00:00:00.000Z")
 * as well as native BSON Date objects, ensuring March 31st and all timestamps are covered.
 */
export function buildFYDateQuery(fieldName: string, startDate?: string | null, endDate?: string | null): Record<string, any> {
  if (!startDate || !endDate) return {};

  const sStr = startDate.slice(0, 10);
  const eStr = endDate.slice(0, 10);

  const sDate = new Date(`${sStr}T00:00:00.000Z`);
  const eDate = new Date(`${eStr}T23:59:59.999Z`);

  return {
    $or: [
      { [fieldName]: { $gte: sStr, $lte: `${eStr}\xFF` } },
      { [fieldName]: { $gte: sDate, $lte: eDate } }
    ]
  };
}
