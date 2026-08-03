import connectDB from "@/lib/mongodb";
import Company from "@/models/Company";
import FinancialYear from "@/models/FinancialYear";

export async function getCompanyVfpFilter(searchParams: URLSearchParams): Promise<Record<string, any>> {
  await connectDB();

  const companyId = searchParams.get("companyId");
  const fyId = searchParams.get("fyId");

  const codesToMatch = new Set<string>();

  if (companyId) {
    const compDoc = await Company.findById(companyId).lean();
    if (compDoc?.companyCode) {
      codesToMatch.add(compDoc.companyCode.trim().toUpperCase());
    }

    // Include all FY codes mapped to this company (e.g. I05, I06, I04)
    const fyDocs = await FinancialYear.find({ companyId }, { fyCode: 1 }).lean();
    for (const fy of fyDocs) {
      if (fy.fyCode) {
        codesToMatch.add(fy.fyCode.trim().toUpperCase());
      }
    }
  }

  if (fyId && fyId !== "ALL") {
    const fyDoc = await FinancialYear.findById(fyId).lean();
    if (fyDoc?.fyCode) {
      // Restrict strictly to the selected Financial Year code
      codesToMatch.clear();
      codesToMatch.add(fyDoc.fyCode.trim().toUpperCase());
    }
    if (fyDoc?.companyId && !companyId) {
      const cDoc = await Company.findById(fyDoc.companyId).lean();
      if (cDoc?.companyCode) {
        codesToMatch.add(cDoc.companyCode.trim().toUpperCase());
      }
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

  if (companyId) {
    vfpOrList.push({ companyId });
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
