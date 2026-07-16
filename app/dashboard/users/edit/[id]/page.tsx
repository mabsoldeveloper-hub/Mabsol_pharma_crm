"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaUserEdit } from "react-icons/fa";

export default function EditUserPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [companies, setCompanies] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  const [photoPreview, setPhotoPreview] = useState("/avatar.png");

  const [form, setForm] = useState({
    employeeCode: "",
    name: "",
    email: "",
    password: "",
    mobile: "",
    companyId: "",
    roleId: "",
    department: "",
    designation: "",
    gender: "",
    dob: "",
    joiningDate: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    status: "Active",
    profilePhoto: "",
  });

  useEffect(() => {
    loadCompanies();
    loadRoles();
    loadUser();
  }, []);

  // ------------------------
  // Company
  // ------------------------
  const loadCompanies = async () => {
    const res = await fetch("/api/company-master");
    const data = await res.json();
    setCompanies(data);
  };

  // ------------------------
  // Roles
  // ------------------------
  const loadRoles = async () => {
    const res = await fetch("/api/roles");
    const data = await res.json();
    setRoles(data);
  };

  // ------------------------
  // Load User
  // ------------------------
  const loadUser = async () => {
    const res = await fetch(`/api/users/${id}`);
    const data = await res.json();

    setForm({
      employeeCode: data.employeeCode || "",
      name: data.name || "",
      email: data.email || "",
      password: "",
      mobile: data.mobile || "",
      companyId: data.companyId?._id || "",
      roleId: data.roleId?._id || "",
      department: data.department || "",
      designation: data.designation || "",
      gender: data.gender || "",
      dob: data.dob ? data.dob.substring(0, 10) : "",
      joiningDate: data.joiningDate ? data.joiningDate.substring(0, 10) : "",
      address: data.address || "",
      city: data.city || "",
      state: data.state || "",
      country: data.country || "",
      pincode: data.pincode || "",
      status: data.status || "Active",
      profilePhoto: data.profilePhoto || "",
    });

    if (data.profilePhoto) {
      setPhotoPreview(data.profilePhoto);
    }
  };

  // ------------------------
  // Update
  // ------------------------
  const updateUser = async () => {
    try {
      setLoading(true);

      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error);
        return;
      }

      alert("User Updated Successfully");
      router.push("/dashboard/users");
    } catch {
      alert("Update Failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg text-sm px-3 py-2 bg-white/50 border border-white/60 text-gray-700 placeholder-gray-400 outline-none focus:bg-white/70 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/20 transition-all";

  const labelClass =
    "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div
      className="
        relative rounded-2xl overflow-hidden
        bg-white/60 backdrop-blur-xl
        border border-white/40
        shadow-[0_4px_20px_rgba(0,0,0,0.06)]
      "
    >
      {/* top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent" />

      {/* header */}
      <div className="relative flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500/80 to-violet-500/80 backdrop-blur-md">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/25 text-white">
          <FaUserEdit size={14} />
        </div>
        <h5 className="text-sm font-semibold text-white tracking-wide m-0">
          Edit User
        </h5>
      </div>

      {/* body */}
      <div className="relative p-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Profile Photo */}
          <div className="md:col-span-12 flex flex-col items-center gap-3">
            <img
              src={photoPreview}
              alt="Profile"
              width={110}
              height={110}
              className="rounded-full object-cover ring-4 ring-white/60 shadow-md"
            />

            <input
              type="file"
              className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-500/90 file:text-white hover:file:bg-indigo-500 file:cursor-pointer"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                if (file.size > 2 * 1024 * 1024) {
                  alert("Maximum file size is 2MB");
                  return;
                }

                const fd = new FormData();
                fd.append("file", file);

                const res = await fetch("/api/upload-user-photo", {
                  method: "POST",
                  body: fd,
                });

                const data = await res.json();

                if (!data.success) {
                  alert("Upload Failed");
                  return;
                }

                setPhotoPreview(data.url);

                setForm((prev) => ({
                  ...prev,
                  profilePhoto: data.url,
                }));
              }}
            />
          </div>

          {/* Employee Code */}
          <div className="md:col-span-4">
            <label className={labelClass}>Employee Code</label>
            <input
              className={inputClass}
              value={form.employeeCode}
              onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
            />
          </div>

          {/* Name */}
          <div className="md:col-span-8">
            <label className={labelClass}>Full Name</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* Email */}
          <div className="md:col-span-6">
            <label className={labelClass}>Email</label>
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          {/* Password */}
          <div className="md:col-span-6">
            <label className={labelClass}>Change Password</label>
            <input
              type="password"
              className={inputClass}
              placeholder="Leave Blank if No Change"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          {/* Mobile */}
          <div className="md:col-span-6">
            <label className={labelClass}>Mobile</label>
            <input
              className={inputClass}
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            />
          </div>

          {/* Company */}
          <div className="md:col-span-6">
            <label className={labelClass}>Company</label>
            <select
              className={inputClass}
              value={form.companyId}
              onChange={(e) => setForm({ ...form, companyId: e.target.value })}
            >
              <option value="">Select Company</option>
              {companies.map((company) => (
                <option key={company._id} value={company._id}>
                  {company.companyName}
                </option>
              ))}
            </select>
          </div>

          {/* Role */}
          <div className="md:col-span-6">
            <label className={labelClass}>Role</label>
            <select
              className={inputClass}
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
            >
              <option value="">Select Role</option>
              {roles.map((role) => (
                <option key={role._id} value={role._id}>
                  {role.roleName}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div className="md:col-span-6">
            <label className={labelClass}>Department</label>
            <input
              className={inputClass}
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>

          {/* Designation */}
          <div className="md:col-span-6">
            <label className={labelClass}>Designation</label>
            <input
              className={inputClass}
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
            />
          </div>

          {/* Gender */}
          <div className="md:col-span-4">
            <label className={labelClass}>Gender</label>
            <select
              className={inputClass}
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>

          {/* DOB */}
          <div className="md:col-span-4">
            <label className={labelClass}>Date of Birth</label>
            <input
              type="date"
              className={inputClass}
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
            />
          </div>

          {/* Joining */}
          <div className="md:col-span-4">
            <label className={labelClass}>Joining Date</label>
            <input
              type="date"
              className={inputClass}
              value={form.joiningDate}
              onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
            />
          </div>

          {/* Address */}
          <div className="md:col-span-12">
            <label className={labelClass}>Address</label>
            <textarea
              rows={3}
              className={inputClass}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="md:col-span-3">
            <label className={labelClass}>City</label>
            <input
              className={inputClass}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>

          <div className="md:col-span-3">
            <label className={labelClass}>State</label>
            <input
              className={inputClass}
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
          </div>

          <div className="md:col-span-3">
            <label className={labelClass}>Country</label>
            <input
              className={inputClass}
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </div>

          <div className="md:col-span-3">
            <label className={labelClass}>Pincode</label>
            <input
              className={inputClass}
              value={form.pincode}
              onChange={(e) => setForm({ ...form, pincode: e.target.value })}
            />
          </div>

          <div className="md:col-span-4">
            <label className={labelClass}>Status</label>
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3 border-t border-gray-200/70 pt-4">
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-500/90 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={loading}
            onClick={updateUser}
          >
            {loading ? "Updating..." : "Update User"}
          </button>

          <button
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-500/90 hover:bg-amber-500 transition-colors"
            onClick={() => {
              loadUser();
            }}
          >
            Reset
          </button>

          <button
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-white/50 hover:bg-white/70 border border-white/60 transition-colors"
            onClick={() => router.push("/dashboard/users")}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}