import { loadAccountingVoucher } from "./AccountingLoader";

export async function loadPaymentVoucher(
  voucher: number
) {
  return loadAccountingVoucher(voucher);
}