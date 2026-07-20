import { SalesMdis } from "@/models/IndiaMapModels";

/**
 * lib/indiaMapStateResolver.ts
 * -----------------------------------------------------------------------------
 * State-resolution logic shared by:
 *   - app/api/dashboard/india-map/route.ts             (national rollup)
 *   - app/api/dashboard/india-map/[state]/route.ts      (per-state drill-down)
 *   - app/api/dashboard/india-map/parties/route.ts      (full Party Directory)
 *
 * Pulled out into one file so both routes resolve state EXACTLY the same
 * way — previously the drill-down route didn't exist at all, which meant
 * there was no shared source of truth for "which state does this CODEP /
 * VOUCHER belong to".
 *
 * NEW IN THIS VERSION — City / District / Pincode
 *   Checked all 8 of your VFP exports again: none of them (MDIS, DIS,
 *   SUBDIS, PEND, GLEDGER, PRO, PROBAT, ORDER) has a dedicated DISTRICT or
 *   PINCODE column. ORDER has CITY as its own field (reliable), but District
 *   and Pincode only exist as free text buried inside ORDER.PARADD /
 *   PARADD1 / PARADD2, e.g.:
 *     "N.T. ROAD, WARD NO. 14, PO - KHELMATI,"
 *     "PS - NORTH LAKHIMPUR, DISTT. NORTH LAKHIMPUR"
 *     "ASSAM - 787001"
 *   extractPincode() / extractDistrict() below pull those two values out of
 *   that free text on a best-effort basis (see each function's comment for
 *   exactly how, and where it falls back). They are NOT guaranteed-accurate
 *   VFP columns — they're parsed, so treat them as "best available" rather
 *   than authoritative master data.
 * -----------------------------------------------------------------------------
 */

// Official GST state-code standard — decodes the 2-digit prefix present in
// MDIS.MISC1 ("06-HARYANA") and in the first 2 digits of ORDER.GSTNO.
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

// Full state name -> lowercase id used by the @svg-maps/india path data in
// india-map-data.ts. Ladakh has no separate path in the base map, so it's
// folded into "jk" visually (it still keeps its own name/GST code in data).
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

// Reverse lookup: map id -> every state name that visually folds into it.
export const MAP_ID_TO_STATE_NAMES: Record<string, string[]> = Object.entries(
    STATE_NAME_TO_MAP_ID
).reduce((acc, [name, id]) => {
    (acc[id] ??= []).push(name);
    return acc;
}, {} as Record<string, string[]>);

/**
 * Best-effort CITY -> state map, built only from the city names that
 * actually appear in your ORDER.CITY column (81 distinct values) — used ONLY
 * as a fallback for ORDER rows that have no GSTNO to decode. A handful of
 * Indian city names are ambiguous across states (flagged inline below);
 * everything else is unambiguous.
 */
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
    // "AURANGABAD" appears both in Maharashtra and Bihar — best guess given
    // the other Bihar cities in this dataset; confirm with the source system.
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
    // "HAMIRPUR" exists in both Himachal Pradesh and Uttar Pradesh — best
    // guess given the other Himachal cities in this dataset.
    HAMIRPUR: "Himachal Pradesh",
};

/** Parses "06-HARYANA" / "09-UTTAR PRADES" (VFP-truncated) -> "Haryana" / "Uttar Pradesh" */
export function stateFromMisc1(misc1: string | null | undefined): string | null {
    if (!misc1) return null;
    const match = misc1.trim().match(/^(\d{2})-/);
    if (!match) return null;
    return GST_STATE_CODE[match[1]] ?? null;
}

/** Decodes a full 15-char GSTIN's leading 2-digit state code, e.g. ORDER.GSTNO */
export function stateFromGstno(gstno: string | null | undefined): string | null {
    if (!gstno || gstno.length < 2) return null;
    return GST_STATE_CODE[gstno.slice(0, 2)] ?? null;
}

/** Fallback for ORDER rows with no usable GSTNO: match by city name. */
export function stateFromCity(city: string | null | undefined): string | null {
    if (!city) return null;
    return CITY_TO_STATE[city.trim().toUpperCase()] ?? null;
}

/**
 * Extracts a 6-digit Indian PIN code out of ORDER's free-text address lines
 * (PARADD / PARADD1 / PARADD2 — pass as many as you have, in any order).
 * There's no dedicated PINCODE column in this export, so this is a regex
 * over the concatenated address text (e.g. "…RANCHI, JHARKHAND - 834007"
 * -> "834007"). Returns null if no 6-digit run is found.
 */
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

/**
 * Best-effort DISTRICT for an ORDER party row.
 *
 * VFP address text sometimes spells the district out explicitly, e.g.
 * "…PS - NORTH LAKHIMPUR, DISTT. NORTH LAKHIMPUR" -> "North Lakhimpur". When
 * that pattern is present we use it (source: "address").
 *
 * There is no separate district column in this export, so when the pattern
 * isn't present we fall back to CITY itself (source: "city") — true for the
 * large majority of the towns in this dataset (Ranchi city == Ranchi
 * district, Jaunpur city == Jaunpur district, etc.) but NOT guaranteed for
 * every row, since a handful of Indian cities sit inside a differently-named
 * district. The returned `source` tells the caller which case it was, so
 * the UI can show the fallback a little lighter / with a tooltip if it
 * wants to be transparent about the guess.
 */
export function extractDistrict(
    city: string | null | undefined,
    ...addressParts: (string | null | undefined)[]
): { district: string | null; source: "address" | "city" | null } {
    const combined = addressParts.filter(Boolean).join(" ").toUpperCase();
    const match = combined.match(/DIST(?:T|RICT)?\.?\s*[:\-]?\s*([A-Z][A-Z .]{2,30}?)(?:[,\-]|\s{2}|$)/);
    if (match && match[1].trim()) {
        return { district: toTitleCase(match[1].trim()), source: "address" };
    }
    if (city && city.trim()) {
        return { district: toTitleCase(city.trim()), source: "city" };
    }
    return { district: null, source: null };
}

// ---- Shared ORDER "is this row a real party?" filter ----
// ORDER also holds chart-of-accounts heads (tax accounts, stock account,
// discount heads, etc.) alongside genuine customer/supplier ledgers. This
// heuristic keeps that filtering logic in one place instead of copy-pasted
// across every route that reads ORDER.
export const NON_PARTY_HINTS = ["TAX", "GST", "STOCK-IN-HAND", "MARGPAY", "DISCOUNT", "EXPENSE", "SALES 0%", "PURCHASE"];

export function isRealParty(name: string | null | undefined): boolean {
    if (!name) return false;
    const upper = name.toUpperCase();
    return !NON_PARTY_HINTS.some((hint) => upper.includes(hint));
}

export interface StateResolution {
    voucherToState: Map<number, string>;
    partyToState: Map<string, string>;
    /** raw MDIS rows already fetched, so callers don't have to hit Mongo twice */
    mdisRows: any[];
}

/**
 * Scans MDIS once and builds the two lookup maps every other table joins
 * against: VOUCHER -> state (used when a row has no party code of its own)
 * and CODEP -> state (mode of that party's own MDIS rows — a party is
 * treated as being "in" whichever state its invoices most often show).
 */
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

/** Resolves a row's state given its own party code first, voucher second. */
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