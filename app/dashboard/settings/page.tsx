"use client";

import { useEffect, useState } from "react";


export default function SettingsPage() {

  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState("/logo.png");
  const [form, setForm] = useState({
    companyName: "",
    ownerName: "",
    email: "",
    mobile: "",
    website: "",
    gstNo: "",
    panNo: "",
    drugLicenseNo: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    invoicePrefix: "INV",
    purchasePrefix: "PUR",
    currency: "INR",
    logo: "",
  });

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {

      const res = await fetch("/api/company-settings");

      const data = await res.json();

      if (data.logo) {
        setLogoPreview(data.logo);
      }

      if (data) {
        setForm({
          companyName: data.companyName || "",
          ownerName: data.ownerName || "",
          email: data.email || "",
          mobile: data.mobile || "",
          website: data.website || "",
          gstNo: data.gstNo || "",
          panNo: data.panNo || "",
          drugLicenseNo: data.drugLicenseNo || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          pincode: data.pincode || "",
          invoicePrefix: data.invoicePrefix || "INV",
          purchasePrefix: data.purchasePrefix || "PUR",
          currency: data.currency || "INR",
          logo: data.logo || "",
        });
      }

    } catch (error) {
      console.log(error);
    }
  };

  const saveCompany = async () => {

    try {

      setLoading(true);

      const res = await fetch(
        "/api/company-settings",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();

      alert("Company Settings Saved");

      console.log(data);

    } catch (error) {

      alert("Error Saving Data");

    } finally {

      setLoading(false);

    }
  };

  return (
    <div className="card shadow border-0">

      <div className="card-body">

      <div className="col-md-12">
      

        <div className="d-flex align-items-center flex justify-center gap-4">

        <img
  src={logoPreview}
  alt="Company Logo"
  width="120"
  height="120"
  style={{
    objectFit: "contain",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "10px",
    background: "#fff",
  }}
/>
        </div>
      </div>

        <h3>Company Settings</h3>

        <hr />

        <div className="row g-3">

          <div className="col-md-6">
            <label>Company Name</label>
            <input
              className="form-control"
              value={form.companyName}
              onChange={(e) =>
                setForm({
                  ...form,
                  companyName: e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-6">
            <label>Owner Name</label>
            <input
              className="form-control"
              value={form.ownerName}
              onChange={(e) =>
                setForm({
                  ...form,
                  ownerName: e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-6">
            <label>Company Email</label>
            <input
              className="form-control"
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-6">
            <label>Company Mobile</label>
            <input
              className="form-control"
              value={form.mobile}
              onChange={(e) =>
                setForm({
                  ...form,
                  mobile: e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-6">
            <label>Website</label>
            <input
              className="form-control"
              value={form.website}
              onChange={(e) =>
                setForm({
                  ...form,
                  website: e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-6">
            <label>GST Number</label>
            <input
              className="form-control"
              value={form.gstNo}
              onChange={(e) =>
                setForm({
                  ...form,
                  gstNo: e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-6">
            <label>PAN Number</label>
            <input
              className="form-control"
              value={form.panNo}
              onChange={(e) =>
                setForm({
                  ...form,
                  panNo: e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-6">
            <label>Drug License No</label>
            <input
              className="form-control"
              value={form.drugLicenseNo}
              onChange={(e) =>
                setForm({
                  ...form,
                  drugLicenseNo: e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-12">
            <label>Company Address</label>
            <textarea
              rows={3}
              className="form-control"
              value={form.address}
              onChange={(e) =>
                setForm({
                  ...form,
                  address: e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-4">
            <label>City</label>
            <input
              className="form-control"
              value={form.city}
              onChange={(e) =>
                setForm({
                  ...form,
                  city: e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-4">
            <label>State</label>
            <input
              className="form-control"
              value={form.state}
              onChange={(e) =>
                setForm({
                  ...form,
                  state: e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-4">
            <label>Pincode</label>
            <input
              className="form-control"
              value={form.pincode}
              onChange={(e) =>
                setForm({
                  ...form,
                  pincode: e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-4">
            <label>Invoice Prefix</label>
            <input
              className="form-control"
              value={form.invoicePrefix}
              onChange={(e) =>
                setForm({
                  ...form,
                  invoicePrefix: e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-4">
            <label>Purchase Prefix</label>
            <input
              className="form-control"
              value={form.purchasePrefix}
              onChange={(e) =>
                setForm({
                  ...form,
                  purchasePrefix: e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-4">
            <label>Currency</label>
            <select
              className="form-control"
              value={form.currency}
              onChange={(e) =>
                setForm({
                  ...form,
                  currency: e.target.value,
                })
              }
            >
              <option>INR</option>
              <option>USD</option>
              <option>AED</option>
            </select>
          </div>

          <div className="col-md-4">
          <label>Upload Logo</label>

          <input
  type="file"
  className="form-control"
  onChange={(e) => {

    const file =
      e.target.files?.[0];

    if (file) {

      const imageUrl =
        URL.createObjectURL(file);

      //setLogoPreview(imageUrl);
      setLogoPreview(imageUrl);

      setForm({
        ...form,
        logo: imageUrl,
      });

    }
  }}
/>

          <small className="text-muted">
            PNG, JPG, JPEG (Max 2MB)
          </small>
        </div>

        </div>

        <button
          className="btn btn-primary mt-4"
          onClick={saveCompany}
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : "Save Company Settings"}
        </button>

      </div>
    </div>
  );
}