import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getEnrichedParties, UNASSIGNED } from "@/lib/areaMasterData";
import AreaMaster from "@/models/AreaMaster";

export async function GET() {
  await connectDB();

  const [parties, customAreas] = await Promise.all([
    getEnrichedParties(),
    AreaMaster.find({}).lean(),
  ]);

  const customAreaMap = new Map<string, any>();
  customAreas.forEach((ca: any) => {
    if (ca.areaName) {
      customAreaMap.set(ca.areaName.trim(), ca);
    }
  });

  // ---- Group enriched parties by AREA ---------------------------------
  const areaMap = new Map<string, any>();

  // Initialize with custom created areas
  for (const ca of customAreas as any[]) {
    if (!ca.areaName) continue;
    const name = ca.areaName.trim();
    areaMap.set(name, {
      AREA: name,
      PRICE: ca.PRICE || "RATEF",
      AREASOURCECOUNTS: { area: 1, district: 0, city: 0, unassigned: 0 } as Record<string, number>,
      CITYSET: new Set<string>(ca.city ? [ca.city] : []),
      DISTRICTSET: new Set<string>(),
      PINCODESET: new Set<string>(),
      STATESET: new Set<string>(ca.state ? [ca.state] : []),
      DSMSET: new Set<string>(),
      RSMSET: new Set<string>(),
      ASMSET: new Set<string>(),
      ROUTESET: new Set<string>(),
      TOTALCUSTOMERS: 0,
      ACTIVECUSTOMERS: 0,
      INACTIVECUSTOMERS: 0,
      UNKNOWNSTATUSCUSTOMERS: 0,
      BUYERCOUNT: 0,
      SUPPLIERCOUNT: 0,
      GSTCOUNT: 0,
      NOGSTCOUNT: 0,
      PHONECOUNT: 0,
      NOPHONECOUNT: 0,
      TOTALOUTSTANDING: 0,
      TOTALCREDITBAL: 0,
      TOTALCREDITLIMIT: 0,
      TOTALSALES: 0,
      SALECOUNT: 0,
      LASTSALEDATE: null as Date | null,
      TOTALPURCHASE: 0,
      PURCHASECOUNT: 0,
      LASTPURCHASEDATE: null as Date | null,
      LEDGERDEBIT: 0,
      LEDGERCREDIT: 0,
      LEDGERTXNCOUNT: 0,
      LASTLEDGERDATE: null as Date | null,
    });
  }

  for (const row of parties) {
    if (!areaMap.has(row.area)) {
      const ca = customAreaMap.get(row.area);
      areaMap.set(row.area, {
        AREA: row.area,
        PRICE: ca?.PRICE || "",
        AREASOURCECOUNTS: { area: 0, district: 0, city: 0, unassigned: 0 } as Record<string, number>,
        CITYSET: new Set<string>(),
        DISTRICTSET: new Set<string>(),
        PINCODESET: new Set<string>(),
        STATESET: new Set<string>(),
        DSMSET: new Set<string>(),
        RSMSET: new Set<string>(),
        ASMSET: new Set<string>(),
        ROUTESET: new Set<string>(),
        TOTALCUSTOMERS: 0,
        ACTIVECUSTOMERS: 0,
        INACTIVECUSTOMERS: 0,
        UNKNOWNSTATUSCUSTOMERS: 0,
        BUYERCOUNT: 0,
        SUPPLIERCOUNT: 0,
        GSTCOUNT: 0,
        NOGSTCOUNT: 0,
        PHONECOUNT: 0,
        NOPHONECOUNT: 0,
        TOTALOUTSTANDING: 0,
        TOTALCREDITBAL: 0,
        TOTALCREDITLIMIT: 0,
        TOTALSALES: 0,
        SALECOUNT: 0,
        LASTSALEDATE: null as Date | null,
        TOTALPURCHASE: 0,
        PURCHASECOUNT: 0,
        LASTPURCHASEDATE: null as Date | null,
        LEDGERDEBIT: 0,
        LEDGERCREDIT: 0,
        LEDGERTXNCOUNT: 0,
        LASTLEDGERDATE: null as Date | null,
      });
    }

    const a = areaMap.get(row.area);

    a.AREASOURCECOUNTS[row.areaSource] = (a.AREASOURCECOUNTS[row.areaSource] || 0) + 1;

    if (row.city) a.CITYSET.add(row.city);
    if (row.district) a.DISTRICTSET.add(row.district);
    if (row.pincode) a.PINCODESET.add(row.pincode);
    if (row.state) a.STATESET.add(row.state);
    row.dsmList.forEach((d: string) => a.DSMSET.add(d));
    if (row.rsm) a.RSMSET.add(row.rsm);
    if (row.asm) a.ASMSET.add(row.asm);
    if (row.rout) a.ROUTESET.add(row.rout);

    a.TOTALCUSTOMERS += 1;
    if (row.status === "Y") a.ACTIVECUSTOMERS += 1;
    else if (row.status === "N") a.INACTIVECUSTOMERS += 1;
    else a.UNKNOWNSTATUSCUSTOMERS += 1;

    if (row.isBuyer) a.BUYERCOUNT += 1;
    if (row.isSupplier) a.SUPPLIERCOUNT += 1;

    if (row.hasGst) a.GSTCOUNT += 1;
    else a.NOGSTCOUNT += 1;

    if (row.phone) a.PHONECOUNT += 1;
    else a.NOPHONECOUNT += 1;

    if (row.balance > 0) a.TOTALOUTSTANDING += row.balance;
    if (row.balance < 0) a.TOTALCREDITBAL += Math.abs(row.balance);
    a.TOTALCREDITLIMIT += row.limit;

    a.TOTALSALES += row.totalSales;
    a.SALECOUNT += row.saleCount;
    if (row.lastSaleDate && (!a.LASTSALEDATE || new Date(row.lastSaleDate) > new Date(a.LASTSALEDATE))) {
      a.LASTSALEDATE = row.lastSaleDate;
    }

    a.TOTALPURCHASE += row.totalPurchase;
    a.PURCHASECOUNT += row.purchaseCount;
    if (
      row.lastPurchaseDate &&
      (!a.LASTPURCHASEDATE || new Date(row.lastPurchaseDate) > new Date(a.LASTPURCHASEDATE))
    ) {
      a.LASTPURCHASEDATE = row.lastPurchaseDate;
    }

    a.LEDGERDEBIT += row.ledgerDebit;
    a.LEDGERCREDIT += row.ledgerCredit;
    a.LEDGERTXNCOUNT += row.ledgerTxnCount;
    if (
      row.lastLedgerDate &&
      (!a.LASTLEDGERDATE || new Date(row.lastLedgerDate) > new Date(a.LASTLEDGERDATE))
    ) {
      a.LASTLEDGERDATE = row.lastLedgerDate;
    }
    if (row.totalSales > (a.TOPPARTYSALES || 0)) {
      a.TOPPARTYSALES = row.totalSales;
      a.TOPPARTYNAME = row.name;
    }
  }

  // ---- Flatten to plain, serializable rows -------------------------------
  const result = Array.from(areaMap.values())
    .map((a) => {
      const ca = customAreaMap.get(a.AREA);
      const dominantSource = Object.entries(a.AREASOURCECOUNTS).sort((x: any, y: any) => y[1] - x[1])[0][0];

      const totalCust = a.TOTALCUSTOMERS || 1;
      const netBal = a.TOTALOUTSTANDING - a.TOTALCREDITBAL;
      const gstPct = Math.round((a.GSTCOUNT / totalCust) * 100);
      const phonePct = Math.round((a.PHONECOUNT / totalCust) * 100);

      return {
        _id: a.AREA,
        AREA: a.AREA,
        PRICE: ca?.PRICE || a.PRICE || "",
        AREASOURCE: dominantSource,

        CITY: Array.from(a.CITYSET).sort().join(", "),
        CITYCOUNT: a.CITYSET.size,
        DISTRICT: Array.from(a.DISTRICTSET).sort().join(", "),
        DISTRICTCOUNT: a.DISTRICTSET.size,
        PINCODE: Array.from(a.PINCODESET).sort().join(", "),
        PINCODECOUNT: a.PINCODESET.size,
        STATE: Array.from(a.STATESET).sort().join(", "),

        DSM: Array.from(a.DSMSET).sort().join(", "),
        RSM: Array.from(a.RSMSET).sort().join(", "),
        ASM: Array.from(a.ASMSET).sort().join(", "),
        ROUTECOUNT: a.ROUTESET.size,

        TOTALCUSTOMERS: a.TOTALCUSTOMERS,
        ACTIVECUSTOMERS: a.ACTIVECUSTOMERS,
        INACTIVECUSTOMERS: a.INACTIVECUSTOMERS,
        UNKNOWNSTATUSCUSTOMERS: a.UNKNOWNSTATUSCUSTOMERS,
        BUYERCOUNT: a.BUYERCOUNT,
        SUPPLIERCOUNT: a.SUPPLIERCOUNT,

        GSTCOUNT: a.GSTCOUNT,
        NOGSTCOUNT: a.NOGSTCOUNT,
        GSTPERCENT: gstPct,
        PHONECOUNT: a.PHONECOUNT,
        NOPHONECOUNT: a.NOPHONECOUNT,
        PHONEPERCENT: phonePct,

        TOTALOUTSTANDING: a.TOTALOUTSTANDING,
        TOTALCREDITBAL: a.TOTALCREDITBAL,
        NETBALANCE: netBal,
        AVGBALANCE: Math.round(netBal / totalCust),
        TOTALCREDITLIMIT: a.TOTALCREDITLIMIT,

        TOTALSALES: a.TOTALSALES,
        SALECOUNT: a.SALECOUNT,
        LASTSALEDATE: a.LASTSALEDATE,
        TOPPARTYNAME: a.TOPPARTYNAME || null,
        TOPPARTYSALES: a.TOPPARTYSALES || 0,

        TOTALPURCHASE: a.TOTALPURCHASE,
        PURCHASECOUNT: a.PURCHASECOUNT,
        LASTPURCHASEDATE: a.LASTPURCHASEDATE,

        LEDGERDEBIT: a.LEDGERDEBIT,
        LEDGERCREDIT: a.LEDGERCREDIT,
        LEDGERBALANCE: a.LEDGERDEBIT - a.LEDGERCREDIT,
        LEDGERTXNCOUNT: a.LEDGERTXNCOUNT,
        LASTLEDGERDATE: a.LASTLEDGERDATE,
      };
    })
    .sort((a, b) => {
      if (a.AREA === UNASSIGNED) return 1;
      if (b.AREA === UNASSIGNED) return -1;
      return a.AREA.localeCompare(b.AREA);
    });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const areaName = String(body.areaName || body.AREA || "").trim();
    const priceRate = String(body.PRICE || body.defaultRate || "RATEF").trim().toUpperCase();

    if (!areaName) {
      return NextResponse.json(
        { success: false, message: "Area Name is required" },
        { status: 400 }
      );
    }

    const existing = await AreaMaster.findOne({
      areaName: { $regex: `^${areaName}$`, $options: "i" },
    });

    if (existing) {
      existing.PRICE = priceRate;
      if (body.city) existing.city = body.city;
      if (body.state) existing.state = body.state;
      await existing.save();
      return NextResponse.json({
        success: true,
        message: "Area updated successfully",
        data: existing,
      });
    }

    const newArea = await AreaMaster.create({
      areaName,
      PRICE: priceRate,
      city: body.city || "",
      state: body.state || "",
      status: "Active",
    });

    return NextResponse.json(
      { success: true, message: "Area created successfully", data: newArea },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create area" },
      { status: 500 }
    );
  }
}