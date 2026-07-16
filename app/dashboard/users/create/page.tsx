"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateUserPage() {

  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [companies, setCompanies] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  const [photoPreview, setPhotoPreview] =
    useState("/avatar.png");

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

    country: "India",

    pincode: "",

    status: "Active",

    profilePhoto: "",

  });

  useEffect(() => {

    loadCompanies();

    loadRoles();

  }, []);

  const loadCompanies = async () => {

    try {

      const res =
        await fetch("/api/company-master");

      const data =
        await res.json();

      setCompanies(data);

    } catch (error) {

      console.log(error);

    }

  };

  const loadRoles = async () => {

    try {

      const res =
        await fetch("/api/roles");

      const data =
        await res.json();

      setRoles(data);

    } catch (error) {

      console.log(error);

    }

  };

  const saveUser = async () => {

    try {

      setLoading(true);

      const res =
        await fetch("/api/users", {

          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

          },

          body: JSON.stringify(form),

        });

      const data =
        await res.json();

      if (!res.ok) {

        alert(data.error);

        return;

      }

      alert("User Created Successfully");

      router.push("/dashboard/users");

    } catch (error) {

      alert("Failed to Create User");

    } finally {

      setLoading(false);

    }

  };

  return (

    <div className="card shadow border-0">
    
    <div className="card-body">
    
    <h3>Create User</h3>
    
    <hr />
    
    <div className="row g-3">
    
    {/* Profile */}
    
    <div className="col-md-12 text-center">
    
    <img
    src={photoPreview}
    alt="Profile"
    width={120}
    height={120}
    style={{
    objectFit:"cover",
    borderRadius:"50%",
    border:"2px solid #ddd",
    padding:"5px",
    }}
    />
    
    <div className="mt-3">
    
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
    
    </div>
    
    {/* Employee Code */}
    
    <div className="col-md-4">
    
    <label>Employee Code</label>
    
    <input
    className="form-control"
    value={form.employeeCode}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    employeeCode:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    {/* Name */}
    
    <div className="col-md-8">
    
    <label>Full Name</label>
    
    <input
    className="form-control"
    value={form.name}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    name:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    {/* Email */}
    
    <div className="col-md-6">
    
    <label>Email</label>
    
    <input
    type="email"
    className="form-control"
    value={form.email}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    email:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    {/* Password */}
    
    <div className="col-md-6">
    
    <label>Password</label>
    
    <input
    type="password"
    className="form-control"
    value={form.password}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    password:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    {/* Mobile */}
    
    <div className="col-md-6">
    
    <label>Mobile</label>
    
    <input
    className="form-control"
    value={form.mobile}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    mobile:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    {/* Company */}
    
    <div className="col-md-6">
    
    <label>Company</label>
    
    <select
    className="form-control"
    value={form.companyId}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    companyId:e.target.value,
    
    })
    
    }
    >
    
    <option value="">
    Select Company
    </option>
    
    {
    
    companies.map((c)=>(
    
    <option
    key={c._id}
    value={c._id}
    >
    
    {c.companyName}
    
    </option>
    
    ))
    
    }
    
    </select>
    
    </div>
    
    {/* Role */}
    
    <div className="col-md-6">
    
    <label>Role</label>
    
    <select
    className="form-control"
    value={form.roleId}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    roleId:e.target.value,
    
    })
    
    }
    >
    
    <option value="">
    Select Role
    </option>
    
    {
    
    roles.map((r)=>(
    
    <option
    key={r._id}
    value={r._id}
    >
    
    {r.roleName}
    
    </option>
    
    ))
    
    }
    
    </select>
    
    </div>
    
    {/* Department */}
    
    <div className="col-md-6">
    
    <label>Department</label>
    
    <input
    className="form-control"
    value={form.department}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    department:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    {/* Designation */}
    
    <div className="col-md-6">
    
    <label>Designation</label>
    
    <input
    className="form-control"
    value={form.designation}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    designation:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    {/* Gender */}
    
    <div className="col-md-3">
    
    <label>Gender</label>
    
    <select
    className="form-control"
    value={form.gender}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    gender:e.target.value,
    
    })
    
    }
    >
    
    <option>Male</option>
    
    <option>Female</option>
    
    <option>Other</option>
    
    </select>
    
    </div>
    
    {/* DOB */}
    
    <div className="col-md-3">
    
    <label>DOB</label>
    
    <input
    type="date"
    className="form-control"
    value={form.dob}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    dob:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    {/* Joining */}
    
    <div className="col-md-3">
    
    <label>Joining Date</label>
    
    <input
    type="date"
    className="form-control"
    value={form.joiningDate}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    joiningDate:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    {/* Status */}
    
    <div className="col-md-3">
    
    <label>Status</label>
    
    <select
    className="form-control"
    value={form.status}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    status:e.target.value,
    
    })
    
    }
    >
    
    <option>Active</option>
    
    <option>Inactive</option>
    
    </select>
    
    </div>
    
    {/* Address */}
    
    <div className="col-md-12">
    
    <label>Address</label>
    
    <textarea
    rows={3}
    className="form-control"
    value={form.address}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    address:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    <div className="col-md-4">
    
    <label>City</label>
    
    <input
    className="form-control"
    value={form.city}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    city:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    <div className="col-md-4">
    
    <label>State</label>
    
    <input
    className="form-control"
    value={form.state}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    state:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    <div className="col-md-4">
    
    <label>Pincode</label>
    
    <input
    className="form-control"
    value={form.pincode}
    onChange={(e)=>
    
    setForm({
    
    ...form,
    
    pincode:e.target.value,
    
    })
    
    }
    />
    
    </div>
    
    </div>
    
    <div className="mt-4 d-flex gap-2">
    
    <button
    className="btn btn-primary"
    onClick={saveUser}
    disabled={loading}
    >
    
    {
    
    loading
    
    ?
    
    "Saving..."
    
    :
    
    "Create User"
    
    }
    
    </button>
    
    <button
    className="btn btn-secondary"
    onClick={()=>
    
    router.push("/dashboard/users")
    
    }
    >
    
    Back
    
    </button>
    
    </div>
    
    </div>
    
    </div>
    
    );
    
    }