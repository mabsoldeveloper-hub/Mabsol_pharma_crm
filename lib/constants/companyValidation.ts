/**
 * Centralized Validation Patterns & Helpers for Company Master and CRM Forms
 */

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PHONE_REGEX = /^[6-9]\d{9}$/;
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

// Indian GST 2-digit State Codes Mapping
export const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman and Diu",
  "26": "Dadra and Nagar Haveli",
  "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh (New)",
  "38": "Ladakh",
};

// HSN / SAC Codes with human-readable descriptions
export const HSN_DESCRIPTIONS: Record<string, string> = {
  "3004": "Medicaments (Pharmaceutical formulations)",
  "3003": "Medicaments (Mixed constituents)",
  "3006": "Pharmaceutical Goods & Supplies",
  "2106": "Food & Nutraceutical Supplements",
  "998313": "IT Software & Application Consulting Services",
  "998314": "IT System Design & Software Development Services",
  "998315": "Web Hosting & Cloud Data Infrastructure Services",
  "998311": "Management & Business Operations Services",
  "998319": "Other Technical & Information Technology Services",
  "998312": "Business Consulting & Strategy Services",
};

export function getHsnDescription(code: string): string {
  const clean = String(code || "").trim();
  return HSN_DESCRIPTIONS[clean] || "General Goods & Services";
}

export function validateGstin(gstin: string): boolean {
  if (!gstin) return true; // Optional if not required
  return GSTIN_REGEX.test(gstin.trim().toUpperCase());
}

export function validatePan(pan: string): boolean {
  if (!pan) return true;
  return PAN_REGEX.test(pan.trim().toUpperCase());
}

export function validateEmail(email: string): boolean {
  if (!email) return false;
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

export function validatePhone(phone: string): boolean {
  if (!phone) return true;
  return PHONE_REGEX.test(phone.trim());
}

export function validatePincode(pincode: string): boolean {
  if (!pincode) return true;
  return PINCODE_REGEX.test(pincode.trim());
}

export function extractPanFromGstin(gstin: string): string {
  const clean = gstin.trim().toUpperCase();
  if (clean.length >= 12) {
    const candidate = clean.substring(2, 12);
    if (PAN_REGEX.test(candidate)) return candidate;
  }
  return "";
}

export function resolveStateFromGstin(gstin: string): string {
  const clean = gstin.trim().toUpperCase();
  if (clean.length >= 2) {
    const code = clean.substring(0, 2);
    return GST_STATE_CODES[code] || "";
  }
  return "";
}

export interface CompanyFormErrors {
  companyCode?: string;
  companyName?: string;
  email?: string;
  mobile?: string;
  gstNo?: string;
  panNo?: string;
  pincode?: string;
}

export function validateCompanyForm(form: {
  companyCode?: string;
  companyName?: string;
  email?: string;
  mobile?: string;
  gstNo?: string;
  panNo?: string;
  pincode?: string;
}): CompanyFormErrors {
  const errors: CompanyFormErrors = {};

  if (!form.companyCode || !form.companyCode.trim()) {
    errors.companyCode = "Company Code is required";
  }

  if (!form.companyName || !form.companyName.trim()) {
    errors.companyName = "Company Name is required";
  }

  if (!form.email || !form.email.trim()) {
    errors.email = "Company Email is required";
  } else if (!validateEmail(form.email)) {
    errors.email = "Invalid email format (e.g. info@company.com)";
  }

  if (form.mobile && !validatePhone(form.mobile)) {
    errors.mobile = "Invalid Indian mobile number (10 digits starting with 6-9)";
  }

  if (form.gstNo && !validateGstin(form.gstNo)) {
    errors.gstNo = "Invalid GSTIN format (15 characters, e.g. 27AABCU9603R1ZM)";
  }

  if (form.panNo && !validatePan(form.panNo)) {
    errors.panNo = "Invalid PAN format (10 characters, e.g. ABCDE1234F)";
  }

  if (form.pincode && !validatePincode(form.pincode)) {
    errors.pincode = "Invalid Pincode (6 digits)";
  }

  return errors;
}
