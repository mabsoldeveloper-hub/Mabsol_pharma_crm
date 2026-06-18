"use client";

import { useState } from "react";

export default function CreateCompanyPage() {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    companyCode: "",
    companyName: "",
    ownerName: "",
    email: "",
    mobile: "",
    gstNo: "",
    panNo: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    status: "Active",
  });

  const saveCompany = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        throw new Error("Failed");
      }

      alert("Company Created Successfully");

      setForm({
        companyCode: "",
        companyName: "",
        ownerName: "",
        email: "",
        mobile: "",
        gstNo: "",
        panNo: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        status: "Active",
      });
    } catch (error) {
      alert("Error Creating Company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card shadow border-0">
      <div className="card-body">

        <h3>Create Company</h3>

        <hr />

        <div className="row g-3">

          <div className="col-md-4">
            <label>Company Code</label>
            <input
              className="form-control"
              value={form.companyCode}
              onChange={(e) =>
                setForm({
                  ...form,
                  companyCode: e.target.value,
                })
              }
            />
          </div>

          <div className="col-md-8">
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
            <label>Email</label>
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
            <label>Mobile</label>
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

          <div className="col-md-12">
            <label>Address</label>
            <textarea
              className="form-control"
              rows={3}
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

        </div>

        <button
          className="btn btn-primary mt-4"
          onClick={saveCompany}
          disabled={loading}
        >
          {loading ? "Saving..." : "Create Company"}
        </button>

      </div>
    </div>
  );
}