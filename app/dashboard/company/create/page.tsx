"use client";

import { useState } from "react";

export default function CreateCompanyPage() {
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState("/logo.png");

  const [form, setForm] = useState({
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
  });


  const saveCompany = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/company-master", {
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
      <div className="col-md-12 text-center flex justify-center">

<img
  src={logoPreview}
  alt="logo"
  width="120"
  height="120"
  style={{
    objectFit: "contain",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "10px",
  }}
/>

</div>

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

          <div className="col-md-4">
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

          <div className="col-md-4">
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
            <label>Company Website</label>
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
            <label>Company Phone</label>
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
    <option value="INR">INR</option>
    <option value="USD">USD</option>
    <option value="AED">AED</option>
  </select>
</div>




<div className="col-md-4">

  <label>Upload Logo</label>

  <input
    type="file"
    className="form-control"


    onChange={async (e) => {
      const file = e.target.files?.[0];
    
      if (!file) return;
    
      if (file.size > 2 * 1024 * 1024) {
        alert("Maximum file size is 2MB");
        return;
      }
    
      const fd = new FormData();
      fd.append("file", file);
    
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



      




    
      setForm({
        ...form,
        logo: data.url,
      });



   //   const data = await res.json();

console.log("Upload Response:", data);

if (!data.success) {
  alert("Upload Failed");
  return;
}

setLogoPreview(data.url);

setForm((prev) => ({
  ...prev,
  logo: data.url,
}));

console.log("Logo Saved:", data.url);
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
          {loading ? "Saving..." : "Create Company"}
        </button>

      </div>
    </div>
  );
}