import ExcelJS from "exceljs";

/**
 * Builds a multi-sheet GSTR-1 Excel workbook covering all 30 standard GST Offline Tool / Portal worksheets.
 */
export async function buildGstr1Excel(gstJson: any, meta: any, invoiceDetail: any[] = []): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = meta.companyName || "GSTR-1 Report";
    wb.created = new Date();

    const helperAddHeaders = (sheet: ExcelJS.Worksheet, headers: string[]) => {
        const row = sheet.addRow(headers);
        row.font = { bold: true };
        sheet.columns.forEach((c) => (c.width = 16));
    };

    // ---- 1. Summary sheet ----
    const summary = wb.addWorksheet("Summary");
    summary.addRow(["GSTR-1 Return Summary"]);
    summary.addRow(["GSTIN", meta.companyGstin || "-"]);
    summary.addRow(["Company", meta.companyName || "-"]);
    summary.addRow(["Period", meta.period || "-"]);
    summary.addRow([]);
    summary.addRow(["Section / Tab", "Record Count"]);
    summary.addRow(["Total Invoices", meta.invoiceCount || 0]);
    summary.addRow(["B2B (4A, 4B)", meta.b2bCount || 0]);
    summary.addRow(["B2CL (5A)", meta.b2clCount || 0]);
    summary.addRow(["B2CS (7)", meta.b2csGroupCount || 0]);
    summary.addRow(["CDNR (9B)", meta.cdnrCount || 0]);
    summary.addRow(["CDNUR (9B)", meta.cdnurCount || 0]);
    summary.addRow(["HSN Summary (12)", meta.hsnLineCount || 0]);
    summary.addRow(["HSN B2B", meta.hsnB2bCount || 0]);
    summary.addRow(["HSN B2C", meta.hsnB2cCount || 0]);
    summary.addRow(["Documents Issued (13)", meta.docsIssuedCount || 0]);
    summary.getColumn(1).width = 32;
    summary.getColumn(2).width = 20;

    // ---- 2. b2b ----
    const b2b = wb.addWorksheet("b2b");
    helperAddHeaders(b2b, ["GSTIN/UIN of Recipient", "Receiver Name", "Invoice Number", "Invoice Date", "Invoice Value", "Place Of Supply", "Reverse Charge", "Invoice Type", "E-Commerce GSTIN", "Rate", "Taxable Value", "Integrated Tax", "Central Tax", "State/UT Tax", "Cess Amount"]);
    for (const party of gstJson.b2b || []) {
        for (const inv of party.inv || []) {
            for (const item of inv.itms || []) {
                b2b.addRow([
                    party.ctin, inv.receiver_name || "-", inv.inum, inv.idt, inv.val, inv.pos,
                    inv.rchrg || "N", inv.inv_typ || "Regular", inv.etin || "-",
                    item.itm_det.rt, item.itm_det.txval, item.itm_det.iamt,
                    item.itm_det.camt, item.itm_det.samt, item.itm_det.csamt,
                ]);
            }
        }
    }

    // ---- 3. b2ba ----
    const b2ba = wb.addWorksheet("b2ba");
    helperAddHeaders(b2ba, ["Original Invoice Number", "Original Invoice Date", "Revised GSTIN/UIN", "Revised Receiver Name", "Revised Invoice Number", "Revised Invoice Date", "Revised Invoice Value", "Place Of Supply", "Reverse Charge", "Rate", "Taxable Value", "Cess Amount"]);

    // ---- 4. b2b_sez_de ----
    const b2bSezDe = wb.addWorksheet("b2b_sez_de");
    helperAddHeaders(b2bSezDe, ["GSTIN/UIN of Recipient", "Receiver Name", "Invoice Number", "Invoice Date", "Invoice Value", "Place Of Supply", "Supply Type", "Rate", "Taxable Value", "Integrated Tax", "Cess Amount"]);

    // ---- 5. b2cl ----
    const b2cl = wb.addWorksheet("b2cl");
    helperAddHeaders(b2cl, ["Invoice Number", "Invoice Date", "Invoice Value", "Place Of Supply", "Rate", "Taxable Value", "Integrated Tax Amount", "Cess Amount"]);
    for (const group of gstJson.b2cl || []) {
        for (const inv of group.inv || []) {
            for (const item of inv.itms || []) {
                b2cl.addRow([inv.inum, inv.idt, inv.val, inv.pos, item.itm_det.rt, item.itm_det.txval, item.itm_det.iamt, item.itm_det.csamt]);
            }
        }
    }

    // ---- 6. b2cla ----
    const b2cla = wb.addWorksheet("b2cla");
    helperAddHeaders(b2cla, ["Original Invoice Number", "Original Invoice Date", "Original POS", "Revised Invoice Number", "Revised Invoice Date", "Revised Invoice Value", "Rate", "Taxable Value", "Integrated Tax Amount", "Cess Amount"]);

    // ---- 7. b2cs ----
    const b2cs = wb.addWorksheet("b2cs");
    helperAddHeaders(b2cs, ["Supply Type", "Place Of Supply", "Rate", "Taxable Value", "Integrated Tax Amount", "Central Tax Amount", "State/UT Tax Amount", "Cess Amount"]);
    for (const row of gstJson.b2cs || []) {
        b2cs.addRow([row.sply_ty, row.pos, row.rt, row.txval, row.iamt, row.camt, row.samt, row.csamt]);
    }

    // ---- 8. b2csa ----
    const b2csa = wb.addWorksheet("b2csa");
    helperAddHeaders(b2csa, ["Financial Year", "Original Month", "Original Place Of Supply", "Supply Type", "Rate", "Taxable Value", "Integrated Tax Amount", "Central Tax Amount", "State/UT Tax Amount", "Cess Amount"]);

    // ---- 9. cdnr ----
    const cdnr = wb.addWorksheet("cdnr");
    helperAddHeaders(cdnr, ["GSTIN/UIN of Recipient", "Receiver Name", "Note Number", "Note Date", "Note Type", "Place Of Supply", "Reverse Charge", "Note Value", "Rate", "Taxable Value", "Integrated Tax", "Central Tax", "State/UT Tax", "Cess Amount"]);
    for (const party of gstJson.cdnr || []) {
        for (const nt of party.nt || []) {
            for (const item of nt.itms || []) {
                cdnr.addRow([
                    party.ctin, nt.receiver_name || "-", nt.nt_num, nt.nt_dt, nt.ntty === "C" ? "Credit Note" : "Debit Note",
                    nt.pos, nt.rchrg || "N", nt.val, item.itm_det.rt, item.itm_det.txval,
                    item.itm_det.iamt, item.itm_det.camt, item.itm_det.samt, item.itm_det.csamt,
                ]);
            }
        }
    }

    // ---- 10. cdnra ----
    const cdnra = wb.addWorksheet("cdnra");
    helperAddHeaders(cdnra, ["Original Note Number", "Original Note Date", "Revised GSTIN/UIN", "Revised Note Number", "Revised Note Date", "Note Type", "Revised Note Value", "Rate", "Taxable Value", "Cess Amount"]);

    // ---- 11. cdnur ----
    const cdnur = wb.addWorksheet("cdnur");
    helperAddHeaders(cdnur, ["UR Type", "Note Number", "Note Date", "Note Type", "Place Of Supply", "Note Value", "Rate", "Taxable Value", "Integrated Tax Amount", "Cess Amount"]);
    for (const nt of gstJson.cdnur || []) {
        for (const item of nt.itms || []) {
            cdnur.addRow([
                nt.typ, nt.nt_num, nt.nt_dt, nt.ntty === "C" ? "Credit Note" : "Debit Note",
                nt.pos, nt.val, item.itm_det.rt, item.itm_det.txval, item.itm_det.iamt, item.itm_det.csamt,
            ]);
        }
    }

    // ---- 12. cdnura ----
    const cdnura = wb.addWorksheet("cdnura");
    helperAddHeaders(cdnura, ["Original Note Number", "Original Note Date", "Revised UR Type", "Revised Note Number", "Revised Note Date", "Place Of Supply", "Revised Note Value", "Rate", "Taxable Value", "Cess Amount"]);

    // ---- 13. exp ----
    const exp = wb.addWorksheet("exp");
    helperAddHeaders(exp, ["Export Type", "Invoice Number", "Invoice Date", "Invoice Value", "Port Code", "Shipping Bill Number", "Shipping Bill Date", "Rate", "Taxable Value", "Integrated Tax", "Cess Amount"]);

    // ---- 14. expa ----
    const expa = wb.addWorksheet("expa");
    helperAddHeaders(expa, ["Original Invoice Number", "Original Invoice Date", "Revised Export Type", "Revised Invoice Number", "Revised Invoice Date", "Revised Invoice Value", "Rate", "Taxable Value", "Cess Amount"]);

    // ---- 15. at ----
    const at = wb.addWorksheet("at");
    helperAddHeaders(at, ["Place Of Supply", "Rate", "Gross Advance Received", "Integrated Tax Amount", "Central Tax Amount", "State/UT Tax Amount", "Cess Amount"]);

    // ---- 16. ata ----
    const ata = wb.addWorksheet("ata");
    helperAddHeaders(ata, ["Financial Year", "Original Month", "Original Place Of Supply", "Rate", "Gross Advance Received", "Cess Amount"]);

    // ---- 17. atadi ----
    const atadi = wb.addWorksheet("atadi");
    helperAddHeaders(atadi, ["Place Of Supply", "Rate", "Gross Advance Adjusted", "Integrated Tax Amount", "Central Tax Amount", "State/UT Tax Amount", "Cess Amount"]);

    // ---- 18. atadja ----
    const atadja = wb.addWorksheet("atadja");
    helperAddHeaders(atadja, ["Financial Year", "Original Month", "Original Place Of Supply", "Rate", "Gross Advance Adjusted", "Cess Amount"]);

    // ---- 19. hsn ----
    const hsn = wb.addWorksheet("hsn");
    helperAddHeaders(hsn, ["HSN Code", "Description", "UQC", "Total Quantity", "Rate", "Taxable Value", "Integrated Tax", "Central Tax", "State/UT Tax", "Total Value"]);
    for (const row of gstJson.hsn?.data || []) {
        hsn.addRow([row.hsn_sc, row.desc, row.uqc, row.qty, row.rt, row.txval, row.iamt, row.camt, row.samt, row.val]);
    }

    // ---- 20. hsn(b2b) ----
    const hsnB2b = wb.addWorksheet("hsn(b2b)");
    helperAddHeaders(hsnB2b, ["HSN Code", "Description", "UQC", "Total Quantity", "Rate", "Taxable Value", "Integrated Tax", "Central Tax", "State/UT Tax", "Total Value"]);
    for (const row of gstJson.hsn_b2b?.data || []) {
        hsnB2b.addRow([row.hsn_sc, row.desc, row.uqc, row.qty, row.rt, row.txval, row.iamt, row.camt, row.samt, row.val]);
    }

    // ---- 21. hsn(b2c) ----
    const hsnB2c = wb.addWorksheet("hsn(b2c)");
    helperAddHeaders(hsnB2c, ["HSN Code", "Description", "UQC", "Total Quantity", "Rate", "Taxable Value", "Integrated Tax", "Central Tax", "State/UT Tax", "Total Value"]);
    for (const row of gstJson.hsn_b2c?.data || []) {
        hsnB2c.addRow([row.hsn_sc, row.desc, row.uqc, row.qty, row.rt, row.txval, row.iamt, row.camt, row.samt, row.val]);
    }

    // ---- 22. docs ----
    const docs = wb.addWorksheet("docs");
    helperAddHeaders(docs, ["Nature of Document", "Sr. No. From", "Sr. No. To", "Total Number", "Cancelled", "Net Issued"]);
    const docList = [
        { name: "Invoices for outward supply", det: gstJson.doc_issue?.doc_det?.[0]?.docs?.[0] },
        { name: "Debit / Credit Notes", det: gstJson.doc_issue?.doc_det?.[1]?.docs?.[0] },
    ];
    for (const d of docList) {
        if (d.det) docs.addRow([d.name, d.det.from, d.det.to, d.det.totnum, d.det.cancel, d.det.net_issue]);
    }

    // ---- 23. eco ----
    const eco = wb.addWorksheet("eco");
    helperAddHeaders(eco, ["GSTIN of ECO", "Trade Name", "Taxable Value", "Integrated Tax Amount", "Central Tax Amount", "State/UT Tax Amount", "Cess Amount"]);

    // ---- 24. ecoa ----
    const ecoa = wb.addWorksheet("ecoa");
    helperAddHeaders(ecoa, ["Financial Year", "Original Month", "GSTIN of ECO", "Taxable Value", "Integrated Tax Amount", "Central Tax Amount", "State/UT Tax Amount", "Cess Amount"]);

    // ---- 25-32. ECO breakdowns ----
    const ecoSheets = ["ecob2b", "ecob2csb", "ecourp2b", "ecourp2c", "ecoab2b", "ecoab2c", "ecoaurp2b", "ecoaurp2c"];
    for (const sheetName of ecoSheets) {
        const ws = wb.addWorksheet(sheetName);
        helperAddHeaders(ws, ["GSTIN of ECO", "Trade Name", "Invoice/Ref No", "Taxable Value", "Integrated Tax", "Central Tax", "State/UT Tax", "Cess Amount"]);
    }

    // ---- 33. All Invoices Audit Sheet ----
    const allInv = wb.addWorksheet("All Invoices");
    helperAddHeaders(allInv, ["Voucher", "Invoice No", "Date", "Party Code", "Party Name", "GSTIN", "City", "Bucket", "Place of Supply", "Interstate", "Item Count", "Taxable Value", "CGST", "SGST", "IGST", "Invoice Value", "State Guessed?"]);
    for (const inv of invoiceDetail) {
        allInv.addRow([
            inv.voucher, inv.vcn, inv.date, inv.codep, inv.partyName, inv.gstin, inv.city,
            inv.bucket, inv.placeOfSupply, inv.interstate ? "Yes" : "No", inv.itemCount,
            inv.taxableAmount, inv.cgstAmount, inv.sgstAmount, inv.igstAmount, inv.invoiceValue,
            inv.stateGuessed ? "⚠ Yes" : "No",
        ]);
    }
    allInv.autoFilter = { from: "A1", to: `Q${invoiceDetail.length + 1}` };

    const arrayBuffer = await wb.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
}