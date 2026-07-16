"use client";

import { useEffect, useState } from "react";

interface ProfileForm {
  name: string;
  email: string;
  mobile: string;
  employeeCode: string;
  companyName: string;
  roleName: string;
  department: string;
  designation: string;
  gender: string;
  dob: string;
  joiningDate: string;
  status: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  profilePhoto: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<ProfileForm>({
    name: "",
    email: "",
    mobile: "",
    employeeCode: "",
    companyName: "",
    roleName: "",
    department: "",
    designation: "",
    gender: "",
    dob: "",
    joiningDate: "",
    status: "",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
    profilePhoto: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/profile");

      if (!res.ok) throw new Error("Failed to load profile");

      const data = await res.json();

      if (data.success && data.user) {
        const u = data.user;
        setForm({
          name: u.name || "",
          email: u.email || "",
          mobile: u.mobile || "",
          employeeCode: u.employeeCode || "",
          companyName: u.companyId?.companyName || "",
          roleName: u.roleId?.roleName || "",
          department: u.department || "",
          designation: u.designation || "",
          gender: u.gender || "",
          dob: u.dob ? u.dob.substring(0, 10) : "",
          joiningDate: u.joiningDate ? u.joiningDate.substring(0, 10) : "",
          status: u.status || "",
          address: u.address || "",
          city: u.city || "",
          state: u.state || "",
          country: u.country || "",
          pincode: u.pincode || "",
          profilePhoto: u.profilePhoto || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      alert("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleInputChange = (field: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const updateProfile = async () => {
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      alert("Confirm Password does not match.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      alert(data.message || "Profile updated successfully");

      // Reset password fields after update
      if (data.success) {
        setForm(prev => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Profile Photo Upload Handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profilePhoto", file);

    try {
      const res = await fetch("/api/upload-user-photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success && data.url) {
        setForm(prev => ({ ...prev, profilePhoto: data.url }));
        alert("Photo uploaded successfully");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to upload photo");
    }
  };

  if (loading) {
    return <div className="text-center p-5">Loading profile...</div>;
  }

  return (
    <div className="container-fluid">
      <div className="row">
        {/* Profile Card */}
        <div className="col-lg-12">
          <div className="card shadow border-0 mb-4">
            <div className="card-body text-center">
              <img
                src={form.profilePhoto || "/admin.jpg"}
                alt="Profile"
                width={130}
                height={130}
                className="rounded-circle border shadow"
                style={{ objectFit: "cover" }}
              />

              <h3 className="mt-3">{form.name || "Employee"}</h3>
              <p className="text-muted">{form.email}</p>

              <span className="badge bg-primary me-2">{form.roleName || "-"}</span>
              <span className="badge bg-success">{form.companyName || "-"}</span>

              <div className="mt-4">
                <label className="btn btn-outline-primary w-100">
                  Change Profile Photo
                  <input
                    type="file"
                    className="d-none"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-lg-12">
          {/* Basic Information */}
          <div className="card shadow border-0 mb-4">
            <div className="card-header bg-primary text-white">
              Basic Information
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label>Full Name</label>
                  <input
                    className="form-control"
                    value={form.name}
                    onChange={handleInputChange("name")}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label>Email</label>
                  <input className="form-control" value={form.email} readOnly />
                </div>
                <div className="col-md-6 mb-3">
                  <label>Mobile</label>
                  <input
                    className="form-control"
                    value={form.mobile}
                    onChange={handleInputChange("mobile")}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label>Gender</label>
                  <select
                    className="form-select"
                    value={form.gender}
                    onChange={handleInputChange("gender")}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label>Date Of Birth</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.dob}
                    onChange={handleInputChange("dob")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Office Information */}
          <div className="card shadow border-0 mb-4">
            <div className="card-header bg-success text-white">
              Office Information
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label>Employee Code</label>
                  <input className="form-control" value={form.employeeCode} readOnly />
                </div>
                <div className="col-md-6 mb-3">
                  <label>Company</label>
                  <input className="form-control" value={form.companyName} readOnly />
                </div>
                <div className="col-md-6 mb-3">
                  <label>Role</label>
                  <input className="form-control" value={form.roleName} readOnly />
                </div>
                <div className="col-md-6 mb-3">
                  <label>Department</label>
                  <input
                    className="form-control"
                    value={form.department}
                    onChange={handleInputChange("department")}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label>Designation</label>
                  <input
                    className="form-control"
                    value={form.designation}
                    onChange={handleInputChange("designation")}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label>Joining Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.joiningDate}
                    readOnly
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label>Status</label>
                  <input className="form-control" value={form.status} readOnly />
                </div>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="card shadow border-0 mb-4">
            <div className="card-header bg-warning text-dark">
              Address Information
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-12 mb-3">
                  <label>Address</label>
                  <textarea
                    rows={3}
                    className="form-control"
                    value={form.address}
                    onChange={handleInputChange("address")}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label>City</label>
                  <input
                    className="form-control"
                    value={form.city}
                    onChange={handleInputChange("city")}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label>State</label>
                  <input
                    className="form-control"
                    value={form.state}
                    onChange={handleInputChange("state")}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label>Country</label>
                  <input
                    className="form-control"
                    value={form.country}
                    onChange={handleInputChange("country")}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label>Pincode</label>
                  <input
                    className="form-control"
                    value={form.pincode}
                    onChange={handleInputChange("pincode")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="card shadow border-0 mb-4">
            <div className="card-header bg-danger text-white">
              Change Password
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label>Current Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={form.currentPassword}
                    onChange={handleInputChange("currentPassword")}
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label>New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={form.newPassword}
                    onChange={handleInputChange("newPassword")}
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={form.confirmPassword}
                    onChange={handleInputChange("confirmPassword")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="d-flex justify-content-end gap-2">
            <button
              className="btn btn-secondary"
              onClick={() => window.location.reload()}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={saving}
              onClick={updateProfile}
            >
              {saving ? "Updating..." : "Update Profile"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}