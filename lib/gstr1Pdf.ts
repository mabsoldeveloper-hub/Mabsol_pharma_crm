import PDFDocument from "pdfkit";
import { GST_STATE_CODES } from "./gstr1Report";

const fmt = (v?: number | null) =>
    (v ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtInt = (v?: number | null) =>
    (v ?? 0).toLocaleString("en-IN");

/**
 * Builds a highly professional, beautifully styled multi-page GSTR-1 PDF Summary Report.
 */
export function buildGstr1Pdf(gstJson: any, meta: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 30, size: "A4", bufferPages: true });
        const chunks: Buffer[] = [];
        doc.on("data", (c) => chunks.push(c));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const pageWidth = 535; // 595 - 60
        const pageLeft = 30;
        let y = 30;

        const checkPageBreak = (neededHeight: number) => {
            if (y + neededHeight > 780) {
                doc.addPage();
                y = 40;
                return true;
            }
            return false;
        };

        // ── 1. Top Header Banner ──
        doc.rect(pageLeft, y, pageWidth, 56).fill("#1E1B4B");
        doc.fillColor("#FFFFFF")
           .font("Helvetica-Bold")
           .fontSize(16)
           .text("GSTR-1 OUTWARD SUPPLIES RETURN REPORT", pageLeft + 16, y + 12);

        doc.fillColor("#A5B4FC")
           .font("Helvetica")
           .fontSize(9.5)
           .text(`GST Portal Filing Summary & Audit Report  ·  Period: ${meta.period}`, pageLeft + 16, y + 34);

        y += 68;

        // ── 2. Company Details Card ──
        doc.rect(pageLeft, y, pageWidth, 52).fillAndStroke("#F8FAFC", "#CBD5E1");
        
        doc.fillColor("#475569").font("Helvetica-Bold").fontSize(8).text("COMPANY NAME", pageLeft + 14, y + 10);
        doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(11).text(meta.companyName || "-", pageLeft + 14, y + 22, { width: 240, ellipsis: true });

        doc.fillColor("#475569").font("Helvetica-Bold").fontSize(8).text("GSTIN", pageLeft + 260, y + 10);
        doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(11).text(meta.companyGstin || "-", pageLeft + 260, y + 22);

        doc.fillColor("#475569").font("Helvetica-Bold").fontSize(8).text("STATE", pageLeft + 410, y + 10);
        doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(11).text(`${meta.companyStateCode || "00"} — ${GST_STATE_CODES[meta.companyStateCode] || "-"}`, pageLeft + 410, y + 22, { width: 110, ellipsis: true });

        y += 62;

        // ── 3. KPI Stat Cards (Grand Totals Bar) ──
        const grand = meta.totals?.grand || { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, invoiceValue: 0 };
        const kpiWidth = (pageWidth - 16) / 3;

        // Row 1 KPI
        const kpis1 = [
            { label: "TOTAL INVOICES", val: `${fmtInt(meta.invoiceCount)} Docs`, sub: `B2B: ${meta.b2bCount} | B2C: ${meta.b2clCount + meta.b2csGroupCount}`, bg: "#EFF6FF", border: "#BFDBFE", color: "#1E40AF" },
            { label: "TAXABLE VALUE", val: `₹${fmt(grand.taxableValue)}`, sub: "Net taxable amount", bg: "#ECFDF5", border: "#A7F3D0", color: "#065F46" },
            { label: "TOTAL INVOICE VALUE", val: `₹${fmt(grand.invoiceValue)}`, sub: "Gross sales value", bg: "#EEF2FF", border: "#C7D2FE", color: "#3730A3" },
        ];

        kpis1.forEach((k, i) => {
            const kx = pageLeft + i * (kpiWidth + 8);
            doc.rect(kx, y, kpiWidth, 46).fillAndStroke(k.bg, k.border);
            doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(7.5).text(k.label, kx + 10, y + 8);
            doc.fillColor(k.color).font("Helvetica-Bold").fontSize(12).text(k.val, kx + 10, y + 20, { width: kpiWidth - 20, ellipsis: true });
            doc.fillColor("#64748b").font("Helvetica").fontSize(7).text(k.sub, kx + 10, y + 33);
        });

        y += 54;

        // Row 2 Tax Split KPI
        const kpiWidth4 = (pageWidth - 18) / 3;
        const taxKpis = [
            { label: "CGST AMOUNT", val: `₹${fmt(grand.cgst)}`, bg: "#EFF6FF", border: "#BFDBFE", color: "#1D4ED8" },
            { label: "SGST AMOUNT", val: `₹${fmt(grand.sgst)}`, bg: "#EFF6FF", border: "#BFDBFE", color: "#1D4ED8" },
            { label: "IGST AMOUNT", val: `₹${fmt(grand.igst)}`, bg: "#F3E8FF", border: "#E9D5FF", color: "#6B21A8" },
        ];

        taxKpis.forEach((k, i) => {
            const kx = pageLeft + i * (kpiWidth4 + 9);
            doc.rect(kx, y, kpiWidth4, 38).fillAndStroke(k.bg, k.border);
            doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(7).text(k.label, kx + 10, y + 6);
            doc.fillColor(k.color).font("Helvetica-Bold").fontSize(10.5).text(k.val, kx + 10, y + 18, { width: kpiWidth4 - 20, ellipsis: true });
        });

        y += 48;

        // Data Quality Warnings
        if (meta.warnings?.stateGuessedCount > 0 || meta.warnings?.unclassifiedHsnCount > 0) {
            doc.rect(pageLeft, y, pageWidth, 28).fillAndStroke("#FEF2F2", "#FECACA");
            doc.fillColor("#991B1B").font("Helvetica-Bold").fontSize(8.5)
               .text(`⚠ DATA WARNING: ${meta.warnings.stateGuessedCount} invoice(s) state assumed | ${meta.warnings.unclassifiedHsnCount} product line(s) missing HSN code`, pageLeft + 12, y + 9);
            y += 34;
        }

        // ── Helper Table Generator ──
        const drawSectionHeader = (title: string, count: number) => {
            checkPageBreak(35);
            doc.rect(pageLeft, y, pageWidth, 22).fill("#1E1B4B");
            doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9.5).text(title, pageLeft + 10, y + 6);
            doc.fillColor("#C7D2FE").font("Helvetica").fontSize(8.5).text(`${count} Record(s)`, pageLeft + pageWidth - 90, y + 6, { align: "right", width: 80 });
            y += 22;
        };

        const drawTableHeader = (cols: { name: string; width: number; align?: string }[]) => {
            doc.rect(pageLeft, y, pageWidth, 18).fill("#334155");
            let cx = pageLeft;
            cols.forEach((col) => {
                doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(7.5).text(col.name, cx + 4, y + 5, { width: col.width - 8, align: (col.align as any) || "left" });
                cx += col.width;
            });
            y += 18;
        };

        // ── 4. Section: B2B Supplies Summary ──
        drawSectionHeader("1. B2B Supplies — Registered Parties (4A, 4B)", meta.b2bCount);
        const b2bCols = [
            { name: "GSTIN", width: 95 },
            { name: "INV NO", width: 65 },
            { name: "DATE", width: 55 },
            { name: "POS", width: 40 },
            { name: "TAXABLE (₹)", width: 75, align: "right" },
            { name: "CGST (₹)", width: 65, align: "right" },
            { name: "SGST (₹)", width: 65, align: "right" },
            { name: "IGST (₹)", width: 75, align: "right" },
        ];
        drawTableHeader(b2bCols);

        if (!gstJson.b2b || !gstJson.b2b.length) {
            doc.rect(pageLeft, y, pageWidth, 18).fill("#F8FAFC");
            doc.fillColor("#94A3B8").font("Helvetica-Oblique").fontSize(8).text("No B2B registered sales for this period.", pageLeft + 10, y + 5);
            y += 18;
        } else {
            let rowIdx = 0;
            for (const party of gstJson.b2b) {
                for (const inv of party.inv) {
                    checkPageBreak(18);
                    const tx = inv.itms.reduce((s: number, i: any) => s + (i.itm_det.txval || 0), 0);
                    const c  = inv.itms.reduce((s: number, i: any) => s + (i.itm_det.camt || 0), 0);
                    const sg = inv.itms.reduce((s: number, i: any) => s + (i.itm_det.samt || 0), 0);
                    const ig = inv.itms.reduce((s: number, i: any) => s + (i.itm_det.iamt || 0), 0);

                    doc.rect(pageLeft, y, pageWidth, 17).fill(rowIdx % 2 === 0 ? "#FFFFFF" : "#F8FAFC");
                    doc.fillColor("#1E293B").font("Helvetica").fontSize(7.5);

                    let cx = pageLeft;
                    doc.text(party.ctin, cx + 4, y + 4, { width: 87, ellipsis: true }); cx += 95;
                    doc.text(inv.inum, cx + 4, y + 4, { width: 57, ellipsis: true }); cx += 65;
                    doc.text(inv.idt, cx + 4, y + 4, { width: 47 }); cx += 55;
                    doc.text(inv.pos, cx + 4, y + 4, { width: 32 }); cx += 40;
                    doc.text(fmt(tx), cx + 4, y + 4, { width: 67, align: "right" }); cx += 75;
                    doc.text(fmt(c), cx + 4, y + 4, { width: 57, align: "right" }); cx += 65;
                    doc.text(fmt(sg), cx + 4, y + 4, { width: 57, align: "right" }); cx += 65;
                    doc.text(fmt(ig), cx + 4, y + 4, { width: 67, align: "right" });

                    y += 17;
                    rowIdx++;
                }
            }
        }
        y += 12;

        // ── 5. Section: B2CS Small Unregistered Summary ──
        drawSectionHeader("2. B2CS Supplies — Small Unregistered (7)", meta.b2csGroupCount);
        const b2csCols = [
            { name: "SUPPLY TYPE", width: 85 },
            { name: "P.O.S. (STATE)", width: 125 },
            { name: "RATE %", width: 55, align: "right" },
            { name: "TAXABLE (₹)", width: 80, align: "right" },
            { name: "CGST (₹)", width: 60, align: "right" },
            { name: "SGST (₹)", width: 60, align: "right" },
            { name: "IGST (₹)", width: 70, align: "right" },
        ];
        drawTableHeader(b2csCols);

        if (!gstJson.b2cs || !gstJson.b2cs.length) {
            doc.rect(pageLeft, y, pageWidth, 18).fill("#F8FAFC");
            doc.fillColor("#94A3B8").font("Helvetica-Oblique").fontSize(8).text("No B2CS unregistered sales for this period.", pageLeft + 10, y + 5);
            y += 18;
        } else {
            let rowIdx = 0;
            for (const row of gstJson.b2cs) {
                checkPageBreak(18);
                doc.rect(pageLeft, y, pageWidth, 17).fill(rowIdx % 2 === 0 ? "#FFFFFF" : "#F8FAFC");
                doc.fillColor("#1E293B").font("Helvetica").fontSize(7.5);

                let cx = pageLeft;
                doc.text(row.sply_ty, cx + 4, y + 4, { width: 77 }); cx += 85;
                doc.text(`${row.pos} — ${GST_STATE_CODES[row.pos] || row.pos}`, cx + 4, y + 4, { width: 117, ellipsis: true }); cx += 125;
                doc.font("Helvetica-Bold").text(`${row.rt}%`, cx + 4, y + 4, { width: 47, align: "right" }).font("Helvetica"); cx += 55;
                doc.text(fmt(row.txval), cx + 4, y + 4, { width: 72, align: "right" }); cx += 80;
                doc.text(fmt(row.camt), cx + 4, y + 4, { width: 52, align: "right" }); cx += 60;
                doc.text(fmt(row.samt), cx + 4, y + 4, { width: 52, align: "right" }); cx += 60;
                doc.text(fmt(row.iamt), cx + 4, y + 4, { width: 62, align: "right" });

                y += 17;
                rowIdx++;
            }
        }
        y += 12;

        // ── 6. Section: HSN Summary ──
        drawSectionHeader("3. HSN / SAC Code Summary (12)", meta.hsnLineCount);
        const hsnCols = [
            { name: "HSN/SAC", width: 75 },
            { name: "DESCRIPTION", width: 135 },
            { name: "UQC", width: 40 },
            { name: "QTY", width: 55, align: "right" },
            { name: "TAXABLE (₹)", width: 75, align: "right" },
            { name: "CGST (₹)", width: 45, align: "right" },
            { name: "SGST (₹)", width: 45, align: "right" },
            { name: "IGST (₹)", width: 65, align: "right" },
        ];
        drawTableHeader(hsnCols);

        const hsnData = gstJson.hsn?.data || [];
        if (!hsnData.length) {
            doc.rect(pageLeft, y, pageWidth, 18).fill("#F8FAFC");
            doc.fillColor("#94A3B8").font("Helvetica-Oblique").fontSize(8).text("No HSN summary data available.", pageLeft + 10, y + 5);
            y += 18;
        } else {
            let rowIdx = 0;
            for (const row of hsnData.slice(0, 30)) {
                checkPageBreak(18);
                doc.rect(pageLeft, y, pageWidth, 17).fill(rowIdx % 2 === 0 ? "#FFFFFF" : "#F8FAFC");
                doc.fillColor("#1E293B").font("Helvetica").fontSize(7.5);

                let cx = pageLeft;
                doc.font("Helvetica-Bold").text(row.hsn_sc, cx + 4, y + 4, { width: 67, ellipsis: true }).font("Helvetica"); cx += 75;
                doc.text(row.desc, cx + 4, y + 4, { width: 127, ellipsis: true }); cx += 135;
                doc.text(row.uqc, cx + 4, y + 4, { width: 32 }); cx += 40;
                doc.text(fmt(row.qty), cx + 4, y + 4, { width: 47, align: "right" }); cx += 55;
                doc.text(fmt(row.txval), cx + 4, y + 4, { width: 67, align: "right" }); cx += 75;
                doc.text(fmt(row.camt), cx + 4, y + 4, { width: 37, align: "right" }); cx += 45;
                doc.text(fmt(row.samt), cx + 4, y + 4, { width: 37, align: "right" }); cx += 45;
                doc.text(fmt(row.iamt), cx + 4, y + 4, { width: 57, align: "right" });

                y += 17;
                rowIdx++;
            }
            if (hsnData.length > 30) {
                checkPageBreak(18);
                doc.rect(pageLeft, y, pageWidth, 16).fill("#EFF6FF");
                doc.fillColor("#1D4ED8").font("Helvetica-Oblique").fontSize(7.5).text(`+ ${hsnData.length - 30} more HSN lines in full Excel report.`, pageLeft + 10, y + 4);
                y += 16;
            }
        }
        y += 12;

        // ── 7. Section: Documents Issued Summary ──
        drawSectionHeader("4. Documents Issued Summary (13)", meta.docsIssuedCount);
        const docCols = [
            { name: "NATURE OF DOCUMENT", width: 195 },
            { name: "FROM SR. NO", width: 85 },
            { name: "TO SR. NO", width: 85 },
            { name: "TOTAL", width: 55, align: "right" },
            { name: "CANCELLED", width: 55, align: "right" },
            { name: "NET ISSUED", width: 60, align: "right" },
        ];
        drawTableHeader(docCols);

        const docDetails = [
            { name: "Invoices for outward supply", d: gstJson.doc_issue?.doc_det?.[0]?.docs?.[0] },
            { name: "Credit / Debit Notes", d: gstJson.doc_issue?.doc_det?.[1]?.docs?.[0] },
        ];

        docDetails.forEach((item, idx) => {
            checkPageBreak(18);
            doc.rect(pageLeft, y, pageWidth, 17).fill(idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC");
            doc.fillColor("#1E293B").font("Helvetica").fontSize(7.5);

            let cx = pageLeft;
            doc.font("Helvetica-Bold").text(item.name, cx + 4, y + 4, { width: 187 }).font("Helvetica"); cx += 195;
            doc.text(item.d?.from || "-", cx + 4, y + 4, { width: 77 }); cx += 85;
            doc.text(item.d?.to || "-", cx + 4, y + 4, { width: 77 }); cx += 85;
            doc.text(String(item.d?.totnum || 0), cx + 4, y + 4, { width: 47, align: "right" }); cx += 55;
            doc.text(String(item.d?.cancel || 0), cx + 4, y + 4, { width: 47, align: "right" }); cx += 55;
            doc.font("Helvetica-Bold").fillColor("#059669").text(String(item.d?.net_issue || 0), cx + 4, y + 4, { width: 52, align: "right" });

            y += 17;
        });

        // ── 8. Add Footer & Page Numbers across all pages ──
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.rect(pageLeft, 800, pageWidth, 15).fill("#FFFFFF");
            doc.rect(pageLeft, 800, pageWidth, 0.5).fill("#E2E8F0");
            doc.fillColor("#94A3B8").font("Helvetica").fontSize(7.5)
               .text(`Mabsol CRM — GSTR-1 Executive Audit Report  ·  Confidential`, pageLeft, 804)
               .text(`Page ${i + 1} of ${pages.count}`, pageLeft + pageWidth - 100, 804, { align: "right", width: 100 });
        }

        doc.end();
    });
}