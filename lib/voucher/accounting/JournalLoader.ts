import { loadAccountingVoucher } from "./AccountingLoader";

export async function loadJournalVoucher(
  voucher: number
) {
  return loadAccountingVoucher(voucher);
}