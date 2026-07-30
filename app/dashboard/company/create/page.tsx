"use client";

import { useState } from "react";
import { FaBuilding } from "react-icons/fa";
import {
  CheckCircle2,
  ShieldCheck,
  Search,
  Mail,
  RefreshCw,
  AlertTriangle,
  X,
  Tag,
  Send,
  Lock,
  Building2,
} from "lucide-react";
import {
  validateCompanyForm,
  validateGstin,
  validatePan,
  validateEmail,
  validatePhone,
  validatePincode,
  CompanyFormErrors,
  getHsnDescription,
} from "@/lib/constants/companyValidation";

export default function CreateCompanyPage() {
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState("/logo.png");

  const initialForm = {
    companyCode: "",
    companyName: "",
    ownerName: "",
    email: "",
    mobile: "",
    gstNo: "",
    panNo: "",
    drugLicenseNo: "",
    website: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    invoicePrefix: "INV-001",
    purchasePrefix: "PUR-001",
    currency: "INR",
    logo: "",
    status: "Active",
  };

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<CompanyFormErrors>({});

  // GST Verification States
  const [verifyingGst, setVerifyingGst] = useState(false);
  const [gstVerifiedData, setGstVerifiedData] = useState<any>(null);
  const [gstMessage, setGstMessage] = useState<{ type: "success" | "error" | ""; text: string }>({
    type: "",
    text: "",
  });

  // Email Verification States
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showInlineOtpBox, setShowInlineOtpBox] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [emailOtpInput, setEmailOtpInput] = useState("");
  const [otpMessage, setOtpMessage] = useState<{ type: "success" | "error" | ""; text: string }>({
    type: "",
    text: "",
  });

  // Field change handler with live validation & number filtering
  const handleChange = (field: string, value: string) => {
    let cleanVal = value;

    // Apply strict character limits & numeric filters
    if (field === "mobile" || field === "pincode") {
      cleanVal = value.replace(/\D/g, ""); // digits only
    } else if (field === "gstNo" || field === "panNo" || field === "companyCode") {
      cleanVal = value.toUpperCase().trim();
    }

    const updated = { ...form, [field]: cleanVal };
    setForm(updated);

    // Reset email verification if email is edited
    if (field === "email") {
      if (isEmailVerified) setIsEmailVerified(false);
      setShowInlineOtpBox(false);
      setEmailOtpInput("");
    }

    // Live validation cleanup
    if (errors[field as keyof CompanyFormErrors]) {
      const fieldErrors = validateCompanyForm(updated);
      setErrors((prev) => ({ ...prev, [field]: fieldErrors[field as keyof CompanyFormErrors] }));
    }
  };

  // Verify GST Handler & Autofill All Form Fields
  const verifyGst = async () => {
    const gstin = form.gstNo.trim().toUpperCase();
    if (!gstin) {
      setGstMessage({ type: "error", text: "Please enter a 15-character GSTIN first." });
      return;
    }

    if (!validateGstin(gstin)) {
      setGstMessage({
        type: "error",
        text: "Invalid GSTIN format (e.g. 06AALCM8009M1Z1). Expected 15 characters.",
      });
      return;
    }

    setVerifyingGst(true);
    setGstMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/gst/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gstin }),
      });

      const result = await res.json();

      if (result.success && result.data) {
        const data = result.data;
        setGstVerifiedData(data);
        setGstMessage({
          type: "success",
          text: `GSTIN verified! Loaded trade name: ${data.tradeName || data.legalName}`,
        });

        // Autofill all matching fields reliably
        setForm((prev) => ({
          ...prev,
          companyName: data.tradeName || data.legalName || prev.companyName,
          companyCode: data.companyCode || prev.companyCode,
          panNo: data.panNo || prev.panNo,
          address: data.address || prev.address,
          city: data.city || prev.city,
          state: data.state || prev.state,
          pincode: data.pincode || prev.pincode,
        }));

        // Clear field validation errors
        setErrors((prev) => ({
          ...prev,
          gstNo: undefined,
          panNo: undefined,
          companyName: undefined,
          companyCode: undefined,
          address: undefined,
          city: undefined,
          state: undefined,
          pincode: undefined,
        }));
      } else {
        setGstMessage({ type: "error", text: result.error || "Could not verify GSTIN with provider." });
      }
    } catch {
      setGstMessage({ type: "error", text: "Error connecting to GST verification API." });
    } finally {
      setVerifyingGst(false);
    }
  };

  // Send Email OTP Handler
  const handleSendEmailOtp = async () => {
    if (!form.email || !validateEmail(form.email)) {
      setErrors((prev) => ({ ...prev, email: "Please enter a valid company email address." }));
      return;
    }

    setSendingOtp(true);
    setOtpMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/company/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_otp", email: form.email }),
      });

      const data = await res.json();

      if (data.success) {
        setShowInlineOtpBox(true);
        setOtpMessage({ type: "success", text: data.message });
      } else {
        setOtpMessage({ type: "error", text: data.error || "Failed to send verification code." });
      }
    } catch {
      setOtpMessage({ type: "error", text: "Error sending verification email. Check SMTP settings." });
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify Email OTP Code Handler
  const handleVerifyOtp = async () => {
    if (!emailOtpInput || emailOtpInput.trim().length !== 6) {
      setOtpMessage({ type: "error", text: "Please enter the 6-digit verification code." });
      return;
    }

    setVerifyingOtp(true);
    setOtpMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/company/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_otp", email: form.email, otp: emailOtpInput }),
      });

      const data = await res.json();

      if (data.success) {
        setIsEmailVerified(true);
        setShowInlineOtpBox(false);
        setEmailOtpInput("");
        setErrors((prev) => ({ ...prev, email: undefined }));
      } else {
        setOtpMessage({ type: "error", text: data.error || "Invalid verification code." });
      }
    } catch {
      setOtpMessage({ type: "error", text: "Failed to verify OTP." });
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Upload Logo Handler
  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Maximum file size is 2MB");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/upload-logo", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!data.success) {
        alert("Upload Failed");
        return;
      }

      setLogoPreview(data.url);
      setForm((prev) => ({ ...prev, logo: data.url }));
    } catch {
      alert("Error uploading logo");
    }
  };

  // Save Company Form Handler
  const saveCompany = async () => {
    // Validate all fields
    const formErrors = validateCompanyForm(form);

    // Extra strict checks on required fields
    if (!form.ownerName || !form.ownerName.trim()) {
      formErrors.companyCode = formErrors.companyCode || "Owner Name is required";
    }
    if (!form.address || !form.address.trim()) {
      formErrors.companyCode = formErrors.companyCode || "Address is required";
    }
    if (!form.city || !form.city.trim()) {
      formErrors.companyCode = formErrors.companyCode || "City is required";
    }
    if (!form.state || !form.state.trim()) {
      formErrors.companyCode = formErrors.companyCode || "State is required";
    }

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      alert("Please complete all required fields and correct validation errors before saving.");
      return;
    }

    if (!isEmailVerified) {
      const confirmProceed = confirm(
        "Company Email is not verified via OTP. Would you like to send verification code now?"
      );
      if (confirmProceed) {
        handleSendEmailOtp();
        return;
      }
    }

    try {
      setLoading(true);

      const res = await fetch("/api/company-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to save company profile");

      alert("Company Created Successfully!");
      setForm(initialForm);
      setLogoPreview("/logo.png");
      setGstVerifiedData(null);
      setIsEmailVerified(false);
      setShowInlineOtpBox(false);
      setErrors({});
    } catch (error: any) {
      alert(error.message || "Error Creating Company");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (fieldError?: string) =>
    `w-full rounded-xl text-sm px-3.5 py-2.5 bg-white border ${
      fieldError
        ? "border-red-400 focus:ring-red-200"
        : "border-slate-200/90 focus:border-indigo-500 focus:ring-indigo-200"
    } text-slate-800 placeholder-slate-400 outline-none focus:ring-2 transition-all shadow-2xs font-sans`;

  const labelClass =
    "block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between";

  return (
    <div className="relative rounded-2xl overflow-hidden bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.06)] max-w-6xl mx-auto my-4">
      {/* Top Sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent" />

      {/* Page Header */}
      <div className="relative flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/10 border border-white/20 text-indigo-300">
            <FaBuilding size={16} />
          </div>
          <div>
            <h5 className="text-base font-bold tracking-tight m-0 text-white">Create Company Profile</h5>
            <p className="text-xs text-slate-300 m-0">Enter business information, verify GSTIN & email, and set ERP defaults.</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="relative p-6 sm:p-8 space-y-6">
        {/* Logo Upload Section */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
          <img
            src={logoPreview}
            alt="logo"
            width={90}
            height={90}
            className="rounded-2xl object-contain bg-white ring-4 ring-white shadow-xs p-2 shrink-0 border border-slate-100"
          />
          <div className="space-y-2 text-center sm:text-left">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Company Logo</label>
            <input
              type="file"
              className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3.5 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-black file:cursor-pointer"
              onChange={uploadLogo}
            />
            <p className="text-[11px] text-slate-400 m-0">Recommended formats: PNG, JPG or WebP (Max size 2MB)</p>
          </div>
        </div>

        {/* GSTIN Verification Section */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/90 to-sky-50/90 border border-indigo-100 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-950 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>GSTIN Auto-Verification & Details Autofill</span>
            </div>
            {gstVerifiedData && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-3 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 size={13} />
                <span>GSTIN Verified ({gstVerifiedData.gstStatus || "Active"})</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="sm:col-span-8">
              <input
                maxLength={15}
                className={`${inputClass(errors.gstNo)} font-mono font-bold tracking-wide uppercase`}
                placeholder="e.g. 06AALCM8009M1Z1 (15-character GSTIN)"
                value={form.gstNo}
                onChange={(e) => handleChange("gstNo", e.target.value)}
              />
              {errors.gstNo && <span className="text-[11px] text-red-500 font-semibold block mt-1">{errors.gstNo}</span>}
            </div>

            <div className="sm:col-span-4">
              <button
                type="button"
                onClick={verifyGst}
                disabled={verifyingGst || !form.gstNo}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {verifyingGst ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Search size={14} />
                )}
                <span>{verifyingGst ? "Verifying GST..." : "Verify GST & Autofill"}</span>
              </button>
            </div>
          </div>

          {gstMessage.text && (
            <div
              className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                gstMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {gstMessage.type === "success" ? (
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle size={14} className="text-red-600 shrink-0" />
              )}
              <span>{gstMessage.text}</span>
            </div>
          )}

          {/* GST Verified Info Card with HSN Code Descriptions */}
          {gstVerifiedData && (
            <div className="p-4 rounded-xl bg-white border border-indigo-100 text-xs space-y-3 shadow-2xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold">Legal Business Name</span>
                  <strong className="text-slate-900 font-bold">{gstVerifiedData.tradeName || gstVerifiedData.legalName || "Active Business"}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold">Taxpayer Type</span>
                  <strong className="text-slate-900 font-bold">{gstVerifiedData.taxpayerType || "Regular"}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold">Extracted PAN</span>
                  <strong className="text-slate-900 font-bold">{gstVerifiedData.panNo || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans uppercase font-bold">State</span>
                  <strong className="text-slate-900 font-bold">{gstVerifiedData.state || "Haryana"}</strong>
                </div>
              </div>

              {/* HSN / SAC Codes with Names & Descriptions */}
              <div className="pt-2.5 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block flex items-center gap-1.5">
                  <Tag size={13} className="text-indigo-600" />
                  <span>Associated HSN / SAC Goods & Services Codes:</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(gstVerifiedData.hsnDetails || [
                    { code: "3004", description: getHsnDescription("3004") },
                    { code: "3003", description: getHsnDescription("3003") },
                    { code: "2106", description: getHsnDescription("2106") },
                    { code: "998313", description: getHsnDescription("998313") },
                  ]).map((item: { code: string; description: string }) => (
                    <div key={item.code} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                      <span className="px-2 py-0.5 bg-slate-900 text-white rounded font-mono font-bold text-[11px] shrink-0">
                        {item.code}
                      </span>
                      <span className="text-slate-700 font-semibold truncate" title={item.description}>
                        {item.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Company Fields Form */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Company Code */}
          <div className="md:col-span-4 space-y-1">
            <label className={labelClass}>
              <span>Company Code *</span>
            </label>
            <input
              maxLength={12}
              className={`${inputClass(errors.companyCode)} font-mono font-bold uppercase`}
              placeholder="e.g. MABSOL01"
              value={form.companyCode}
              onChange={(e) => handleChange("companyCode", e.target.value)}
            />
            {errors.companyCode && <span className="text-[11px] text-red-500 font-semibold block">{errors.companyCode}</span>}
          </div>

          {/* Company Name */}
          <div className="md:col-span-4 space-y-1">
            <label className={labelClass}>
              <span>Company Name *</span>
            </label>
            <input
              className={inputClass(errors.companyName)}
              placeholder="e.g. Mabsol Infotech Pvt Ltd"
              value={form.companyName}
              onChange={(e) => handleChange("companyName", e.target.value)}
            />
            {errors.companyName && <span className="text-[11px] text-red-500 font-semibold block">{errors.companyName}</span>}
          </div>

          {/* Owner Name */}
          <div className="md:col-span-4 space-y-1">
            <label className={labelClass}>
              <span>Owner Name *</span>
            </label>
            <input
              className={inputClass()}
              placeholder="e.g. Ashish Kumar (Owner/Director)"
              value={form.ownerName}
              onChange={(e) => handleChange("ownerName", e.target.value)}
            />
          </div>

          {/* Company Email Container with Right-Aligned Inline Verify Button */}
          <div className="md:col-span-6 space-y-1">
            <label className={labelClass}>
              <span>Company Email *</span>
            </label>
            <div className="relative flex items-center w-full">
              <input
                type="email"
                className={`${inputClass(errors.email)} pr-32`}
                placeholder="e.g. contact@mabsolinfotech.com"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />

              {/* Right-aligned Inline Verify Email Button / Badge */}
              <div className="absolute right-2 flex items-center">
                {isEmailVerified ? (
                  <span className="text-[11px] text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 shadow-2xs">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>Verified</span>
                  </span>
                ) : validateEmail(form.email) ? (
                  <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    disabled={sendingOtp}
                    className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  >
                    {sendingOtp ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Send size={12} />
                    )}
                    <span>{sendingOtp ? "Sending..." : "Verify Email"}</span>
                  </button>
                ) : null}
              </div>
            </div>
            {errors.email && <span className="text-[11px] text-red-500 font-semibold block">{errors.email}</span>}

            {/* Inline Email OTP Verification Input Box */}
            {showInlineOtpBox && !isEmailVerified && (
              <div className="mt-2.5 p-3.5 bg-indigo-50/90 border border-indigo-200 rounded-xl space-y-2.5 animate-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                  <span className="flex items-center gap-1.5">
                    <Mail size={14} className="text-indigo-600" />
                    <span>Enter 6-Digit OTP sent to {form.email}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowInlineOtpBox(false)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={emailOtpInput}
                    onChange={(e) => setEmailOtpInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit OTP"
                    className="flex-1 px-3 py-1.5 text-sm font-mono font-bold tracking-widest bg-white border border-slate-300 rounded-lg text-slate-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={verifyingOtp || emailOtpInput.length !== 6}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {verifyingOtp ? "Verifying..." : "Submit OTP"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendEmailOtp}
                    disabled={sendingOtp}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    Resend
                  </button>
                </div>

                {otpMessage.text && (
                  <p
                    className={`text-[11px] font-semibold m-0 ${
                      otpMessage.type === "success" ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {otpMessage.text}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Mobile / Phone */}
          <div className="md:col-span-6 space-y-1">
            <label className={labelClass}>
              <span>Company Phone *</span>
            </label>
            <input
              maxLength={10}
              className={`${inputClass(errors.mobile)} font-mono`}
              placeholder="e.g. 9876543210 (10-digit mobile)"
              value={form.mobile}
              onChange={(e) => handleChange("mobile", e.target.value)}
            />
            {errors.mobile && <span className="text-[11px] text-red-500 font-semibold block">{errors.mobile}</span>}
          </div>

          {/* PAN Number */}
          <div className="md:col-span-6 space-y-1">
            <label className={labelClass}>
              <span>PAN Number *</span>
            </label>
            <input
              maxLength={10}
              className={`${inputClass(errors.panNo)} font-mono uppercase font-bold`}
              placeholder="e.g. AALCM8009M (10-character PAN)"
              value={form.panNo}
              onChange={(e) => handleChange("panNo", e.target.value)}
            />
            {errors.panNo && <span className="text-[11px] text-red-500 font-semibold block">{errors.panNo}</span>}
          </div>

          {/* Drug License No */}
          <div className="md:col-span-6 space-y-1">
            <label className={labelClass}>Drug License No</label>
            <input
              className={`${inputClass()} font-mono`}
              placeholder="e.g. 20B/HR/12345, 21B/HR/12346"
              value={form.drugLicenseNo}
              onChange={(e) => handleChange("drugLicenseNo", e.target.value)}
            />
          </div>

          {/* Website */}
          <div className="md:col-span-12 space-y-1">
            <label className={labelClass}>Company Website</label>
            <input
              className={inputClass()}
              placeholder="e.g. https://www.mabsolinfotech.com"
              value={form.website}
              onChange={(e) => handleChange("website", e.target.value)}
            />
          </div>

          {/* Address */}
          <div className="md:col-span-12 space-y-1">
            <label className={labelClass}>
              <span>Address *</span>
            </label>
            <textarea
              rows={3}
              className={inputClass()}
              placeholder="e.g. Plot No 45, Sector 18, Industrial Area"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </div>

          {/* City */}
          <div className="md:col-span-4 space-y-1">
            <label className={labelClass}>
              <span>City *</span>
            </label>
            <input
              className={inputClass()}
              placeholder="e.g. Gurugram / Mumbai"
              value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
            />
          </div>

          {/* State */}
          <div className="md:col-span-4 space-y-1">
            <label className={labelClass}>
              <span>State *</span>
            </label>
            <input
              className={inputClass()}
              placeholder="e.g. Haryana / Maharashtra"
              value={form.state}
              onChange={(e) => handleChange("state", e.target.value)}
            />
          </div>

          {/* Pincode */}
          <div className="md:col-span-4 space-y-1">
            <label className={labelClass}>
              <span>Pincode *</span>
            </label>
            <input
              maxLength={6}
              className={`${inputClass(errors.pincode)} font-mono font-bold`}
              placeholder="e.g. 122001 (6 digits)"
              value={form.pincode}
              onChange={(e) => handleChange("pincode", e.target.value)}
            />
            {errors.pincode && <span className="text-[11px] text-red-500 font-semibold block">{errors.pincode}</span>}
          </div>

          {/* Invoice Prefix */}
          <div className="md:col-span-4 space-y-1">
            <label className={labelClass}>
              <span>Invoice Prefix *</span>
            </label>
            <input
              className={`${inputClass()} font-mono font-bold`}
              placeholder="e.g. INV-001"
              value={form.invoicePrefix}
              onChange={(e) => handleChange("invoicePrefix", e.target.value)}
            />
          </div>

          {/* Purchase Prefix */}
          <div className="md:col-span-4 space-y-1">
            <label className={labelClass}>
              <span>Purchase Prefix *</span>
            </label>
            <input
              className={`${inputClass()} font-mono font-bold`}
              placeholder="e.g. PUR-001"
              value={form.purchasePrefix}
              onChange={(e) => handleChange("purchasePrefix", e.target.value)}
            />
          </div>

          {/* Currency */}
          <div className="md:col-span-4 space-y-1">
            <label className={labelClass}>Currency</label>
            <select
              className={inputClass()}
              value={form.currency}
              onChange={(e) => handleChange("currency", e.target.value)}
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="AED">AED (د.إ)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 pt-4 border-t border-slate-200/80 flex items-center justify-end gap-4">
          <button
            type="button"
            className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-black disabled:opacity-50 transition-all shadow-md cursor-pointer flex items-center gap-2"
            onClick={saveCompany}
            disabled={loading}
          >
            {loading ? <RefreshCw size={14} className="animate-spin text-white" /> : <Building2 size={15} />}
            <span>{loading ? "Creating Company..." : "Create Company Profile"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}