"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FaArrowLeft,
  FaPlus,
  FaTrash,
  FaSpinner,
  FaRupeeSign,
  FaFileInvoiceDollar,
  FaUserCheck,
  FaBoxOpen,
  FaExclamationTriangle,
  FaSearch,
  FaChevronDown,
  FaTimes,
  FaCheckCircle,
  FaPercentage,
  FaGlobe,
  FaHome,
  FaBuilding,
} from "react-icons/fa";

interface CustomerOption {
  _id: string;
  CODEP: string;
  ORDNO?: string;
  PARNAM: string;
  CITY?: string;
  STATE?: string;
  GSTNO?: string;
  GSTHED?: string;
  PRICE?: string; // Rate A, B, C, D, E, F, etc.
  BALANCE?: number;
}

interface BatchItem {
  batchNo: string;
  expiry?: string;
  stock?: number;
  mrp?: number;
  ratef?: number;
}

interface ProductOption {
  _id: string;
  PRODUCT?: string;
  CODE?: string;
  NAME: string;
  PACK?: string;
  UNIT?: string;
  MRP?: number;
  PRATE?: number;
  RATEF?: number;
  RATEA?: number;
  RATEB?: number;
  RATEC?: number;
  RATED?: number;
  RATEE?: number;
  RATEG?: number;
  CLBAL?: number;
  STOCK?: number;
  CGST?: number;
  IGST?: number;
  BATCH?: string;
  EXPIRY?: string;
  companyName?: string;
  batches?: BatchItem[];
}

interface InvoiceItem {
  productId: string;
  code: string;
  name: string;
  pack: string;
  unit: string;
  batch: string;
  expiry: string;
  qty: number;
  freeQty: number;
  mrp: number;
  rate: number;
  disc: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxableAmount: number;
  taxAmount: number;
  finalAmount: number;
}

export default function CreateSaleInvoicePage() {
  const router = useRouter();

  // Data Sources
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Invoice Form Header State
  const [selectedCustomerCode, setSelectedCustomerCode] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceVcn, setInvoiceVcn] = useState("");

  // Search Combobox States
  const [custSearch, setCustSearch] = useState("");
  const [isCustDropdownOpen, setIsCustDropdownOpen] = useState(false);
  const custDropdownRef = useRef<HTMLDivElement>(null);

  const [prodSearch, setProdSearch] = useState("");
  const [isProdDropdownOpen, setIsProdDropdownOpen] = useState(false);
  const prodDropdownRef = useRef<HTMLDivElement>(null);

  // Selected Customer details
  const selectedCustomer = useMemo(() => {
    return customers.find(
      (c) =>
        String(c.CODEP || "").trim().toUpperCase() === selectedCustomerCode.trim().toUpperCase() ||
        String(c.ORDNO || "").trim().toUpperCase() === selectedCustomerCode.trim().toUpperCase()
    );
  }, [customers, selectedCustomerCode]);

  // Company State Code & Customer State Code
  const companyGst = useMemo(() => String(company?.gstNo || company?.GSTNO || "").trim(), [company]);
  const companyStateCode = useMemo(() => (/^\d{2}/.test(companyGst) ? companyGst.slice(0, 2) : ""), [companyGst]);

  const customerGst = useMemo(() => String(selectedCustomer?.GSTNO || "").trim(), [selectedCustomer]);
  const customerStateCode = useMemo(() => (/^\d{2}/.test(customerGst) ? customerGst.slice(0, 2) : ""), [customerGst]);

  // Tax Category: Local (CGST+SGST) vs Central (IGST) by comparing Company GST vs Customer GST State Code
  const isLocalParty = useMemo(() => {
    if (!selectedCustomer) return true; // Default Local

    // 1. Compare State Codes from GSTIN (first 2 digits)
    if (companyStateCode && customerStateCode) {
      return companyStateCode === customerStateCode;
    }

    // 2. Explicit GSTHED in Customer Record
    const gstHed = String(selectedCustomer.GSTHED || "").trim().toUpperCase();
    if (
      gstHed.includes("CENTRAL") ||
      gstHed.includes("IGST") ||
      gstHed.includes("OUT") ||
      gstHed.includes("INTERSTATE")
    ) {
      return false; // Central Party -> IGST
    }
    if (gstHed.includes("LOCAL")) {
      return true; // Local Party -> CGST + SGST
    }

    // 3. Compare State Names
    const compState = String(company?.state || "").trim().toLowerCase();
    const custState = String(selectedCustomer.STATE || "").trim().toLowerCase();

    if (compState && custState) {
      return compState === custState;
    }

    return true; // Default Local
  }, [selectedCustomer, companyStateCode, customerStateCode, company]);

  // Filtered Customers by Search Query
  const filteredCustomers = useMemo(() => {
    const s = custSearch.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter(
      (c) =>
        String(c.PARNAM || "").toLowerCase().includes(s) ||
        String(c.CODEP || "").toLowerCase().includes(s) ||
        String(c.CITY || "").toLowerCase().includes(s) ||
        String(c.GSTNO || "").toLowerCase().includes(s)
    );
  }, [customers, custSearch]);

  // Invoice Line Items List
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Draft Item Entry Form State
  const [draftProdCode, setDraftProdCode] = useState("");
  const [draftQty, setDraftQty] = useState<number | "">(1);
  const [draftFreeQty, setDraftFreeQty] = useState<number | "">(0);
  const [draftMrp, setDraftMrp] = useState<number | "">(0);
  const [draftRate, setDraftRate] = useState<number | "">(0);
  const [draftDisc, setDraftDisc] = useState<number | "">(0);
  const [draftBatch, setDraftBatch] = useState("");
  const [draftExpiry, setDraftExpiry] = useState("");
  const [draftCgst, setDraftCgst] = useState<number | "">(6);
  const [draftSgst, setDraftSgst] = useState<number | "">(6);
  const [draftIgst, setDraftIgst] = useState<number | "">(0);

  // Selected draft product
  const selectedProduct = useMemo(() => {
    return products.find(
      (p) =>
        String(p.PRODUCT || "").trim().toUpperCase() === draftProdCode.trim().toUpperCase() ||
        String(p.CODE || "").trim().toUpperCase() === draftProdCode.trim().toUpperCase() ||
        String(p.NAME || "").trim().toUpperCase() === draftProdCode.trim().toUpperCase()
    );
  }, [products, draftProdCode]);

  // Filtered Products by Search Query
  const filteredProducts = useMemo(() => {
    const s = prodSearch.trim().toLowerCase();
    if (!s) return products;
    return products.filter(
      (p) =>
        String(p.NAME || "").toLowerCase().includes(s) ||
        String(p.PRODUCT || p.CODE || "").toLowerCase().includes(s) ||
        String(p.PACK || "").toLowerCase().includes(s) ||
        String(p.companyName || "").toLowerCase().includes(s)
    );
  }, [products, prodSearch]);

  useEffect(() => {
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setInvoiceVcn(`INV-${Date.now().toString().slice(-6)}`);
    loadData();

    const handleClickOutside = (e: MouseEvent) => {
      if (custDropdownRef.current && !custDropdownRef.current.contains(e.target as Node)) {
        setIsCustDropdownOpen(false);
      }
      if (prodDropdownRef.current && !prodDropdownRef.current.contains(e.target as Node)) {
        setIsProdDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      setLoadingInitial(true);
      const [resCust, resProd, resComp] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/products"),
        fetch("/api/company-settings"),
      ]);

      if (resCust.ok) {
        const jsonCust = await resCust.json();
        if (Array.isArray(jsonCust)) setCustomers(jsonCust);
      }

      if (resProd.ok) {
        const jsonProd = await resProd.json();
        if (Array.isArray(jsonProd)) setProducts(jsonProd);
      }

      if (resComp.ok) {
        const jsonComp = await resComp.json();
        if (jsonComp && typeof jsonComp === "object") setCompany(jsonComp);
      }
    } catch (err) {
      console.error("Failed to load invoice initial data", err);
    } finally {
      setLoadingInitial(false);
    }
  };

  // Auto-populate batch, expiry, rate, mrp, and tax (Local vs Central)
  useEffect(() => {
    if (selectedProduct) {
      // Check customer price tier (RATEA, RATEB, RATEC, RATED, RATEE, RATEF, etc.)
      const rateTier = String(selectedCustomer?.PRICE || "RATEF").trim().toUpperCase();

      let rateToUse = Number(selectedProduct.RATEF || selectedProduct.MRP || 0);

      if (rateTier === "RATEA" && selectedProduct.RATEA) rateToUse = Number(selectedProduct.RATEA);
      else if (rateTier === "RATEB" && selectedProduct.RATEB) rateToUse = Number(selectedProduct.RATEB);
      else if (rateTier === "RATEC" && selectedProduct.RATEC) rateToUse = Number(selectedProduct.RATEC);
      else if (rateTier === "RATED" && selectedProduct.RATED) rateToUse = Number(selectedProduct.RATED);
      else if (rateTier === "RATEE" && selectedProduct.RATEE) rateToUse = Number(selectedProduct.RATEE);
      else if (rateTier === "RATEG" && selectedProduct.RATEG) rateToUse = Number(selectedProduct.RATEG);

      setDraftRate(rateToUse);
      setDraftMrp(Number(selectedProduct.MRP || 0));

      // Local vs Central Tax Logic
      const rawCgst = Number(selectedProduct.CGST || 6);
      const totalGstPct = Number(selectedProduct.IGST) || rawCgst * 2;

      if (isLocalParty) {
        setDraftCgst(totalGstPct / 2);
        setDraftSgst(totalGstPct / 2);
        setDraftIgst(0);
      } else {
        setDraftCgst(0);
        setDraftSgst(0);
        setDraftIgst(totalGstPct);
      }

      // Batches Auto-population
      if (selectedProduct.batches && selectedProduct.batches.length > 0) {
        const firstBatch = selectedProduct.batches[0];
        setDraftBatch(firstBatch.batchNo || "DEFAULT");
        setDraftExpiry(firstBatch.expiry || "");
      } else if (selectedProduct.BATCH) {
        setDraftBatch(selectedProduct.BATCH);
        setDraftExpiry(selectedProduct.EXPIRY || "");
      } else {
        setDraftBatch("DEFAULT");
        setDraftExpiry("");
      }
    }
  }, [selectedProduct, selectedCustomer, isLocalParty]);

  // When user selects a specific batch from batch dropdown
  const handleBatchSelect = (batchNo: string) => {
    setDraftBatch(batchNo);
    if (selectedProduct?.batches) {
      const b = selectedProduct.batches.find(
        (x) => x.batchNo.trim().toUpperCase() === batchNo.trim().toUpperCase()
      );
      if (b) {
        if (b.expiry) setDraftExpiry(b.expiry);
        if (b.ratef && Number(b.ratef) > 0) setDraftRate(Number(b.ratef));
        if (b.mrp && Number(b.mrp) > 0) setDraftMrp(Number(b.mrp));
      }
    }
  };

  // Add Item Handler
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      setErrorMsg("Please select a valid product first!");
      return;
    }

    const qtyNum = Number(draftQty) || 1;
    const freeQtyNum = Number(draftFreeQty) || 0;
    const rateNum = Number(draftRate) || 0;
    const mrpNum = Number(draftMrp) || Number(selectedProduct.MRP || 0);
    const discNum = Number(draftDisc) || 0;

    const cgstNum = isLocalParty ? Number(draftCgst) || 0 : 0;
    const sgstNum = isLocalParty ? Number(draftSgst) || 0 : 0;
    const igstNum = !isLocalParty ? Number(draftIgst) || 0 : 0;

    const grossAmount = qtyNum * rateNum;
    const discAmount = grossAmount * (discNum / 100);
    const taxableAmount = grossAmount - discAmount;

    const taxAmount = taxableAmount * ((cgstNum + sgstNum + igstNum) / 100);
    const finalAmount = taxableAmount + taxAmount;

    const newItem: InvoiceItem = {
      productId: String(selectedProduct._id || selectedProduct.PRODUCT || selectedProduct.CODE),
      code: String(selectedProduct.PRODUCT || selectedProduct.CODE || selectedProduct.NAME),
      name: selectedProduct.NAME,
      pack: selectedProduct.PACK || "",
      unit: selectedProduct.UNIT || "Pcs",
      batch: draftBatch || selectedProduct.BATCH || "DEFAULT",
      expiry: draftExpiry || selectedProduct.EXPIRY || "",
      qty: qtyNum,
      freeQty: freeQtyNum,
      mrp: mrpNum,
      rate: rateNum,
      disc: discNum,
      cgst: cgstNum,
      sgst: sgstNum,
      igst: igstNum,
      taxableAmount,
      taxAmount,
      finalAmount,
    };

    setItems((prev) => [...prev, newItem]);

    // Reset draft item form
    setDraftProdCode("");
    setProdSearch("");
    setDraftQty(1);
    setDraftFreeQty(0);
    setDraftRate(0);
    setDraftMrp(0);
    setDraftDisc(0);
    setDraftBatch("");
    setDraftExpiry("");
    setErrorMsg("");
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Invoice Summary Computations
  const invoiceSummary = useMemo(() => {
    const totalTaxable = items.reduce((acc, item) => acc + item.taxableAmount, 0);
    const totalCgst = items.reduce((acc, item) => acc + item.taxableAmount * (item.cgst / 100), 0);
    const totalSgst = items.reduce((acc, item) => acc + item.taxableAmount * (item.sgst / 100), 0);
    const totalIgst = items.reduce((acc, item) => acc + item.taxableAmount * (item.igst / 100), 0);
    const totalTax = totalCgst + totalSgst + totalIgst;
    const grossTotal = totalTaxable + totalTax;
    const finalAmount = Math.round(grossTotal);
    const roundOff = Number((finalAmount - grossTotal).toFixed(2));

    return {
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax,
      grossTotal,
      finalAmount,
      roundOff,
    };
  }, [items]);

  // Submit Invoice to API
  const handleSubmitInvoice = async () => {
    if (!selectedCustomerCode) {
      setErrorMsg("Please select a customer for the invoice!");
      return;
    }
    if (items.length === 0) {
      setErrorMsg("Please add at least one product item to the invoice!");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");
      setSuccessMsg("");

      const codepToUse = selectedCustomer?.CODEP || selectedCustomer?.ORDNO || selectedCustomerCode;

      const payload = {
        VCN: invoiceVcn,
        DATE: invoiceDate,
        CODEP: codepToUse,
        TYPE: "S",
        items: items.map((item) => ({
          PRODUCT: item.code,
          NAME: item.name,
          QTY: item.qty,
          FREEQTY: item.freeQty,
          LPRATE: item.rate,
          MRP: item.mrp,
          DISC: item.disc,
          BATCH: item.batch,
          EXPIRY: item.expiry,
          CGST: item.cgst,
          SGST: item.sgst,
          IGST: item.igst,
        })),
      };

      const res = await fetch("/api/sales/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to generate Sale Invoice");
      }

      setSuccessMsg(`Sale Invoice #${data.data?.vcn || invoiceVcn} created successfully! Redirecting...`);
      setTimeout(() => {
        router.push("/dashboard/sales/invoice");
      }, 1200);
    } catch (err: any) {
      console.error("Submit Sale Invoice error:", err);
      setErrorMsg(err.message || "Something went wrong while saving the invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/sales/invoice"
            className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/70 backdrop-blur-md border border-white/70 shadow-sm text-slate-600 hover:text-slate-900 transition"
          >
            <FaArrowLeft size={14} />
          </Link>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FaFileInvoiceDollar className="text-indigo-600" /> Generate New Sale Invoice
            </h2>
            <p className="text-xs text-slate-500">
              Live Billing with Company GST State ({companyStateCode || "24"}) vs Customer GST Matching
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
            VCN: #{invoiceVcn || "INV-..."}
          </span>
        </div>
      </div>

      {/* Success / Error Message Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-sm">
          <FaCheckCircle className="text-emerald-600 flex-shrink-0" size={15} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="text-rose-500 flex-shrink-0" size={15} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="text-rose-500 hover:text-rose-800 text-xs cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Form Container - Liquid Glass */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2-Columns: Invoice Header & Product Entry Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Customer & Invoice Info */}
          <div className="relative isolate overflow-hidden rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(52,56,114,0.08)] p-5 space-y-4">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent" />
            
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FaUserCheck className="text-indigo-600" /> Customer & Billing Info
              </span>
              {companyGst ? (
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  <FaBuilding className="text-slate-400" size={10} /> Our GST: <span className="font-bold text-slate-700">{companyGst}</span>
                </span>
              ) : null}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* SEARCHABLE CUSTOMER COMBOBOX */}
              <div className="relative" ref={custDropdownRef}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Search & Select Customer <span className="text-rose-500">*</span>
                </label>
                {loadingInitial ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                    <FaSpinner className="animate-spin text-indigo-600" /> Loading customers...
                  </div>
                ) : (
                  <div>
                    <div
                      onClick={() => setIsCustDropdownOpen((prev) => !prev)}
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white/90 flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-indigo-600 shadow-sm"
                    >
                      <span className={selectedCustomer ? "font-bold text-slate-800" : "text-slate-400"}>
                        {selectedCustomer ? `${selectedCustomer.PARNAM} (${selectedCustomer.CODEP || selectedCustomer.ORDNO})` : "-- Search & Select Customer --"}
                      </span>
                      <FaChevronDown className="text-slate-400 text-[10px]" />
                    </div>

                    {/* Customer Search Dropdown Menu */}
                    {isCustDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
                        <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2">
                          <FaSearch size={11} className="text-slate-400 ml-1" />
                          <input
                            type="text"
                            value={custSearch}
                            onChange={(e) => setCustSearch(e.target.value)}
                            placeholder="Search by customer name, code, city, GST..."
                            autoFocus
                            className="w-full bg-transparent text-xs outline-none text-slate-800"
                          />
                          {custSearch && (
                            <button onClick={() => setCustSearch("")} className="text-slate-400 hover:text-slate-600">
                              <FaTimes size={10} />
                            </button>
                          )}
                        </div>

                        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                          {filteredCustomers.length === 0 ? (
                            <div className="p-3 text-center text-slate-400">No customers matching "{custSearch}"</div>
                          ) : (
                            filteredCustomers.map((c, idx) => (
                              <div
                                key={`${c.CODEP}-${idx}`}
                                onClick={() => {
                                  setSelectedCustomerCode(c.CODEP || c.ORDNO || "");
                                  setIsCustDropdownOpen(false);
                                }}
                                className={`p-2.5 hover:bg-indigo-50/70 cursor-pointer transition flex items-center justify-between ${
                                  selectedCustomerCode === (c.CODEP || c.ORDNO) ? "bg-indigo-50 font-bold text-indigo-900" : "text-slate-700"
                                }`}
                              >
                                <div>
                                  <div className="font-semibold text-slate-800">{c.PARNAM}</div>
                                  <div className="text-[10px] text-slate-500">
                                    Code: {c.CODEP || c.ORDNO} {c.CITY ? `• 📍 ${c.CITY}` : ""} {c.PRICE ? `• Rate: ${c.PRICE}` : ""}
                                  </div>
                                </div>
                                {c.BALANCE ? (
                                  <div className="text-[10px] font-semibold text-slate-600">
                                    Bal: ₹{Number(c.BALANCE).toLocaleString("en-IN")}
                                  </div>
                                ) : null}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none bg-white/80 font-medium"
                />
              </div>
            </div>

            {/* Selected Customer Details & Local vs Central Tax Category Banner */}
            {selectedCustomer && (
              <div className="mt-3 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-indigo-900">{selectedCustomer.PARNAM}</span>
                  {selectedCustomer.CITY ? <span className="text-slate-600 ml-2">📍 {selectedCustomer.CITY}</span> : null}
                  {selectedCustomer.GSTNO ? <span className="text-slate-600 ml-2">📜 GST: {selectedCustomer.GSTNO}</span> : null}
                </div>
                <div className="flex items-center gap-3">
                  {/* LOCAL VS CENTRAL BADGE BASED ON COMPANY GST VS CUSTOMER GST */}
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
                    isLocalParty
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-blue-100 text-blue-800 border-blue-300"
                  }`}>
                    {isLocalParty ? <FaHome size={11} /> : <FaGlobe size={11} />}
                    {isLocalParty ? "LOCAL SALE (CGST + SGST)" : "CENTRAL SALE (IGST)"}
                  </span>

                  <span className="px-2 py-0.5 rounded bg-white text-indigo-700 font-semibold border border-indigo-200">
                    Rate: {selectedCustomer.PRICE || "Rate F"}
                  </span>
                  <span className="font-semibold text-slate-700">
                    Outstanding: ₹{Number(selectedCustomer.BALANCE || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Product Line Item Add Form */}
          <div className="relative isolate overflow-hidden rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(52,56,114,0.08)] p-5 space-y-4">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-white/5 to-transparent" />
            
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FaBoxOpen className="text-emerald-600" /> Add Product Item ({isLocalParty ? "Local CGST+SGST" : "Central IGST"})
              </span>
            </h3>

            <form onSubmit={handleAddItem} className="space-y-4">
              
              {/* Row 1: Product Combobox & Batch & Expiry */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                
                {/* SEARCHABLE PRODUCT COMBOBOX */}
                <div className="sm:col-span-2 relative" ref={prodDropdownRef}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Medicine Product <span className="text-rose-500">*</span>
                  </label>
                  {loadingInitial ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                      <FaSpinner className="animate-spin text-emerald-600" /> Loading products...
                    </div>
                  ) : (
                    <div>
                      <div
                        onClick={() => setIsProdDropdownOpen((prev) => !prev)}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white/90 flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-emerald-600 shadow-sm"
                      >
                        <span className={selectedProduct ? "font-bold text-slate-800" : "text-slate-400"}>
                          {selectedProduct
                            ? `${selectedProduct.NAME} ${selectedProduct.PACK ? `(${selectedProduct.PACK})` : ""} [Stock: ${selectedProduct.CLBAL || selectedProduct.STOCK || 0}]`
                            : "-- Search & Select Medicine Product --"}
                        </span>
                        <FaChevronDown className="text-slate-400 text-[10px]" />
                      </div>

                      {/* Product Search Dropdown Menu */}
                      {isProdDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
                          <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex items-center gap-2">
                            <FaSearch size={11} className="text-slate-400 ml-1" />
                            <input
                              type="text"
                              value={prodSearch}
                              onChange={(e) => setProdSearch(e.target.value)}
                              placeholder="Search medicine by name, code, pack, company..."
                              autoFocus
                              className="w-full bg-transparent text-xs outline-none text-slate-800"
                            />
                            {prodSearch && (
                              <button onClick={() => setProdSearch("")} className="text-slate-400 hover:text-slate-600">
                                <FaTimes size={10} />
                              </button>
                            )}
                          </div>

                          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                            {filteredProducts.length === 0 ? (
                              <div className="p-3 text-center text-slate-400">No medicine products matching "{prodSearch}"</div>
                            ) : (
                              filteredProducts.map((p, idx) => {
                                const code = p.PRODUCT || p.CODE || p.NAME || "";
                                const stock = Number(p.CLBAL || p.STOCK || 0);
                                const isSelected = draftProdCode === code;
                                return (
                                  <div
                                    key={`${code}-${idx}`}
                                    onClick={() => {
                                      setDraftProdCode(code);
                                      setIsProdDropdownOpen(false);
                                    }}
                                    className={`p-2.5 hover:bg-emerald-50/70 cursor-pointer transition flex items-center justify-between ${
                                      isSelected ? "bg-emerald-50 font-bold text-emerald-900" : "text-slate-700"
                                    }`}
                                  >
                                    <div>
                                      <div className="font-semibold text-slate-800">
                                        {p.NAME} {p.PACK ? <span className="text-[10px] text-slate-500">({p.PACK})</span> : null}
                                      </div>
                                      <div className="text-[10px] text-slate-500">
                                        MRP: ₹{p.MRP || 0} {p.companyName && p.companyName !== "N/A" && p.companyName !== "ZZZZZZ 144" ? `• ${p.companyName}` : ""}
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        stock > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"
                                      }`}>
                                        Stock: {stock}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Batch Selection Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Number</label>
                  {selectedProduct && selectedProduct.batches && selectedProduct.batches.length > 0 ? (
                    <select
                      value={draftBatch}
                      onChange={(e) => handleBatchSelect(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-semibold text-emerald-800"
                    >
                      {selectedProduct.batches.map((b, idx) => (
                        <option key={`${b.batchNo}-${idx}`} value={b.batchNo}>
                          {b.batchNo} {b.expiry ? `(Exp: ${b.expiry})` : ""} {b.stock ? `[Stock: ${b.stock}]` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={draftBatch}
                      onChange={(e) => setDraftBatch(e.target.value)}
                      placeholder="Batch No"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-semibold text-slate-800"
                    />
                  )}
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="text"
                    value={draftExpiry}
                    onChange={(e) => setDraftExpiry(e.target.value)}
                    placeholder="MM/YY or YYYY-MM"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80"
                  />
                </div>
              </div>

              {/* Row 2: Quantities, Pricing & Dynamic Tax Fields (Local CGST+SGST vs Central IGST) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={draftQty}
                    onChange={(e) => setDraftQty(e.target.value ? Number(e.target.value) : "")}
                    placeholder="1"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Free Qty (Scheme)</label>
                  <input
                    type="number"
                    min="0"
                    value={draftFreeQty}
                    onChange={(e) => setDraftFreeQty(e.target.value ? Number(e.target.value) : "")}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftMrp}
                    onChange={(e) => setDraftMrp(e.target.value ? Number(e.target.value) : "")}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-medium text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sale Rate (₹) {selectedCustomer?.PRICE ? `[${selectedCustomer.PRICE}]` : "[Rate F]"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftRate}
                    onChange={(e) => setDraftRate(e.target.value ? Number(e.target.value) : "")}
                    placeholder="0.00"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Disc (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draftDisc}
                    onChange={(e) => setDraftDisc(e.target.value ? Number(e.target.value) : "")}
                    placeholder="0%"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-semibold text-indigo-700"
                  />
                </div>

                {/* Dynamic Tax Inputs: CGST+SGST for Local vs IGST for Central */}
                {isLocalParty ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">CGST / SGST (%)</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="number"
                        step="0.01"
                        value={draftCgst}
                        onChange={(e) => setDraftCgst(e.target.value ? Number(e.target.value) : "")}
                        placeholder="CGST"
                        className="w-full px-2 py-2 text-[11px] rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-semibold text-slate-800"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={draftSgst}
                        onChange={(e) => setDraftSgst(e.target.value ? Number(e.target.value) : "")}
                        placeholder="SGST"
                        className="w-full px-2 py-2 text-[11px] rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none bg-white/80 font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 mb-1">IGST (%) [Central]</label>
                    <input
                      type="number"
                      step="0.01"
                      value={draftIgst}
                      onChange={(e) => setDraftIgst(e.target.value ? Number(e.target.value) : "")}
                      placeholder="IGST %"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-blue-300 focus:ring-2 focus:ring-blue-600 outline-none bg-blue-50/50 font-bold text-blue-800"
                    />
                  </div>
                )}
              </div>

              {/* Stock Warning Banner if (Qty + FreeQty) > Stock */}
              {selectedProduct && (Number(draftQty || 0) + Number(draftFreeQty || 0)) > Number(selectedProduct.CLBAL || selectedProduct.STOCK || 0) && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-2">
                  <FaExclamationTriangle className="text-amber-600 flex-shrink-0" />
                  <span>Warning: Total Qty (Billing: {draftQty} + Free: {draftFreeQty}) exceeds Available Stock ({selectedProduct.CLBAL || selectedProduct.STOCK || 0}).</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!selectedProduct}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-md hover:from-emerald-700 hover:to-teal-700 transition disabled:opacity-50 cursor-pointer"
                >
                  <FaPlus size={11} /> Add to Invoice Table
                </button>
              </div>
            </form>
          </div>

          {/* Card 3: Added Items Table */}
          <div className="relative isolate overflow-hidden rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(52,56,114,0.08)] p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Invoice Items List ({items.length})</span>
            </h3>

            {items.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No items added yet. Use the form above to add medicine products to this invoice.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">Batch</th>
                      <th className="py-2.5 px-3 text-right">Qty + Free</th>
                      <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right">Disc %</th>
                      <th className="py-2.5 px-3 text-right">Taxable</th>
                      <th className="py-2.5 px-3 text-right">{isLocalParty ? "CGST + SGST" : "IGST"}</th>
                      <th className="py-2.5 px-3 text-right">Total (₹)</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {item.name} <span className="text-[10px] text-slate-400 font-normal">({item.pack})</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{item.batch}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {item.qty} {item.freeQty > 0 ? <span className="text-emerald-600 text-[10px]">(+{item.freeQty} Free)</span> : ""}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-700">₹{item.rate.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right text-indigo-700">{item.disc > 0 ? `${item.disc}%` : "-"}</td>
                        <td className="py-2.5 px-3 text-right">₹{item.taxableAmount.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right text-amber-600">
                          {item.igst > 0 ? `₹${item.taxAmount.toFixed(2)} (${item.igst}%)` : `₹${item.taxAmount.toFixed(2)} (${item.cgst + item.sgst}%)`}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{item.finalAmount.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-700 transition cursor-pointer"
                          >
                            <FaTrash size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1-Column: Invoice Summary & Submit Action */}
        <div className="space-y-6">
          <div className="relative isolate overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl border border-white/70 shadow-[0_8px_32px_rgba(52,56,114,0.08)] p-6 space-y-5 sticky top-6">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white/5 to-transparent" />
            
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-3 m-0 flex items-center justify-between">
              <span>Invoice Summary</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isLocalParty ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
              }`}>
                {isLocalParty ? "Local" : "Central"}
              </span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal (Taxable):</span>
                <span className="font-semibold text-slate-800">₹{invoiceSummary.totalTaxable.toFixed(2)}</span>
              </div>

              {isLocalParty ? (
                <>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>CGST Amount:</span>
                    <span className="font-semibold text-slate-800">₹{invoiceSummary.totalCgst.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>SGST Amount:</span>
                    <span className="font-semibold text-slate-800">₹{invoiceSummary.totalSgst.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between text-blue-800 font-medium">
                  <span>IGST Amount (Central):</span>
                  <span className="font-semibold text-blue-900">₹{invoiceSummary.totalIgst.toFixed(2)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-600">
                <span>Round Off:</span>
                <span className="font-semibold text-slate-600">{invoiceSummary.roundOff.toFixed(2)}</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">Grand Total:</span>
                <span className="text-lg font-black text-indigo-700">₹{invoiceSummary.finalAmount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <button
                type="button"
                onClick={handleSubmitInvoice}
                disabled={submitting || items.length === 0 || !selectedCustomerCode}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#343872] to-indigo-700 shadow-lg hover:from-[#2a2d5c] hover:to-indigo-800 transition outline-none disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <FaSpinner className="animate-spin" size={13} />
                    <span>Generating Sale Invoice...</span>
                  </>
                ) : (
                  <>
                    <FaFileInvoiceDollar size={14} />
                    <span>Generate Sale Invoice</span>
                  </>
                )}
              </button>

              <Link
                href="/dashboard/sales/invoice"
                className="block text-center py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
