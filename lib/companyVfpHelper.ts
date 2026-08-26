import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Company from "@/models/Company";
import FinancialYear from "@/models/FinancialYear";

export async function getCompanyVfpFilter(searchParams: URLSearchParams): Promise<Record<string, any>> {
  await connectDB();

  const companyId = searchParams.get("companyId");
  const fyId = searchParams.get("fyId");

  const codesToMatch = new Set<string>();

  let compDoc: any = null;
  if (companyId && companyId !== "ALL") {
    try {
      if (mongoose.Types.ObjectId.isValid(companyId)) {
        compDoc = await Company.findById(companyId).lean();
      } else {
        compDoc = await Company.findOne({ companyCode: new RegExp(`^${companyId}$`, "i") }).lean();
      }

      if (compDoc?.companyCode) {
        codesToMatch.add(compDoc.companyCode.trim().toUpperCase());
      }
      if (compDoc?.code) {
        codesToMatch.add(compDoc.code.trim().toUpperCase());
      }

      if (!fyId || fyId === "ALL") {
        const fyDocs = await FinancialYear.find({ companyId: compDoc?._id || companyId }, { fyCode: 1 }).lean();
        for (const fy of fyDocs) {
          if (fy.fyCode) {
            codesToMatch.add(fy.fyCode.trim().toUpperCase());
          }
        }
      }
    } catch (e) {
      console.error("Error matching companyId in getCompanyVfpFilter:", e);
    }
  }

  if (fyId && fyId !== "ALL") {
    try {
      let fyDoc: any = null;
      if (mongoose.Types.ObjectId.isValid(fyId)) {
        fyDoc = await FinancialYear.findById(fyId).lean();
      } else {
        fyDoc = await FinancialYear.findOne({ fyCode: new RegExp(`^${fyId}$`, "i") }).lean();
      }

      if (fyDoc?.fyCode) {
        codesToMatch.add(fyDoc.fyCode.trim().toUpperCase());
      }
      if (fyDoc?.companyId) {
        const fyComp: any = await Company.findById(fyDoc.companyId).lean();
        if (fyComp?.companyCode) codesToMatch.add(fyComp.companyCode.trim().toUpperCase());
        if (fyComp?.code) codesToMatch.add(fyComp.code.trim().toUpperCase());
      }
    } catch (e) {
      console.error("Error matching fyId in getCompanyVfpFilter:", e);
    }
  }

  const vfpOrList: any[] = [];
  for (const code of Array.from(codesToMatch)) {
    if (code) {
      vfpOrList.push({ _vfpTable: new RegExp(`_${code}$`, "i") });
      vfpOrList.push({ companyCode: new RegExp(`^${code}$`, "i") });
      vfpOrList.push({ COMPANY: new RegExp(`^${code}$`, "i") });
      vfpOrList.push({ fyCode: new RegExp(`^${code}$`, "i") });
    }
  }

  if (companyId && companyId !== "ALL") {
    const compStr = String(companyId).trim();
    if (mongoose.Types.ObjectId.isValid(compStr)) {
      vfpOrList.push({ companyId: new mongoose.Types.ObjectId(compStr) });
    }
    vfpOrList.push({ companyId: compStr });
  }

  return vfpOrList.length > 0 ? { $or: vfpOrList } : {};
}

/**
 * Safely merges multiple filter objects into a single MongoDB filter using $and
 * to prevent duplicate keys (like $or in date filters vs $or in company filters)
 * from overwriting each other in JavaScript object spread.
 */
export function combineFilters(...filters: any[]): Record<string, any> {
  const valid = filters.filter((f) => f && typeof f === "object" && Object.keys(f).length > 0);
  if (valid.length === 0) return {};
  if (valid.length === 1) return valid[0];
  return { $and: valid };
}
