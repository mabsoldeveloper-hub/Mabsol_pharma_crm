import { loadAccountingVoucher } from "./AccountingLoader";

export async function loadReceiptVoucher(
  voucher: number
) {
  return loadAccountingVoucher(voucher);
}