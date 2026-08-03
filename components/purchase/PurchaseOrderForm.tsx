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
  FaPercent,
  FaRupeeSign,
  FaSlidersH,
  FaCheckSquare,
  FaSquare,
  FaTruck,
  FaExclamationCircle,
  FaSearch,
  FaTimes,
  FaListUl,
  FaShieldAlt,
  FaCheckCircle,
} from "react-icons/fa";

interface POItem {
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
  schemePercent: number;
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

// Column Visibility State
interface ColumnConfig {
  hsn: boolean;
  batch: boolean;
  expDate: boolean;
  mrp: boolean;
  freeQty: boolean;
  schemeDisc: boolean;
  tradeDisc: boolean;
  gst: boolean;
  taxableAmt: boolean;
  gstAmt: boolean;
}

function getGstStateCode(gstin?: string): string {
  if (!gstin) return "";
  const cleaned = gstin.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length >= 2 && /^\d{2}/.test(cleaned.substring(0, 2))) {
    return cleaned.substring(0, 2);
  }
  return "";
}

export default function PurchaseOrderForm() {
  const router = useRouter();
  const { selectedCompany } = useCompany();
  const { selectedFY } = useFinancialYear();

  const [saving, setSaving] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(true);

  const [suppliersList, setSuppliersList] = useState<SupplierMaster[]>([]);
  const [productsList, setProductsList] = useState<ProductMaster[]>([]);

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorCode, setVendorCode] = useState("");
  const [vendorGst, setVendorGst] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");

  const [poDate, setPoDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [priority, setPriority] = useState<"Normal" | "High" | "Urgent">("Normal");
  const [paymentTerms, setPaymentTerms] = useState("30 Days Credit");
  const [taxType, setTaxType] = useState<"Intrastate" | "Interstate">("Intrastate");
  const [freightCharges, setFreightCharges] = useState<number>(0);
  const [remarks, setRemarks] = useState("");

  // Column Customization Visibility Checkboxes
  const [showColSettings, setShowColSettings] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig>({
    hsn: true,
    batch: false,
    expDate: false,
    mrp: true,
    freeQty: true,
    schemeDisc: true,
    tradeDisc: true,
    gst: true,
    taxableAmt: true,
    gstAmt: true,
  });

  // Quick Multi-Product Selection Drawer
  const [showMultiProductModal, setShowMultiProductModal] = useState(false);
  const [prodSearch, setProdSearch] = useState("");

  // Initial Empty Row (no default dummy rate or dummy totals)
  const [items, setItems] = useState<POItem[]>([
    {
      productName: "",
      hsnCode: "",
      batchNo: "",
      expDate: "",
      mrp: 0,
      qty: 1,
      freeQty: 0,
      unit: "Box",
      rate: 0,
      discountPercent: 0,
      schemePercent: 0,
      gstPercent: 12,
    },
  ]);

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

  // Auto-Detect Intrastate (CGST+SGST) vs Interstate (IGST) based on Company & Supplier GSTIN State Codes
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

  // Toggle column visibility
  const toggleColumn = (key: keyof ColumnConfig) => {
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  // Quick Add Product from Modal
  const handleQuickAddProduct = (prod: ProductMaster) => {
    const newItem: POItem = {
      productId: prod.id,
      productCode: prod.code,
      productName: prod.name,
      hsnCode: prod.hsn || "30049099",
      batchNo: "",
      expDate: "",
      mrp: prod.mrp || Math.round((prod.purchaseRate || 0) * 1.3),
      qty: 1,
      freeQty: 0,
      unit: prod.unit || "Box",
      rate: prod.purchaseRate || 0,
      discountPercent: 0,
      schemePercent: 0,
      gstPercent: prod.gstPercent || 12,
    };

    if (items.length === 1 && !items[0].productName) {
      setItems([newItem]);
    } else {
      setItems([...items, newItem]);
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productName: "",
        hsnCode: "",
        batchNo: "",
        expDate: "",
        mrp: 0,
        qty: 1,
        freeQty: 0,
        unit: "Box",
        rate: 0,
        discountPercent: 0,
        schemePercent: 0,
        gstPercent: 12,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof POItem, value: any) => {
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
    const scheme = Number(it.schemePercent || 0);
    const gst = Number(it.gstPercent || 0);

    const gross = qty * rate;
    const discAmt = gross * (disc / 100);
    const schemeAmt = gross * (scheme / 100);
    const totalItemDisc = discAmt + schemeAmt;

    const taxable = Math.max(0, gross - totalItemDisc);
    const gstAmt = taxable * (gst / 100);
    const lineTotal = taxable + gstAmt;

    return {
      ...it,
      isSelected,
      gross,
      discAmt,
      schemeAmt,
      totalItemDisc,
      taxable,
      gstAmt,
      lineTotal,
    };
  });

  const subtotal = calculatedItems.reduce((acc, it) => acc + (it.isSelected ? it.gross : 0), 0);
  const totalDiscount = calculatedItems.reduce((acc, it) => acc + (it.isSelected ? it.totalItemDisc : 0), 0);
  const totalTax = calculatedItems.reduce((acc, it) => acc + (it.isSelected ? it.gstAmt : 0), 0);
  const hasProducts = calculatedItems.some((it) => it.isSelected);
  const freight = hasProducts ? Number(freightCharges || 0) : 0;

  const isInterstate = taxType === "Interstate";
  const cgst = isInterstate ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const sgst = isInterstate ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const igst = isInterstate ? Math.round(totalTax * 100) / 100 : 0;

  const rawNet = subtotal - totalDiscount + totalTax + freight;
  const netTotal = Math.round(rawNet);
  const roundOff = Math.round((netTotal - rawNet) * 100) / 100;

  const compStateCode = getGstStateCode(selectedCompany?.gstNo);
  const suppStateCode = getGstStateCode(vendorGst);

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
      const res = await fetch("/api/purchase/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompany?._id,
          companyCode: selectedCompany?.companyCode,
          fyId: selectedFY?._id,
          fyCode: selectedFY?.fyCode,
          poDate,
          expectedDeliveryDate,
          priority,
          paymentTerms,
          taxType,
          vendorName,
          vendorCode,
          vendorGst,
          vendorPhone,
          vendorAddress,
          freightCharges: freight,
          items: validItems,
          remarks,
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert(`Purchase Order ${json.order.poNumber} created successfully!`);
        router.push("/dashboard/purchase/orders");
      } else {
        alert(json.message || "Failed to create PO");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error saving Purchase Order");
    } finally {
      setSaving(false);
    }
  };

  const filteredModalProducts = productsList.filter((p) =>
    p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
    p.code.toLowerCase().includes(prodSearch.toLowerCase()) ||
    (p.companyName || "").toLowerCase().includes(prodSearch.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/purchase/orders"
            className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition"
          >
            <FaArrowLeft />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white">
              Create Purchase Order
            </h1>
            <p className="text-xs text-slate-500">
              Professional vendor requisition & purchase order entry
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Product Drawer Trigger */}
          <button
            type="button"
            onClick={() => setShowMultiProductModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition shadow-xs"
          >
            <FaListUl /> Quick Add Products
          </button>

          {/* Customize Columns Trigger */}
          <button
            type="button"
            onClick={() => setShowColSettings(!showColSettings)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
          >
            <FaSlidersH /> Customize Columns ⚙️
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

      {/* Customizable Columns Panel */}
      {showColSettings && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-4 animate-fadeIn space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <FaSlidersH /> Select Table Fields To Display (Checkboxes):
            </span>
            <button
              onClick={() => setShowColSettings(false)}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              Close ✕
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
            {[
              { key: "hsn", label: "HSN Code" },
              { key: "batch", label: "Batch No" },
              { key: "expDate", label: "Expiry Date" },
              { key: "mrp", label: "MRP (₹)" },
              { key: "freeQty", label: "Free Qty" },
              { key: "schemeDisc", label: "Scheme %" },
              { key: "tradeDisc", label: "Trade Disc %" },
              { key: "gst", label: "GST %" },
              { key: "taxableAmt", label: "Taxable Value" },
              { key: "gstAmt", label: "GST Amount" },
            ].map((col) => {
              const active = columns[col.key as keyof ColumnConfig];
              return (
                <label
                  key={col.key}
                  className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200/60 dark:border-white/10"
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleColumn(col.key as keyof ColumnConfig)}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                  <span>{col.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vendor & Order Settings Section */}
        <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-100 dark:border-white/10 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FaUser className="text-amber-600" /> Supplier & Order Terms
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Supplier Searchable Select */}
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
                Order Priority Badge
              </label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none font-bold text-amber-700"
              >
                <option value="Normal">🟢 Normal Priority</option>
                <option value="High">🟠 High Priority</option>
                <option value="Urgent">🔴 Urgent Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                GST Tax Structure
              </label>
              <select
                value={taxType}
                onChange={(e: any) => setTaxType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none font-bold"
              >
                <option value="Intrastate">Intrastate (CGST + SGST)</option>
                <option value="Interstate">Interstate (IGST)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                PO Date *
              </label>
              <input
                type="date"
                required
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Payment Credit Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none"
              >
                <option value="30 Days Credit">30 Days Credit</option>
                <option value="15 Days Credit">15 Days Credit</option>
                <option value="Immediate / Advance">Immediate / Advance</option>
                <option value="Cash on Delivery">Cash on Delivery</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Supplier GSTIN / Phone
              </label>
              <input
                type="text"
                placeholder="GSTIN Number"
                value={vendorGst}
                onChange={(e) => setVendorGst(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none font-semibold text-slate-800 dark:text-white"
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

        {/* Product Items Table with Dynamic Customized Columns */}
        <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-100 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <FaBoxes className="text-amber-600" /> Purchase Items Table
            </h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition"
            >
              <FaPlus /> Add Item Row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/10 text-slate-400 font-medium">
                  <th className="pb-3 w-8">#</th>
                  <th className="pb-3 min-w-[220px]">Product Name *</th>
                  {columns.hsn && <th className="pb-3 w-24">HSN Code</th>}
                  {columns.batch && <th className="pb-3 w-20">Batch</th>}
                  {columns.expDate && <th className="pb-3 w-20">Exp Date</th>}
                  {columns.mrp && <th className="pb-3 w-20">MRP (₹)</th>}
                  <th className="pb-3 w-16">Qty</th>
                  {columns.freeQty && <th className="pb-3 w-16">Free</th>}
                  <th className="pb-3 w-16">Unit</th>
                  <th className="pb-3 w-20">Rate (₹)</th>
                  {columns.schemeDisc && <th className="pb-3 w-16">Scheme %</th>}
                  {columns.tradeDisc && <th className="pb-3 w-16">Disc %</th>}
                  {columns.gst && <th className="pb-3 w-16">GST %</th>}
                  {columns.taxableAmt && <th className="pb-3 w-24 text-right">Taxable</th>}
                  {columns.gstAmt && <th className="pb-3 w-20 text-right">GST Amt</th>}
                  <th className="pb-3 w-28 text-right">Line Total (₹)</th>
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
                        placeholder={loadingMasters ? "Loading Products..." : "Search Inventory Product..."}
                      />
                    </td>

                    {columns.hsn && (
                      <td className="py-2.5 pr-2">
                        <input
                          type="text"
                          placeholder="HSN"
                          value={it.hsnCode}
                          onChange={(e) => handleItemChange(idx, "hsnCode", e.target.value)}
                          className="w-full px-2 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none font-semibold text-amber-800 dark:text-amber-300"
                        />
                      </td>
                    )}

                    {columns.batch && (
                      <td className="py-2.5 pr-2">
                        <input
                          type="text"
                          placeholder="Batch"
                          value={it.batchNo}
                          onChange={(e) => handleItemChange(idx, "batchNo", e.target.value)}
                          className="w-full px-2 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none"
                        />
                      </td>
                    )}

                    {columns.expDate && (
                      <td className="py-2.5 pr-2">
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={it.expDate}
                          onChange={(e) => handleItemChange(idx, "expDate", e.target.value)}
                          className="w-full px-2 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none"
                        />
                      </td>
                    )}

                    {columns.mrp && (
                      <td className="py-2.5 pr-2">
                        <input
                          type="number"
                          min="0"
                          value={it.mrp || ""}
                          placeholder="0.00"
                          onChange={(e) => handleItemChange(idx, "mrp", parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none font-medium"
                        />
                      </td>
                    )}

                    <td className="py-2.5 pr-2">
                      <input
                        type="number"
                        min="1"
                        value={it.qty}
                        onChange={(e) => handleItemChange(idx, "qty", Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full px-2 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none font-bold text-amber-700"
                      />
                    </td>

                    {columns.freeQty && (
                      <td className="py-2.5 pr-2">
                        <input
                          type="number"
                          min="0"
                          value={it.freeQty}
                          onChange={(e) => handleItemChange(idx, "freeQty", parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none"
                        />
                      </td>
                    )}

                    <td className="py-2.5 pr-2">
                      <select
                        value={it.unit}
                        onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                        className="w-full px-2 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none"
                      >
                        <option value="Box">Box</option>
                        <option value="Strip">Strip</option>
                        <option value="Bottle">Bottle</option>
                        <option value="Pcs">Pcs</option>
                      </select>
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

                    {columns.schemeDisc && (
                      <td className="py-2.5 pr-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={it.schemePercent || ""}
                          placeholder="0"
                          onChange={(e) => handleItemChange(idx, "schemePercent", parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none"
                        />
                      </td>
                    )}

                    {columns.tradeDisc && (
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
                    )}

                    {columns.gst && (
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
                    )}

                    {columns.taxableAmt && (
                      <td className="py-2.5 text-right font-medium text-slate-600 dark:text-slate-400">
                        ₹{it.taxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    )}

                    {columns.gstAmt && (
                      <td className="py-2.5 text-right font-medium text-amber-600 dark:text-amber-400">
                        ₹{it.gstAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    )}

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

        {/* Calculations, Shipping & Final Order Submit Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-100 dark:border-white/10 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Freight / Transport Charges (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={freightCharges || ""}
                  onChange={(e) => setFreightCharges(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Delivery / Shipping Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Central Warehouse, Plot 4"
                  value={vendorAddress}
                  onChange={(e) => setVendorAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Special Remarks & Instructions
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Please deliver before 5 PM. Cold-chain items must be stored properly."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-3xl p-6 shadow-xl space-y-3 flex flex-col justify-between">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-amber-100">
                <span>Subtotal (Gross):</span>
                <span>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-amber-100">
                <span>Total Discount:</span>
                <span>- ₹{totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-amber-100">
                <span>Freight Charges:</span>
                <span>+ ₹{freight.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {isInterstate ? (
                <div className="flex justify-between text-amber-100">
                  <span>IGST Total:</span>
                  <span>+ ₹{igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-amber-100">
                    <span>CGST (Half Tax):</span>
                    <span>+ ₹{cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-amber-100">
                    <span>SGST (Half Tax):</span>
                    <span>+ ₹{sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-amber-100">
                <span>Round Off:</span>
                <span>₹{roundOff.toFixed(2)}</span>
              </div>
              <div className="border-t border-white/20 pt-2 flex justify-between text-base font-extrabold text-white">
                <span>Net PO Value:</span>
                <span>₹{netTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-2xl bg-white text-amber-900 font-extrabold text-xs shadow-lg hover:bg-amber-50 transition flex items-center justify-center gap-2"
            >
              <FaSave /> {saving ? "Saving Order..." : "Save Purchase Order"}
            </button>
          </div>
        </div>
      </form>

      {/* Quick Add Product Modal */}
      {showMultiProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-slate-100 dark:border-white/10 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <FaListUl className="text-amber-600" /> Quick Add Products to Order
                </h3>
                <p className="text-xs text-slate-500">
                  Search & click products to instantly append them into your PO items list
                </p>
              </div>
              <button
                onClick={() => setShowMultiProductModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="relative">
              <FaSearch className="absolute left-3.5 top-3 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search products by name, code or company..."
                value={prodSearch}
                onChange={(e) => setProdSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredModalProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-amber-400 transition"
                >
                  <div>
                    <div className="font-extrabold text-xs text-slate-800 dark:text-white">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {p.companyName ? `Company: ${p.companyName} | ` : ""}Rate: ₹{p.purchaseRate} | HSN: {p.hsn}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleQuickAddProduct(p)}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1"
                  >
                    <FaPlus size={10} /> Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
