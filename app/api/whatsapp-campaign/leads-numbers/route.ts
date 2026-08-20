import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Lead from "@/models/Lead";
import Customer from "@/models/Customer";

export const runtime = "nodejs";

function normalizePhoneNumber(raw: string): string {
  let cleaned = (raw || "").replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }
  return cleaned;
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source") || "all"; // "leads" | "customers" | "all"

    let leadsNumbers: { name: string; phone: string; type: string }[] = [];
    let customerNumbers: { name: string; phone: string; type: string }[] = [];

    if (source === "leads" || source === "all") {
      const leads = await Lead.find(
        {
          $or: [
            { whatsapp: { $exists: true, $ne: "" } },
            { phone: { $exists: true, $ne: "" } },
          ],
        },
        "partyName whatsapp phone leadType"
      ).lean();

      leadsNumbers = (leads as any[]).map((l) => ({
        name: l.partyName || "Lead",
        phone: normalizePhoneNumber(l.whatsapp || l.phone),
        type: `Lead (${l.leadType || "General"})`,
      })).filter((x) => x.phone.length >= 10 && x.phone.length <= 15);
    }

    if (source === "customers" || source === "all") {
      try {
        const customers = await Customer.find(
          {},
          "party_name partyname mobile phone telephone contact"
        )
          .limit(500)
          .lean();

        customerNumbers = (customers as any[]).map((c) => {
          const rawNum = c.mobile || c.phone || c.telephone || c.contact || "";
          return {
            name: c.party_name || c.partyname || "Customer",
            phone: normalizePhoneNumber(String(rawNum)),
            type: "Customer",
          };
        }).filter((x) => x.phone.length >= 10 && x.phone.length <= 15);
      } catch (custErr) {
        console.warn("Could not query Customer collection:", custErr);
      }
    }

    const combined = [...leadsNumbers, ...customerNumbers];

    // Deduplicate by phone
    const seen = new Set<string>();
    const unique = combined.filter((item) => {
      if (!seen.has(item.phone)) {
        seen.add(item.phone);
        return true;
      }
      return false;
    });

    return NextResponse.json({
      success: true,
      total: unique.length,
      leadsCount: leadsNumbers.length,
      customersCount: customerNumbers.length,
      contacts: unique,
    });
  } catch (err: any) {
    console.error("LEADS NUMBERS FETCH ERROR:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load CRM contacts" },
      { status: 500 }
    );
  }
}
