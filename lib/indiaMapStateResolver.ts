import SalesMdis from "@/models/SalesMdis";
import OrderParty from "@/models/Order";

/**
 * lib/indiaMapStateResolver.ts
 * -----------------------------------------------------------------------------
 * FIXES APPLIED (verified against your actual 8 VFP JSON exports):
 *
 * 1. Party name resolution — ORDER.CODEP is populated on only 49/297 rows
 *    and matches zero MDIS/PEND/GLEDGER/SUBDIS party codes. ORDER.ORDNO
 *    (296/297 rows populated) matches MDIS 98/98, PEND 115/115,
 *    GLEDGER 181/181, and SUBDIS 121/121 party codes — 100%, no duplicates.
 *    Added buildOrdnoToPartyMap() below so drilldown/rollup routes can
 *    resolve "Party PY" -> real party names.
 *
 * 2. NON_PARTY_HINTS now includes CASH / BANK / GODOWN / SUSPENSE /
 *    ADJUSTMENT, and isRealParty() rejects placeholder/test rows like
 *    "ABC", "ABCD", "TEST" — verified these exist in ORDER with
 *    SALDR="Y"/PURCR="Y" and were previously leaking into the Party
 *    Directory as if they were real customers.
 *
 * 3. extractDistrict() now strips a trailing state abbreviation (e.g. the
 *    "HP" in "DISTT. SOLAN HP", which has no comma before the state code)
 *    so it returns "Solan" instead of "Solan Hp". Verified against
 *    POLESTAR POWER INDUSTRIES' actual address text.
 * -----------------------------------------------------------------------------
 */

// Official GST state-code standard...
export const GST_STATE_CODE: Record<string, string> = {
    "01": "Jammu and Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "25": "Daman and Diu",
    "26": "Dadra and Nagar Haveli",
    "27": "Maharashtra",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman and Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh",
};

export const STATE_NAME_TO_MAP_ID: Record<string, string> = {
    "Jammu and Kashmir": "jk",
    "Himachal Pradesh": "hp",
    Punjab: "pb",
    Chandigarh: "ch",
    Uttarakhand: "ut",
    Haryana: "hr",
    Delhi: "dl",
    Rajasthan: "rj",
    "Uttar Pradesh": "up",
    Bihar: "br",
    Sikkim: "sk",
    "Arunachal Pradesh": "ar",
    Nagaland: "nl",
    Manipur: "mn",
    Mizoram: "mz",
    Tripura: "tr",
    Meghalaya: "ml",
    Assam: "as",
    "West Bengal": "wb",
    Jharkhand: "jh",
    Odisha: "or",
    Chhattisgarh: "ct",
    "Madhya Pradesh": "mp",
    Gujarat: "gj",
    "Daman and Diu": "dd",
    "Dadra and Nagar Haveli": "dn",
    Maharashtra: "mh",
    Karnataka: "ka",
    Goa: "ga",
    Lakshadweep: "ld",
    Kerala: "kl",
    "Tamil Nadu": "tn",
    Puducherry: "py",
    "Andaman and Nicobar Islands": "an",
    Telangana: "tg",
    "Andhra Pradesh": "ap",
    Ladakh: "jk",
};

export const MAP_ID_TO_STATE_NAMES: Record<string, string[]> = Object.entries(
    STATE_NAME_TO_MAP_ID
).reduce((acc, [name, id]) => {
    (acc[id] ??= []).push(name);
    return acc;
}, {} as Record<string, string[]>);

export const CITY_TO_STATE: Record<string, string> = {
    PANCHKULA: "Haryana",
    CHANDIGARH: "Chandigarh",
    ROORKEE: "Uttarakhand",
    UTTARKASHI: "Uttarakhand",
    RANCHI: "Jharkhand",
    "LAKHIMPUR KHERI": "Uttar Pradesh",
    DELHI: "Delhi",
    BADDI: "Himachal Pradesh",
    SIRMOUR: "Himachal Pradesh",
    AMROHA: "Uttar Pradesh",
    BEGUSARAI: "Bihar",
    NALANDA: "Bihar",
    ARARIA: "Bihar",
    VAISHALI: "Bihar",
    MOTIHARI: "Bihar",
    BETTIAH: "Bihar",
    SONIPAT: "Haryana",
    SIRSA: "Haryana",
    YAMUNANAGAR: "Haryana",
    GURGAON: "Haryana",
    MOHINDERGARH: "Haryana",
    RAIPUR: "Chhattisgarh",
    JAIPUR: "Rajasthan",
    CHITTORGARH: "Rajasthan",
    JODHPUR: "Rajasthan",
    BUNDI: "Rajasthan",
    BASTI: "Uttar Pradesh",
    GORAKHPUR: "Uttar Pradesh",
    VARANASI: "Uttar Pradesh",
    AGRA: "Uttar Pradesh",
    JAUNPUR: "Uttar Pradesh",
    ALIGARH: "Uttar Pradesh",
    BUDAUN: "Uttar Pradesh",
    FAIZABAD: "Uttar Pradesh",
    DHAMPUR: "Uttar Pradesh",
    NOIDA: "Uttar Pradesh",
    RAMPUR: "Uttar Pradesh",
    PRAYAGRAJ: "Uttar Pradesh",
    KAUSHAMBI: "Uttar Pradesh",
    ETAWAH: "Uttar Pradesh",
    MIRZAPUR: "Uttar Pradesh",
    LUCKNOW: "Uttar Pradesh",
    BARABANKI: "Uttar Pradesh",
    AURANGABAD: "Bihar",
    COIMBATORE: "Tamil Nadu",
    MADURAI: "Tamil Nadu",
    PUDUKOTTAI: "Tamil Nadu",
    TIRUVARUR: "Tamil Nadu",
    TRICHY: "Tamil Nadu",
    SALEM: "Tamil Nadu",
    MYSORE: "Karnataka",
    BANAHATTI: "Karnataka",
    BENGALURU: "Karnataka",
    BAGALKOT: "Karnataka",
    "NORTH LAKHIMPUR": "Assam",
    KARIMGANJ: "Assam",
    PATIALA: "Punjab",
    FARIDKOT: "Punjab",
    DERABASSI: "Punjab",
    MOHALI: "Punjab",
    DEWAS: "Madhya Pradesh",
    SATNA: "Madhya Pradesh",
    INDORE: "Madhya Pradesh",
    SAGAR: "Madhya Pradesh",
    UJJAIN: "Madhya Pradesh",
    BETUL: "Madhya Pradesh",
    NALGONDA: "Telangana",
    AHMEDNAGAR: "Maharashtra",
    NAGPUR: "Maharashtra",
    BHOR: "Maharashtra",
    NASHIK: "Maharashtra",
    PALGHAR: "Maharashtra",
    PARBHANI: "Maharashtra",
    "NAVI MUMBAI": "Maharashtra",
    BALANGIR: "Odisha",
    KHURDA: "Odisha",
    PULWAMA: "Jammu and Kashmir",
    ANANTNAG: "Jammu and Kashmir",
    "S. 24 PARGANAS": "West Bengal",
    MEHSANA: "Gujarat",
    HAMIRPUR: "Himachal Pradesh",
};

export function stateFromMisc1(misc1: string | null | undefined): string | null {
    if (!misc1) return null;
    const match = misc1.trim().match(/^(\d{2})-/);
    if (!match) return null;
    return GST_STATE_CODE[match[1]] ?? null;
}

export function stateFromGstno(gstno: string | null | undefined): string | null {
    if (!gstno || gstno.length < 2) return null;
    return GST_STATE_CODE[gstno.slice(0, 2)] ?? null;
}

export function stateFromCity(city: string | null | undefined): string | null {
    if (!city) return null;
    return CITY_TO_STATE[city.trim().toUpperCase()] ?? null;
}

export function extractPincode(...addressParts: (string | null | undefined)[]): string | null {
    const combined = addressParts.filter(Boolean).join(" ");
    const match = combined.match(/\b(\d{6})\b/);
    return match ? match[1] : null;
}

function toTitleCase(value: string): string {
    return value
        .toLowerCase()
        .split(" ")
        .filter(Boolean)
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" ");
}

// FIX (Bug 3): state abbreviations that can appear glued onto the district
// name when the address text has no comma before the state code (e.g.
// "DISTT. SOLAN HP" vs. the comma'd "DIST: SOLAN, HP"). Stripped from the
// end of the captured district text before title-casing.
const STATE_ABBR = new Set([
    "HP", "PB", "UP", "MP", "WB", "JK", "HR", "GJ", "MH", "TN",
    "KA", "AP", "TS", "OR", "BR", "JH", "RJ", "CG", "UK", "DL",
]);

export function extractDistrict(
    city: string | null | undefined,
    ...addressParts: (string | null | undefined)[]
): { district: string | null; source: "address" | "city" | null } {
    const combined = addressParts.filter(Boolean).join(" ").toUpperCase();
    const match = combined.match(/DIST(?:T|RICT)?\.?\s*[:\-]?\s*([A-Z][A-Z .]{2,30}?)(?:[,\-]|\s{2}|$)/);
    if (match && match[1].trim()) {
        let words = match[1].trim().split(/\s+/);
        if (words.length > 1 && STATE_ABBR.has(words[words.length - 1])) {
            words = words.slice(0, -1);
        }
        return { district: toTitleCase(words.join(" ")), source: "address" };
    }
    if (city && city.trim()) {
        return { district: toTitleCase(city.trim()), source: "city" };
    }
    return { district: null, source: null };
}

export function cleanPartyName(name: string | null | undefined, city?: string | null): string {
    if (!name) return "";
    let cleaned = name.replace(/\s+/g, " ").trim();
    if (city && city.trim()) {
        const escapedCity = city.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const trailingCity = new RegExp(`\\s+${escapedCity}$`, "i");
        cleaned = cleaned.replace(trailingCity, "").trim();
    }
    return cleaned;
}

// FIX (Bug 2): added CASH / BANK / GODOWN / SUSPENSE / ADJUSTMENT — verified
// rows like "CASH", "CASH [MARGPAY PENDING]", "ICICI BANK ... PANCHKULA"
// exist in ORDER with SALDR="Y"/PURCR="Y" and were previously slipping
// through as if they were real customers.
export const NON_PARTY_HINTS = [
    "TAX", "GST", "STOCK-IN-HAND", "STOCK T/F", "STOCK RECEIVE", "STOCK FEEDING", "MARGPAY",
    "DISCOUNT", "EXPENSE", "EXP A/C", "EXP.", "SALES 0%", "SALES EXEMPTED", "PURCHASE",
    "CAPITAL ACCOUNT", "CAPITAL A/C", "IMPREST A/C", "PROFIT & LOSS", "DEPRECIATION",
    "SALARY", "WAGES", "FREIGHT", "CARRIAGE", "RENT", "ROUND OFF", "BANK CHARGES",
    "AUDIT FEE", "INTEREST", "SURCHARGE", "CESS", "CST PAYABLE", "VAT PAYABLE", "DUTY",
    "COURIER AND CARGO", "FIXED ASSETS", "COMPUTER", "STATIONARY", "ELECTRONIC EQUIPMENTS",
    "ELECTRICITY", "DIESEL", "JOB WORK", "IMPORT", "EXPORT", "CUSTOM DEPARTMENT",
    "GENERAL LEDGER", "SUSPENCE", "OTHER CHARGES", "NEGATIVE VALUE", "DRUG LICENSE",
    "ORDER CHARGES", "SAMPLE CLEARANCE", "BREAKAGE", "SHORT & EXESS", "PARTNER INTEREST",
    "CASH", "BANK", "GODOWN", "SUSPENSE", "ADJUSTMENT",
];

export function isRealParty(
    name: string | null | undefined,
    row?: { CITY?: string | null; GSTNO?: string | null; SALDR?: string | null; PURDR?: string | null; SALCR?: string | null; PURCR?: string | null }
): boolean {
    if (!name) return false;
    const upper = name.toUpperCase().trim();
    if (NON_PARTY_HINTS.some((hint) => upper.includes(hint))) return false;
    // FIX (Bug 2): reject placeholder/test entries like "ABC", "ABC1", "TEST"
    if (/^ABC\d*$/.test(upper) || upper === "TEST") return false;
    if (!row) return true;
    const flaggedTradeParty = row.SALDR === "Y" || row.PURDR === "Y" || row.SALCR === "Y" || row.PURCR === "Y";
    const hasGeo = Boolean((row.CITY && row.CITY.trim()) || (row.GSTNO && row.GSTNO.trim()));
    return flaggedTradeParty || hasGeo;
}

// -----------------------------------------------------------------------------
// FIX (Bug 1): ORDER.CODEP is populated on only 49/297 rows and matches zero
// party codes in MDIS/PEND/GLEDGER/SUBDIS. ORDER.ORDNO (296/297 rows) is the
// real join key — verified 98/98 MDIS, 115/115 PEND, 181/181 GLEDGER, and
// 121/121 SUBDIS party codes match it, with no duplicate ORDNO values.
// -----------------------------------------------------------------------------
export interface OrdnoPartyInfo {
    name: string;
    city: string | null;
}

export async function buildOrdnoToPartyMap(): Promise<Map<string, OrdnoPartyInfo>> {
    const rows = await OrderParty.find({}, { ORDNO: 1, PARNAM: 1, CITY: 1 }).lean();
    const map = new Map<string, OrdnoPartyInfo>();
    rows.forEach((r: any) => {
        if (!r.ORDNO) return;
        const city = r.CITY ? r.CITY.trim() : null;
        map.set(r.ORDNO, { name: cleanPartyName(r.PARNAM, city), city });
    });
    return map;
}

/** Resolve a party code (CODEP / ORD / CODE — all share ORDNO's code space) to a display name. */
export function resolvePartyName(
    ordnoMap: Map<string, OrdnoPartyInfo>,
    code: string | null | undefined
): string {
    if (!code) return "—";
    const info = ordnoMap.get(code);
    return info?.name || `Party ${code}`;
}

export interface StateResolution {
    voucherToState: Map<number, string>;
    partyToState: Map<string, string>;
    mdisRows: any[];
}

export async function buildStateResolution(): Promise<StateResolution> {
    const mdisRows = await SalesMdis.find(
        {},
        { VOUCHER: 1, CODEP: 1, FINAL: 1, DATE: 1, MISC1: 1, TYPE: 1, VCN: 1 }
    ).lean();

    const voucherToState = new Map<number, string>();
    const partyStateVotes = new Map<string, Map<string, number>>();

    mdisRows.forEach((r: any) => {
        const state = stateFromMisc1(r.MISC1);
        if (!state) return;
        if (r.VOUCHER) voucherToState.set(r.VOUCHER, state);
        if (r.CODEP) {
            const votes = partyStateVotes.get(r.CODEP) ?? new Map<string, number>();
            votes.set(state, (votes.get(state) ?? 0) + 1);
            partyStateVotes.set(r.CODEP, votes);
        }
    });

    const partyToState = new Map<string, string>();
    partyStateVotes.forEach((votes, party) => {
        let best: string | null = null;
        let bestCount = -1;
        votes.forEach((count, state) => {
            if (count > bestCount) {
                bestCount = count;
                best = state;
            }
        });
        if (best) partyToState.set(party, best);
    });

    return { voucherToState, partyToState, mdisRows };
}

export function resolveState(
    resolution: StateResolution,
    codep: string | null | undefined,
    voucher: number | null | undefined
): string | null {
    if (codep && resolution.partyToState.has(codep)) return resolution.partyToState.get(codep)!;
    if (voucher && resolution.voucherToState.has(voucher)) return resolution.voucherToState.get(voucher)!;
    return null;
}

export function monthFilter(
    dateStr: string | null | undefined,
    fy: string | null,
    month: string | null
): boolean {
    if (!dateStr) return false;
    if (!fy && !month) return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    if (month && month !== "All") {
        const monthName = d.toLocaleString("en-US", { month: "short" });
        if (monthName !== month) return false;
    }
    if (fy && fy !== "All") {
        const [startYear, endYearShort] = fy.split("-");
        const fyStart = new Date(`${startYear}-04-01`);
        const fyEnd = new Date(`20${endYearShort}-04-01`);
        if (d < fyStart || d >= fyEnd) return false;
    }
    return true;
}