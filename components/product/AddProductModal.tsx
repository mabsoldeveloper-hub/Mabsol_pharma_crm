"use client";

import { useEffect, useState } from "react";
import {
  FaTimes,
  FaPlus,
  FaInfoCircle,
  FaRupeeSign,
  FaFileInvoiceDollar,
  FaWarehouse,
  FaTags,
  FaSpinner,
  FaBuilding,
} from "react-icons/fa";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Company {
  _id?: string;
  companyCode: string;
  companyName: string;
}

export default function AddProductModal({
  isOpen,
  onClose,
  onSuccess,
}: AddProductModalProps) {
  const [activeTab, setActiveTab] = useState<"basic" | "pricing" | "tax" | "stock" | "discount">("basic");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form State containing all 45+ fields
  const [formData, setFormData] = useState<Record<string, any>>({
    // Basic Info
    NAME: "",
    GENERIC: "",
    COMPANY: "",
    PACK: "",
    UNIT: "Pcs",
    CATEGORY: "",
    HSNCODE: "",
    EAN: "",
    STATUS: "Y",
    DELETED: "N",
    // Pricing
    MRP: "",
    PRATE: "",
    RATEF: "",
    RATEA: "",
    RATEB: "",
    RATEC: "",
    RATED: "",
    RATEE: "",
    RATEG: "",
    COST: "",
    CONVRATE: "1",
    // GST & Tax
    CGST: "",
    SGST: "",
    IGST: "",
    CESS: "",
    STAX: "",
    TAXFREE: "N",
    // Stock & Batches
    BATCH: "",
    EXPIRY: "",
    MFGDATE: "",
    MINQTY: "",
    MAXQTY: "",
    REORDER: "",
    LOCATION: "",
    RAKNO: "",
    CLBAL: "0",
    STOCK: "0",
    // Discounts & Schemes
    SCHEME1: "",
    SCHEME2: "",
    DISCOUNT: "",
    MAXDISC: "",
    NETRATE: "",
    HALFRATE: "",
    FLAG: "",
  });

  useEffect(() => {
    if (isOpen) {
      loadCompanies();
      setErrorMsg("");
    }
  }, [isOpen]);

  const loadCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const res = await fetch("/api/master/fetch-company-master");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) {
          setCompanies(json);
        }
      }
    } catch (err) {
      console.error("Failed to load companies", err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.NAME || !formData.NAME.trim()) {
      setErrorMsg("Product Name (NAME) is required!");
      setActiveTab("basic");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create product");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong while creating product.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-white/15 backdrop-blur-md text-white flex-shrink-0">
              <FaPlus className="text-sm sm:text-base" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold tracking-wide text-white m-0 truncate">Add New Product</h3>
              <p className="text-[11px] sm:text-xs text-blue-100/90 m-0 truncate">Fill product details to save into Inventory Master</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-200 outline-none cursor-pointer"
          >
            <FaTimes size={13} />
          </button>
        </div>

        {/* Navigation Tabs - Horizontally Scrollable on Mobile */}
        <div className="flex-shrink-0 flex items-center overflow-x-auto whitespace-nowrap border-b border-gray-200 bg-gray-50/80 px-3 sm:px-6 pt-2 sm:pt-3 gap-1.5 sm:gap-2 [scrollbar-width:none] [-ms-overflow-style:none]">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 cursor-pointer ${
              activeTab === "basic"
                ? "bg-white text-indigo-600 border-indigo-600 shadow-sm"
                : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/60"
            }`}
          >
            <FaInfoCircle size={12} />
            Basic Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pricing")}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 cursor-pointer ${
              activeTab === "pricing"
                ? "bg-white text-emerald-600 border-emerald-600 shadow-sm"
                : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/60"
            }`}
          >
            <FaRupeeSign size={12} />
            Pricing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tax")}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 cursor-pointer ${
              activeTab === "tax"
                ? "bg-white text-amber-600 border-amber-600 shadow-sm"
                : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/60"
            }`}
          >
            <FaFileInvoiceDollar size={12} />
            GST & Tax
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stock")}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 cursor-pointer ${
              activeTab === "stock"
                ? "bg-white text-sky-600 border-sky-600 shadow-sm"
                : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/60"
            }`}
          >
            <FaWarehouse size={12} />
            Stock Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("discount")}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-semibold rounded-t-xl transition-all border-b-2 shrink-0 cursor-pointer ${
              activeTab === "discount"
                ? "bg-white text-rose-600 border-rose-600 shadow-sm"
                : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/60"
            }`}
          >
            <FaTags size={12} />
            Discount & Schemes
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 p-2.5 sm:p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] sm:text-xs font-medium flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} className="text-rose-500 hover:text-rose-700 cursor-pointer">
              <FaTimes size={12} />
            </button>
          </div>
        )}

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            
            {/* 1. BASIC INFO TAB */}
            {activeTab === "basic" && (
              <div className="space-y-4">
                <h4 className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FaInfoCircle className="text-indigo-600" /> Basic Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">
                      Product Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="NAME"
                      value={formData.NAME}
                      onChange={handleChange}
                      placeholder="e.g. Paracetamol 500mg Tablet"
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Generic Name / Composition</label>
                    <input
                      type="text"
                      name="GENERIC"
                      value={formData.GENERIC}
                      onChange={handleChange}
                      placeholder="e.g. Acetaminophen"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Company / Brand</label>
                    {loadingCompanies ? (
                      <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                        <FaSpinner className="animate-spin text-blue-600" /> Loading companies...
                      </div>
                    ) : (
                      <select
                        name="COMPANY"
                        value={formData.COMPANY}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
                      >
                        <option value="">-- Select Company --</option>
                        {companies.map((c, idx) => (
                          <option key={c.companyCode ? `${c.companyCode}-${idx}` : `comp-${idx}`} value={c.companyCode}>
                            {c.companyName} ({c.companyCode})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Packaging (Pack)</label>
                    <input
                      type="text"
                      name="PACK"
                      value={formData.PACK}
                      onChange={handleChange}
                      placeholder="e.g. 10x10 Strip, 100ml Bottle"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Unit</label>
                    <input
                      type="text"
                      name="UNIT"
                      value={formData.UNIT}
                      onChange={handleChange}
                      placeholder="e.g. Pcs, Box, Strip, Bottle"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Category</label>
                    <input
                      type="text"
                      name="CATEGORY"
                      value={formData.CATEGORY}
                      onChange={handleChange}
                      placeholder="e.g. Tablet, Syrup, Injection"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">HSN Code</label>
                    <input
                      type="text"
                      name="HSNCODE"
                      value={formData.HSNCODE}
                      onChange={handleChange}
                      placeholder="e.g. 3004"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">EAN / Barcode</label>
                    <input
                      type="text"
                      name="EAN"
                      value={formData.EAN}
                      onChange={handleChange}
                      placeholder="Barcode number"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Status</label>
                    <select
                      name="STATUS"
                      value={formData.STATUS}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none bg-white"
                    >
                      <option value="Y">Active (Y)</option>
                      <option value="N">Inactive (N)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PRICING TAB */}
            {activeTab === "pricing" && (
              <div className="space-y-4">
                <h4 className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FaRupeeSign className="text-emerald-600" /> Pricing & Multi-Rate Structure
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">MRP (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="MRP"
                      value={formData.MRP}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Purchase Rate / PRATE (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="PRATE"
                      value={formData.PRATE}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Sale Rate / RATE F (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="RATEF"
                      value={formData.RATEF}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none font-semibold text-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Rate A (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="RATEA"
                      value={formData.RATEA}
                      onChange={handleChange}
                      placeholder="Rate A"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Rate B (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="RATEB"
                      value={formData.RATEB}
                      onChange={handleChange}
                      placeholder="Rate B"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Rate C (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="RATEC"
                      value={formData.RATEC}
                      onChange={handleChange}
                      placeholder="Rate C"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Rate D (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="RATED"
                      value={formData.RATED}
                      onChange={handleChange}
                      placeholder="Rate D"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Rate E (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="RATEE"
                      value={formData.RATEE}
                      onChange={handleChange}
                      placeholder="Rate E"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Rate G (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="RATEG"
                      value={formData.RATEG}
                      onChange={handleChange}
                      placeholder="Rate G"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Cost Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="COST"
                      value={formData.COST}
                      onChange={handleChange}
                      placeholder="Cost Price"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Conversion Rate</label>
                    <input
                      type="number"
                      name="CONVRATE"
                      value={formData.CONVRATE}
                      onChange={handleChange}
                      placeholder="1"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. GST & TAX TAB */}
            {activeTab === "tax" && (
              <div className="space-y-4">
                <h4 className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FaFileInvoiceDollar className="text-amber-600" /> GST & Tax Configuration
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">CGST (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="CGST"
                      value={formData.CGST}
                      onChange={handleChange}
                      placeholder="e.g. 6 or 9"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">SGST (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="SGST"
                      value={formData.SGST}
                      onChange={handleChange}
                      placeholder="e.g. 6 or 9"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">IGST (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="IGST"
                      value={formData.IGST}
                      onChange={handleChange}
                      placeholder="e.g. 12 or 18"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">CESS (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="CESS"
                      value={formData.CESS}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Sales Tax (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="STAX"
                      value={formData.STAX}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Tax Exempt / Taxfree</label>
                    <select
                      name="TAXFREE"
                      value={formData.TAXFREE}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-600 outline-none bg-white"
                    >
                      <option value="N">Taxable (N)</option>
                      <option value="Y">Tax Exempt (Y)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 4. STOCK TAB */}
            {activeTab === "stock" && (
              <div className="space-y-4">
                <h4 className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FaWarehouse className="text-sky-600" /> Stock & Location Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Initial Batch Number</label>
                    <input
                      type="text"
                      name="BATCH"
                      value={formData.BATCH}
                      onChange={handleChange}
                      placeholder="e.g. BATCH-2026-A"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      name="EXPIRY"
                      value={formData.EXPIRY}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Mfg Date</label>
                    <input
                      type="date"
                      name="MFGDATE"
                      value={formData.MFGDATE}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Opening Stock Quantity</label>
                    <input
                      type="number"
                      name="CLBAL"
                      value={formData.CLBAL}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none font-semibold text-sky-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Min Stock Level</label>
                    <input
                      type="number"
                      name="MINQTY"
                      value={formData.MINQTY}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Max Stock Level</label>
                    <input
                      type="number"
                      name="MAXQTY"
                      value={formData.MAXQTY}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Reorder Point Level</label>
                    <input
                      type="number"
                      name="REORDER"
                      value={formData.REORDER}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Godown / Location</label>
                    <input
                      type="text"
                      name="LOCATION"
                      value={formData.LOCATION}
                      onChange={handleChange}
                      placeholder="e.g. Main Warehouse"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Rack Number (RAKNO)</label>
                    <input
                      type="text"
                      name="RAKNO"
                      value={formData.RAKNO}
                      onChange={handleChange}
                      placeholder="e.g. Rack-B4"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-600 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. DISCOUNT & SCHEMES TAB */}
            {activeTab === "discount" && (
              <div className="space-y-4">
                <h4 className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FaTags className="text-rose-600" /> Discounts & Promotional Schemes
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Default Discount (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="DISCOUNT"
                      value={formData.DISCOUNT}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Max Allowed Discount (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="MAXDISC"
                      value={formData.MAXDISC}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Scheme 1 (e.g. 10+1)</label>
                    <input
                      type="text"
                      name="SCHEME1"
                      value={formData.SCHEME1}
                      onChange={handleChange}
                      placeholder="e.g. 10+1"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Scheme 2 (Special Deal)</label>
                    <input
                      type="text"
                      name="SCHEME2"
                      value={formData.SCHEME2}
                      onChange={handleChange}
                      placeholder="e.g. 50+5"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Net Rate (Non-Discounted)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="NETRATE"
                      value={formData.NETRATE}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-gray-700 mb-1">Half Scheme Allowed</label>
                    <select
                      name="HALFRATE"
                      value={formData.HALFRATE}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-600 outline-none bg-white"
                    >
                      <option value="">-- Select --</option>
                      <option value="Y">Allowed (Y)</option>
                      <option value="N">Not Allowed (N)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-gray-50 border-t border-gray-200">
            <span className="text-[11px] sm:text-xs text-gray-500">
              Tab {activeTab === "basic" ? "1" : activeTab === "pricing" ? "2" : activeTab === "tax" ? "3" : activeTab === "stock" ? "4" : "5"} of 5
            </span>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition outline-none disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 sm:gap-2 px-4 py-1.5 sm:px-5 sm:py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-md hover:from-blue-700 hover:to-indigo-700 transition outline-none disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <FaSpinner className="animate-spin" size={12} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FaPlus size={11} />
                    <span>Save Product</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
