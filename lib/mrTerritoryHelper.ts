import MrTerritory from "@/models/MrTerritory";
import Customer from "@/models/Customer";
import SalesDis from "@/models/SalesDis";
import SalesMdis from "@/models/SalesMdis";
import { getCurrentUser } from "@/lib/auth";

export interface MrTerritoryRestriction {
    isMrRestricted: boolean;
    allowedCompanyCodes: string[] | null; // null means unrestricted (Admin or non-MR)
    allowedOrdnos: string[] | null;       // null means unrestricted
    allowedCompanyCodesSet: Set<string>;
    allowedOrdnosSet: Set<string>;
    companyRegexes: RegExp[];
    ordnoRegexes: RegExp[];
    isPartyAllowed: (party: any) => boolean;
}

/**
 * Resolves MR Territory restrictions for the currently logged-in user.
 * Handles VFP fixed-width whitespace padding gracefully with regex & trimmed set matching.
 */
export async function getMrTerritoryRestriction(): Promise<MrTerritoryRestriction> {
    const emptyUnrestricted: MrTerritoryRestriction = {
        isMrRestricted: false,
        allowedCompanyCodes: null,
        allowedOrdnos: null,
        allowedCompanyCodesSet: new Set(),
        allowedOrdnosSet: new Set(),
        companyRegexes: [],
        ordnoRegexes: [],
        isPartyAllowed: () => true,
    };

    try {
        const user = await getCurrentUser();
        if (!user) return emptyUnrestricted;

        const roleName = String(user.roleId?.roleName || "").trim().toLowerCase();

        // Admin role users get FULL access to all data
        if (roleName.includes("admin")) return emptyUnrestricted;

        // Non-admin: check active territories
        const territories = await MrTerritory.find(
            { userId: user._id, status: "Active" },
            { companyCode: 1 }
        );

        if (!territories || territories.length === 0) return emptyUnrestricted;

        const allowedCompanyCodes = Array.from(
            new Set(territories.map((t: any) => String(t.companyCode || "").trim()))
        ).filter(Boolean);

        const companyRegexes = allowedCompanyCodes.map(
            (c) => new RegExp("^" + c.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + "\\s*$", "i")
        );

        const userName = String(user.name || "").trim();
        const empCode = String(user.employeeCode || "").trim();

        const dsmConditions: any[] = [];
        if (userName) dsmConditions.push({ DSM: { $regex: userName, $options: "i" } });
        if (empCode) dsmConditions.push({ DSM: { $regex: empCode, $options: "i" } });

        const companyMatchQuery = {
            $in: [...allowedCompanyCodes, ...companyRegexes],
        };

        const [disCodes, mdisCodes, directOrdnos] = await Promise.all([
            SalesDis.distinct("CODEP", { COMPANY: companyMatchQuery }),
            SalesMdis.distinct("CODEP", { COMPANY: companyMatchQuery }),
            Customer.distinct("ORDNO", {
                $or: [
                    { COMPANY: companyMatchQuery },
                    { GCODE: companyMatchQuery },
                    { SCODE: companyMatchQuery },
                    ...(dsmConditions.length > 0 ? dsmConditions : []),
                ],
            }),
        ]);

        const allowedOrdnos = Array.from(
            new Set(
                [
                    ...disCodes.map((c: any) => String(c).trim()),
                    ...mdisCodes.map((c: any) => String(c).trim()),
                    ...directOrdnos.map((c: any) => String(c).trim()),
                ].filter(Boolean)
            )
        );

        const ordnoRegexes = allowedOrdnos.map(
            (code) => new RegExp("^" + code.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + "\\s*$", "i")
        );

        const allowedCompanyCodesSet = new Set(allowedCompanyCodes.map((c) => c.toLowerCase()));
        const allowedOrdnosSet = new Set(allowedOrdnos.map((c) => c.toLowerCase()));

        const dsmTerms = [userName, empCode].filter(Boolean);
        const userDsmRegex = dsmTerms.length > 0
            ? new RegExp(dsmTerms.map((t) => t.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")).join("|"), "i")
            : null;

        const isPartyAllowed = (party: any) => {
            if (!party) return false;
            const ordno = String(party.ORDNO || party.ordno || party.CODEP || party.codep || party.ORD || party.ord || party.code || party.CODE || "").trim().toLowerCase();
            const company = String(party.COMPANY || party.GCODE || party.SCODE || party.company || "").trim().toLowerCase();
            const dsm = String(party.DSM || party.dsm || "").trim();

            if (ordno && allowedOrdnosSet.has(ordno)) return true;
            if (company && allowedCompanyCodesSet.has(company)) return true;
            if (userDsmRegex && dsm && userDsmRegex.test(dsm)) return true;
            return false;
        };

        return {
            isMrRestricted: true,
            allowedCompanyCodes,
            allowedOrdnos,
            allowedCompanyCodesSet,
            allowedOrdnosSet,
            companyRegexes,
            ordnoRegexes,
            isPartyAllowed,
        };
    } catch {
        return emptyUnrestricted;
    }
}
