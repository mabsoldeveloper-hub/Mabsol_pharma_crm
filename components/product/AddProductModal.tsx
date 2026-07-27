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

  // Form State with default fields
  const [formData, setFormData] = useState<Record<string, any>>({
    // Basic Info
    PRODUCT: "",
    CODE: "",
    GCODE: "",
    STATUS: "Y",
    UNIT: "PCS",
    UNIT2: "",
    PACKING: "",
    PACK: "",
    HSN: "",
    UPCCODE: "",
    RACKNO: "",
    RACKNO2: "",
    // Pricing
    MRP: "",
    PRATE: "",
    RATEF: "",
    LPRATE: "",
    COST: "",
    RATEA: "",
    RATEB: "",
    RATEC: "",
    RATED: "",
    RATEE: "",
    RATEG: "",
    // GST / Tax
    CGST: "",
    SGST: "",
    IGST: "",
    PURTAX: "",
    SALTAX: "",
    TAXL: "",
    TAXC: "",
    // Stock
    BALANCE: "0",
    OPENING: "0",
    ONQTY: "0",
    ONQTYFREE: "0",
    FREEBAL: "0",
    HOLD: "0",
    MINIMUM: "0",
    MAXIMUM: "0",
    TQTY: "0",
    QTY: "0",
    // Discount & Scheme
    SALDIS: "",
    PURDIS: "",
    SALVDIS: "",
    PURSPDIS: "",
    PURSPVDIS: "",
    PURSPVDIS1: "",
    SALVDIS1: "",
    FIXDIS: "",
    FIXDIS1: "",
    FREE: "",
    QTRSCHE: "",
    HALFSCHE: "",
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
        if (json.success && Array.isArray(json.data)) {
          setCompanies(json.data);
          if (json.data.length > 0 && !formData.GCODE) {
            setFormData((prev) => ({ ...prev, GCODE: json.data[0].companyCode }));
          }
        }
      }
    } catch (err) {
      console.error("Failed to load companies", err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.PRODUCT || !formData.PRODUCT.trim()) {
      setErrorMsg("Product Name is required!");
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
        throw new Error(data.message || "Failed to add product");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong while creating the product.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/15 backdrop-blur-md text-white">
              <FaPlus size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-wide text-white m-0">Add New Product</h3>
              <p className="text-xs text-blue-100/90 m-0">Fill product details to save into Inventory Master</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-200 outline-none"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-gray-200 bg-gray-50/80 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === "basic"
                ? "bg-white text-indigo-600 border-indigo-600 shadow-sm"
                : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/60"
            }`}
          >
            <FaInfoCircle size={13} />
            Basic Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pricing")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === "pricing"
                ? "bg-white text-emerald-600 border-emerald-600 shadow-sm"
                : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/60"
            }`}
          >
            <FaRupeeSign size={13} />
            Pricing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tax")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === "tax"
                ? "bg-white text-amber-600 border-amber-600 shadow-sm"
                : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/60"
            }`}
          >
            <FaFileInvoiceDollar size={13} />
            GST & Tax
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("stock")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === "stock"
                ? "bg-white text-sky-600 border-sky-600 shadow-sm"
                : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/60"
            }`}
          >
            <FaWarehouse size={13} />
            Stock Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("discount")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
              activeTab === "discount"
                ? "bg-white text-rose-600 border-rose-600 shadow-sm"
                : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/60"
            }`}
          >
            <FaTags size={13} />
            Discount & Schemes
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} className="text-rose-500 hover:text-rose-700">
              <FaTimes size={12} />
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* 1. BASIC INFORMATION TAB */}
            {activeTab === "basic" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FaInfoCircle className="text-indigo-500" /> Basic Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Product Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="PRODUCT"
                      value={formData.PRODUCT}
                      onChange={handleChange}
                      placeholder="e.g. Paracetamol 500mg"
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Product Code</label>
                    <input
                      type="text"
                      name="CODE"
                      value={formData.CODE}
                      onChange={handleChange}
                      placeholder="Auto-generated if empty"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Company</label>
                    <div className="relative">
                      <select
                        name="GCODE"
                        value={formData.GCODE}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      >
                        <option value="">-- Select Company --</option>
                        {companies.map((c, index) => (
                          <option key={c._id ? String(c._id) : `${c.companyCode}-${index}`} value={c.companyCode}>
                            {c.companyName} ({c.companyCode})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                    <select
                      name="STATUS"
                      value={formData.STATUS}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                      <option value="Y">Active (Y)</option>
                      <option value="N">Inactive (N)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Unit</label>
                    <input
                      type="text"
                      name="UNIT"
                      value={formData.UNIT}
                      onChange={handleChange}
                      placeholder="e.g. PCS, STRIP, BOX"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Second Unit</label>
                    <input
                      type="text"
                      name="UNIT2"
                      value={formData.UNIT2}
                      onChange={handleChange}
                      placeholder="e.g. BOX"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Packing</label>
                    <input
                      type="text"
                      name="PACKING"
                      value={formData.PACKING}
                      onChange={handleChange}
                      placeholder="e.g. 10x10"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Pack Qty</label>
                    <input
                      type="number"
                      name="PACK"
                      value={formData.PACK}
                      onChange={handleChange}
                      placeholder="e.g. 10"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">HSN / SAC</label>
                    <input
                      type="text"
                      name="HSN"
                      value={formData.HSN}
                      onChange={handleChange}
                      placeholder="HSN Code"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">UPC Code</label>
                    <input
                      type="text"
                      name="UPCCODE"
                      value={formData.UPCCODE}
                      onChange={handleChange}
                      placeholder="Barcode / UPC"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Rack No.</label>
                    <input
                      type="text"
                      name="RACKNO"
                      value={formData.RACKNO}
                      onChange={handleChange}
                      placeholder="Rack Number"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Rack No. 2</label>
                    <input
                      type="text"
                      name="RACKNO2"
                      value={formData.RACKNO2}
                      onChange={handleChange}
                      placeholder="Secondary Rack"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. PRICING TAB */}
            {activeTab === "pricing" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FaRupeeSign className="text-emerald-500" /> Pricing Structure
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">MRP (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="MRP"
                      value={formData.MRP}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Purchase Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="PRATE"
                      value={formData.PRATE}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Sale Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="RATEF"
                      value={formData.RATEF}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Last Purchase Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="LPRATE"
                      value={formData.LPRATE}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Cost / PCS (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="COST"
                      value={formData.COST}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Rate A (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="RATEA"
                      value={formData.RATEA}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Rate B (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="RATEB"
                      value={formData.RATEB}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Rate C (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="RATEC"
                      value={formData.RATEC}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Rate D (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="RATED"
                      value={formData.RATED}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Rate E (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="RATEE"
                      value={formData.RATEE}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Rate G (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="RATEG"
                      value={formData.RATEG}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. GST & TAX TAB */}
            {activeTab === "tax" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FaFileInvoiceDollar className="text-amber-500" /> Tax & GST Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">CGST (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="CGST"
                      value={formData.CGST}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">SGST (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="SGST"
                      value={formData.SGST}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">IGST (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="IGST"
                      value={formData.IGST}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Purchase Tax (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="PURTAX"
                      value={formData.PURTAX}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Sale Tax (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="SALTAX"
                      value={formData.SALTAX}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tax Type</label>
                    <input
                      type="text"
                      name="TAXL"
                      value={formData.TAXL}
                      onChange={handleChange}
                      placeholder="Tax Type"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Tax Category</label>
                    <input
                      type="text"
                      name="TAXC"
                      value={formData.TAXC}
                      onChange={handleChange}
                      placeholder="Tax Category"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. STOCK INFORMATION TAB */}
            {activeTab === "stock" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FaWarehouse className="text-sky-500" /> Stock Configuration
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Current Stock</label>
                    <input
                      type="number"
                      name="BALANCE"
                      value={formData.BALANCE}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Opening Stock</label>
                    <input
                      type="number"
                      name="OPENING"
                      value={formData.OPENING}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">On Qty</label>
                    <input
                      type="number"
                      name="ONQTY"
                      value={formData.ONQTY}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Free Qty</label>
                    <input
                      type="number"
                      name="ONQTYFREE"
                      value={formData.ONQTYFREE}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Free Balance</label>
                    <input
                      type="number"
                      name="FREEBAL"
                      value={formData.FREEBAL}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Hold Stock</label>
                    <input
                      type="number"
                      name="HOLD"
                      value={formData.HOLD}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Minimum Stock</label>
                    <input
                      type="number"
                      name="MINIMUM"
                      value={formData.MINIMUM}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Maximum Stock</label>
                    <input
                      type="number"
                      name="MAXIMUM"
                      value={formData.MAXIMUM}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Total Qty</label>
                    <input
                      type="number"
                      name="TQTY"
                      value={formData.TQTY}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Qty</label>
                    <input
                      type="number"
                      name="QTY"
                      value={formData.QTY}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. DISCOUNT & SCHEME TAB */}
            {activeTab === "discount" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FaTags className="text-rose-500" /> Discount & Schemes
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Sale Discount (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="SALDIS"
                      value={formData.SALDIS}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Purchase Discount (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="PURDIS"
                      value={formData.PURDIS}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Sale Special Disc (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="SALVDIS"
                      value={formData.SALVDIS}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Purchase Special Disc (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="PURSPDIS"
                      value={formData.PURSPDIS}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Purchase V. Disc (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="PURSPVDIS"
                      value={formData.PURSPVDIS}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Purchase V. Disc 2 (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="PURSPVDIS1"
                      value={formData.PURSPVDIS1}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Sale V. Disc 2 (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="SALVDIS1"
                      value={formData.SALVDIS1}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Fixed Discount</label>
                    <input
                      type="number"
                      step="0.01"
                      name="FIXDIS"
                      value={formData.FIXDIS}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Fixed Discount 2</label>
                    <input
                      type="number"
                      step="0.01"
                      name="FIXDIS1"
                      value={formData.FIXDIS1}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Free Scheme</label>
                    <input
                      type="text"
                      name="FREE"
                      value={formData.FREE}
                      onChange={handleChange}
                      placeholder="e.g. 10+1"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Quarter Scheme</label>
                    <input
                      type="text"
                      name="QTRSCHE"
                      value={formData.QTRSCHE}
                      onChange={handleChange}
                      placeholder="Scheme details"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Half Scheme</label>
                    <input
                      type="text"
                      name="HALFSCHE"
                      value={formData.HALFSCHE}
                      onChange={handleChange}
                      placeholder="Scheme details"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                Tab {activeTab === "basic" ? "1" : activeTab === "pricing" ? "2" : activeTab === "tax" ? "3" : activeTab === "stock" ? "4" : "5"} of 5
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition outline-none disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-md hover:from-blue-700 hover:to-indigo-700 transition outline-none disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <FaSpinner className="animate-spin" size={12} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FaPlus size={12} />
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
