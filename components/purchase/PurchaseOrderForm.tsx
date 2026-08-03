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
  FaShoppingBag,
  FaFileInvoiceDollar,
  FaReceipt,
  FaUndoAlt,
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
  const [poNumberCustom, setPoNumberCustom] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorCode, setVendorCode] = useState("");
  const [vendorGst, setVendorGst] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");

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

  // Initial Empty Row
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

  // Auto Fetch Next PO VCN Series Number
  const fetchNextPoVcn = useCallback(async () => {
    try {
      const res = await fetch("/api/purchase/orders?action=nextNumber");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.nextVcn) {
          setPoNumberCustom(json.nextVcn);
        }
      }
    } catch (err) {
      console.error("Fetch Next PO VCN Error:", err);
    }
  }, []);

  useEffect(() => {
    fetchMasters();
    fetchNextPoVcn();
  }, [fetchMasters, fetchNextPoVcn]);

  // Auto-Detect Intrastate (CGST+SGST) vs Interstate (IGST)
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

  // Line & Overall Calculations
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
          poNumber: poNumberCustom,
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
          shippingAddress,
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
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto text-slate-800 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/purchase/orders"
            className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition shadow-xs"
          >
            <FaArrowLeft />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
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

      {/* Interlinking Navigation Pills */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-900/60 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
        <Link
          href="/dashboard/purchase/dashboard"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaShoppingBag className="text-amber-500" /> Dashboard
        </Link>
        <Link
          href="/dashboard/purchase/invoice"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaFileInvoice className="text-amber-500" /> Invoices List
        </Link>
        <Link
          href="/dashboard/purchase/orders"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white shadow-xs font-bold"
        >
          <FaTruck /> Create PO
        </Link>
        <Link
          href="/dashboard/purchase/outstanding"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaFileInvoiceDollar className="text-rose-500" /> Outstanding
        </Link>
        <Link
          href="/dashboard/purchase/payment"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
        >
          <FaReceipt className="text-emerald-500" /> Payment Entry
        </Link>
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
            <FaUser className="text-indigo-600" /> Supplier & Order Terms
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Customizable PO Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                PO Number (Customizable) *
              </label>
              <input
                type="text"
                value={poNumberCustom}
                onChange={(e) => setPoNumberCustom(e.target.value)}
                placeholder="PO-1001"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-extrabold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

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
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Supplier Company Name"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Supplier GSTIN
              </label>
              <input
                type="text"
                value={vendorGst}
                onChange={(e) => setVendorGst(e.target.value)}
                placeholder="27AAAAA0000A1Z5"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                PO Date
              </label>
              <input
                type="date"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Order Priority
              </label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="Normal">Normal Priority</option>
                <option value="High">High Priority</option>
                <option value="Urgent">Urgent Requisition</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="30 Days Credit">30 Days Credit</option>
                <option value="15 Days Credit">15 Days Credit</option>
                <option value="Cash / Advance">Cash / Advance</option>
                <option value="Net 45 Days">Net 45 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Tax Type Mode
              </label>
              <select
                value={taxType}
                onChange={(e: any) => setTaxType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
              >
                <option value="Intrastate">Intrastate (CGST + SGST)</option>
                <option value="Interstate">Interstate (IGST)</option>
              </select>
            </div>

            <div className="col-span-1 sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Shipping / Delivery Address
              </label>
              <input
                type="text"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Godown / Warehouse Address"
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Product Items Entry Table */}
        <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-100 dark:border-white/10 shadow-sm space-y-4 overflow-x-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <FaBoxes className="text-indigo-600" /> Products Requisition List
            </h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
            >
              <FaPlus /> Add Line Item
            </button>
          </div>

          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider">
                <th className="pb-3 px-2 min-w-[200px]">Product Name *</th>
                {columns.hsn && <th className="pb-3 px-2 w-24">HSN</th>}
                {columns.batch && <th className="pb-3 px-2 w-24">Batch</th>}
                {columns.expDate && <th className="pb-3 px-2 w-28">Exp Date</th>}
                {columns.mrp && <th className="pb-3 px-2 text-right w-24">MRP (₹)</th>}
                <th className="pb-3 px-2 text-right w-24">Qty *</th>
                {columns.freeQty && <th className="pb-3 px-2 text-right w-20">Free</th>}
                <th className="pb-3 px-2 text-right w-28">Rate (₹) *</th>
                {columns.schemeDisc && <th className="pb-3 px-2 text-right w-20">Sch %</th>}
                {columns.tradeDisc && <th className="pb-3 px-2 text-right w-20">Dis %</th>}
                {columns.gst && <th className="pb-3 px-2 text-right w-20">GST %</th>}
                {columns.taxableAmt && <th className="pb-3 px-2 text-right w-28">Taxable</th>}
                {columns.gstAmt && <th className="pb-3 px-2 text-right w-24">GST Amt</th>}
                <th className="pb-3 px-2 text-right w-28">Total</th>
                <th className="pb-3 px-2 text-center w-10">✕</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {calculatedItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                  <td className="py-2.5 px-2">
                    <SearchableSelect
                      options={productOptions}
                      value={item.productId || ""}
                      onChange={(val) => handleProductSelect(idx, val)}
                      placeholder="Search / Select Product..."
                    />
                  </td>
                  {columns.hsn && (
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        value={item.hsnCode}
                        onChange={(e) => handleItemChange(idx, "hsnCode", e.target.value)}
                        className="w-full px-2 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      />
                    </td>
                  )}
                  {columns.batch && (
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        value={item.batchNo}
                        onChange={(e) => handleItemChange(idx, "batchNo", e.target.value)}
                        className="w-full px-2 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      />
                    </td>
                  )}
                  {columns.expDate && (
                    <td className="py-2.5 px-2">
                      <input
                        type="month"
                        value={item.expDate}
                        onChange={(e) => handleItemChange(idx, "expDate", e.target.value)}
                        className="w-full px-2 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      />
                    </td>
                  )}
                  {columns.mrp && (
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.mrp || ""}
                        onChange={(e) => handleItemChange(idx, "mrp", e.target.value)}
                        className="w-full px-2 py-1 text-right rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      />
                    </td>
                  )}
                  <td className="py-2.5 px-2">
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => handleItemChange(idx, "qty", Math.max(1, Number(e.target.value)))}
                      className="w-full px-2 py-1 text-right font-bold rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    />
                  </td>
                  {columns.freeQty && (
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        min="0"
                        value={item.freeQty}
                        onChange={(e) => handleItemChange(idx, "freeQty", Math.max(0, Number(e.target.value)))}
                        className="w-full px-2 py-1 text-right rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      />
                    </td>
                  )}
                  <td className="py-2.5 px-2">
                    <input
                      type="number"
                      step="0.01"
                      value={item.rate || ""}
                      onChange={(e) => handleItemChange(idx, "rate", Number(e.target.value))}
                      className="w-full px-2 py-1 text-right font-bold text-indigo-600 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    />
                  </td>
                  {columns.schemeDisc && (
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        step="0.1"
                        value={item.schemePercent || ""}
                        onChange={(e) => handleItemChange(idx, "schemePercent", Number(e.target.value))}
                        className="w-full px-2 py-1 text-right rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      />
                    </td>
                  )}
                  {columns.tradeDisc && (
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        step="0.1"
                        value={item.discountPercent || ""}
                        onChange={(e) => handleItemChange(idx, "discountPercent", Number(e.target.value))}
                        className="w-full px-2 py-1 text-right rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      />
                    </td>
                  )}
                  {columns.gst && (
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        step="0.1"
                        value={item.gstPercent}
                        onChange={(e) => handleItemChange(idx, "gstPercent", Number(e.target.value))}
                        className="w-full px-2 py-1 text-right rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      />
                    </td>
                  )}
                  {columns.taxableAmt && (
                    <td className="py-2.5 px-2 text-right font-semibold">
                      ₹{item.taxable.toFixed(2)}
                    </td>
                  )}
                  {columns.gstAmt && (
                    <td className="py-2.5 px-2 text-right text-slate-500">
                      ₹{item.gstAmt.toFixed(2)}
                    </td>
                  )}
                  <td className="py-2.5 px-2 text-right font-black text-indigo-600">
                    ₹{item.lineTotal.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition"
                    >
                      <FaTrash size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Footer & Totals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800/80 p-6 rounded-3xl border border-slate-100 dark:border-white/10 shadow-sm space-y-3">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
              Remarks / Requisition Notes
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter special instructions for vendor, transport details, or internal notes..."
              className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-3xl text-white shadow-xl space-y-3 border border-indigo-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-300">Order Financial Summary</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-indigo-200">
                <span>Subtotal Gross:</span>
                <span>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-rose-300">
                <span>Discounts:</span>
                <span>-₹{totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-indigo-200">
                <span>Taxable Amount:</span>
                <span>₹{(subtotal - totalDiscount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-amber-300">
                <span>{isInterstate ? "IGST Tax" : "CGST + SGST Tax"}:</span>
                <span>₹{totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-indigo-200 pt-1">
                <span>Freight Charges:</span>
                <input
                  type="number"
                  step="1"
                  value={freightCharges || ""}
                  onChange={(e) => setFreightCharges(Number(e.target.value))}
                  className="w-24 px-2 py-0.5 text-right bg-white/10 rounded-lg text-white font-bold border border-white/20"
                />
              </div>
              <div className="border-t border-indigo-700/60 pt-2 flex justify-between items-center">
                <span className="text-base font-black">Net Total Amount:</span>
                <span className="text-2xl font-black text-amber-400">₹{netTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2 transform hover:scale-[1.02]"
            >
              <FaSave /> {saving ? "Saving Order..." : "Save & Generate Purchase Order"}
            </button>
          </div>
        </div>
      </form>

      {/* QUICK MULTI-PRODUCT DRAWER MODAL */}
      {showMultiProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaListUl className="text-amber-500" /> Quick Product Selection Catalog
              </h3>
              <button onClick={() => setShowMultiProductModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <FaTimes />
              </button>
            </div>

            <div className="relative">
              <FaSearch className="absolute left-3.5 top-3.5 text-slate-400 text-xs" />
              <input
                type="text"
                placeholder="Search products by name, code, company..."
                value={prodSearch}
                onChange={(e) => setProdSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
              {filteredModalProducts.map((prod) => (
                <div key={prod.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border flex items-center justify-between hover:border-amber-500 transition">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{prod.name}</p>
                    <p className="text-[10px] text-slate-500">Code: {prod.code} • Rate: ₹{prod.purchaseRate} • HSN: {prod.hsn}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickAddProduct(prod)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[11px] transition"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowMultiProductModal(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
