import connectDB from "@/lib/mongodb";
import VoucherSeries from "@/models/VoucherSeries";

/**
 * Formats a voucher number given prefix, number, padding, suffix
 */
export function formatVoucherNumber(prefix: string, num: number, padding: number, suffix: string): string {
  const padded = String(num).padStart(padding || 5, "0");
  return `${prefix || ""}${padded}${suffix || ""}`;
}

/**
 * Gets or initializes default series for a given voucher type
 */
export async function getActiveVoucherSeries(voucherType: "SALES" | "PROFORMA" | "PURCHASE" | "RETURN") {
  await connectDB();

  let series = await VoucherSeries.findOne({
    voucherType,
    status: "Active",
    isDefault: true,
  });

  if (!series) {
    series = await VoucherSeries.findOne({
      voucherType,
      status: "Active",
    });
  }

  // Seed default if none exists
  if (!series) {
    const defaults = {
      SALES: { seriesName: "Default Tax Invoice Series", prefix: "INV-", nextNumber: 1001, padding: 5 },
      PROFORMA: { seriesName: "Default Proforma Series", prefix: "PRF-", nextNumber: 1001, padding: 5 },
      PURCHASE: { seriesName: "Default Purchase Series", prefix: "PUR-", nextNumber: 1001, padding: 5 },
      RETURN: { seriesName: "Default Return Series", prefix: "RET-", nextNumber: 1001, padding: 5 },
    };

    const d = defaults[voucherType] || defaults.SALES;

    series = await VoucherSeries.create({
      seriesName: d.seriesName,
      voucherType,
      prefix: d.prefix,
      suffix: "",
      nextNumber: d.nextNumber,
      padding: d.padding,
      isDefault: true,
      status: "Active",
    });
  }

  return series;
}

/**
 * Previews the next voucher number without incrementing
 */
export async function peekNextVoucherNumber(voucherType: "SALES" | "PROFORMA" | "PURCHASE" | "RETURN"): Promise<string> {
  const series = await getActiveVoucherSeries(voucherType);
  return formatVoucherNumber(series.prefix, series.nextNumber, series.padding, series.suffix);
}

/**
 * Atomically generates and increments the next voucher number for given type
 */
export async function consumeNextVoucherNumber(voucherType: "SALES" | "PROFORMA" | "PURCHASE" | "RETURN"): Promise<string> {
  await connectDB();
  const series = await getActiveVoucherSeries(voucherType);

  const vcn = formatVoucherNumber(series.prefix, series.nextNumber, series.padding, series.suffix);

  // Increment series nextNumber
  await VoucherSeries.updateOne(
    { _id: series._id },
    { $inc: { nextNumber: 1 } }
  );

  return vcn;
}
