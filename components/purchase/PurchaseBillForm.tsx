"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCompany } from "@/context/CompanyContext";
import { useFinancialYear } from "@/context/FinancialYearContext";
import SearchableSelect, { OptionItem } from "@/components/SearchableSelect";
import SupplierHistoryPanel from "@/components/purchase/SupplierHistoryPanel";
import {
  FaArrowLeft,
  FaPlus,
  FaTrash,
  FaSave,
  FaBuilding,
  FaFileInvoice,
  FaBoxes,
  FaUser,
  FaDownload,
  FaCheckCircle,
  FaTimes,
  FaReceipt,
  FaSearch,
  FaShieldAlt,
} from "react-icons/fa";

interface BillItem {
  productId?: string;
  productCode?: string;
  productName: string;
  hsnCode: string;
  batchNo: string;
  expDate: string;
  mrp: number;
  qty: number;
  freeQty: number;
  unit: string;
  rate: number;
  discountPercent: number;
  gstPercent: number;
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

interface POSelectOption {
  _id: string;
  poNumber: string;
  poDate: string;
  vendorName: string;
  vendorCode?: string;
  vendorGst?: string;
  vendorPhone?: string;
  vendorAddress?: string;
  netTotal: number;
  items: any[];
}

function getGstStateCode(gstin?: string): string {
  if (!gstin) return "";
  const cleaned = gstin.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length >= 2 && /^\d{2}/.test(cleaned.substring(0, 2))) {
    return cleaned.substring(0, 2);
  }
  return "";
}

export default function PurchaseBillForm() {
  const router = useRouter();
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  const [saving, setSaving] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(true);

  const [suppliersList, setSuppliersList] = useState<SupplierMaster[]>([]);
  const [productsList, setProductsList] = useState<ProductMaster[]>([]);

  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [poId, setPoId] = useState<string | null>(null);
  const [poNumber, setPoNumber] = useState<string>("");

  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorCode, setVendorCode] = useState("");
  const [vendorGst, setVendorGst] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");

  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [remarks, setRemarks] = useState("");
  const [taxType, setTaxType] = useState<"Intrastate" | "Interstate">("Intrastate");

  // Initial Empty Row (no default dummy rate or dummy totals)
  const [items, setItems] = useState<BillItem[]>([
    {
      productName: "",
      hsnCode: "",
      batchNo: "BATCH-01",
      expDate: "2027-12",
      mrp: 0,
      qty: 1,
      freeQty: 0,
      unit: "Box",
      rate: 0,
      discountPercent: 0,
      gstPercent: 12,
    },
  ]);

  // PO Import Modal state
  const [showPoModal, setShowPoModal] = useState(false);
  const [poList, setPoList] = useState<POSelectOption[]>([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [poSearch, setPoSearch] = useState("");

  // Fetch Master Data (Suppliers & Products)
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

  useEffect(() => {
    fetchMasters();
  }, [fetchMasters]);

  // Auto-Detect Intrastate vs Interstate tax based on GST State Codes
  useEffect(() => {
    const compGst = selectedCompany?.gstNo || "";
    const compStateCode = getGstStateCode(compGst);
    const suppStateCode = getGstStateCode(vendorGst);

    if (compStateCode && suppStateCode) {
      if (compStateCode === suppStateCode) {
        setTaxType("Intrastate");
      } else {
        setTaxType("Interstate");
      }
    }
  }, [selectedCompany, vendorGst]);

  // Handle Supplier Selection
  const handleSupplierSelect = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    const supp = suppliersList.find((s) => s.id === supplierId || s.code === supplierId);
    if (supp) {
      setVendorName(supp.name);
      setVendorCode(supp.code);
      setVendorGst(supp.gst);
      setVendorPhone(supp.phone);
      setVendorAddress(supp.address ? `${supp.address}, ${supp.city}` : supp.city);
    }
  };

  // Handle Product Selection for a Row
  const handleProductSelect = (index: number, productId: string) => {
    const prod = productsList.find((p) => p.id === productId || p.code === productId);
    if (prod) {
      const updated = [...items];
      updated[index] = {
        ...updated[index],
        productId: prod.id,
        productCode: prod.code,
        productName: prod.name,
        hsnCode: prod.hsn || "30049099",
        rate: prod.purchaseRate || 0,
        mrp: prod.mrp || Math.round((prod.purchaseRate || 0) * 1.3),
        gstPercent: prod.gstPercent || 12,
        unit: prod.unit || "Box",
        qty: updated[index].qty > 0 ? updated[index].qty : 1,
      };
      setItems(updated);
    }
  };

  // Fetch pending POs when modal is opened
  const fetchPendingPOs = async () => {
    setLoadingPOs(true);
    try {
      const res = await fetch("/api/purchase/orders?status=Pending");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setPoList(json.orders || []);
        }
      }
    } catch (err) {
      console.error("Error fetching POs:", err);
    } finally {
      setLoadingPOs(false);
    }
  };

  const openPoModal = () => {
    setShowPoModal(true);
    fetchPendingPOs();
  };

  // Import selected PO into Purchase Bill form
  const handleImportPO = (po: POSelectOption) => {
    setPoId(po._id);
    setPoNumber(po.poNumber);
    setVendorName(po.vendorName || "");
    setVendorCode(po.vendorCode || "");
    setVendorGst(po.vendorGst || "");
    setVendorPhone(po.vendorPhone || "");
    setVendorAddress(po.vendorAddress || "");

    if (po.items && po.items.length > 0) {
      const importedItems: BillItem[] = po.items.map((it: any) => ({
        productId: it.productId || "",
        productCode: it.productCode || "",
        productName: it.productName || "",
        hsnCode: it.hsnCode || "30049099",
        batchNo: "BATCH-01",
        expDate: "2027-12",
        mrp: Math.round(Number(it.rate || 0) * 1.3),
        qty: Number(it.qty || 1),
        freeQty: 0,
        unit: it.unit || "Box",
        rate: Number(it.rate || 0),
        discountPercent: Number(it.discountPercent || 0),
        gstPercent: Number(it.gstPercent || 12),
      }));
      setItems(importedItems);
    }

    setShowPoModal(false);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productName: "",
        hsnCode: "",
        batchNo: "BATCH-01",
        expDate: "2027-12",
        mrp: 0,
        qty: 1,
        freeQty: 0,
        unit: "Box",
        rate: 0,
        discountPercent: 0,
        gstPercent: 12,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof BillItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Options for SearchableSelect
  const supplierOptions: OptionItem[] = suppliersList.map((s) => ({
    value: s.id,
    label: s.name,
    subLabel: `${s.code ? `Code: ${s.code}` : ""} ${s.city ? `| City: ${s.city}` : ""} ${s.gst ? `| GST: ${s.gst}` : ""}`,
  }));

  const productOptions: OptionItem[] = productsList.map((p) => ({
    value: p.id,
    label: p.name,
    subLabel: `${p.companyName ? `Comp: ${p.companyName} | ` : ""}Rate: ₹${p.purchaseRate} | HSN: ${p.hsn}`,
  }));

  // Line & Overall Calculations (only include valid products)
  const calculatedItems = items.map((it) => {
    const isSelected = it.productName.trim() !== "" || Boolean(it.productId);
    const qty = isSelected ? Number(it.qty || 0) : 0;
    const rate = isSelected ? Number(it.rate || 0) : 0;
    const disc = Number(it.discountPercent || 0);
    const gst = Number(it.gstPercent || 0);

    const gross = qty * rate;
    const discAmt = gross * (disc / 100);
    const taxable = gross - discAmt;
    const gstAmt = taxable * (gst / 100);
    const lineTotal = taxable + gstAmt;

    return {
      ...it,
      isSelected,
      gross,
      discAmt,
      taxable,
      gstAmt,
      lineTotal,
    };
  });

  const subtotal = calculatedItems.reduce((acc, it) => acc + (it.isSelected ? it.gross : 0), 0);
  const totalDiscount = calculatedItems.reduce((acc, it) => acc + (it.isSelected ? it.discAmt : 0), 0);
  const totalTax = calculatedItems.reduce((acc, it) => acc + (it.isSelected ? it.gstAmt : 0), 0);
  const rawNet = subtotal - totalDiscount + totalTax;
  const netAmount = Math.round(rawNet);
  const roundOff = Math.round((netAmount - rawNet) * 100) / 100;
  const balance = Math.max(0, netAmount - paidAmount);

  const compStateCode = getGstStateCode(selectedCompany?.gstNo);
  const suppStateCode = getGstStateCode(vendorGst);
  const isInterstate = taxType === "Interstate";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      alert("Please select or enter Supplier / Vendor Name");
      return;
    }

    const validItems = items.filter((it) => it.productName.trim() !== "");
    if (validItems.length === 0) {
      alert("Please select at least one Product Item");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/purchase/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierInvoiceNo,
          poId,
          poNumber,
          companyId: selectedCompany?._id,
          companyCode: selectedCompany?.companyCode,
          fyId: selectedFY?._id,
          fyCode: selectedFY?.fyCode,
          billDate,
          dueDate,
          vendorName,
          vendorCode,
          vendorGst,
          vendorPhone,
          vendorAddress,
          items: validItems,
          paidAmount,
          remarks,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert(`Purchase Bill ${json.bill.billNumber} created successfully!`);
        router.push("/dashboard/purchase/invoice");
      } else {
        alert(json.message || "Failed to create Purchase Bill");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error saving Purchase Bill");
    } finally {
      setSaving(false);
    }
  };

  const filteredPOs = poList.filter((po) =>
    po.poNumber.toLowerCase().includes(poSearch.toLowerCase()) ||
    po.vendorName.toLowerCase().includes(poSearch.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/purchase/invoice"
            className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition"
          >
            <FaArrowLeft />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">
              Create Purchase Bill
            </h1>
            <p className="text-xs text-slate-500">
              New purchase invoice & inward stock entry
            </p>
          </div>
        </div>

        {/* Feature Button: Fetch / Import from Purchase Order */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openPoModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-extrabold shadow-md transition-all transform hover:scale-105"
          >
            <FaDownload /> Fetch / Import from Purchase Order
          </button>
        </div>
      </div>

      {/* Auto GST State Code Matching Alert Banner */}
      {(compStateCode || suppStateCode) && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <FaShieldAlt className="text-emerald-600" />
            <span>
              Company GST State: <strong>{compStateCode || "Local"}</strong> | Supplier GST State: <strong>{suppStateCode || "Local"}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <FaCheckCircle className="text-emerald-600" />
            <span>Auto Applied: {isInterstate ? "IGST (Interstate)" : "CGST + SGST (Intrastate)"}</span>
          </div>
        </div>
      )}

      {poNumber && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-semibold">
          <FaCheckCircle className="text-amber-600" /> Linked to Purchase Order: <strong>{poNumber}</strong>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bill Metadata */}
        <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-100 dark:border-white/10 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FaUser className="text-amber-600" /> Supplier & Invoice Info
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Supplier Invoice / Bill No *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. INV-90421"
                value={supplierInvoiceNo}
                onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
              />
            </div>

            {/* Supplier Selector Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Select Supplier (Sundry Creditor) *
              </label>
              <SearchableSelect
                options={supplierOptions}
                value={selectedSupplierId}
                onChange={handleSupplierSelect}
                placeholder={loadingMasters ? "Loading Suppliers..." : "Type/Search Supplier Name..."}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Supplier Name (Auto-filled) *
              </label>
              <input
                type="text"
                required
                placeholder="Supplier Name"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Bill Date *
              </label>
              <input
                type="date"
                required
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Live Supplier History & Outstanding Panel */}
        <SupplierHistoryPanel
          vendorName={vendorName}
          vendorCode={vendorCode}
          vendorId={selectedSupplierId}
        />

        {/* Product Items Table with Inventory Product Selector */}
        <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-100 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <FaBoxes className="text-amber-600" /> Inward Stock Items & Batch Info
            </h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition"
            >
              <FaPlus /> Add Product Row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[950px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/10 text-slate-400 font-medium">
                  <th className="pb-3 w-8">#</th>
                  <th className="pb-3 min-w-[240px]">Select Product (Inventory Master) *</th>
                  <th className="pb-3 w-24">HSN Code</th>
                  <th className="pb-3 w-20">Batch No</th>
                  <th className="pb-3 w-20">Exp Date</th>
                  <th className="pb-3 w-20">MRP (₹)</th>
                  <th className="pb-3 w-16">Qty</th>
                  <th className="pb-3 w-16">Free</th>
                  <th className="pb-3 w-20">Rate (₹)</th>
                  <th className="pb-3 w-16">Disc %</th>
                  <th className="pb-3 w-16">GST %</th>
                  <th className="pb-3 w-24 text-right">Line Total (₹)</th>
                  <th className="pb-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {calculatedItems.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 text-slate-400 font-semibold">{idx + 1}</td>
                    <td className="py-2.5 pr-2">
                      <SearchableSelect
                        options={productOptions}
                        value={it.productId || ""}
                        onChange={(val) => handleProductSelect(idx, val)}
                        placeholder={loadingMasters ? "Loading Products..." : "Search/Select Inventory Product..."}
                      />
                    </td>
                    <td className="py-2.5 pr-2">
                      <input
                        type="text"
                        placeholder="HSN"
                        value={it.hsnCode}
                        onChange={(e) => handleItemChange(idx, "hsnCode", e.target.value)}
                        className="w-full px-2 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none font-semibold text-amber-800 dark:text-amber-300"
                      />
                    </td>
                    <td className="py-2.5 pr-2">
                      <input
                        type="text"
                        value={it.batchNo}
                        onChange={(e) => handleItemChange(idx, "batchNo", e.target.value)}
                        className="w-full px-2 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 pr-2">
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={it.expDate}
                        onChange={(e) => handleItemChange(idx, "expDate", e.target.value)}
                        className="w-full px-2 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 pr-2">
                      <input
                        type="number"
                        min="0"
                        value={it.mrp || ""}
                        placeholder="0.00"
                        onChange={(e) => handleItemChange(idx, "mrp", parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 pr-2">
                      <input
                        type="number"
                        min="1"
                        value={it.qty}
                        onChange={(e) => handleItemChange(idx, "qty", Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full px-2 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none font-bold text-amber-700"
                      />
                    </td>
                    <td className="py-2.5 pr-2">
                      <input
                        type="number"
                        min="0"
                        value={it.freeQty}
                        onChange={(e) => handleItemChange(idx, "freeQty", parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 pr-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.rate || ""}
                        placeholder="0.00"
                        onChange={(e) => handleItemChange(idx, "rate", parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none font-semibold"
                      />
                    </td>
                    <td className="py-2.5 pr-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={it.discountPercent || ""}
                        placeholder="0"
                        onChange={(e) => handleItemChange(idx, "discountPercent", parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 pr-2">
                      <input
                        type="number"
                        min="0"
                        max="28"
                        value={it.gstPercent}
                        onChange={(e) => handleItemChange(idx, "gstPercent", parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 text-right font-bold text-slate-800 dark:text-white">
                      ₹{it.lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="text-slate-300 hover:text-rose-600 disabled:opacity-30 transition"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculation Summary & Save Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-100 dark:border-white/10 shadow-sm space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Amount Paid Right Now (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={paidAmount || ""}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Remarks / Notes
              </label>
              <textarea
                rows={2}
                placeholder="Notes for inward purchase entry..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-600 to-orange-700 text-white rounded-3xl p-6 shadow-xl space-y-3 flex flex-col justify-between">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-amber-100">
                <span>Subtotal:</span>
                <span>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-amber-100">
                <span>Total Discount:</span>
                <span>- ₹{totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {isInterstate ? (
                <div className="flex justify-between text-amber-100">
                  <span>IGST Total:</span>
                  <span>+ ₹{totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-amber-100">
                    <span>CGST (Half Tax):</span>
                    <span>+ ₹{(totalTax / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-amber-100">
                    <span>SGST (Half Tax):</span>
                    <span>+ ₹{(totalTax / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-amber-100">
                <span>Round Off:</span>
                <span>₹{roundOff.toFixed(2)}</span>
              </div>
              <div className="border-t border-white/20 pt-2 flex justify-between text-base font-extrabold text-white">
                <span>Grand Total:</span>
                <span>₹{netAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-amber-200 pt-1 font-semibold">
                <span>Balance Pending:</span>
                <span>₹{balance.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-2xl bg-white text-amber-900 font-extrabold text-xs shadow-lg hover:bg-amber-50 transition flex items-center justify-center gap-2"
            >
              <FaSave /> {saving ? "Saving Bill..." : "Save Purchase Bill"}
            </button>
          </div>
        </div>
      </form>

      {/* Fetch / Import PO Modal */}
      {showPoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-slate-100 dark:border-white/10 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <FaDownload className="text-amber-600" /> Fetch Data from Purchase Order
                </h3>
                <p className="text-xs text-slate-500">
                  Select a pending Purchase Order to auto-fill vendor details & product items
                </p>
              </div>
              <button
                onClick={() => setShowPoModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="relative">
              <FaSearch className="absolute left-3.5 top-3 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search by PO Number or Vendor Name..."
                value={poSearch}
                onChange={(e) => setPoSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingPOs ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading pending Purchase Orders...</div>
              ) : filteredPOs.length > 0 ? (
                filteredPOs.map((po) => (
                  <div
                    key={po._id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 hover:border-amber-400 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-800 dark:text-white">
                          {po.poNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">({po.poDate})</span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {po.vendorName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {po.items?.length || 0} items | Amount: ₹{po.netTotal?.toLocaleString("en-IN")}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleImportPO(po)}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm"
                    >
                      Import to Bill
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No pending Purchase Orders found. You can create one first or enter bill manually.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
