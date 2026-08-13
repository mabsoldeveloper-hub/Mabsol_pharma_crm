"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import SearchableSelect, { OptionItem } from "@/components/SearchableSelect";
import {
  FaArrowLeft,
  FaCamera,
  FaFileUpload,
  FaMagic,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUserPlus,
  FaBoxOpen,
  FaPlusCircle,
  FaTrash,
  FaSave,
  FaTimes,
  FaSync,
  FaReceipt,
  FaBuilding,
  FaFilePdf,
  FaChevronDown,
  FaChevronUp,
  FaShieldAlt,
  FaSlidersH,
} from "react-icons/fa";

interface BillItem {
  productId?: string;
  productCode?: string;
  productName: string;
  hsnCode: string;
  batchNo: string;
  mfgDate?: string;
  expDate: string;
  mrp: number;
  qty: number;
  freeQty: number;
  unit: string;
  rate: number;
  discountPercent: number;
  gstPercent: number;
  isNewProduct?: boolean;
  matchScore?: number;
}

interface SupplierMaster {
  id: string;
  code: string;
  name: string;
  gst: string;
  phone: string;
  city: string;
  address: string;
  isCreditor: boolean;
}

interface ProductMaster {
  id: string;
  code: string;
  name: string;
  hsn: string;
  purchaseRate: number;
  mrp: number;
  gstPercent: number;
  unit: string;
  companyName?: string;
}

interface ColumnConfig {
  hsn: boolean;
  pack: boolean;
  batch: boolean;
  mfgDate: boolean;
  expDate: boolean;
  mrp: boolean;
  freeQty: boolean;
  tradeDisc: boolean;
  gst: boolean;
  taxableAmt: boolean;
  gstAmt: boolean;
}

function computeSimilarity(str1: string, str2: string): number {
  const s1 = (str1 || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const s2 = (str2 || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  const set1 = new Set(s1.split(/\s+/));
  const set2 = new Set(s2.split(/\s+/));
  const common = new Set([...set1].filter((x) => set2.has(x)));
  return (2 * common.size) / (set1.size + set2.size);
}

export default function AiPurchaseBillEntry() {
  const router = useRouter();
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  // File & Camera states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Column Visibility Checkboxes
  const [showColSettings, setShowColSettings] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig>({
    hsn: true,
    pack: true,
    batch: true,
    mfgDate: true,
    expDate: true,
    mrp: true,
    freeQty: true,
    tradeDisc: true,
    gst: true,
    taxableAmt: true,
    gstAmt: true,
  });

  const toggleColumn = (key: keyof ColumnConfig) => {
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Status & Progress
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [showRawInspector, setShowRawInspector] = useState(false);
  const [rawExtractedData, setRawExtractedData] = useState<any>(null);
  const [noApiKey, setNoApiKey] = useState(false);

  // Master Data
  const [suppliersList, setSuppliersList] = useState<SupplierMaster[]>([]);
  const [productsList, setProductsList] = useState<ProductMaster[]>([]);

  // Form State
  const [billNumberCustom, setBillNumberCustom] = useState("");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [billDate, setBillDate] = useState("2026-06-20");
  const [dueDate, setDueDate] = useState("2026-07-20");

  // Supplier details
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [extractedVendorName, setExtractedVendorName] = useState("");
  const [matchedDbVendorName, setMatchedDbVendorName] = useState("");
  const [vendorGst, setVendorGst] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorDlNo, setVendorDlNo] = useState("");
  const [isNewSupplier, setIsNewSupplier] = useState(false);
  const [supplierMatchScore, setSupplierMatchScore] = useState<number>(0);
  const [registeringSupplier, setRegisteringSupplier] = useState(false);

  // Tax Type (Interstate IGST vs Intrastate CGST+SGST)
  const [taxType, setTaxType] = useState<"Interstate" | "Intrastate">("Interstate");

  // Line Items
  const [items, setItems] = useState<BillItem[]>([]);
  const [remarks, setRemarks] = useState("Parsed via High-Precision Pharma Invoice Extractor");
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Success Modal
  const [successModal, setSuccessModal] = useState(false);
  const [createdBillNo, setCreatedBillNo] = useState("");

  // Fetch Master Data
  const fetchMasters = useCallback(async () => {
    setLoadingMasters(true);
    try {
      const params = new URLSearchParams();
      if (selectedCompany?._id) params.set("companyId", selectedCompany._id);

      const res = await fetch(`/api/purchase/master-options?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setSuppliersList(json.suppliers || []);
          setProductsList(json.products || []);
        }
      }
    } catch (err) {
      console.error("Master Options Error:", err);
    } finally {
      setLoadingMasters(false);
    }
  }, [selectedCompany]);

  // Fetch Next Voucher Number VCN
  const fetchNextVcn = useCallback(async () => {
    try {
      const res = await fetch("/api/purchase/invoice?action=nextNumber");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.nextVcn) {
          setBillNumberCustom(json.nextVcn);
        }
      }
    } catch (err) {
      console.error("VCN Fetch Error:", err);
    }
  }, []);

  useEffect(() => {
    fetchMasters();
    fetchNextVcn();
  }, [fetchMasters, fetchNextVcn]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // File upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  // Drag & Drop handler
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  // Camera handlers
  const startCamera = async () => {
    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Unable to access camera. Please allow permissions or upload a file.");
      setShowCameraModal(false);
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      setMediaStream(null);
    }
    setShowCameraModal(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const capturedFile = new File([blob], `scanned_bill_${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            setSelectedFile(capturedFile);
            setPreviewUrl(URL.createObjectURL(capturedFile));
          }
        }, "image/jpeg");
      }
    }
    stopCamera();
  };

  // High Precision Supplier Matching
  const matchSupplier = (parsedVendorName: string, parsedGst: string, currentSuppliers: SupplierMaster[]) => {
    const cleanGst = (parsedGst || "").trim().toUpperCase();
    const cleanName = (parsedVendorName || "").trim().toUpperCase();

    setExtractedVendorName(cleanName);

    let matched = currentSuppliers.find(
      (s) => cleanGst && s.gst && s.gst.toUpperCase() === cleanGst
    );

    let score = 0;
    if (matched) {
      score = 1.0;
    } else {
      let bestScore = 0;
      currentSuppliers.forEach((s) => {
        const sim = computeSimilarity(cleanName, s.name);
        if (sim > bestScore) {
          bestScore = sim;
          matched = s;
        }
      });
      if (bestScore >= 0.6) {
        score = bestScore;
      } else {
        matched = undefined;
        score = 0;
      }
    }

    if (matched) {
      setSelectedSupplierId(matched.id);
      setMatchedDbVendorName(matched.name);
      setVendorName(cleanName || matched.name);
      setVendorGst(cleanGst || matched.gst || "");
      setVendorPhone(matched.phone || "");
      setVendorAddress(matched.address || "");
      setIsNewSupplier(false);
      setSupplierMatchScore(score);
    } else {
      setSelectedSupplierId("");
      setMatchedDbVendorName("");
      setVendorName(cleanName);
      setVendorGst(cleanGst);
      setVendorPhone("");
      setVendorAddress("");
      setIsNewSupplier(true);
      setSupplierMatchScore(0);
    }
  };

  // High Precision Product Matching
  const matchProducts = (parsedItems: any[], currentProducts: ProductMaster[]): BillItem[] => {
    return parsedItems.map((raw) => {
      const rawName = String(raw.productName || "").trim().toUpperCase();

      let matchedProd: ProductMaster | null = null;
      let bestScore = 0;

      for (const p of currentProducts) {
        const sim = computeSimilarity(rawName, p.name);
        if (sim > bestScore) {
          bestScore = sim;
          matchedProd = p;
        }
      }

      if (matchedProd && bestScore >= 0.4) {
        const p: ProductMaster = matchedProd;
        return {
          productId: p.id,
          productCode: p.code,
          productName: p.name,
          hsnCode: raw.hsnCode || p.hsn || "3004",
          batchNo: raw.batchNo || "BATCH-01",
          mfgDate: raw.mfgDate || "",
          expDate: raw.expDate || "2028-02",
          mrp: Number(raw.mrp || p.mrp || 0),
          qty: Number(raw.qty || 1),
          freeQty: Number(raw.freeQty || 0),
          unit: raw.unit || p.unit || "Box",
          rate: Number(raw.rate || p.purchaseRate || 0),
          discountPercent: Number(raw.discountPercent || 0),
          gstPercent: Number(raw.gstPercent || p.gstPercent || 5),
          isNewProduct: false,
          matchScore: bestScore,
        };
      }

      return {
        productName: rawName || "MEDICINE ITEM",
        hsnCode: raw.hsnCode || "3004",
        batchNo: raw.batchNo || "BATCH-01",
        mfgDate: raw.mfgDate || "",
        expDate: raw.expDate || "2028-02",
        mrp: Number(raw.mrp || 0),
        qty: Number(raw.qty || 1),
        freeQty: Number(raw.freeQty || 0),
        unit: raw.unit || "Box",
        rate: Number(raw.rate || 0),
        discountPercent: Number(raw.discountPercent || 0),
        gstPercent: Number(raw.gstPercent || 5),
        isNewProduct: true,
        matchScore: 0,
      };
    });
  };

  const [parseError, setParseError] = useState<string | null>(null);

  // Trigger Document Extraction
  const handleParseDocument = async () => {
    if (!selectedFile) {
      alert("Please upload a purchase bill document or click a photo first.");
      return;
    }

    setParsing(true);
    setParseError(null);
    setParseProgress("Uploading document & running AI Multimodal extraction...");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/parse-bill-document", {
        method: "POST",
        body: formData,
      });

      setParseProgress("Parsing header, items & auto-matching database records...");

      const json = await res.json().catch(() => null);

      if (res.ok && json) {
        if (json.noApiKey) {
          setNoApiKey(true);
          setParseError("GEMINI_API_KEY is not configured in .env file.");
          alert("GEMINI_API_KEY not configured. Please add it to your .env file.");
          return;
        }

        if (json.success && json.data) {
          const data = json.data;
          setRawExtractedData(data);
          setNoApiKey(false);

          if (data.supplierInvoiceNo) setSupplierInvoiceNo(data.supplierInvoiceNo);
          if (data.billDate) setBillDate(data.billDate);
          if (data.dueDate) setDueDate(data.dueDate);
          if (data.vendorDlNo) setVendorDlNo(data.vendorDlNo);

          // Supplier match
          matchSupplier(data.vendorName, data.vendorGst, suppliersList);

          // Items match
          const hasItems = data.items && Array.isArray(data.items) && data.items.length > 0;
          if (hasItems) {
            const mapped = matchProducts(data.items, productsList);
            setItems(mapped);
          } else {
            alert("⚠️ AI processed the bill, but no items could be detected. Please check if the document is clear.");
          }

          // Auto-detect tax type based on vendor GSTIN state code
          const vendorStateCode = (data.vendorGst || "").slice(0, 2);
          const companyStateCode = (selectedCompany?.gstNo || "03").slice(0, 2);
          if (vendorStateCode && companyStateCode && vendorStateCode === companyStateCode) {
            setTaxType("Intrastate");
          } else {
            setTaxType("Interstate");
          }

          if (json.source) {
            setRemarks(`Parsed via ${json.source}`);
          }
        } else {
          const errMsg = json.message || "Failed to extract purchase bill data.";
          setParseError(errMsg);
          alert(`❌ Extraction Error: ${errMsg}`);
        }
      } else {
        const errMsg = json?.message || `Server Error ${res.status}: ${res.statusText}`;
        setParseError(errMsg);
        alert(`❌ Error from Server: ${errMsg}`);
      }
    } catch (err: any) {
      console.error("Parse error:", err);
      const errMsg = err?.message || "Error occurred while extracting document.";
      setParseError(errMsg);
      alert(`❌ Network/Processing Error: ${errMsg}`);
    } finally {
      setParsing(false);
      setParseProgress("");
    }
  };

  // Quick Register Supplier
  const handleQuickRegisterSupplier = async () => {
    if (!vendorName.trim()) {
      alert("Please enter Supplier Name.");
      return;
    }

    setRegisteringSupplier(true);
    try {
      const res = await fetch("/api/purchase/quick-create-supplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: vendorName,
          gst: vendorGst,
          phone: vendorPhone,
          address: vendorAddress,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.supplier) {
          setSuppliersList((prev) => [json.supplier, ...prev]);
          setSelectedSupplierId(json.supplier.id);
          setIsNewSupplier(false);
          setSupplierMatchScore(1.0);
          alert(`Supplier "${json.supplier.name}" registered successfully!`);
        } else {
          alert(json.message || "Failed to register supplier.");
        }
      }
    } catch (err) {
      console.error("Register supplier error:", err);
    } finally {
      setRegisteringSupplier(false);
    }
  };

  // Row Manipulation
  const handleItemChange = (index: number, field: keyof BillItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productName: "",
        hsnCode: "3004",
        batchNo: "BATCH-01",
        mfgDate: "",
        expDate: "2028-02",
        mrp: 0,
        qty: 1,
        freeQty: 0,
        unit: "Box",
        rate: 0,
        discountPercent: 0,
        gstPercent: 5,
        isNewProduct: true,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Computations
  const computedItems = items.map((it) => {
    const qty = Number(it.qty || 0);
    const rate = Number(it.rate || 0);
    const discPercent = Number(it.discountPercent || 0);
    const gstPercent = Number(it.gstPercent || 0);

    const gross = qty * rate;
    const discAmt = gross * (discPercent / 100);
    const taxableAmount = Math.max(0, gross - discAmt);
    const gstAmount = taxableAmount * (gstPercent / 100);
    const total = taxableAmount + gstAmount;

    return { ...it, taxableAmount, gstAmount, total };
  });

  const subtotalTaxable = computedItems.reduce((sum, item) => sum + item.taxableAmount, 0);
  const totalTaxAmount = computedItems.reduce((sum, item) => sum + item.gstAmount, 0);
  const totalDiscount = computedItems.reduce((sum, item) => {
    const gross = item.qty * item.rate;
    return sum + gross * (item.discountPercent / 100);
  }, 0);

  const cgst = taxType === "Intrastate" ? totalTaxAmount / 2 : 0;
  const sgst = taxType === "Intrastate" ? totalTaxAmount / 2 : 0;
  const igst = taxType === "Interstate" ? totalTaxAmount : 0;

  const rawNetTotal = subtotalTaxable + totalTaxAmount;
  const netAmount = Math.round(rawNetTotal);
  const roundOff = Number((netAmount - rawNetTotal).toFixed(2));
  const balanceAmount = Math.max(0, netAmount - paidAmount);

  // Save Purchase Bill
  const handleSavePurchaseBill = async () => {
    if (!vendorName.trim()) {
      alert("Please specify a Vendor/Supplier Name.");
      return;
    }
    if (computedItems.length === 0) {
      alert("Please add at least one line item.");
      return;
    }

    setSaving(true);
    try {
      let finalVendorId = selectedSupplierId;
      if (isNewSupplier && !selectedSupplierId) {
        const supRes = await fetch("/api/purchase/quick-create-supplier", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: vendorName,
            gst: vendorGst,
            phone: vendorPhone,
            address: vendorAddress,
          }),
        });
        if (supRes.ok) {
          const supJson = await supRes.json();
          if (supJson.success && supJson.supplier) {
            finalVendorId = supJson.supplier.id;
          }
        }
      }

      const finalItems = await Promise.all(
        computedItems.map(async (it) => {
          if (it.isNewProduct && !it.productId) {
            try {
              const prodRes = await fetch("/api/purchase/quick-create-product", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: it.productName,
                  hsn: it.hsnCode,
                  purchaseRate: it.rate,
                  mrp: it.mrp,
                  gstPercent: it.gstPercent,
                  unit: it.unit,
                }),
              });
              if (prodRes.ok) {
                const prodJson = await prodRes.json();
                if (prodJson.success && prodJson.product) {
                  return {
                    ...it,
                    productId: prodJson.product.id,
                    productCode: prodJson.product.code,
                  };
                }
              }
            } catch (err) {
              console.error("Auto product creation error:", err);
            }
          }
          return it;
        })
      );

      const payload = {
        billNumber: billNumberCustom || `PUR-${Date.now()}`,
        supplierInvoiceNo,
        billDate,
        dueDate,
        companyId: selectedCompany?._id || "",
        companyCode: selectedCompany?.companyCode || "",
        fyId: selectedFY?._id || "",
        fyCode: selectedFY?.fyCode || "",
        vendorId: finalVendorId,
        vendorName,
        vendorGst,
        vendorPhone,
        vendorAddress,
        items: finalItems,
        subtotal: subtotalTaxable,
        totalDiscount,
        cgst,
        sgst,
        igst,
        totalTax: totalTaxAmount,
        roundOff,
        netAmount,
        paidAmount,
        balanceAmount,
        paymentStatus: paidAmount >= netAmount ? "Paid" : paidAmount > 0 ? "Partial" : "Pending",
        remarks,
      };

      const saveRes = await fetch("/api/purchase/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const saveJson = await saveRes.json().catch(() => null);
      if (saveRes.ok && saveJson?.success) {
        setCreatedBillNo(saveJson.bill?.billNumber || payload.billNumber);
        setSuccessModal(true);
      } else {
        alert(saveJson?.message || "Failed to save Purchase Bill.");
      }
    } catch (err) {
      console.error("Save Purchase Bill error:", err);
      alert("Error occurred while saving purchase bill.");
    } finally {
      setSaving(false);
    }
  };

  const supplierOptions: OptionItem[] = suppliersList.map((s) => ({
    value: s.id,
    label: `${s.name} ${s.gst ? `(${s.gst})` : ""}`,
  }));

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-3 sm:p-5 md:p-8 text-slate-800 dark:text-slate-100 font-sans transition-colors">
      {/* Executive Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6 md:p-8 rounded-3xl shadow-xl shadow-amber-500/10 border border-white/20 dark:border-slate-800 mb-6 text-white">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/purchase/invoice"
              className="p-3 rounded-2xl bg-white/20 dark:bg-slate-800/80 hover:bg-white/30 backdrop-blur-md text-white transition-all shadow-sm group"
            >
              <FaArrowLeft className="text-base group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-200 dark:text-amber-400 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 dark:bg-amber-950/60 backdrop-blur-md border border-white/20 text-[10px] flex items-center gap-1">
                  <FaMagic className="text-amber-300 animate-spin" /> AI Vision Engine v2.5
                </span>
                <span>• Purchase Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
                Smart AI Purchase Bill Scan & Auto-Fill
              </h1>
              <p className="text-xs sm:text-sm text-white/80 dark:text-slate-300 mt-1 max-w-2xl">
                Scan Marg ERP, Tally, Busy, Goods Receipt Notes or PDF bills. Extracts line items, matches suppliers, and posts purchase records automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <button
              onClick={() => setShowColSettings(!showColSettings)}
              className="px-4 py-2.5 text-xs font-bold rounded-2xl bg-white/20 hover:bg-white/30 dark:bg-slate-800 dark:hover:bg-slate-700 backdrop-blur-md text-white border border-white/20 transition-all flex items-center gap-2 shadow-sm"
            >
              <FaSlidersH /> Customize Columns ⚙️
            </button>
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
                setItems([]);
                setVendorName("");
                setVendorGst("");
              }}
              className="px-4 py-2.5 text-xs font-bold rounded-2xl bg-white/20 hover:bg-white/30 dark:bg-slate-800 dark:hover:bg-slate-700 backdrop-blur-md text-white border border-white/20 transition-all flex items-center gap-2 shadow-sm"
            >
              <FaSync /> Reset Form
            </button>
          </div>
        </div>

        {/* Column Customization Drawer */}
        {showColSettings && (
          <div className="mt-6 p-4 bg-white/10 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-slate-700 text-xs space-y-3 animate-in fade-in duration-200">
            <div className="flex justify-between items-center text-white">
              <span className="font-bold uppercase tracking-wider flex items-center gap-2">
                <FaSlidersH /> Toggle Table Column Visibility (S.N, HSN, Pack, Batch, Mfg, Exp, MRP, Rate, Dis %, IGST %, Taxable, Total)
              </span>
              <button
                onClick={() => setShowColSettings(false)}
                className="text-xs text-white/80 hover:text-white font-bold"
              >
                Close ✕
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
              {[
                { key: "hsn", label: "HSN Code" },
                { key: "pack", label: "Pack / Unit" },
                { key: "batch", label: "Batch No" },
                { key: "mfgDate", label: "Mfg Date" },
                { key: "expDate", label: "Expiry Date" },
                { key: "mrp", label: "MRP (₹)" },
                { key: "freeQty", label: "Free Qty" },
                { key: "tradeDisc", label: "Trade Disc %" },
                { key: "gst", label: "GST %" },
                { key: "taxableAmt", label: "Taxable Value" },
                { key: "gstAmt", label: "GST Amount" },
              ].map((col) => {
                const active = columns[col.key as keyof ColumnConfig];
                return (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-white bg-white/10 dark:bg-slate-900/80 p-2 rounded-xl border border-white/20"
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleColumn(col.key as keyof ColumnConfig)}
                      className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500"
                    />
                    <span>{col.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* NO API KEY BANNER */}
      {noApiKey && (
        <div className="mb-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl p-5 flex gap-4">
          <div className="text-red-500 text-2xl mt-1">⚠️</div>
          <div className="flex-1">
            <h3 className="font-bold text-red-700 dark:text-red-400 text-sm mb-1">
              Gemini AI Key Configure Nahi Hai — Bill Data Extract Nahi Ho Sakta
            </h3>
            <p className="text-xs text-red-600 dark:text-red-300 mb-3">
              Image se data automatically pick karne ke liye <strong>GEMINI_API_KEY</strong> chahiye. Yeh bilkul free hai.
            </p>
            <div className="bg-white dark:bg-red-950/60 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-300 space-y-1 border border-red-100 dark:border-red-800">
              <p className="font-bold text-red-700 dark:text-red-300 mb-2">📋 Steps to fix:</p>
              <p>1️⃣ Open: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">https://aistudio.google.com/apikey</a></p>
              <p>2️⃣ Google account se login karo → "Create API Key" click karo</p>
              <p>3️⃣ Key copy karo (AIzaSy... jaisi dikhegi)</p>
              <p>4️⃣ Project root mein <code className="bg-red-100 dark:bg-red-900 px-1 rounded">.env</code> file mein yeh line add karo:</p>
              <pre className="bg-slate-100 dark:bg-slate-900 rounded-lg p-2 mt-1 text-green-700 dark:text-green-400 font-mono text-[11px]">GEMINI_API_KEY=AIzaSy_aapki_key_yahan</pre>
              <p>5️⃣ Dev server restart karo: <code className="bg-red-100 dark:bg-red-900 px-1 rounded">npm run dev</code></p>
            </div>
          </div>
        </div>
      )}

      {/* PARSE ERROR BANNER */}
      {parseError && !noApiKey && (
        <div className="mb-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start justify-between gap-3 text-red-700 dark:text-red-300">
          <div className="flex items-start gap-3">
            <span className="text-xl">❌</span>
            <div>
              <h4 className="font-bold text-sm">AI Bill Extraction Error</h4>
              <p className="text-xs font-mono mt-1 text-red-600 dark:text-red-400">{parseError}</p>
            </div>
          </div>
          <button
            onClick={() => setParseError(null)}
            className="text-xs font-bold px-2 py-1 bg-red-100 dark:bg-red-900 rounded-lg hover:bg-red-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Responsive 12 Columns Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Upload, Camera & Supplier Matching (4 Cols on XL) */}
        <div className="xl:col-span-4 space-y-6">
          {/* Card 1: Upload / Camera Dropzone */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[11px] font-extrabold">
                  1
                </span>
                Upload or Capture Invoice
              </h2>
            </div>

            {/* Dropzone Container */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-amber-300 dark:border-amber-700/60 hover:border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 rounded-3xl p-6 text-center transition-all cursor-pointer relative overflow-hidden group shadow-inner"
            >
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />

              {previewUrl ? (
                <div className="relative group/prev">
                  <img
                    src={previewUrl}
                    alt="Purchase Bill Preview"
                    className="max-h-56 mx-auto rounded-2xl object-contain shadow-lg border border-slate-200 dark:border-slate-700"
                  />
                  <div className="mt-3 text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {selectedFile?.name}
                  </div>
                </div>
              ) : selectedFile ? (
                <div className="py-8 flex flex-col items-center">
                  <FaFilePdf className="text-5xl text-red-500 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {selectedFile.name}
                  </span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    ✓ PDF Invoice Ready
                  </span>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/20">
                    <FaFileUpload />
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Drag & Drop Purchase Bill / PDF
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports Marg ERP, Busy, Tally, PDF & Photos
                  </p>
                </div>
              )}
            </div>

            {/* Upload Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={startCamera}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md"
              >
                <FaCamera className="text-amber-400" /> Click Photo
              </button>

              <button
                onClick={handleParseDocument}
                disabled={!selectedFile || parsing}
                className={`w-full py-3 px-4 rounded-2xl text-white text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg ${
                  !selectedFile || parsing
                    ? "bg-slate-300 dark:bg-slate-800 cursor-not-allowed text-slate-500 shadow-none"
                    : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/25"
                }`}
              >
                {parsing ? (
                  <>
                    <FaSync className="animate-spin text-sm" /> Extracting...
                  </>
                ) : (
                  <>
                    <FaMagic className="text-sm" /> Auto Extract Data
                  </>
                )}
              </button>
            </div>

            {parseProgress && (
              <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2.5 animate-pulse font-medium">
                <FaMagic className="text-amber-500 shrink-0" />
                <span>{parseProgress}</span>
              </div>
            )}
          </div>

          {/* Card 2: Supplier Detection & Party Matching */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[11px] font-extrabold">
                2
              </span>
              Supplier Detection & Matching
            </h2>

            {/* Match Status Badge */}
            {vendorName && (
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all ${
                  isNewSupplier
                    ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"
                    : "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isNewSupplier ? (
                    <FaExclamationTriangle className="text-amber-500 text-base shrink-0" />
                  ) : (
                    <FaCheckCircle className="text-emerald-500 text-base shrink-0" />
                  )}
                  <div>
                    <div>{isNewSupplier ? "New Supplier Detected" : "Matched Existing Supplier"}</div>
                    {!isNewSupplier && (
                      <div className="text-[10px] opacity-80 font-normal">
                        Match Confidence: {Math.round(supplierMatchScore * 100)}%
                      </div>
                    )}
                  </div>
                </div>

                {isNewSupplier && (
                  <button
                    onClick={handleQuickRegisterSupplier}
                    disabled={registeringSupplier}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1 shadow-sm shrink-0"
                  >
                    <FaUserPlus /> {registeringSupplier ? "Saving..." : "Register Party"}
                  </button>
                )}
              </div>
            )}

            {/* Quick Vendor Name Selector: Paper Name vs DB Matched Name */}
            {extractedVendorName && matchedDbVendorName && extractedVendorName !== matchedDbVendorName && (
              <div className="p-3 bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl text-xs space-y-1.5 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Select Vendor Name Option:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setVendorName(extractedVendorName)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                      vendorName === extractedVendorName
                        ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    Paper Name: {extractedVendorName}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVendorName(matchedDbVendorName)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                      vendorName === matchedDbVendorName
                        ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    DB Name: {matchedDbVendorName}
                  </button>
                </div>
              </div>
            )}

            {/* Select Supplier Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                Select Supplier from Database:
              </label>
              <SearchableSelect
                options={supplierOptions}
                value={selectedSupplierId}
                onChange={(val) => {
                  setSelectedSupplierId(val);
                  const matched = suppliersList.find((s) => s.id === val);
                  if (matched) {
                    setVendorName(matched.name);
                    setVendorGst(matched.gst);
                    setVendorPhone(matched.phone);
                    setVendorAddress(matched.address);
                    setIsNewSupplier(false);
                    setSupplierMatchScore(1.0);
                  }
                }}
                placeholder="Search Supplier Name / GST..."
              />
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5 pt-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-white"
                  placeholder="e.g. WHITE EAGLE LABORATORIES"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    GSTIN No
                  </label>
                  <input
                    type="text"
                    value={vendorGst}
                    onChange={(e) => setVendorGst(e.target.value)}
                    className="w-full mt-1.5 px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none uppercase font-mono text-slate-900 dark:text-white"
                    placeholder="15-digit GSTIN"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Drug License No
                  </label>
                  <input
                    type="text"
                    value={vendorDlNo}
                    onChange={(e) => setVendorDlNo(e.target.value)}
                    className="w-full mt-1.5 px-3.5 py-2.5 text-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-white"
                    placeholder="e.g. 1395-B, 1396-OSP"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Invoice Header & Line Items Table (8 Cols on XL) */}
        <div className="xl:col-span-8 space-y-6">
          {/* Card 3: Invoice Header & Tax Controls */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[11px] font-extrabold">
                  3
                </span>
                Invoice Header & Tax Calculation Mode
              </h2>

              {/* Tax Type Interactive Toggle Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 self-stretch sm:self-auto justify-center">
                <button
                  type="button"
                  onClick={() => setTaxType("Interstate")}
                  className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all ${
                    taxType === "Interstate"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Interstate (IGST)
                </button>
                <button
                  type="button"
                  onClick={() => setTaxType("Intrastate")}
                  className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all ${
                    taxType === "Intrastate"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Intrastate (CGST + SGST)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Voucher / VCN *
                </label>
                <input
                  type="text"
                  value={billNumberCustom}
                  onChange={(e) => setBillNumberCustom(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-amber-600 dark:text-amber-400 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Supplier Inv No *
                </label>
                <input
                  type="text"
                  value={supplierInvoiceNo}
                  onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-white"
                  placeholder="e.g. P000030"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Bill Date *
                </label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Extracted Line Items Table */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[11px] font-extrabold">
                  4
                </span>
                Extracted Line Items ({computedItems.length})
              </h2>

              <button
                onClick={handleAddItem}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <FaPlusCircle /> Add Item
              </button>
            </div>

            {/* Responsive Table Wrapper */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 max-h-[460px] scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[1250px] border-collapse">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 sticky top-0 backdrop-blur-md z-10">
                  <tr>
                    <th className="py-3 px-3.5 min-w-[280px]">Product / Medicine</th>
                    {columns.hsn && <th className="py-3 px-2 min-w-[85px]">HSN</th>}
                    {columns.pack && <th className="py-3 px-2 min-w-[80px]">Pack</th>}
                    {columns.batch && <th className="py-3 px-2 min-w-[95px]">Batch</th>}
                    {columns.mfgDate && <th className="py-3 px-2 min-w-[125px]">Mfg</th>}
                    {columns.expDate && <th className="py-3 px-2 min-w-[125px]">Exp</th>}
                    <th className="py-3 px-2 min-w-[80px] text-right">Qty</th>
                    {columns.freeQty && <th className="py-3 px-2 min-w-[75px] text-right">Free</th>}
                    <th className="py-3 px-2 min-w-[95px] text-right">Rate</th>
                    {columns.mrp && <th className="py-3 px-2 min-w-[90px] text-right">MRP</th>}
                    {columns.tradeDisc && <th className="py-3 px-2 min-w-[75px] text-right">Dis%</th>}
                    {columns.gst && <th className="py-3 px-2 min-w-[75px] text-right">GST%</th>}
                    {columns.taxableAmt && <th className="py-3 px-3 min-w-[95px] text-right">Taxable (₹)</th>}
                    {columns.gstAmt && <th className="py-3 px-3 min-w-[90px] text-right">GST Amt</th>}
                    <th className="py-3 px-3 min-w-[95px] text-right">Amount</th>
                    <th className="py-3 px-2 w-10 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                  {computedItems.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-slate-400 font-medium">
                        No items added yet. Click &quot;Auto Extract Data&quot; or &quot;Add Item&quot;.
                      </td>
                    </tr>
                  ) : (
                    computedItems.map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-amber-50/40 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-2.5 px-3 min-w-[280px]">
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) =>
                                handleItemChange(idx, "productName", e.target.value)
                              }
                              className="w-full font-bold bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-amber-500 outline-none text-slate-900 dark:text-slate-100"
                              placeholder="Product Name"
                            />
                            <div className="flex items-center gap-1.5 text-[10px]">
                              {item.isNewProduct ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                                  ★ New Product
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                                  ✓ Matched ({Math.round((item.matchScore || 1) * 100)}%)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {columns.hsn && (
                          <td className="py-2.5 px-2 min-w-[85px]">
                            <input
                              type="text"
                              value={item.hsnCode}
                              onChange={(e) => handleItemChange(idx, "hsnCode", e.target.value)}
                              className="w-full min-w-0 px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </td>
                        )}

                        {columns.pack && (
                          <td className="py-2.5 px-2 min-w-[80px]">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                              className="w-full min-w-0 px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none focus:ring-1 focus:ring-amber-500"
                              placeholder="10*10"
                            />
                          </td>
                        )}

                        {columns.batch && (
                          <td className="py-2.5 px-2 min-w-[95px]">
                            <input
                              type="text"
                              value={item.batchNo}
                              onChange={(e) => handleItemChange(idx, "batchNo", e.target.value)}
                              className="w-full min-w-0 px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none font-mono focus:ring-1 focus:ring-amber-500"
                            />
                          </td>
                        )}

                        {columns.mfgDate && (
                          <td className="py-2.5 px-2 min-w-[125px]">
                            <input
                              type="text"
                              value={item.mfgDate || ""}
                              onChange={(e) => handleItemChange(idx, "mfgDate", e.target.value)}
                              className="w-full min-w-0 px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none focus:ring-1 focus:ring-amber-500"
                              placeholder="MM/YY"
                            />
                          </td>
                        )}

                        {columns.expDate && (
                          <td className="py-2.5 px-2 min-w-[125px]">
                            <input
                              type="text"
                              value={item.expDate}
                              onChange={(e) => handleItemChange(idx, "expDate", e.target.value)}
                              className="w-full min-w-0 px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none focus:ring-1 focus:ring-amber-500"
                              placeholder="YYYY-MM"
                            />
                          </td>
                        )}

                        <td className="py-2.5 px-2 text-right min-w-[80px]">
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) =>
                              handleItemChange(idx, "qty", parseFloat(e.target.value) || 0)
                            }
                            className="w-full min-w-0 px-2 py-1.5 text-xs text-right rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none font-bold focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>

                        {columns.freeQty && (
                          <td className="py-2.5 px-2 text-right min-w-[75px]">
                            <input
                              type="number"
                              value={item.freeQty}
                              onChange={(e) =>
                                handleItemChange(idx, "freeQty", parseFloat(e.target.value) || 0)
                              }
                              className="w-full min-w-0 px-2 py-1.5 text-xs text-right rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                        )}

                        <td className="py-2.5 px-2 text-right min-w-[95px]">
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) =>
                              handleItemChange(idx, "rate", parseFloat(e.target.value) || 0)
                            }
                            className="w-full min-w-0 px-2 py-1.5 text-xs text-right rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </td>

                        {columns.mrp && (
                          <td className="py-2.5 px-2 text-right min-w-[90px]">
                            <input
                              type="number"
                              value={item.mrp}
                              onChange={(e) =>
                                handleItemChange(idx, "mrp", parseFloat(e.target.value) || 0)
                              }
                              className="w-full min-w-0 px-2 py-1.5 text-xs text-right rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                        )}

                        {columns.tradeDisc && (
                          <td className="py-2.5 px-2 text-right min-w-[75px]">
                            <input
                              type="number"
                              value={item.discountPercent}
                              onChange={(e) =>
                                handleItemChange(
                                  idx,
                                  "discountPercent",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full min-w-0 px-2 py-1.5 text-xs text-right rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                        )}

                        {columns.gst && (
                          <td className="py-2.5 px-2 text-right min-w-[75px]">
                            <input
                              type="number"
                              value={item.gstPercent}
                              onChange={(e) =>
                                handleItemChange(
                                  idx,
                                  "gstPercent",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full min-w-0 px-2 py-1.5 text-xs text-right rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 outline-none font-bold text-amber-600 dark:text-amber-400 focus:ring-1 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                        )}

                        {columns.taxableAmt && (
                          <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 dark:text-white min-w-[95px]">
                            ₹{item.taxableAmount.toFixed(2)}
                          </td>
                        )}

                        {columns.gstAmt && (
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                            ₹{item.gstAmount.toFixed(2)}
                          </td>
                        )}

                        <td className="py-2.5 px-3 text-right font-black text-amber-600 dark:text-amber-400">
                          ₹{item.total.toFixed(2)}
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Raw Extracted Payload Accordion */}
          {rawExtractedData && (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800">
              <button
                onClick={() => setShowRawInspector(!showRawInspector)}
                className="w-full flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                <span className="flex items-center gap-2">
                  <FaShieldAlt className="text-amber-500" /> View Raw AI Extracted JSON Payload
                </span>
                {showRawInspector ? <FaChevronUp /> : <FaChevronDown />}
              </button>

              {showRawInspector && (
                <pre className="mt-3 p-4 bg-slate-950 text-emerald-400 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-60 border border-slate-800">
                  {JSON.stringify(rawExtractedData, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Card 5: Financial Summary & Final Post Button */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row gap-6 justify-between items-start">
            <div className="w-full md:w-1/2 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Payment Paid Amount (₹)
                </label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 text-sm font-bold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Remarks / Notes
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 text-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Right Calculations Summary Block */}
            <div className="w-full md:w-1/2 bg-slate-50/80 dark:bg-slate-950/80 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs shadow-inner">
              <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                <span>Subtotal Taxable Amount:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ₹{subtotalTaxable.toFixed(2)}
                </span>
              </div>

              {taxType === "Intrastate" ? (
                <>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                    <span>CGST Amount:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₹{cgst.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                    <span>SGST Amount:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₹{sgst.toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                  <span>IGST Amount ({computedItems[0]?.gstPercent || 5}%):</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₹{igst.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                <span>Round Off:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ₹{roundOff.toFixed(2)}
                </span>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between items-center text-sm font-extrabold text-slate-900 dark:text-white">
                <span>Net Payable Amount:</span>
                <span className="text-2xl text-amber-500 font-black tracking-tight">
                  ₹{netAmount.toFixed(2)}
                </span>
              </div>

              {balanceAmount > 0 && (
                <div className="flex justify-between text-xs font-extrabold text-red-500 pt-1">
                  <span>Balance Due:</span>
                  <span>₹{balanceAmount.toFixed(2)}</span>
                </div>
              )}

              <button
                onClick={handleSavePurchaseBill}
                disabled={saving}
                className={`w-full mt-4 py-3.5 px-5 rounded-2xl text-white font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl ${
                  saving
                    ? "bg-slate-400 cursor-not-allowed shadow-none"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/30 hover:scale-[1.01]"
                }`}
              >
                {saving ? (
                  <>
                    <FaSync className="animate-spin text-sm" /> Saving Purchase Record...
                  </>
                ) : (
                  <>
                    <FaSave className="text-sm" /> Save Purchase Bill & Post to DB
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-800 shadow-2xl relative space-y-4">
            <div className="flex justify-between items-center text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FaCamera className="text-amber-400" /> Live Purchase Bill Photo Scanner
              </h3>
              <button onClick={stopCamera} className="text-slate-400 hover:text-white text-lg">
                <FaTimes />
              </button>
            </div>

            <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={stopCamera}
                className="px-5 py-2.5 rounded-2xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-amber-500/25"
              >
                <FaCamera /> Capture Picture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-7 text-center shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">
              <FaCheckCircle />
            </div>

            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                Purchase Bill Saved!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Purchase Bill <span className="font-extrabold text-amber-600">{createdBillNo}</span> has been posted to MongoDB database.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                onClick={() => router.push("/dashboard/purchase/invoice")}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-lg shadow-emerald-600/25"
              >
                View Purchase Invoices List
              </button>

              <button
                onClick={() => {
                  setSuccessModal(false);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setItems([]);
                  setVendorName("");
                  setVendorGst("");
                  fetchNextVcn();
                }}
                className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
              >
                Scan Another Purchase Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
