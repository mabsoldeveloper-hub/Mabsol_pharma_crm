import MrTerritory from "@/models/MrTerritory";
import Customer from "@/models/Customer";
import SalesDis from "@/models/SalesDis";
import SalesMdis from "@/models/SalesMdis";
import { getCurrentUser } from "@/lib/auth";

export interface MrTerritoryRestriction {
    isMrRestricted: boolean;
    allowedCompanyCodes: string[] | null; // null means unrestricted (Admin or non-MR)
    allowedOrdnos: string[] | null;       // null means unrestricted
}

/**
 * Resolves MR Territory restrictions for the currently logged-in user.
 * - Admin users get unrestricted access (`isMrRestricted = false`).
 * - Non-admin users with active `MrTerritory` records get restricted access to their allowed company codes and matched customer party codes (`allowedOrdnos`).
 */
export async function getMrTerritoryRestriction(): Promise<MrTerritoryRestriction> {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return { isMrRestricted: false, allowedCompanyCodes: null, allowedOrdnos: null };
        }

        const roleName = String(user.roleId?.roleName || "").trim().toLowerCase();

        // Admin role users get FULL access to all data
        if (roleName.includes("admin")) {
            return { isMrRestricted: false, allowedCompanyCodes: null, allowedOrdnos: null };
        }

        // Non-admin: check active territories
        const territories = await MrTerritory.find(
            { userId: user._id, status: "Active" },
            { companyCode: 1 }
        );

        if (!territories || territories.length === 0) {
            return { isMrRestricted: false, allowedCompanyCodes: null, allowedOrdnos: null };
        }

        const allowedCompanyCodes = Array.from(
            new Set(territories.map((t: any) => String(t.companyCode || "").trim()))
        ).filter(Boolean);

        const userName = String(user.name || "").trim();
        const empCode = String(user.employeeCode || "").trim();

        const dsmConditions: any[] = [];
        if (userName) dsmConditions.push({ DSM: { $regex: userName, $options: "i" } });
        if (empCode) dsmConditions.push({ DSM: { $regex: empCode, $options: "i" } });

        const [disCodes, mdisCodes, directOrdnos] = await Promise.all([
            SalesDis.distinct("CODEP", { COMPANY: { $in: allowedCompanyCodes } }),
            SalesMdis.distinct("CODEP", { COMPANY: { $in: allowedCompanyCodes } }),
            Customer.distinct("ORDNO", {
                $or: [
                    { COMPANY: { $in: allowedCompanyCodes } },
                    { GCODE: { $in: allowedCompanyCodes } },
                    { SCODE: { $in: allowedCompanyCodes } },
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

        return {
            isMrRestricted: true,
            allowedCompanyCodes,
            allowedOrdnos,
        };
    } catch {
        return { isMrRestricted: false, allowedCompanyCodes: null, allowedOrdnos: null };
    }
}
