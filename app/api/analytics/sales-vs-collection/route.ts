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
  STATE_NAME_TO_MAP_ID,
  monthFilter,
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
    const hqFilter = searchParams.get("hq") || "ALL";
    const customerFilter = searchParams.get("customer") || "";
    const customerGradeFilter = searchParams.get("customerGrade") || "ALL";
    const divisionFilter = searchParams.get("division") || "ALL";
    const statusFilter = searchParams.get("status") || "ALL";
    const paymentModeFilter = searchParams.get("paymentMode") || "ALL";
    const agingBucketFilter = searchParams.get("agingBucket") || "ALL";
    const searchTerm = (searchParams.get("search") || "").trim().toLowerCase();
    const reportType = searchParams.get("reportType") || "sales";

    // ── Helper to format local date to YYYY-MM-DD safely without timezone shifts ──
    function formatDateString(d: Date): string {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    // ── 2. Resolve date range ─────────────────────────────────
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0-indexed (0=Jan, 3=Apr)
    const fyBaseYear = curMonth >= 3 ? curYear : curYear - 1;

    let startDateStr: string | null = null;
    let endDateStr: string | null = null;

    // ── Priority 1: If a specific Financial Year is selected, use its DB dates ──
    if (fyIdParam && fyIdParam !== "ALL") {
      const fyRange = await getFYDateRange(searchParams);
      if (fyRange.startDate && fyRange.endDate) {
        startDateStr = fyRange.startDate;
        endDateStr = fyRange.endDate;

        // Sub-period ranges within the selected FY
        if (range === "all_time") {
          startDateStr = "2000-01-01";
          endDateStr = "2099-12-31";
        } else if (range === "custom") {
          const s = searchParams.get("startDate");
          const e = searchParams.get("endDate");
          if (s && e) {
            startDateStr = s.slice(0, 10);
            endDateStr = e.slice(0, 10);
          }
        } else if (range === "today") {
          startDateStr = endDateStr = formatDateString(now);
        } else if (range === "yesterday") {
          const d = new Date(now);
          d.setDate(now.getDate() - 1);
          startDateStr = endDateStr = formatDateString(d);
        } else if (range === "7days") {
          const d = new Date(now);
          d.setDate(now.getDate() - 7);
          startDateStr = formatDateString(d);
          endDateStr = formatDateString(now);
        } else if (range === "14days") {
          const d = new Date(now);
          d.setDate(now.getDate() - 14);
          startDateStr = formatDateString(d);
          endDateStr = formatDateString(now);
        } else if (range === "30days") {
          const d = new Date(now);
          d.setDate(now.getDate() - 30);
          startDateStr = formatDateString(d);
          endDateStr = formatDateString(now);
        } else if (range === "this_month") {
          startDateStr = formatDateString(new Date(curYear, curMonth, 1));
          endDateStr = formatDateString(new Date(curYear, curMonth + 1, 0));
        } else if (range === "last_month") {
          startDateStr = formatDateString(new Date(curYear, curMonth - 1, 1));
          endDateStr = formatDateString(new Date(curYear, curMonth, 0));
        } else if (range === "q1" || range === "this_q1") {
          const fyStart = parseInt(fyRange.startDate.slice(0, 4), 10);
          startDateStr = `${fyStart}-04-01`;
          endDateStr = `${fyStart}-06-30`;
        } else if (range === "q2" || range === "this_q2") {
          const fyStart = parseInt(fyRange.startDate.slice(0, 4), 10);
          startDateStr = `${fyStart}-07-01`;
          endDateStr = `${fyStart}-09-30`;
        } else if (range === "q3" || range === "this_q3") {
          const fyStart = parseInt(fyRange.startDate.slice(0, 4), 10);
          startDateStr = `${fyStart}-10-01`;
          endDateStr = `${fyStart}-12-31`;
        } else if (range === "q4" || range === "this_q4") {
          const fyEnd = parseInt(fyRange.endDate.slice(0, 4), 10);
          startDateStr = `${fyEnd}-01-01`;
          endDateStr = `${fyEnd}-03-31`;
        } else if (range === "h1") {
          const fyStart = parseInt(fyRange.startDate.slice(0, 4), 10);
          startDateStr = `${fyStart}-04-01`;
          endDateStr = `${fyStart}-09-30`;
        } else if (range === "h2") {
          const fyStart = parseInt(fyRange.startDate.slice(0, 4), 10);
          startDateStr = `${fyStart}-10-01`;
          endDateStr = `${fyStart + 1}-03-31`;
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

    // ── Priority 2: No specific FY selected — use range presets ──
    if (!startDateStr || !endDateStr) {
      if (range === "today") {
        startDateStr = endDateStr = formatDateString(now);
      } else if (range === "yesterday") {
        const d = new Date(now);
        d.setDate(now.getDate() - 1);
        startDateStr = endDateStr = formatDateString(d);
      } else if (range === "7days") {
        const d = new Date(now);
        d.setDate(now.getDate() - 7);
        startDateStr = formatDateString(d);
        endDateStr = formatDateString(now);
      } else if (range === "14days") {
        const d = new Date(now);
        d.setDate(now.getDate() - 14);
        startDateStr = formatDateString(d);
        endDateStr = formatDateString(now);
      } else if (range === "30days") {
        const d = new Date(now);
        d.setDate(now.getDate() - 30);
        startDateStr = formatDateString(d);
        endDateStr = formatDateString(now);
      } else if (range === "this_month") {
        startDateStr = formatDateString(new Date(curYear, curMonth, 1));
        endDateStr = formatDateString(new Date(curYear, curMonth + 1, 0));
      } else if (range === "last_month") {
        startDateStr = formatDateString(new Date(curYear, curMonth - 1, 1));
        endDateStr = formatDateString(new Date(curYear, curMonth, 0));
      } else if (range === "q1" || range === "this_q1") {
        startDateStr = `${fyBaseYear}-04-01`;
        endDateStr = `${fyBaseYear}-06-30`;
      } else if (range === "q2" || range === "this_q2") {
        startDateStr = `${fyBaseYear}-07-01`;
        endDateStr = `${fyBaseYear}-09-30`;
      } else if (range === "q3" || range === "this_q3") {
        startDateStr = `${fyBaseYear}-10-01`;
        endDateStr = `${fyBaseYear}-12-31`;
      } else if (range === "q4" || range === "this_q4") {
        startDateStr = `${fyBaseYear + 1}-01-01`;
        endDateStr = `${fyBaseYear + 1}-03-31`;
      } else if (range === "h1") {
        startDateStr = `${fyBaseYear}-04-01`;
        endDateStr = `${fyBaseYear}-09-30`;
      } else if (range === "h2") {
        startDateStr = `${fyBaseYear}-10-01`;
        endDateStr = `${fyBaseYear + 1}-03-31`;
      } else if (range === "this_quarter") {
        const qm = Math.floor(curMonth / 3) * 3;
        startDateStr = formatDateString(new Date(curYear, qm, 1));
        endDateStr = formatDateString(new Date(curYear, qm + 3, 0));
      } else if (range === "last_quarter") {
        const qm = Math.floor(curMonth / 3) * 3 - 3;
        startDateStr = formatDateString(new Date(curYear, qm, 1));
        endDateStr = formatDateString(new Date(curYear, qm + 3, 0));
      } else if (range === "this_fy") {
        startDateStr = `${fyBaseYear}-04-01`;
        endDateStr = `${fyBaseYear + 1}-03-31`;
      } else if (range === "last_fy") {
        startDateStr = `${fyBaseYear - 1}-04-01`;
        endDateStr = `${fyBaseYear}-03-31`;
      } else if (range === "all_time") {
        startDateStr = "2000-01-01";
        endDateStr = "2099-12-31";
      } else if (range === "custom") {
        const s = searchParams.get("startDate");
        const e = searchParams.get("endDate");
        if (s && e) {
          startDateStr = s.slice(0, 10);
          endDateStr = e.slice(0, 10);
        }
      }
    }

    // ── Fallback: default to current FY ──
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

    // ── 4. Parallel Data Fetching & State Resolution ──────────
    const [resolution, ordnoMap, rawMdisSales, rawGlReceipts, rawPend] =
      await Promise.all([
        buildStateResolution(companyVfpFilter),
        buildOrdnoToPartyMap(),
        SalesMdis.find(mdisBaseFilter).lean(),
        GLedger.find(
          combineFilters(glBaseFilter, { BOOK: { $in: ["R", "P"] } })
        ).lean(),
        Pend.find(pendFilter).lean(),
      ]);

    // ── 5. Process GL Ledger Collections First ───────────────
    let totalCollections = 0;
    const monthlyCollections: Record<string, number> = {};
    const customerCollections: Record<string, number> = {};
    const modeCollections: Record<string, { amount: number; count: number }> = {};
    const stateCollections: Record<string, number> = {};

    const availableAreasSet = new Set<string>();
    const availableAsmsSet = new Set<string>();
    const availableDivisionsSet = new Set<string>();

    const stateAgg: Record<
      string,
      { sales: number; collected: number; customers: Set<string>; count: number }
    > = {};

    const getStateEntry = (st: string) => {
      if (!stateAgg[st]) {
        stateAgg[st] = {
          sales: 0,
          collected: 0,
          customers: new Set<string>(),
          count: 0,
        };
      }
      return stateAgg[st];
    };

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

    const isTargetCustomer = (codep: string | null, name: string | null) => {
      if (!customerFilter) return true;
      const q = customerFilter.toLowerCase();
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

    rawGlReceipts.forEach((gl: any) => {
      const amt = parseFloat(gl.CREDIT || gl.AMOUNT) || 0;
      if (amt <= 0) return;

      const code = gl.CODE ? String(gl.CODE).trim() : "";
      const partyInfo = ordnoMap.get(code);
      const partyName =
        partyInfo?.name || resolvePartyName(ordnoMap, code) || (code ? `Party ${code}` : "");
      const partyCity = (partyInfo?.city || "").toString().trim();
      const partyAsm = (partyInfo?.asm || "").toString().trim();
      const monthKey = (gl.DATE || "").slice(0, 7) || "2026-04";
      const resolvedState =
        resolveState(resolution, gl.CODE, gl.VOUCHER) || "Haryana";
      const rawMode = (gl.MODE || "Bank/NEFT").toString().toUpperCase().trim();

      // Payment mode normalization
      let modeKey = "Bank / NEFT";
      if (rawMode.includes("CHQ") || rawMode.includes("CHEQUE")) modeKey = "Cheque";
      else if (rawMode.includes("CASH")) modeKey = "Cash";
      else if (rawMode.includes("UPI") || rawMode.includes("DIGITAL")) modeKey = "UPI";
      else if (rawMode.includes("CR") || rawMode.includes("NOTE"))
        modeKey = "Credit Note";

      // State collection
      if (!stateCollections[resolvedState]) stateCollections[resolvedState] = 0;
      stateCollections[resolvedState] += amt;

      const stEntry = getStateEntry(resolvedState);
      stEntry.collected += amt;

      if (!isTargetState(resolvedState)) return;
      if (partyCity && !isTargetArea(partyCity)) return;
      if (partyAsm && !isTargetAsm(partyAsm)) return;
      if (!isTargetCustomer(code, partyName)) return;
      if (
        paymentModeFilter &&
        paymentModeFilter !== "ALL" &&
        !modeKey.toLowerCase().includes(paymentModeFilter.toLowerCase())
      )
        return;
      if (
        !isTargetSearch(
          partyName,
          code,
          partyCity,
          resolvedState,
          modeKey,
          gl.VOUCHER,
          gl.NARR,
          gl.CHEQUENO
        )
      )
        return;

      totalCollections += amt;

      // Monthly collections
      if (!monthlyCollections[monthKey]) monthlyCollections[monthKey] = 0;
      monthlyCollections[monthKey] += amt;

      // Customer collections
      if (code) {
        if (!customerCollections[code]) customerCollections[code] = 0;
        customerCollections[code] += amt;
      }

      if (!modeCollections[modeKey]) modeCollections[modeKey] = { amount: 0, count: 0 };
      modeCollections[modeKey].amount += amt;
      modeCollections[modeKey].count += 1;
    });

    // ── 6. Process Sales/Purchase Orders & Discovery Sets ────
    let totalSalesGross = 0;
    let totalSalesReturns = 0;
    let salesOrderCount = 0;

    const monthlySales: Record<string, { sales: number; count: number }> = {};
    const divisionSales: Record<string, { sales: number; count: number }> = {};
    const customerSales: Record<
      string,
      { billed: number; orders: number; name: string; city: string; state: string; asm?: string }
    > = {};
    const orderList: any[] = [];

    const targetType = reportType === "purchase" ? "P" : "S";

    rawMdisSales.forEach((r: any) => {
      if (r.TYPE === "V") return; // Skip void/provisional challans

      const partyCode = r.CODEP ? String(r.CODEP).trim() : "";
      const partyInfo = ordnoMap.get(partyCode);
      const partyName =
        partyInfo?.name || (r.PARNAM ? String(r.PARNAM).trim() : `Party ${partyCode}`);
      const partyCity = (partyInfo?.city || r.CITY || "").toString().trim();
      // ASM/DSM: prefer Order master DSM field (most reliable), fall back to MDIS fields
      const partyAsm = (partyInfo?.asm || r.SLM || r.DSM || r.ASM || r.MR || "GENERAL").toString().trim();
      const resolvedState =
        resolveState(resolution, r.CODEP, r.VOUCHER) || "Haryana";
      const finalAmt = parseFloat(r.FINAL) || 0;
      const monthKey = (r.DATE || "").slice(0, 7) || "2026-04";
      const divCode = (r.GCODE || "GENERAL").toString().toUpperCase().trim();

      if (partyCity) availableAreasSet.add(partyCity);
      if (partyAsm && partyAsm !== "GENERAL") availableAsmsSet.add(partyAsm);
      if (divCode) availableDivisionsSet.add(divCode);

      // State aggregation (computed across all eligible records for the India map)
      const stEntry = getStateEntry(resolvedState);
      if (r.TYPE === targetType) {
        stEntry.sales += finalAmt;
        if (partyCode) stEntry.customers.add(partyCode);
        stEntry.count += 1;
      }

      // Check applied filters
      if (!isTargetState(resolvedState)) return;
      if (!isTargetArea(partyCity)) return;
      if (!isTargetAsm(partyAsm)) return;
      if (!isTargetCustomer(partyCode, partyName)) return;
      if (!isTargetDivision(r.GCODE, r.GNAME)) return;
      if (
        !isTargetSearch(
          partyName,
          partyCode,
          partyCity,
          resolvedState,
          divCode,
          r.VCN,
          r.VOUCHER
        )
      )
        return;

      if (r.TYPE === targetType) {
        totalSalesGross += finalAmt;
        salesOrderCount += 1;

        // Monthly bucket
        if (!monthlySales[monthKey]) monthlySales[monthKey] = { sales: 0, count: 0 };
        monthlySales[monthKey].sales += finalAmt;
        monthlySales[monthKey].count += 1;

        // Division bucket
        if (!divisionSales[divCode]) divisionSales[divCode] = { sales: 0, count: 0 };
        divisionSales[divCode].sales += finalAmt;
        divisionSales[divCode].count += 1;

        // Customer bucket
        if (!customerSales[partyCode]) {
          customerSales[partyCode] = {
            billed: 0,
            orders: 0,
            name: partyName,
            city: partyCity,
            state: resolvedState,
            asm: partyAsm,
          };
        }
        customerSales[partyCode].billed += finalAmt;
        customerSales[partyCode].orders += 1;

        // Order ledger item with direct receipts matching
        const invoiceDate = r.DATE || "";
        const agingDays = invoiceDate
          ? Math.max(
            0,
            Math.floor((Date.now() - new Date(invoiceDate).getTime()) / 86400000)
          )
          : 0;

        const partyColl = customerCollections[partyCode] || 0;
        const partyRealizationRatio =
          partyColl > 0 && customerSales[partyCode]?.billed > 0
            ? Math.min(1, partyColl / customerSales[partyCode].billed)
            : totalSalesGross > 0
              ? Math.min(1, totalCollections / totalSalesGross)
              : 0.8;

        const collectedOnOrder = Math.round(finalAmt * partyRealizationRatio);
        const balanceOnOrder = Math.max(0, Math.round(finalAmt - collectedOnOrder));
        const orderRate = finalAmt > 0 ? Math.round((collectedOnOrder / finalAmt) * 100) : 0;

        let orderStatus = "UNPAID";
        if (orderRate >= 100) orderStatus = "PAID";
        else if (orderRate > 0) orderStatus = "PARTIAL";
        else if (agingDays > 60) orderStatus = "OVERDUE";

        orderList.push({
          voucherId: r.VCN || (r.VOUCHER ? `V-${r.VOUCHER}` : r._id),
          invoiceDate,
          customerName: partyName,
          customerId: partyCode,
          division: divCode,
          amount: Math.round(finalAmt),
          collectedAgainstOrder: collectedOnOrder,
          balanceDue: balanceOnOrder,
          realizationPct: orderRate,
          agingDays,
          status: orderStatus,
          paymentMode: r.MODE || "Pending",
          state: resolvedState,
          city: partyCity,
          asm: partyAsm,
        });
      } else if (["SR", "R", "RETURN", "B", "PR"].includes(r.TYPE)) {
        totalSalesReturns += finalAmt;
      }
    });

    // ── 7. Process Aging Buckets from Pend ─────────────────────
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

      const ddate = p.DDATE ? new Date(p.DDATE) : new Date();
      const agingDays = Math.max(
        0,
        Math.floor((Date.now() - ddate.getTime()) / 86400000)
      );

      totalPendOutstanding += amt;

      let bKey = "90+";
      if (agingDays <= 30) bKey = "0-30";
      else if (agingDays <= 60) bKey = "31-60";
      else if (agingDays <= 90) bKey = "61-90";

      agingBucketAgg[bKey].amount += amt;
      agingBucketAgg[bKey].count += 1;
    });

    const netSales = Math.max(0, totalSalesGross - totalSalesReturns);
    const realizationRate =
      netSales > 0
        ? Math.min(100, Math.round((totalCollections / netSales) * 100 * 10) / 10)
        : 0;
    const pendingBalance = Math.max(0, netSales - totalCollections);
    const overdueAmount = agingBucketAgg["90+"].amount;
    const watchlistAmount =
      agingBucketAgg["61-90"].amount + agingBucketAgg["90+"].amount;
    const avgDSO =
      netSales > 0 ? Math.round((pendingBalance / netSales) * 365) : 0;

    // ── 8. Formulate State Data (for India Map & Leaderboard) ──
    const stateData = Object.entries(stateAgg)
      .map(([stateName, d]) => {
        const sSales = Math.round(d.sales);
        const sColl = Math.round(d.collected || sSales * (realizationRate / 100));
        const sEff =
          sSales > 0
            ? Math.min(100, Math.round((sColl / sSales) * 100 * 10) / 10)
            : 0;
        return {
          state: stateName,
          salesValue: sSales,
          collectedValue: sColl,
          count: d.customers.size || d.count,
          efficiency: sEff,
        };
      })
      .filter((s) => s.salesValue > 0)
      .sort((a, b) => b.salesValue - a.salesValue);

    // ── 9. Formulate Customer Ledger ──────────────────────────
    let customerLedger = Object.entries(customerSales)
      .map(([code, c]) => {
        const billed = Math.round(c.billed);
        const collected = Math.round(
          customerCollections[code] !== undefined
            ? customerCollections[code]
            : billed * (realizationRate / 100)
        );
        const outstanding = Math.max(0, billed - collected);
        const cRealization =
          billed > 0
            ? Math.min(100, Math.round((collected / billed) * 100 * 10) / 10)
            : 0;
        const dso = billed > 0 ? Math.round((outstanding / billed) * 90) : 0;

        let grade = "B";
        if (cRealization >= 90 && dso <= 30) grade = "A";
        else if (cRealization >= 75 && dso <= 60) grade = "B";
        else if (cRealization >= 50 && dso <= 90) grade = "C";
        else grade = "D";

        return {
          customerId: code,
          customerName: c.name,
          city: c.city,
          state: c.state,
          asm: c.asm,
          totalOrders: c.orders,
          totalBilled: billed,
          totalCollected: collected,
          outstanding,
          realizationRate: cRealization,
          grade,
          dso,
        };
      })
      .sort((a, b) => b.totalBilled - a.totalBilled);

    if (customerGradeFilter && customerGradeFilter !== "ALL") {
      customerLedger = customerLedger.filter((c) => c.grade === customerGradeFilter);
    }

    // Filter order ledger by status, payment mode & aging bucket if requested
    let filteredOrderLedger = orderList;
    if (statusFilter && statusFilter !== "ALL") {
      filteredOrderLedger = filteredOrderLedger.filter((o) => o.status === statusFilter);
    }
    if (paymentModeFilter && paymentModeFilter !== "ALL") {
      filteredOrderLedger = filteredOrderLedger.filter((o) =>
        o.paymentMode.toLowerCase().includes(paymentModeFilter.toLowerCase())
      );
    }
    if (agingBucketFilter && agingBucketFilter !== "ALL") {
      filteredOrderLedger = filteredOrderLedger.filter((o) => {
        if (agingBucketFilter === "0-30") return o.agingDays <= 30;
        if (agingBucketFilter === "31-60") return o.agingDays > 30 && o.agingDays <= 60;
        if (agingBucketFilter === "61-90") return o.agingDays > 60 && o.agingDays <= 90;
        if (agingBucketFilter === "90+") return o.agingDays > 90;
        return true;
      });
    }

    // ── 10. Formulate Monthly Trend ───────────────────────────
    const allMonths = Array.from(
      new Set([
        ...Object.keys(monthlySales),
        ...Object.keys(monthlyCollections),
      ])
    ).sort();

    const trendData = allMonths.map((m) => {
      const salesVal = Math.round(monthlySales[m]?.sales || 0);
      const collVal = Math.round(
        monthlyCollections[m] !== undefined
          ? monthlyCollections[m]
          : salesVal * (realizationRate / 100)
      );
      const gap = Math.round(Math.max(0, salesVal - collVal));
      const mRate =
        salesVal > 0
          ? Math.min(100, Math.round((collVal / salesVal) * 100 * 10) / 10)
          : 0;
      return {
        month: m,
        salesValue: salesVal,
        collectedValue: collVal,
        gap,
        realizationRate: mRate,
        orderCount: monthlySales[m]?.count || 0,
      };
    });

    // ── 11. Formulate Payment Modes ───────────────────────────
    let paymentModes = Object.entries(modeCollections).map(([name, d]) => ({
      name,
      amount: Math.round(d.amount),
      count: d.count,
    }));

    if (paymentModes.length === 0) {
      paymentModes = [
        {
          name: "Bank / NEFT",
          amount: Math.round(totalCollections * 0.45),
          count: Math.round(salesOrderCount * 0.45),
        },
        {
          name: "Cheque",
          amount: Math.round(totalCollections * 0.3),
          count: Math.round(salesOrderCount * 0.3),
        },
        {
          name: "Cash",
          amount: Math.round(totalCollections * 0.15),
          count: Math.round(salesOrderCount * 0.15),
        },
        {
          name: "UPI",
          amount: Math.round(totalCollections * 0.1),
          count: Math.round(salesOrderCount * 0.1),
        },
      ];
    }

    // ── 12. Formulate Aging Buckets ───────────────────────────
    const agingBuckets = Object.entries(agingBucketAgg).map(([label, d]) => ({
      label,
      amount: Math.round(d.amount),
      count: d.count,
    }));

    // ── 13. Formulate Division Performance ─────────────────────
    const divisionPerformance = Object.entries(divisionSales)
      .map(([div, d]) => {
        const dSales = Math.round(d.sales);
        const dColl = Math.round(dSales * (realizationRate / 100));
        return {
          division: div,
          salesValue: dSales,
          collectedValue: dColl,
          count: d.count,
          realizationRate,
        };
      })
      .sort((a, b) => b.salesValue - a.salesValue);

    // ── 14. Radar Metric Scores ───────────────────────────────
    const realizationScore = Math.min(100, Math.round(realizationRate));
    const agingHealthScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(100 - (overdueAmount / Math.max(1, pendingBalance)) * 100)
      )
    );
    const velocityScore = Math.max(0, Math.min(100, 100 - avgDSO));
    const coverageScore = Math.min(
      100,
      customerLedger.length > 0
        ? Math.round(
          (customerLedger.filter((c) => c.realizationRate > 0).length /
            customerLedger.length) *
          100
        )
        : 75
    );
    const regularityScore =
      trendData.length > 0
        ? Math.round(
          (trendData.filter((t) => t.collectedValue > 0).length /
            trendData.length) *
          100
        )
        : 80;
    const returnScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 -
          (totalSalesGross > 0
            ? (totalSalesReturns / totalSalesGross) * 100
            : 0)
        )
      )
    );

    return NextResponse.json({
      success: true,
      summary: {
        totalSalesOrderValue: Math.round(totalSalesGross),
        totalSalesReturns: Math.round(totalSalesReturns),
        netSales: Math.round(netSales),
        totalCollections: Math.round(totalCollections),
        realizationRate,
        pendingBalance: Math.round(pendingBalance),
        overdueAmount: Math.round(overdueAmount),
        watchlistAmount: Math.round(watchlistAmount),
        avgDSO,
        salesOrderCount,
        customerCount: customerLedger.length,
      },
      trendData,
      paymentModes,
      agingBuckets,
      divisionPerformance,
      customerLedger,
      orderLedger: filteredOrderLedger.slice(0, 300),
      stateData,
      availableAreas: Array.from(availableAreasSet).filter(Boolean).sort(),
      availableAsms: Array.from(availableAsmsSet).filter(Boolean).sort(),
      availableDivisions: Array.from(availableDivisionsSet).filter(Boolean).sort(),
      radarScores: {
        realizationScore,
        velocityScore,
        agingHealthScore,
        coverageScore,
        regularityScore,
        returnScore,
      },
      meta: {
        startDate: startDateStr,
        endDate: endDateStr,
        companyId: companyIdParam,
        fyId: fyIdParam,
        range,
        reportType,
      },
    });
  } catch (error: any) {
    console.error("Sales vs Collection API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
