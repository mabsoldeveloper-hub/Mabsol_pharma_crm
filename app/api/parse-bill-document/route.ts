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

// Extract vendor/party details from M/s or Party Name section
function parseUniversalInvoiceText(rawText: string) {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  let vendorName = "";
  let vendorGst = "";
  let vendorPhone = "";
  let vendorAddress = "";
  let vendorDlNo = "";
  let supplierInvoiceNo = "";
  let billDate = "";
  let dueDate = "";

  // 1. M/s or Party Name block priority
  const msMatch = rawText.match(/(?:M\/s|M\/S|Party\s*Name|Customer\s*Name)\s*[:\.]?\s*([^\n\r]+)/i);
  if (msMatch) {
    vendorName = msMatch[1].replace(/^(M\/s|M\/S)\s*/i, "").trim();
  }

  // 2. GST in or near M/s block
  const msGstMatch = rawText.match(/(?:M\/s|M\/S|Party\s*Name)[\s\S]{0,300}?GST\s*[:\s]*([0-9A-Z]{15})/i);
  if (msGstMatch) {
    vendorGst = msGstMatch[1].toUpperCase();
  } else {
    const gstMatches = Array.from(rawText.matchAll(/GSTIN\s*[:\s]*([0-9A-Z]{15})|GST\s*[:\s]*([0-9A-Z]{15})/gi)).map((m) => (m[1] || m[2]).toUpperCase());
    if (gstMatches.length > 0) vendorGst = gstMatches[gstMatches.length - 1] || gstMatches[0];
  }

  // 3. Phone in or near M/s block
  const msPhoneMatch = rawText.match(/(?:Ph\.?|Phone\.?|Mob\.?|Mobile\.?)\s*[:\s]*([0-9,\s\/-]{8,25})/i);
  if (msPhoneMatch) {
    vendorPhone = msPhoneMatch[1].replace(/[^0-9,]/g, "").slice(0, 15);
  }

  // 4. DL No in or near M/s block
  const msDlMatch = rawText.match(/(?:D\.?L\.?\s*NO\.?|Licence\s*No\.?|Lic\.?\s*No\.?)\s*[:\s]*([A-Z0-9\-\/,\s]{5,50})/i);
  if (msDlMatch) {
    vendorDlNo = msDlMatch[1].trim().slice(0, 50);
  }

  // Fallback if M/s block wasn't matched
  if (!vendorName) {
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      if (
        line.match(/MEDICOS|LABORATORIES|HEALTHCARE|PHARMA|DISTRIBUTORS|ENTERPRISES|AGENCIES|DRUGS|LIMITED|P\.?LTD|PVT LTD|TRADERS|CHEMISTS|DRUGGISTS/i) &&
        !line.match(/GST\s*INVOICE|TAX\s*INVOICE|Invoice\s*No|CREDIT|DEBIT|BILL\s*NO/i)
      ) {
        vendorName = line.replace(/^(M\/S\.?|M\/s\.?)\s*/i, "").trim();
        break;
      }
    }
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

  if (!vendorName) vendorName = lines[0] || "";
  if (!billDate) billDate = new Date().toISOString().slice(0, 10);
  if (!dueDate) {
    const d = new Date(billDate || Date.now());
    d.setDate(d.getDate() + 30);
    dueDate = d.toISOString().slice(0, 10);
  }

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

    // If no API key and file is an image (not PDF) → we can't extract from image without AI
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
        const promptText = `You are an expert pharmaceutical purchase bill data extractor for an Indian pharma wholesale/retail ERP system.

Your job is to extract data from purchase bills (GST Invoice / Tax Invoice).

CRITICAL RULES FOR SUPPLIER / VENDOR DETAILS:
1. VENDOR/SUPPLIER = Extract details from the "M/s" or "Party Name:" or "Customer / Purchaser" block (e.g., "M/s BALA JI MEDICOS").
2. vendorName: Extract the party name listed next to "M/s" or "Party Name:" (e.g. "BALA JI MEDICOS"). Remove "M/s" prefix.
3. vendorGst: Extract the GSTIN listed inside or next to the M/s section (e.g. "03BETPD2794E1ZH").
4. vendorPhone: Extract the Phone number listed inside or next to the M/s section (e.g. "7973515913").
5. vendorAddress: Extract the address listed inside the M/s section (e.g. "SHOP NO1#56A, NEAR SBI BANK GURU NANAK NAGAR PATIALA").
6. vendorDlNo: Extract the Drug Licence No. listed under D.L NO. in that section (e.g. "20B-164343,21B-164344").
7. Extract ALL line items (medicines) from the table -- every single row must be captured.
8. For each item extract: productName, hsnCode, batchNo, expiry (convert any MM/YY or MM/YYYY to YYYY-MM format), MRP, qty (quantity ordered), freeQty (free/bonus qty labelled "FREE" or "F"), rate (purchase rate per unit), discountPercent (CD or Trade Disc %), gstPercent (5, 12, 18 or 28).
9. Bill Date: look for "Date:", "Invoice Date:", "DATE :" fields. Format as YYYY-MM-DD (e.g. 2026-08-05).
10. Invoice/Bill No: look for "Invoice No.", "Bill No.", "Challan No.", "GST-" etc. (e.g. "AR26-27/3991").
11. Due Date: "Due Date:" or "Payment Due:" -- if not found, return billDate + 30 days.
12. If a field is not present, return empty string "" or 0.

Return ONLY valid JSON (no markdown, no explanation) matching this exact schema:
{
  "supplierInvoiceNo": "string",
  "billDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "vendorName": "string (Party name from M/s section e.g. BALA JI MEDICOS)",
  "vendorGst": "string (GSTIN from M/s section e.g. 03BETPD2794E1ZH)",
  "vendorPhone": "string (Phone from M/s section e.g. 7973515913)",
  "vendorAddress": "string (Address from M/s section)",
  "vendorDlNo": "string (Drug Licence No from M/s section e.g. 20B-164343,21B-164344)",
  "items": [
    {
      "productName": "string",
      "hsnCode": "string",
      "batchNo": "string",
      "expDate": "YYYY-MM",
      "mrp": number,
      "qty": number,
      "freeQty": number,
      "unit": "string (e.g. 1X10, 10*10, 1*100G)",
      "rate": number,
      "discountPercent": number,
      "gstPercent": number
    }
  ],
  "remarks": "string"
}`;

        const modelsToTry = [
          "gemini-2.5-flash",
          "gemini-2.5-pro",
          "gemini-1.5-pro-latest",
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
                },
              }),
            });
            clearTimeout(timer);
            if (r.ok) {
              geminiRes = r;
              break;
            } else {
              const errBody = await r.json().catch(() => ({}));
              lastErrorMessage = errBody?.error?.message || `HTTP ${r.status}: ${r.statusText}`;
              console.error(`Gemini model ${model} error:`, lastErrorMessage);
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

          const cleanJsonStr = combinedText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
          const jsonMatch = cleanJsonStr.match(/\{[\s\S]*\}/);

          if (!jsonMatch) {
            throw new Error(`AI generated response but no JSON structure was found. Content snippet: ${cleanJsonStr.slice(0, 150)}`);
          }

          const parsed = JSON.parse(jsonMatch[0]);

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