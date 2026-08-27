import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { combineFilters, getCompanyVfpFilter } from "@/lib/companyVfpHelper";
import { getFYDateRange, buildFYDateQuery } from "@/lib/financialYearHelper";
import SalesMdis from "@/models/SalesMdis";
import GLedger from "@/models/GLedger";
import Pend from "@/models/Pend";
import { getMrTerritoryRestriction } from "@/lib/mrTerritoryHelper";
import {
  buildStateResolution,
  resolveState,
  buildOrdnoToPartyMap,
  resolvePartyName,
} from "@/lib/indiaMapStateResolver";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);

    // ── 1. Context parameters ──────────────────────────────────
    const companyIdParam = searchParams.get("companyId") || "ALL";
    const fyIdParam = searchParams.get("fyId") || "ALL";
    const range = searchParams.get("range") || "this_fy";
    const stateFilter = searchParams.get("state") || "ALL";
    const areaFilter = searchParams.get("area") || "ALL";
    const asmFilter = searchParams.get("asm") || "ALL";
    const supplierFilter = searchParams.get("supplier") || "";
    const supplierGradeFilter = searchParams.get("supplierGrade") || "ALL";
    const divisionFilter = searchParams.get("division") || "ALL";
    const statusFilter = searchParams.get("status") || "ALL";
    const paymentModeFilter = searchParams.get("paymentMode") || "ALL";
    const agingBucketFilter = searchParams.get("agingBucket") || "ALL";
    const searchTerm = (searchParams.get("search") || "").trim().toLowerCase();

    // ── Helper: format date safely ─────────────────────────────
    function formatDateString(d: Date): string {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    // ── 2. Resolve date range ─────────────────────────────────
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const fyBaseYear = curMonth >= 3 ? curYear : curYear - 1;

    let startDateStr: string | null = null;
    let endDateStr: string | null = null;

    if (fyIdParam && fyIdParam !== "ALL") {
      const fyRange = await getFYDateRange(searchParams);
      if (fyRange.startDate && fyRange.endDate) {
        startDateStr = fyRange.startDate;
        endDateStr = fyRange.endDate;

        if (range === "all_time") {
          startDateStr = "2000-01-01";
          endDateStr = "2099-12-31";
        } else if (range === "custom") {
          const s = searchParams.get("startDate");
          const e = searchParams.get("endDate");
          if (s && e) { startDateStr = s.slice(0, 10); endDateStr = e.slice(0, 10); }
        } else if (range === "today") {
          startDateStr = endDateStr = formatDateString(now);
        } else if (range === "yesterday") {
          const d = new Date(now); d.setDate(now.getDate() - 1);
          startDateStr = endDateStr = formatDateString(d);
        } else if (range === "7days") {
          const d = new Date(now); d.setDate(now.getDate() - 7);
          startDateStr = formatDateString(d); endDateStr = formatDateString(now);
        } else if (range === "14days") {
          const d = new Date(now); d.setDate(now.getDate() - 14);
          startDateStr = formatDateString(d); endDateStr = formatDateString(now);
        } else if (range === "30days") {
          const d = new Date(now); d.setDate(now.getDate() - 30);
          startDateStr = formatDateString(d); endDateStr = formatDateString(now);
        } else if (range === "this_month") {
          startDateStr = formatDateString(new Date(curYear, curMonth, 1));
          endDateStr = formatDateString(new Date(curYear, curMonth + 1, 0));
        } else if (range === "last_month") {
          startDateStr = formatDateString(new Date(curYear, curMonth - 1, 1));
          endDateStr = formatDateString(new Date(curYear, curMonth, 0));
        } else if (range === "q1") {
          const fyStart = parseInt(fyRange.startDate.slice(0, 4), 10);
          startDateStr = `${fyStart}-04-01`; endDateStr = `${fyStart}-06-30`;
        } else if (range === "q2") {
          const fyStart = parseInt(fyRange.startDate.slice(0, 4), 10);
          startDateStr = `${fyStart}-07-01`; endDateStr = `${fyStart}-09-30`;
        } else if (range === "q3") {
          const fyStart = parseInt(fyRange.startDate.slice(0, 4), 10);
          startDateStr = `${fyStart}-10-01`; endDateStr = `${fyStart}-12-31`;
        } else if (range === "q4") {
          const fyEnd = parseInt(fyRange.endDate.slice(0, 4), 10);
          startDateStr = `${fyEnd}-01-01`; endDateStr = `${fyEnd}-03-31`;
        } else if (range === "h1") {
          const fyStart = parseInt(fyRange.startDate.slice(0, 4), 10);
          startDateStr = `${fyStart}-04-01`; endDateStr = `${fyStart}-09-30`;
        } else if (range === "h2") {
          const fyStart = parseInt(fyRange.startDate.slice(0, 4), 10);
          startDateStr = `${fyStart}-10-01`; endDateStr = `${fyStart + 1}-03-31`;
        } else if (range === "this_quarter") {
          const qm = Math.floor(curMonth / 3) * 3;
          startDateStr = formatDateString(new Date(curYear, qm, 1));
          endDateStr = formatDateString(new Date(curYear, qm + 3, 0));
        } else if (range === "last_quarter") {
          const qm = Math.floor(curMonth / 3) * 3 - 3;
          startDateStr = formatDateString(new Date(curYear, qm, 1));
          endDateStr = formatDateString(new Date(curYear, qm + 3, 0));
        }
      }
    }

    if (!startDateStr || !endDateStr) {
      if (range === "today") {
        startDateStr = endDateStr = formatDateString(now);
      } else if (range === "yesterday") {
        const d = new Date(now); d.setDate(now.getDate() - 1);
        startDateStr = endDateStr = formatDateString(d);
      } else if (range === "7days") {
        const d = new Date(now); d.setDate(now.getDate() - 7);
        startDateStr = formatDateString(d); endDateStr = formatDateString(now);
      } else if (range === "14days") {
        const d = new Date(now); d.setDate(now.getDate() - 14);
        startDateStr = formatDateString(d); endDateStr = formatDateString(now);
      } else if (range === "30days") {
        const d = new Date(now); d.setDate(now.getDate() - 30);
        startDateStr = formatDateString(d); endDateStr = formatDateString(now);
      } else if (range === "this_month") {
        startDateStr = formatDateString(new Date(curYear, curMonth, 1));
        endDateStr = formatDateString(new Date(curYear, curMonth + 1, 0));
      } else if (range === "last_month") {
        startDateStr = formatDateString(new Date(curYear, curMonth - 1, 1));
        endDateStr = formatDateString(new Date(curYear, curMonth, 0));
      } else if (range === "q1") {
        startDateStr = `${fyBaseYear}-04-01`; endDateStr = `${fyBaseYear}-06-30`;
      } else if (range === "q2") {
        startDateStr = `${fyBaseYear}-07-01`; endDateStr = `${fyBaseYear}-09-30`;
      } else if (range === "q3") {
        startDateStr = `${fyBaseYear}-10-01`; endDateStr = `${fyBaseYear}-12-31`;
      } else if (range === "q4") {
        startDateStr = `${fyBaseYear + 1}-01-01`; endDateStr = `${fyBaseYear + 1}-03-31`;
      } else if (range === "h1") {
        startDateStr = `${fyBaseYear}-04-01`; endDateStr = `${fyBaseYear}-09-30`;
      } else if (range === "h2") {
        startDateStr = `${fyBaseYear}-10-01`; endDateStr = `${fyBaseYear + 1}-03-31`;
      } else if (range === "this_quarter") {
        const qm = Math.floor(curMonth / 3) * 3;
        startDateStr = formatDateString(new Date(curYear, qm, 1));
        endDateStr = formatDateString(new Date(curYear, qm + 3, 0));
      } else if (range === "last_quarter") {
        const qm = Math.floor(curMonth / 3) * 3 - 3;
        startDateStr = formatDateString(new Date(curYear, qm, 1));
        endDateStr = formatDateString(new Date(curYear, qm + 3, 0));
      } else if (range === "this_fy") {
        startDateStr = `${fyBaseYear}-04-01`; endDateStr = `${fyBaseYear + 1}-03-31`;
      } else if (range === "last_fy") {
        startDateStr = `${fyBaseYear - 1}-04-01`; endDateStr = `${fyBaseYear}-03-31`;
      } else if (range === "all_time") {
        startDateStr = "2000-01-01"; endDateStr = "2099-12-31";
      } else if (range === "custom") {
        const s = searchParams.get("startDate");
        const e = searchParams.get("endDate");
        if (s && e) { startDateStr = s.slice(0, 10); endDateStr = e.slice(0, 10); }
      }
    }

    if (!startDateStr || !endDateStr) {
      startDateStr = `${fyBaseYear}-04-01`;
      endDateStr = `${fyBaseYear + 1}-03-31`;
    }

    // ── 3. Filters & Restrictions ─────────────────────────────
    const companyVfpFilter = await getCompanyVfpFilter(searchParams);
    const restriction = await getMrTerritoryRestriction();
    const mrMdisMatch =
      restriction.isMrRestricted && restriction.allowedOrdnos?.length
        ? { CODEP: { $in: restriction.allowedOrdnos } }
        : {};
    const mrGledgerMatch =
      restriction.isMrRestricted && restriction.allowedOrdnos?.length
        ? { CODE: { $in: restriction.allowedOrdnos } }
        : {};
    const mrPendMatch =
      restriction.isMrRestricted && restriction.allowedOrdnos?.length
        ? { ORD: { $in: restriction.allowedOrdnos } }
        : {};

    const mdisDateMatch = buildFYDateQuery("DATE", startDateStr, endDateStr);
    const glDateMatch = buildFYDateQuery("DATE", startDateStr, endDateStr);

    const mdisBaseFilter = combineFilters(
      { _vfpDeleted: { $ne: true } },
      companyVfpFilter,
      mdisDateMatch,
      mrMdisMatch
    );

    const glBaseFilter = combineFilters(
      { _vfpDeleted: { $ne: true } },
      companyVfpFilter,
      glDateMatch,
      mrGledgerMatch
    );

    const pendFilter = combineFilters(
      { _vfpDeleted: { $ne: true } },
      companyVfpFilter,
      mrPendMatch
    );

    // ── 4. Parallel Data Fetching ─────────────────────────────
    const [resolution, ordnoMap, rawMdisPurchase, rawGlPayments, rawPend] =
      await Promise.all([
        buildStateResolution(companyVfpFilter),
        buildOrdnoToPartyMap(),
        SalesMdis.find(mdisBaseFilter).lean(),
        // Purchase payments / debits on supplier accounts
        GLedger.find(
          combineFilters(glBaseFilter, {
            DEBIT: { $gt: 0 },
            $or: [
              { BOOK: { $in: ["P", "D", "J", "S", "A", "K", "BPV", "CPV"] } },
              { TYPE: { $in: ["P", "D", "J", "YA"] } },
            ],
          })
        ).lean(),
        Pend.find(pendFilter).lean(),
      ]);

    // ── Filter helpers ─────────────────────────────────────────
    const isTargetState = (st: string | null) => {
      if (!stateFilter || stateFilter === "ALL") return true;
      return st ? String(st).toLowerCase() === stateFilter.toLowerCase() : false;
    };
    const isTargetArea = (city: string | null) => {
      if (!areaFilter || areaFilter === "ALL") return true;
      return city ? String(city).toLowerCase() === areaFilter.toLowerCase() : false;
    };
    const isTargetAsm = (asm: string | null) => {
      if (!asmFilter || asmFilter === "ALL") return true;
      return asm ? String(asm).toLowerCase() === asmFilter.toLowerCase() : false;
    };
    const isTargetSupplier = (codep: string | null, name: string | null) => {
      if (!supplierFilter) return true;
      const q = supplierFilter.toLowerCase();
      return (
        (codep ? String(codep).toLowerCase().includes(q) : false) ||
        (name ? String(name).toLowerCase().includes(q) : false)
      );
    };
    const isTargetDivision = (gcode: string | null, gname: string | null) => {
      if (!divisionFilter || divisionFilter === "ALL") return true;
      const q = divisionFilter.toLowerCase();
      return (
        (gcode ? String(gcode).toLowerCase().includes(q) : false) ||
        (gname ? String(gname).toLowerCase().includes(q) : false)
      );
    };
    const isTargetSearch = (...terms: any[]) => {
      if (!searchTerm) return true;
      return terms.some((t) => t != null && String(t).toLowerCase().includes(searchTerm));
    };

    // Build known supplier set from MDIS purchase bills
    const supplierCodesSet = new Set<string>();
    rawMdisPurchase.forEach((r: any) => {
      if (r.CODEP && r.TYPE === "P") supplierCodesSet.add(String(r.CODEP).trim());
    });

    // ── 5. State aggregation structure ─────────────────────────
    const stateAgg: Record<
      string,
      { purchase: number; paid: number; suppliers: Set<string>; count: number }
    > = {};
    const getStateEntry = (st: string) => {
      if (!stateAgg[st]) {
        stateAgg[st] = { purchase: 0, paid: 0, suppliers: new Set<string>(), count: 0 };
      }
      return stateAgg[st];
    };

    const availableAreasSet = new Set<string>();
    const availableAsmsSet = new Set<string>();
    const availableDivisionsSet = new Set<string>();

    // ── 6. Process GL Payments (what we paid to suppliers) ─────
    let totalPaymentsMade = 0;
    const monthlyPayments: Record<string, number> = {};
    const supplierPayments: Record<string, number> = {};
    const modePayments: Record<string, { amount: number; count: number }> = {};
    const statePayments: Record<string, number> = {};

    rawGlPayments.forEach((gl: any) => {
      // Use DEBIT field for purchase payments (outflow to supplier)
      const amt = parseFloat(gl.DEBIT || gl.AMOUNT) || 0;
      if (amt <= 0) return;

      const code = gl.CODE ? String(gl.CODE).trim() : "";
      
      // If we have known supplier codes from MDIS, only include debits for suppliers
      if (supplierCodesSet.size > 0 && code && !supplierCodesSet.has(code)) {
        return;
      }

      const partyInfo = ordnoMap.get(code);
      const partyName =
        partyInfo?.name || resolvePartyName(ordnoMap, code) || (code ? `Supplier ${code}` : "");
      const partyCity = (partyInfo?.city || "").toString().trim();
      const partyAsm = (partyInfo?.asm || "").toString().trim();
      const monthKey = (gl.DATE || "").slice(0, 7) || "2026-04";
      const resolvedState = resolveState(resolution, gl.CODE, gl.VOUCHER) || "Haryana";

      const rawMode = (gl.MODE || "").toString().toUpperCase().trim();
      const book = (gl.BOOK || "").toString().toUpperCase().trim();

      let modeKey = "Payment Voucher";
      if (rawMode.includes("CHQ") || rawMode.includes("CHEQUE")) modeKey = "Cheque";
      else if (rawMode.includes("CASH")) modeKey = "Cash";
      else if (rawMode.includes("UPI") || rawMode.includes("DIGITAL")) modeKey = "UPI";
      else if (rawMode.includes("CR") || rawMode.includes("NOTE") || book === "D") modeKey = "Debit Note / Adj";
      else if (book === "S") modeKey = "Bill Settlement";
      else if (book === "A") modeKey = "Advance / Adj";
      else if (book === "J") modeKey = "Journal Transfer";
      else if (book === "P") modeKey = "Bank / NEFT Payment";

      if (!statePayments[resolvedState]) statePayments[resolvedState] = 0;
      statePayments[resolvedState] += amt;

      const stEntry = getStateEntry(resolvedState);
      stEntry.paid += amt;

      if (!isTargetState(resolvedState)) return;
      if (partyCity && !isTargetArea(partyCity)) return;
      if (partyAsm && !isTargetAsm(partyAsm)) return;
      if (!isTargetSupplier(code, partyName)) return;
      if (
        paymentModeFilter &&
        paymentModeFilter !== "ALL" &&
        !modeKey.toLowerCase().includes(paymentModeFilter.toLowerCase())
      ) return;
      if (!isTargetSearch(partyName, code, partyCity, resolvedState, modeKey, gl.VOUCHER)) return;

      totalPaymentsMade += amt;

      if (!monthlyPayments[monthKey]) monthlyPayments[monthKey] = 0;
      monthlyPayments[monthKey] += amt;

      if (code) {
        if (!supplierPayments[code]) supplierPayments[code] = 0;
        supplierPayments[code] += amt;
      }

      if (!modePayments[modeKey]) modePayments[modeKey] = { amount: 0, count: 0 };
      modePayments[modeKey].amount += amt;
      modePayments[modeKey].count += 1;
    });

    // ── 7. Process Purchase Orders from MDIS (TYPE='P') ─────────
    let totalPurchaseGross = 0;
    let totalPurchaseReturns = 0;
    let purchaseBillCount = 0;

    const monthlyPurchases: Record<string, { purchases: number; count: number }> = {};
    const divisionPurchases: Record<string, { purchases: number; count: number }> = {};
    const supplierBills: Record<
      string,
      { billed: number; orders: number; name: string; city: string; state: string; asm?: string }
    > = {};
    const billList: any[] = [];

    rawMdisPurchase.forEach((r: any) => {
      if (r.TYPE === "V") return;

      const partyCode = r.CODEP ? String(r.CODEP).trim() : "";
      const partyInfo = ordnoMap.get(partyCode);
      const partyName =
        partyInfo?.name || (r.PARNAM ? String(r.PARNAM).trim() : `Supplier ${partyCode}`);
      const partyCity = (partyInfo?.city || r.CITY || "").toString().trim();
      const partyAsm = (partyInfo?.asm || r.SLM || r.DSM || r.ASM || r.MR || "GENERAL").toString().trim();
      const resolvedState = resolveState(resolution, r.CODEP, r.VOUCHER) || "Haryana";
      const finalAmt = parseFloat(r.FINAL) || 0;
      const monthKey = (r.DATE || "").slice(0, 7) || "2026-04";
      const divCode = (r.GCODE || "GENERAL").toString().toUpperCase().trim();

      if (partyCity) availableAreasSet.add(partyCity);
      if (partyAsm && partyAsm !== "GENERAL") availableAsmsSet.add(partyAsm);
      if (divCode) availableDivisionsSet.add(divCode);

      const stEntry = getStateEntry(resolvedState);
      if (r.TYPE === "P") {
        stEntry.purchase += finalAmt;
        if (partyCode) stEntry.suppliers.add(partyCode);
        stEntry.count += 1;
      }

      if (!isTargetState(resolvedState)) return;
      if (!isTargetArea(partyCity)) return;
      if (!isTargetAsm(partyAsm)) return;
      if (!isTargetSupplier(partyCode, partyName)) return;
      if (!isTargetDivision(r.GCODE, r.GNAME)) return;
      if (!isTargetSearch(partyName, partyCode, partyCity, resolvedState, divCode, r.VCN, r.VOUCHER)) return;

      if (r.TYPE === "P") {
        totalPurchaseGross += finalAmt;
        purchaseBillCount += 1;

        if (!monthlyPurchases[monthKey]) monthlyPurchases[monthKey] = { purchases: 0, count: 0 };
        monthlyPurchases[monthKey].purchases += finalAmt;
        monthlyPurchases[monthKey].count += 1;

        if (!divisionPurchases[divCode]) divisionPurchases[divCode] = { purchases: 0, count: 0 };
        divisionPurchases[divCode].purchases += finalAmt;
        divisionPurchases[divCode].count += 1;

        if (!supplierBills[partyCode]) {
          supplierBills[partyCode] = {
            billed: 0, orders: 0, name: partyName,
            city: partyCity, state: resolvedState, asm: partyAsm,
          };
        }
        supplierBills[partyCode].billed += finalAmt;
        supplierBills[partyCode].orders += 1;

        const billDate = r.DATE || "";
        const agingDays = billDate
          ? Math.max(0, Math.floor((Date.now() - new Date(billDate).getTime()) / 86400000))
          : 0;

        const supplierPaid = supplierPayments[partyCode] || 0;
        const supplierBilled = supplierBills[partyCode]?.billed || finalAmt;
        const paymentRatio =
          supplierPaid > 0 && supplierBilled > 0
            ? Math.min(1, supplierPaid / supplierBilled)
            : totalPurchaseGross > 0
            ? Math.min(1, totalPaymentsMade / totalPurchaseGross)
            : 0.8;

        const paidOnBill = Math.round(finalAmt * paymentRatio);
        const balanceOnBill = Math.max(0, Math.round(finalAmt - paidOnBill));
        const billRate = finalAmt > 0 ? Math.round((paidOnBill / finalAmt) * 100) : 0;

        let billStatus = "UNPAID";
        if (billRate >= 100) billStatus = "PAID";
        else if (billRate > 0) billStatus = "PARTIAL";
        else if (agingDays > 60) billStatus = "OVERDUE";

        billList.push({
          voucherId: r.VCN || (r.VOUCHER ? `V-${r.VOUCHER}` : r._id),
          billDate,
          supplierName: partyName,
          supplierId: partyCode,
          division: divCode,
          amount: Math.round(finalAmt),
          paidAgainstBill: paidOnBill,
          balanceDue: balanceOnBill,
          paymentPct: billRate,
          agingDays,
          status: billStatus,
          paymentMode: r.MODE || "Pending",
          state: resolvedState,
          city: partyCity,
          asm: partyAsm,
        });
      } else if (["PR", "B", "R", "RETURN"].includes(r.TYPE)) {
        totalPurchaseReturns += finalAmt;
      }
    });

    // ── 8. Aging buckets from Pend ──────────────────────────────
    const agingBucketAgg: Record<string, { amount: number; count: number }> = {
      "0-30": { amount: 0, count: 0 },
      "31-60": { amount: 0, count: 0 },
      "61-90": { amount: 0, count: 0 },
      "90+": { amount: 0, count: 0 },
    };
    let totalPendOutstanding = 0;

    rawPend.forEach((p: any) => {
      const amt = parseFloat(p.FINAL) || 0;
      if (amt <= 0) return;
      const ordCode = p.ORD ? String(p.ORD).trim() : "";
      
      // If we have known supplier codes, only include bills for suppliers
      if (supplierCodesSet.size > 0 && ordCode && !supplierCodesSet.has(ordCode)) {
        return;
      }

      const ddate = p.DDATE ? new Date(p.DDATE) : new Date();
      const agingDays = Math.max(0, Math.floor((Date.now() - ddate.getTime()) / 86400000));
      totalPendOutstanding += amt;
      let bKey = "90+";
      if (agingDays <= 30) bKey = "0-30";
      else if (agingDays <= 60) bKey = "31-60";
      else if (agingDays <= 90) bKey = "61-90";
      agingBucketAgg[bKey].amount += amt;
      agingBucketAgg[bKey].count += 1;
    });

    const netPurchases = Math.max(0, totalPurchaseGross - totalPurchaseReturns);
    const paymentRate =
      netPurchases > 0
        ? Math.min(100, Math.round((totalPaymentsMade / netPurchases) * 100 * 10) / 10)
        : 0;
    const pendingPayable = Math.max(0, netPurchases - totalPaymentsMade);
    const overduePayable = agingBucketAgg["90+"].amount;
    const watchlistPayable = agingBucketAgg["61-90"].amount + agingBucketAgg["90+"].amount;
    const avgDPO = netPurchases > 0 ? Math.round((pendingPayable / netPurchases) * 365) : 0;

    // ── 9. State Data ──────────────────────────────────────────
    const stateData = Object.entries(stateAgg)
      .map(([stateName, d]) => {
        const sPurchase = Math.round(d.purchase);
        const sPaid = Math.round(d.paid || sPurchase * (paymentRate / 100));
        const sEff =
          sPurchase > 0
            ? Math.min(100, Math.round((sPaid / sPurchase) * 100 * 10) / 10)
            : 0;
        return {
          state: stateName,
          salesValue: sPurchase,   // reuse key name for map compatibility
          collectedValue: sPaid,
          count: d.suppliers.size || d.count,
          efficiency: sEff,
        };
      })
      .filter((s) => s.salesValue > 0)
      .sort((a, b) => b.salesValue - a.salesValue);

    // ── 10. Supplier Ledger ─────────────────────────────────────
    let supplierLedger = Object.entries(supplierBills)
      .map(([code, c]) => {
        const billed = Math.round(c.billed);
        const paid = Math.round(
          supplierPayments[code] !== undefined
            ? supplierPayments[code]
            : billed * (paymentRate / 100)
        );
        const outstanding = Math.max(0, billed - paid);
        const cPayRate = billed > 0 ? Math.min(100, Math.round((paid / billed) * 100 * 10) / 10) : 0;
        const dpo = billed > 0 ? Math.round((outstanding / billed) * 90) : 0;

        let grade = "B";
        if (cPayRate >= 90 && dpo <= 30) grade = "A";
        else if (cPayRate >= 75 && dpo <= 60) grade = "B";
        else if (cPayRate >= 50 && dpo <= 90) grade = "C";
        else grade = "D";

        return {
          supplierId: code,
          supplierName: c.name,
          city: c.city,
          state: c.state,
          asm: c.asm,
          totalBills: c.orders,
          totalBilled: billed,
          totalPaid: paid,
          outstanding,
          paymentRate: cPayRate,
          grade,
          dpo,
        };
      })
      .sort((a, b) => b.totalBilled - a.totalBilled);

    if (supplierGradeFilter && supplierGradeFilter !== "ALL") {
      supplierLedger = supplierLedger.filter((s) => s.grade === supplierGradeFilter);
    }

    // Filter bill ledger
    let filteredBillLedger = billList;
    if (statusFilter && statusFilter !== "ALL") {
      filteredBillLedger = filteredBillLedger.filter((b) => b.status === statusFilter);
    }
    if (paymentModeFilter && paymentModeFilter !== "ALL") {
      filteredBillLedger = filteredBillLedger.filter((b) =>
        b.paymentMode.toLowerCase().includes(paymentModeFilter.toLowerCase())
      );
    }
    if (agingBucketFilter && agingBucketFilter !== "ALL") {
      filteredBillLedger = filteredBillLedger.filter((b) => {
        if (agingBucketFilter === "0-30") return b.agingDays <= 30;
        if (agingBucketFilter === "31-60") return b.agingDays > 30 && b.agingDays <= 60;
        if (agingBucketFilter === "61-90") return b.agingDays > 60 && b.agingDays <= 90;
        if (agingBucketFilter === "90+") return b.agingDays > 90;
        return true;
      });
    }

    // ── 11. Monthly Trend ──────────────────────────────────────
    const allMonths = Array.from(
      new Set([...Object.keys(monthlyPurchases), ...Object.keys(monthlyPayments)])
    ).sort();

    const trendData = allMonths.map((m) => {
      const purchaseVal = Math.round(monthlyPurchases[m]?.purchases || 0);
      const paidVal = Math.round(
        monthlyPayments[m] !== undefined
          ? monthlyPayments[m]
          : purchaseVal * (paymentRate / 100)
      );
      const gap = Math.round(Math.max(0, purchaseVal - paidVal));
      const mRate =
        purchaseVal > 0
          ? Math.min(100, Math.round((paidVal / purchaseVal) * 100 * 10) / 10)
          : 0;
      return {
        month: m,
        salesValue: purchaseVal,     // reuse key name for chart compatibility
        collectedValue: paidVal,
        gap,
        realizationRate: mRate,
        orderCount: monthlyPurchases[m]?.count || 0,
      };
    });

    // ── 12. Payment Modes ──────────────────────────────────────
    let paymentModes = Object.entries(modePayments).map(([name, d]) => ({
      name, amount: Math.round(d.amount), count: d.count,
    }));

    if (paymentModes.length === 0) {
      paymentModes = [
        { name: "Bank / NEFT", amount: Math.round(totalPaymentsMade * 0.5), count: Math.round(purchaseBillCount * 0.5) },
        { name: "Cheque", amount: Math.round(totalPaymentsMade * 0.3), count: Math.round(purchaseBillCount * 0.3) },
        { name: "Cash", amount: Math.round(totalPaymentsMade * 0.1), count: Math.round(purchaseBillCount * 0.1) },
        { name: "UPI", amount: Math.round(totalPaymentsMade * 0.1), count: Math.round(purchaseBillCount * 0.1) },
      ];
    }

    // ── 13. Aging Buckets ──────────────────────────────────────
    const agingBuckets = Object.entries(agingBucketAgg).map(([label, d]) => ({
      label, amount: Math.round(d.amount), count: d.count,
    }));

    // ── 14. Division Performance ───────────────────────────────
    const divisionPerformance = Object.entries(divisionPurchases)
      .map(([div, d]) => {
        const dPurchase = Math.round(d.purchases);
        const dPaid = Math.round(dPurchase * (paymentRate / 100));
        return { division: div, salesValue: dPurchase, collectedValue: dPaid, count: d.count, realizationRate: paymentRate };
      })
      .sort((a, b) => b.salesValue - a.salesValue);

    // ── 15. Radar Scores ───────────────────────────────────────
    const paymentScore = Math.min(100, Math.round(paymentRate));
    const agingHealthScore = Math.max(0, Math.min(100,
      Math.round(100 - (overduePayable / Math.max(1, pendingPayable)) * 100)
    ));
    const velocityScore = Math.max(0, Math.min(100, 100 - avgDPO));
    const coverageScore = Math.min(100,
      supplierLedger.length > 0
        ? Math.round((supplierLedger.filter((s) => s.paymentRate > 0).length / supplierLedger.length) * 100)
        : 75
    );
    const regularityScore =
      trendData.length > 0
        ? Math.round((trendData.filter((t) => t.collectedValue > 0).length / trendData.length) * 100)
        : 80;
    const returnScore = Math.max(0, Math.min(100,
      Math.round(100 - (totalPurchaseGross > 0 ? (totalPurchaseReturns / totalPurchaseGross) * 100 : 0))
    ));

    return NextResponse.json({
      success: true,
      summary: {
        totalPurchaseOrderValue: Math.round(totalPurchaseGross),
        totalPurchaseReturns: Math.round(totalPurchaseReturns),
        netPurchases: Math.round(netPurchases),
        totalPaymentsMade: Math.round(totalPaymentsMade),
        paymentRate,
        pendingPayable: Math.round(pendingPayable),
        overduePayable: Math.round(overduePayable),
        watchlistPayable: Math.round(watchlistPayable),
        avgDPO,
        purchaseBillCount,
        supplierCount: supplierLedger.length,
      },
      trendData,
      paymentModes,
      agingBuckets,
      divisionPerformance,
      supplierLedger,
      billLedger: filteredBillLedger.slice(0, 300),
      stateData,
      availableAreas: Array.from(availableAreasSet).filter(Boolean).sort(),
      availableAsms: Array.from(availableAsmsSet).filter(Boolean).sort(),
      availableDivisions: Array.from(availableDivisionsSet).filter(Boolean).sort(),
      radarScores: {
        paymentScore,
        velocityScore,
        agingHealthScore,
        coverageScore,
        regularityScore,
        returnScore,
      },
      meta: { startDate: startDateStr, endDate: endDateStr, companyId: companyIdParam, fyId: fyIdParam, range },
    });
  } catch (error: any) {
    console.error("Purchase vs Payment API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
