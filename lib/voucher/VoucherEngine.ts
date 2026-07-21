import SalesMdis from "@/models/SalesMdis";
import { loadSalesVoucher } from "./loaders/SalesLoader";



export async function getVoucher(voucher: number) {
  const header: any = await SalesMdis.findOne({
    VOUCHER: voucher,
  }).lean();

  if (!header) {
    throw new Error("Voucher not found");
  }

  switch (header.TYPE) {
    case "S":
      return loadSalesVoucher(header);

    case "P":
      return loadSalesVoucher(header);

    case "R":
      return loadSalesVoucher(header);

    case "B":
      return loadSalesVoucher(header);

    case "W":
      return loadSalesVoucher(header);

    case "Q":
      return loadSalesVoucher(header);

    case "U":
      return loadSalesVoucher(header);

    case "u":
      return loadSalesVoucher(header);

    case "T":
      return loadSalesVoucher(header);

    case "t":
      return loadSalesVoucher(header);

    case "J":
      return loadSalesVoucher(header);

    default:
      throw new Error(`Unsupported Voucher Type ${header.TYPE}`);
  }
}