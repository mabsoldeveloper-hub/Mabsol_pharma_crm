import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

function extractTextFromPdfBuffer(buffer: Buffer): string {
  try {
    const rawString = buffer.toString("binary");
    const lines: string[] = [];
    const tjMatches = rawString.match(/\(([^()]+)\)\s*T[jJ]/g);
    if (tjMatches && tjMatches.length > 0) {
      tjMatches.forEach((m) => {
        const clean = m.replace(/^\(/, "").replace(/\)\s*T[jJ]$/, "").trim();
        if (clean.length > 0) lines.push(clean);
      });
    }
    const asciiLines = rawString.match(/[\x20-\x7E]{3,}/g);
    if (asciiLines && asciiLines.length > 0) {
      asciiLines.forEach((l) => {
        if (l.match(/[A-Z0-9]/i) && !l.startsWith("/") && !l.startsWith("<<")) {
          lines.push(l);
        }
      });
    }
    return lines.join("\n");
  } catch (err) {
    return "";
  }
}

function normalizeDate(rawDateStr: string): string {
  if (!rawDateStr) return new Date().toISOString().slice(0, 10);
  const clean = rawDateStr.trim().replace(/,/g, "").replace(/\s+/g, "");
  let m = clean.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](20\d{2}|\d{2})$/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${month}-${day}`;
  }
  m = clean.match(/^(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
  }
  return new Date().toISOString().slice(0, 10);
}
function normalizeExpiry(rawExp: string): string {
  if (!rawExp) return "";
  const clean = rawExp.trim();
  const m = clean.match(/^(\d{1,2})[\/\-](\d{2}|\d{4})$/);
  if (m) {
    const month = m[1].padStart(2, "0");
    const year = m[2].length === 2 ? `20${m[2]}` : m[2];
    return `${year}-${month}`;
  }
  if (/^20\d{2}-\d{2}$/.test(clean)) return clean;
  return clean;
}

function robustJsonParse(input: string): any {
  if (!input || !input.trim()) {
    throw new Error("Empty AI response received.");
  }

  // 1. Remove markdown backtick codeblocks
  let clean = input
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // 2. Extract outermost JSON object { ... }
  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace !== -1) {
    if (lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.slice(firstBrace, lastBrace + 1);
    } else {
      clean = clean.slice(firstBrace);
    }
  }

  // 3. Try standard JSON.parse first
  try {
    return JSON.parse(clean);
  } catch (err1) {
    // Continue with resilient repairs
  }

  // 4. Strip JS style comments (// and /* */)
  clean = clean.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

  // 5. Remove trailing commas before closing braces/brackets
  clean = clean.replace(/,(\s*[\]\}])/g, "$1");

  // 6. Remove invalid unescaped control characters inside strings
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  try {
    return JSON.parse(clean);
  } catch (err2) {
    // 7. Repair truncated/unclosed JSON stream
    let repaired = clean;
    let inString = false;
    let escaped = false;
    const stack: string[] = [];

    for (let i = 0; i < repaired.length; i++) {
      const ch = repaired[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (ch === "{" || ch === "[") {
          stack.push(ch);
        } else if (ch === "}") {
          if (stack.length > 0 && stack[stack.length - 1] === "{") stack.pop();
        } else if (ch === "]") {
          if (stack.length > 0 && stack[stack.length - 1] === "[") stack.pop();
        }
      }
    }

    if (inString) {
      repaired += '"';
    }

    repaired = repaired.replace(/,\s*$/, "");
    repaired = repaired.replace(/,\s*([\}\]])/g, "$1");

    while (stack.length > 0) {
      const open = stack.pop();
      if (open === "{") repaired += "}";
      else if (open === "[") repaired += "]";
    }

    try {
      return JSON.parse(repaired);
    } catch (err3) {
      // 8. Resilient Regex recovery for table items if JSON syntax broke mid-way
      const items: any[] = [];
      const itemRegex = /\{[^{}]*"(?:productName|name)"\s*:\s*"([^"]+)"[^{}]*\}/gi;
      let match;
      while ((match = itemRegex.exec(clean)) !== null) {
        try {
          const itemClean = match[0].replace(/,(\s*[\]\}])/g, "$1");
          const itemObj = JSON.parse(itemClean);
          items.push(itemObj);
        } catch {}
      }

      if (items.length > 0) {
        const invMatch = clean.match(/"supplierInvoiceNo"\s*:\s*"([^"]+)"/i);
        const dateMatch = clean.match(/"billDate"\s*:\s*"([^"]+)"/i);
        const vendorMatch = clean.match(/"vendorName"\s*:\s*"([^"]+)"/i);
        const gstMatch = clean.match(/"vendorGst"\s*:\s*"([^"]+)"/i);

        return {
          supplierInvoiceNo: invMatch ? invMatch[1] : "",
          billDate: dateMatch ? dateMatch[1] : new Date().toISOString().slice(0, 10),
          dueDate: "",
          vendorName: vendorMatch ? vendorMatch[1] : "",
          vendorGst: gstMatch ? gstMatch[1] : "",
          candidateParties: vendorMatch ? [{ role: "Seller / Header", name: vendorMatch[1], gst: gstMatch ? gstMatch[1] : "" }] : [],
          items,
          remarks: "Recovered via Resilient Parser",
        };
      }

      throw new Error(`AI generated response could not be parsed: ${(err3 as any)?.message || "Invalid JSON"}`);
    }
  }
}

// Extract vendor/party details from M/s or Header section
function parseUniversalInvoiceText(rawText: string) {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  let headerVendorName = "";
  let headerGst = "";
  let headerPhone = "";
  let headerAddress = "";
  let headerDlNo = "";

  let msVendorName = "";
  let msGst = "";
  let msPhone = "";
  let msAddress = "";
  let msDlNo = "";

  let supplierInvoiceNo = "";
  let billDate = "";
  let dueDate = "";

  // 1. Top Header Seller Detection (first 8 lines)
  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const line = lines[i];
    if (
      line.match(/MEDICOS|LABORATORIES|HEALTHCARE|PHARMA|DISTRIBUTORS|ENTERPRISES|AGENCIES|DRUGS|LIMITED|P\.?LTD|PVT LTD|TRADERS|CHEMISTS|DRUGGISTS|SURGICALS/i) &&
      !line.match(/GST\s*INVOICE|TAX\s*INVOICE|Invoice\s*No|CREDIT|DEBIT|BILL\s*NO|M\/S|M\/s|PARTY\s*NAME/i)
    ) {
      headerVendorName = line.replace(/^(M\/S\.?|M\/s\.?)\s*/i, "").trim();
      break;
    }
  }
  if (!headerVendorName && lines.length > 0) {
    headerVendorName = lines[0].replace(/^(TAX\s*INVOICE|GST\s*INVOICE|INVOICE)\s*/i, "").trim();
  }

  // Header GST / DL
  const headerGstMatch = rawText.slice(0, 500).match(/GSTIN?\s*[:\s]*([0-9A-Z]{15})/i);
  if (headerGstMatch) headerGst = headerGstMatch[1].toUpperCase();

  const headerDlMatch = rawText.slice(0, 600).match(/(?:D\.?L\.?\s*NO\.?|Licence\s*No\.?|Lic\.?\s*No\.?)\s*[:\s]*([A-Z0-9\-\/,\s]{5,50})/i);
  if (headerDlMatch) headerDlNo = headerDlMatch[1].trim();

  // 2. M/s or Party Name block (Buyer / Purchaser)
  const msMatch = rawText.match(/(?:M\/s|M\/S|Party\s*Name|Customer\s*Name|Sold\s*To|Billed\s*To)\s*[:\.]?\s*([^\n\r]+)/i);
  if (msMatch) {
    msVendorName = msMatch[1].replace(/^(M\/s|M\/S)\s*/i, "").trim();
  }

  const msGstMatch = rawText.match(/(?:M\/s|M\/S|Party\s*Name|Sold\s*To)[\s\S]{0,300}?GSTIN?\s*[:\s]*([0-9A-Z]{15})/i);
  if (msGstMatch) {
    msGst = msGstMatch[1].toUpperCase();
  }

  const msPhoneMatch = rawText.match(/(?:Ph\.?|Phone\.?|Mob\.?|Mobile\.?)\s*[:\s]*([0-9,\s\/-]{8,25})/i);
  if (msPhoneMatch) {
    msPhone = msPhoneMatch[1].replace(/[^0-9,]/g, "").slice(0, 15);
  }

  const msDlMatch = rawText.match(/(?:D\.?L\.?\s*NO\.?|Licence\s*No\.?|Lic\.?\s*No\.?)\s*[:\s]*([A-Z0-9\-\/,\s]{5,50})/i);
  if (msDlMatch) {
    msDlNo = msDlMatch[1].trim().slice(0, 50);
  }

  const candidateParties = [];
  if (headerVendorName) {
    candidateParties.push({
      role: "Seller / Distributor (Top Header)",
      name: headerVendorName,
      gst: headerGst,
      phone: headerPhone,
      address: headerAddress,
      dlNo: headerDlNo,
    });
  }
  if (msVendorName && msVendorName.toLowerCase() !== headerVendorName.toLowerCase()) {
    candidateParties.push({
      role: "Buyer / Customer (M/s Billed To)",
      name: msVendorName,
      gst: msGst,
      phone: msPhone,
      address: msAddress,
      dlNo: msDlNo,
    });
  }

  const invMatch = rawText.match(/(?:Invoice\s*No\.?|Bill\s*No\.?|Inv\.?\s*No\.?|BILL\s*NO\s*[-:\s])([A-Z0-9\/\-]+)/i);
  if (invMatch) supplierInvoiceNo = invMatch[1].trim();

  const datePatterns = [
    /(?:Invoice\s*Date|Bill\s*Date|Date)\s*[:\s]*(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/i,
    /DATE\s*[:\s]*(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/i,
    /(\d{2}[-\/]\d{2}[-\/]20\d{2})/,
  ];
  for (const pat of datePatterns) {
    const m = rawText.match(pat);
    if (m) { billDate = normalizeDate(m[1]); break; }
  }

  const dueMatch = rawText.match(/(?:Due\s*Date|Payment\s*Due)\s*[:\s]*(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/i);
  if (dueMatch) dueDate = normalizeDate(dueMatch[1]);

  if (!billDate) billDate = new Date().toISOString().slice(0, 10);
  if (!dueDate) {
    const d = new Date(billDate || Date.now());
    d.setDate(d.getDate() + 30);
    dueDate = d.toISOString().slice(0, 10);
  }

  const vendorName = headerVendorName || msVendorName || lines[0] || "";
  const vendorGst = headerGst || msGst || "";
  const vendorDlNo = headerDlNo || msDlNo || "";
  const vendorPhone = headerPhone || msPhone || "";
  const vendorAddress = headerAddress || msAddress || "";

  const items: any[] = [];
  for (const line of lines) {
    const rowMatch = line.match(/^(\d{1,3})\s+(\d{4,8})\s+(.+)$/i);
    if (rowMatch) {
      const hsnCode = rowMatch[2];
      const rest = rowMatch[3].trim();
      const tokens = rest.split(/\s+/);
      const numTokens: number[] = [];
      const nonNumTokens: string[] = [];
      for (const t of tokens) {
        const cleaned = t.replace(/[^0-9.]/g, "");
        const num = parseFloat(cleaned);
        if (!isNaN(num) && /^\d+(?:\.\d+)?$/.test(cleaned) && cleaned.length > 0) {
          numTokens.push(num);
        } else {
          nonNumTokens.push(t);
        }
      }
      let rate = 0, mrp = 0, qty = 1, freeQty = 0, discountPercent = 0, gstPercent = 5;
      let batchNo = "", expDate = "", unit = "Box";
      if (numTokens.length >= 2) {
        const foundGst = numTokens.find((n) => [5, 12, 18, 28].includes(n));
        if (foundGst !== undefined) gstPercent = foundGst;
        const last = numTokens[numTokens.length - 1];
        const foundQty = numTokens.find((n) => Number.isInteger(n) && n >= 1 && n <= 9999 && n !== foundGst);
        if (foundQty !== undefined) qty = foundQty;
        const foundRate = numTokens.find((n) => n > 0 && n < 100000 && n !== last && n !== gstPercent && n !== qty);
        if (foundRate !== undefined) rate = foundRate;
        const mrpToken = numTokens.find((n) => n > rate && n !== last && n !== gstPercent);
        if (mrpToken !== undefined) mrp = mrpToken;
      }
      const expToken = tokens.find((t) => /^\d{1,2}\/\d{2,4}$/.test(t));
      if (expToken) expDate = normalizeExpiry(expToken);
      const batchToken = nonNumTokens.find(
        (t) => t.length >= 3 && /[A-Z]/i.test(t) && !/TAB|CAP|BOX|STRIP|INJ|SYP|MG|ML|GM/i.test(t)
      );
      if (batchToken) batchNo = batchToken;
      const packToken = tokens.find((t) => /\d+X\d+|\d+\*\d+|TAB|CAP|BOX|STRIP|INJ|SYP|ML|MG|GM/i.test(t));
      if (packToken) unit = packToken;
      let productName = "";
      const packIdx = tokens.findIndex((t) => /\d+X\d+|\d+\*\d+|TAB|CAP|BOX|STRIP|INJ|SYP/i.test(t));
      if (packIdx > 0) {
        productName = tokens.slice(0, packIdx).join(" ");
      } else {
        productName = nonNumTokens.slice(0, 4).join(" ");
      }
      if (productName.length > 2) {
        items.push({
          productName: productName.toUpperCase().trim(),
          hsnCode,
          batchNo: batchNo || "",
          expDate: expDate || "",
          mrp,
          qty,
          freeQty,
          unit,
          rate,
          discountPercent,
          gstPercent,
        });
      }
    }
  }

  return {
    supplierInvoiceNo,
    billDate,
    dueDate,
    vendorName,
    vendorGst,
    vendorPhone,
    vendorAddress,
    vendorDlNo,
    buyerName: msVendorName,
    buyerGst: msGst,
    candidateParties,
    rawLines: lines.slice(0, 30),
    items,
    remarks: "Parsed via Fallback Text Extractor",
  };
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let fileBuffer: Buffer | null = null;
    let mimeType = "image/jpeg";
    let base64Data = "";
    let rawTextPayload = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      rawTextPayload = (formData.get("ocrText") as string) || "";
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
        mimeType = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
        base64Data = bufferToBase64(fileBuffer);
        if (mimeType.includes("pdf") || file.name.endsWith(".pdf")) {
          const pdfExtractedText = extractTextFromPdfBuffer(fileBuffer);
          if (pdfExtractedText) rawTextPayload = `${rawTextPayload}\n${pdfExtractedText}`;
        }
      }
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      base64Data = body.base64 || body.image || "";
      mimeType = body.mimeType || "image/jpeg";
      rawTextPayload = body.ocrText || body.text || "";
      if (base64Data.includes(";base64,")) {
        const parts = base64Data.split(";base64,");
        mimeType = parts[0].replace("data:", "");
        base64Data = parts[1];
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey && mimeType.startsWith("image/") && !rawTextPayload.trim()) {
      return NextResponse.json({
        success: false,
        noApiKey: true,
        message: "GEMINI_API_KEY not configured. Please add it to your .env file to enable AI bill reading from images. Get a free key at https://aistudio.google.com/apikey",
      });
    }

    if (apiKey && base64Data) {
      let lastErrorMessage = "";
      try {
        const promptText = `You are a world-class AI pharmaceutical invoice & Goods Receipt Note parser for Indian pharma ERP systems.

Your task is to parse ANY pharmaceutical purchase bill image/PDF (Wholesale GST Invoice, Tax Invoice, Delivery Challan, Marg ERP, Tally, Busy, Vyapar, etc.).

CRITICAL PARTY IDENTIFICATION RULES:
1. SELLER / SUPPLIER / DISTRIBUTOR (Party issuing the bill):
   - Found at the TOP HEADER of the bill / Letterhead (e.g. "BHASIN AGENCIES", "ARORA MEDICOS", "HETERO HEALTHCARE LTD", "SUN PHARMA DISTRIBUTORS").
   - Often has their GSTIN, Phone, Address, DL No (20B, 21B), Email printed at the top or bottom footer.
   - Set this as "vendorName", "vendorGst", "vendorPhone", "vendorAddress", "vendorDlNo".

2. BUYER / BILLED TO / CUSTOMER (Party receiving the bill):
   - Found in "M/s", "Party Name:", "Sold To:", "Billed To:", "Customer:", "Consignee:" block (e.g. "BALA JI MEDICOS"). Strip "M/s" prefix.
   - Set this as "buyerName", "buyerGst", "buyerPhone", "buyerAddress", "buyerDlNo".

3. CANDIDATE PARTIES LIST:
   - Identify ALL parties mentioned in the document (Header Seller, M/s Buyer, Consignee, Transport, etc.) and return them in the "candidateParties" array so the user can easily select the exact supplier from a popup.

4. INVOICE HEADER DETAILS:
   - supplierInvoiceNo: Look for "Invoice No.", "Bill No.", "Challan No.", "GST Inv No." (e.g. "AR26-27/3991", "GST-22000", "MSG-4596").
   - billDate: Look for "Date:", "Invoice Date:", "Bill Date:". Format strictly as YYYY-MM-DD.
   - dueDate: Look for "Due Date:". If missing, set to 30 days after billDate.

5. TABLE LINE ITEMS (EVERY SINGLE ROW MUST BE CAPTURED):
   - productName: Full medicine / product name (e.g. "DR.ULTRA ISABGOL", "GLYCOMET TRIO 1", "ROZUCOR ASP 20 CAP").
   - hsnCode: HSN Code (e.g. "3004", "30049099").
   - batchNo: Batch number (e.g. "DRU25002", "CMR260305", "464799@").
   - expDate: Expiry date in YYYY-MM format (e.g. "2027-02", "2026-12", "2028-03").
   - mrp: Maximum Retail Price per unit.
   - qty: Quantity billed (integer/number).
   - freeQty: Free / scheme / bonus quantity (often labelled "FREE", "F", "SCH.", "SCHEME"). Return 0 if none.
   - unit: Pack size or unit (e.g. "1*100G", "1X10", "10*10", "60ML", "Box", "Strip").
   - rate: Purchase rate per unit before discount.
   - discountPercent: Discount percentage (CD %, TD %, Trade Disc %, Cash Disc %, Disc %).
   - gstPercent: GST percentage (5, 12, 18, 28).

6. Return ONLY valid JSON matching this exact schema (no markdown, no backticks, no wrap):
{
  "supplierInvoiceNo": "string",
  "billDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "vendorName": "string",
  "vendorGst": "string",
  "vendorPhone": "string",
  "vendorAddress": "string",
  "vendorDlNo": "string",
  "buyerName": "string",
  "buyerGst": "string",
  "buyerPhone": "string",
  "buyerAddress": "string",
  "buyerDlNo": "string",
  "candidateParties": [
    {
      "role": "Seller / Distributor (Top Header)",
      "name": "string",
      "gst": "string",
      "phone": "string",
      "address": "string",
      "dlNo": "string"
    },
    {
      "role": "Buyer / Customer (M/s Billed To)",
      "name": "string",
      "gst": "string",
      "phone": "string",
      "address": "string",
      "dlNo": "string"
    }
  ],
  "rawLines": ["string"],
  "items": [
    {
      "productName": "string",
      "hsnCode": "string",
      "batchNo": "string",
      "expDate": "YYYY-MM",
      "mrp": number,
      "qty": number,
      "freeQty": number,
      "unit": "string",
      "rate": number,
      "discountPercent": number,
      "gstPercent": number
    }
  ],
  "remarks": "string"
}`;

        const modelsToTry = [
          "gemini-2.5-flash",
          "gemini-2.0-flash",
          "gemini-1.5-flash",
          "gemini-2.5-pro",
          "gemini-1.5-pro",
          "gemini-flash-latest",
          "gemini-pro-latest",
        ];

        let geminiRes: Response | null = null;
        for (const model of modelsToTry) {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 45000); // 45s timeout for AI vision

          try {
            const r = await fetch(url, {
              signal: controller.signal,
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: promptText },
                      {
                        inlineData: {
                          mimeType: mimeType.startsWith("image/") ? mimeType : "image/jpeg",
                          data: base64Data,
                        },
                      },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: 0.1,
                  topP: 0.95,
                  maxOutputTokens: 8192,
                  responseMimeType: "application/json",
                },
              }),
            });
            clearTimeout(timer);
            if (r.ok) {
              geminiRes = r;
              break;
            } else {
              const errBody = await r.json().catch(() => ({}));
              const msg = errBody?.error?.message || `HTTP ${r.status}: ${r.statusText}`;
              if (!lastErrorMessage || r.status !== 404) {
                lastErrorMessage = msg;
              }
              console.error(`Gemini model ${model} error:`, msg);
            }
          } catch (fetchErr: any) {
            clearTimeout(timer);
            lastErrorMessage = fetchErr.message || "Network request timed out";
            console.error(`Gemini fetch error for model ${model}:`, fetchErr);
          }
        }

        if (geminiRes && geminiRes.ok) {
          const geminiData = await geminiRes.json();
          // Collect text from ALL parts (handles thinking models or multiple text parts)
          const partsArray = geminiData.candidates?.[0]?.content?.parts || [];
          const combinedText = partsArray
            .map((p: any) => p.text || "")
            .filter(Boolean)
            .join("\n");

          const parsed = robustJsonParse(combinedText);

          if (parsed.items && Array.isArray(parsed.items)) {
            parsed.items = parsed.items.map((item: any) => ({
              ...item,
              expDate: item.expDate ? normalizeExpiry(String(item.expDate)) : "",
              mrp: Number(item.mrp || 0),
              qty: Number(item.qty || 1),
              freeQty: Number(item.freeQty || 0),
              rate: Number(item.rate || 0),
              discountPercent: Number(item.discountPercent || 0),
              gstPercent: Number(item.gstPercent || 5),
            }));
          }

          if (!parsed.candidateParties || !Array.isArray(parsed.candidateParties)) {
            parsed.candidateParties = [];
          }
          if (parsed.vendorName && !parsed.candidateParties.some((p: any) => p?.name && p.name.trim().toLowerCase() === parsed.vendorName.trim().toLowerCase())) {
            parsed.candidateParties.unshift({
              role: "Seller / Distributor (Header)",
              name: parsed.vendorName,
              gst: parsed.vendorGst || "",
              phone: parsed.vendorPhone || "",
              address: parsed.vendorAddress || "",
              dlNo: parsed.vendorDlNo || "",
            });
          }
          if (parsed.buyerName && !parsed.candidateParties.some((p: any) => p?.name && p.name.trim().toLowerCase() === parsed.buyerName.trim().toLowerCase())) {
            parsed.candidateParties.push({
              role: "Buyer / Customer (M/s Billed To)",
              name: parsed.buyerName,
              gst: parsed.buyerGst || "",
              phone: parsed.buyerPhone || "",
              address: parsed.buyerAddress || "",
              dlNo: parsed.buyerDlNo || "",
            });
          }

          if (parsed.billDate) parsed.billDate = normalizeDate(String(parsed.billDate));
          if (parsed.dueDate) parsed.dueDate = normalizeDate(String(parsed.dueDate));
          if (!parsed.dueDate && parsed.billDate) {
            const d = new Date(parsed.billDate);
            d.setDate(d.getDate() + 30);
            parsed.dueDate = d.toISOString().slice(0, 10);
          }

          return NextResponse.json({
            success: true,
            source: "Gemini AI Vision",
            data: parsed,
          });
        } else {
          // If this is an image file and AI failed, return explicit error instead of silent empty fallback
          if (mimeType.startsWith("image/") && !rawTextPayload.trim()) {
            return NextResponse.json(
              {
                success: false,
                message: `Gemini AI Vision failed to extract bill: ${lastErrorMessage || "Unable to parse bill image"}`,
              },
              { status: 400 }
            );
          }
        }
      } catch (geminiErr: any) {
        console.error("Gemini Vision API processing error:", geminiErr);
        if (mimeType.startsWith("image/") && !rawTextPayload.trim()) {
          return NextResponse.json(
            {
              success: false,
              message: `AI Bill Parsing Error: ${geminiErr?.message || "Failed to process image with Gemini AI"}`,
            },
            { status: 400 }
          );
        }
      }
    }

    const parsedData = parseUniversalInvoiceText(rawTextPayload);

    // If fallback returned 0 items on an image upload without OCR text, return error
    if (mimeType.startsWith("image/") && (!parsedData.items || parsedData.items.length === 0)) {
      return NextResponse.json(
        {
          success: false,
          message: "Could not extract bill items from the image. Please verify your GEMINI_API_KEY or upload a clearer photo.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      source: "Fallback Text Extractor",
      data: parsedData,
    });
  } catch (error: any) {
    console.error("Parse Bill Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to parse document" },
      { status: 500 }
    );
  }
}