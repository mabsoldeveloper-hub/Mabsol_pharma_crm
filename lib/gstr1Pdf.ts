import PDFDocument from "pdfkit";
import { GST_STATE_CODES } from "./gstr1Report";

/** 
 * Builds a printable GSTR-1 summary PDF from the gstJson + meta produced by
 * Gstr1Report.build(). Requires `pdfkit` — run: npm install pdfkit
 *
 * This is a readable summary document (for internal record / CA review),
 * NOT the official filing artifact — official filing happens via the JSON
 * upload on the GST portal (use the "Download JSON" button for that).
 */
export function buildGstr1Pdf(gstJson: any, meta: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 40, size: "A4" });
        const chunks: Buffer[] = [];
        doc.on("data", (c) => chunks.push(c));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        doc.fontSize(16).text("GSTR-1 Summary Report", { align: "center" });
        doc.moveDown(0.5);
        doc.fontSize(10)
            .text(`Company: ${meta.companyName}`)
            .text(`GSTIN: ${meta.companyGstin}`)
            .text(`Period: ${meta.period}`)
            .moveDown();

        doc.fontSize(12).text("Summary", { underline: true });
        doc.fontSize(10);
        doc.text(`Total Invoices: ${meta.invoiceCount}`);
        doc.text(`B2B Invoices: ${meta.b2bCount}`);
        doc.text(`B2CL Invoices: ${meta.b2clCount}`);
        doc.text(`B2CS Groups: ${meta.b2csGroupCount}`);
        doc.text(`HSN Lines: ${meta.hsnLineCount}`);
        doc.moveDown();

        if (meta.warnings?.stateGuessedCount || meta.warnings?.unclassifiedHsnCount) {
            doc.fillColor("red").fontSize(11).text("⚠ Data Quality Warnings", { underline: true });
            doc.fontSize(9)
                .text(`Invoices with guessed customer state: ${meta.warnings.stateGuessedCount}`)
                .text(`Product lines with unresolved HSN: ${meta.warnings.unclassifiedHsnCount}`);
            doc.fillColor("black").moveDown();
        }

        // ---- B2CS table (aggregated — fits well on a summary page) ----
        doc.fontSize(12).text("B2CS (Small B2C Sales)", { underline: true });
        doc.fontSize(9);
        const b2csRows = gstJson.b2cs || [];
        if (!b2csRows.length) {
            doc.text("No B2CS transactions for this period.");
        } else {
            doc.text("Supply Type | POS (State) | Rate% | Taxable | IGST | CGST | SGST");
            for (const row of b2csRows) {
                const stateName = GST_STATE_CODES[row.pos] || row.pos;
                doc.text(`${row.sply_ty} | ${stateName} | ${row.rt}% | ${row.txval} | ${row.iamt} | ${row.camt} | ${row.samt}`);
            }
        }
        doc.moveDown();

        // ---- HSN table ----
        doc.fontSize(12).text("HSN Summary", { underline: true });
        doc.fontSize(9);
        const hsnRows = gstJson.hsn?.data || [];
        if (!hsnRows.length) {
            doc.text("No HSN data for this period.");
        } else {
            doc.text("HSN | Description | Qty | Taxable | CGST | SGST | IGST");
            for (const row of hsnRows.slice(0, 40)) {
                doc.text(`${row.hsn_sc} | ${row.desc} | ${row.qty} | ${row.txval} | ${row.camt} | ${row.samt} | ${row.iamt}`);
            }
            if (hsnRows.length > 40) doc.text(`... and ${hsnRows.length - 40} more rows (see Excel export for full detail)`);
        }

        doc.end();
    });
} 