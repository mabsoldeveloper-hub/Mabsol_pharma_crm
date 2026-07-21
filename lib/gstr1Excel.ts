import ExcelJS from "exceljs";

/**
 * Builds a multi-sheet GSTR-1 Excel workbook from the gstJson produced by
 * Gstr1Report.build(). Requires `exceljs` — run: npm install exceljs
 *
 * Sheet layout mirrors the GST offline tool's format so it's familiar to
 * anyone who has used the official Excel template before.
 */
export async function buildGstr1Excel(gstJson: any, meta: any, invoiceDetail: any[] = []): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = meta.companyName || "GSTR-1 Report";
    wb.created = new Date();

    // ---- Summary sheet ----
    const summary = wb.addWorksheet("Summary");
    summary.addRow(["GSTR-1 Summary"]);
    summary.addRow(["GSTIN", meta.companyGstin]);
    summary.addRow(["Company", meta.companyName]);
    summary.addRow(["Period", meta.period]);
    summary.addRow([]);
    summary.addRow(["Section", "Count"]);
    summary.addRow(["Total Invoices", meta.invoiceCount]);
    summary.addRow(["B2B Invoices", meta.b2bCount]);
    summary.addRow(["B2CL Invoices", meta.b2clCount]);
    summary.addRow(["B2CS Groups (pos+rate)", meta.b2csGroupCount]);
    summary.addRow(["HSN Lines", meta.hsnLineCount]);
    if (meta.warnings?.stateGuessedCount || meta.warnings?.unclassifiedHsnCount) {
        summary.addRow([]);
        summary.addRow(["⚠ Data Quality Warnings"]);
        summary.addRow(["Invoices with guessed customer state", meta.warnings.stateGuessedCount]);
        summary.addRow(["Product lines with unresolved HSN", meta.warnings.unclassifiedHsnCount]);
    }
    summary.getColumn(1).width = 32;
    summary.getColumn(2).width = 20;

    // ---- B2B sheet ----
    const b2b = wb.addWorksheet("B2B");
    b2b.addRow(["Customer GSTIN", "Invoice No", "Invoice Date", "Invoice Value", "POS", "Rate", "Taxable Value", "IGST", "CGST", "SGST", "Cess"]);
    for (const party of gstJson.b2b || []) {
        for (const inv of party.inv) {
            for (const item of inv.itms) {
                b2b.addRow([
                    party.ctin, inv.inum, inv.idt, inv.val, inv.pos,
                    item.itm_det.rt, item.itm_det.txval, item.itm_det.iamt,
                    item.itm_det.camt, item.itm_det.samt, item.itm_det.csamt,
                ]);
            }
        }
    }
    b2b.columns.forEach((c) => (c.width = 16));

    // ---- B2CL sheet ----
    const b2cl = wb.addWorksheet("B2CL");
    b2cl.addRow(["Invoice No", "Invoice Date", "Invoice Value", "POS", "Rate", "Taxable Value", "IGST"]);
    for (const group of gstJson.b2cl || []) {
        for (const inv of group.inv) {
            for (const item of inv.itms) {
                b2cl.addRow([inv.inum, inv.idt, inv.val, inv.pos, item.itm_det.rt, item.itm_det.txval, item.itm_det.iamt]);
            }
        }
    }
    b2cl.columns.forEach((c) => (c.width = 16));

    // ---- B2CS sheet ----
    const b2cs = wb.addWorksheet("B2CS");
    b2cs.addRow(["Supply Type", "POS", "Rate", "Taxable Value", "IGST", "CGST", "SGST", "Cess"]);
    for (const row of gstJson.b2cs || []) {
        b2cs.addRow([row.sply_ty, row.pos, row.rt, row.txval, row.iamt, row.camt, row.samt, row.csamt]);
    }
    b2cs.columns.forEach((c) => (c.width = 16));

    // ---- HSN sheet ----
    const hsn = wb.addWorksheet("HSN Summary");
    hsn.addRow(["HSN Code", "Description", "UQC", "Qty", "Rate", "Taxable Value", "IGST", "CGST", "SGST", "Total Value"]);
    for (const row of gstJson.hsn?.data || []) {
        hsn.addRow([row.hsn_sc, row.desc, row.uqc, row.qty, row.rt, row.txval, row.iamt, row.camt, row.samt, row.val]);
    }
    hsn.columns.forEach((c) => (c.width = 16));

    // ---- Documents Issued sheet ----
    const doc = wb.addWorksheet("Documents Issued");
    doc.addRow(["From", "To", "Total Number", "Cancelled", "Net Issued"]);
    for (const d of gstJson.doc_issue?.doc_det?.[0]?.docs || []) {
        doc.addRow([d.from, d.to, d.totnum, d.cancel, d.net_issue]);
    }
    doc.columns.forEach((c) => (c.width = 18));

    // ---- All Invoices sheet — full per-invoice audit detail (not a govt
    // filing section, but the most useful sheet for internal reconciliation:
    // shows every invoice with its party, bucket classification, and amounts,
    // regardless of whether it landed in B2B/B2CL/B2CS) ----
    const allInv = wb.addWorksheet("All Invoices");
    allInv.addRow([
        "Voucher", "Invoice No", "Date", "Party Code", "Party Name", "GSTIN", "City",
        "Bucket", "Place of Supply", "Interstate", "Item Count",
        "Taxable Value", "CGST", "SGST", "IGST", "Invoice Value", "State Guessed?",
    ]);
    allInv.getRow(1).font = { bold: true };
    for (const inv of invoiceDetail) {
        allInv.addRow([
            inv.voucher, inv.vcn, inv.date, inv.codep, inv.partyName, inv.gstin, inv.city,
            inv.bucket, inv.placeOfSupply, inv.interstate ? "Yes" : "No", inv.itemCount,
            inv.taxableAmount, inv.cgstAmount, inv.sgstAmount, inv.igstAmount, inv.invoiceValue,
            inv.stateGuessed ? "⚠ Yes" : "No",
        ]);
    }
    allInv.columns.forEach((c) => (c.width = 15));
    allInv.getColumn(5).width = 26; // Party Name needs more room
    // Auto-filter so the user can sort/filter by bucket, party, date etc. in Excel
    allInv.autoFilter = { from: "A1", to: `Q${invoiceDetail.length + 1}` };

    const arrayBuffer = await wb.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
}